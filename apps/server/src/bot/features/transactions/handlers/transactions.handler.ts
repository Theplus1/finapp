import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { SlashApiService } from 'src/integrations/slash/services/slash-api.service';
import { TransactionsService } from 'src/domain/transactions/transactions.service';
import { ExportsService } from 'src/domain/exports/exports.service';
import { Messages } from 'src/bot/constants/messages.constant';
import { Keyboards } from 'src/bot/constants/keyboards.constant';
import { BotContext } from 'src/bot/interfaces/bot-context.interface';
import {
  TransactionDetailedStatus,
  TransactionDto,
  TransactionStatus,
} from 'src/integrations/slash/dto/transaction.dto';
import { SessionSteps } from 'src/bot/constants/session-steps.constant';
import { formatCurrency } from 'src/shared/utils/formatCurrency.util';
import { Actions } from 'src/bot/constants/actions.constant';
import { ExportType } from 'src/database/schemas/export-job.schema';
import { isValid, parse } from 'date-fns';

@Injectable()
export class TransactionsHandler {

  private readonly logger = new Logger(TransactionsHandler.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly slashApiService: SlashApiService,
    private readonly transactionsService: TransactionsService,
    private readonly exportsService: ExportsService,
    private readonly configService: ConfigService,
  ) { }

  async handleTransactionListAction(ctx: BotContext) {
    await ctx.answerCbQuery();
    await ctx.reply(Messages.transactionsMenu, {
      parse_mode: 'Markdown',
      ...Keyboards.transactionTimeFilterMenu(),
    });
  }

  async handleSubscribeTransactionsAction(ctx: BotContext) {
    await ctx.answerCbQuery('Subscribing...');
    await this.usersService.addNotificationDestination(ctx.userData!.telegramId, ctx.chat?.id ?? ctx.from!.id);
    await ctx.editMessageText(Messages.subscribeTransactionsSuccess, {
      parse_mode: 'Markdown',
      ...Keyboards.backToTransaction(),
    });
  }

  async handleUnsubscribeTransactionsAction(ctx: BotContext) {
    await ctx.answerCbQuery('Unsubscribing...');
    await this.usersService.removeNotificationDestination(ctx.userData!.telegramId, ctx.chat?.id ?? ctx.from!.id);
    await ctx.editMessageText(Messages.unsubscribeTransactionsSuccess, {
      parse_mode: 'Markdown',
      ...Keyboards.backToTransaction(),
    });
  }

  async handleTransactionDetailAction(ctx: BotContext) {
    if (!ctx.session) return;
    ctx.session.step = SessionSteps.AWAITING_TRANSACTION_ID;
    await ctx.answerCbQuery();
    await ctx.reply(Messages.transactionInfoPrompt, {
      parse_mode: 'Markdown',
      reply_markup: { force_reply: true, selective: true },
    });
  }

  async handleTransactionInput(ctx: BotContext, transactionId: string) {
    if (!ctx.session) return;

    const userData = ctx.userData!;
    const trimmed = (transactionId || '').trim();
    if (!trimmed) {
      await ctx.reply(Messages.noTransactionsFound);
      // Clear session after error response
      ctx.session = undefined;
      return;
    }

    await ctx.sendChatAction('typing');
    try {
      this.logger.log(`Fetching transaction details for transaction ${trimmed}`);
      const transactionDetail =
        await this.slashApiService.getTransaction(trimmed);
      if (
        !transactionDetail ||
        transactionDetail.virtualAccountId !== userData.virtualAccountId
      ) {
        this.logger.warn(`Transaction ${trimmed} not found or does not belong to user ${userData.virtualAccountId}`);
        await ctx.reply(Messages.noTransactionsFound);
        // Clear session after error response
        ctx.session = undefined;
        return;
      }

      const detail = this.formatTransactionDetail(transactionDetail);
      await ctx.reply(detail, {
        parse_mode: 'Markdown',
        ...Keyboards.backToTransaction(),
      });

      // Clear session after successful response
      ctx.session = undefined;
      this.logger.log(`Transaction details sent successfully for transaction ${trimmed}`);
    } catch (error) {
      this.logger.error(`Error fetching transaction ${trimmed}:`, error);

      // Clear session on error to prevent stuck state
      ctx.session = undefined;

      // Provide more specific error message
      if (error.response?.status === 404) {
        await ctx.reply(Messages.noTransactionsFound);
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        await ctx.reply('❌ Request timed out. Please try again later.');
      } else {
        await ctx.reply(Messages.errorFetchingTransactions);
      }
    }
  }

  private formatTransactionDetail(transactionDTO: TransactionDto): string {
    const statusEmoji = this.getTransactionStatusEmoji(transactionDTO.status);
    const created = new Date(transactionDTO.date).toLocaleString();
    const description = transactionDTO.description || 'N/A';

    let message = `*Transaction Detail*\n\n`;
    message += `Amount: ${formatCurrency(transactionDTO.amountCents || 0, transactionDTO.originalCurrency.code)}\n`;
    message += `Status: ${statusEmoji} ${transactionDTO.status}\n`;
    message += `Description: ${description}\n`;
    message += `Country: ${transactionDTO.merchantData.location.country}\n`;
    message += `Created: ${created}\n`;
    return message;
  }

  private getTransactionStatusEmoji(
    status: TransactionStatus | string,
  ): string {
    switch (status) {
      case TransactionStatus.COMPLETED:
        return '✅';
      case TransactionStatus.PENDING:
        return '⏸️';
      case TransactionStatus.FAILED:
      case TransactionStatus.DECLINED:
        return '❌';
      default:
        return '❓';
    }
  }

  async handleTransactionExportAction(ctx: BotContext) {
    await ctx.answerCbQuery();
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) return;
    let filters: any = {
      virtualAccountId: ctx.userData?.virtualAccountId,
      detailedStatus: { $in: [TransactionDetailedStatus.SETTLED, TransactionDetailedStatus.PENDING, TransactionDetailedStatus.REVERSED] },
      amountCents: { $lt: 0 }
    };

    switch (callbackQuery.data) {
      case Actions.transaction.listCustomTime:
        if (!ctx.session) return;
        ctx.session.step = SessionSteps.AWAITING_EXPORT_DATE;
        await ctx.reply(Messages.customTimePrompt, {
          parse_mode: 'Markdown',
          reply_markup: { force_reply: true, selective: true },
        });
        break;
      default:
        await this.createExportJob(ctx, filters);
        break;
    }
  }

  async handleExportDateInput(ctx: BotContext, text: string) {
    const [fromDateStr, toDateStr] = text.split('-');
    const startDate = parse(fromDateStr + ' 00:00:00', 'dd/MM/yyyy HH:mm:ss', new Date());
    const endDate = parse(toDateStr || fromDateStr + ' 23:59:59', 'dd/MM/yyyy HH:mm:ss', new Date());
    if (!isValid(startDate) || !isValid(endDate)) {
      await ctx.reply(Messages.errorInvalidDate);
      return;
    }
    const filters: any = {
      virtualAccountId: ctx.userData?.virtualAccountId,
      detailedStatus: { $in: [TransactionDetailedStatus.SETTLED, TransactionDetailedStatus.PENDING, TransactionDetailedStatus.REVERSED] },
      amountCents: { $lt: 0 },
      startDate,
      endDate
    };
    await this.createExportJob(ctx, filters);
  }

  private async createExportJob(ctx: BotContext, filters: any) {
    try {
      const exportJob = await this.exportsService.createExport(
        ctx.from!.id,
        ctx.chat!.id,
        {
          type: ExportType.TRANSACTIONS,
          filters,
        },
      );
      await ctx.reply(
        Messages.exportingTransactions,
        { parse_mode: 'Markdown' },
      );

      this.logger.log(`Export job ${exportJob.id} created for user ${ctx.from!.id}`);
    } catch (err) {
      this.logger.error('Failed to export', err as any);
      await ctx.reply(Messages.errorFetchingTransactions);
    }
  }
}

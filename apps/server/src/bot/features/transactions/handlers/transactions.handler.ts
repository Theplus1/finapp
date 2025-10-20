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
  TransactionDto,
  TransactionStatus,
} from 'src/integrations/slash/dto/transaction.dto';
import { SessionSteps } from 'src/bot/constants/session-steps.constant';
import { formatCurrency } from 'src/shared/utils/formatCurrency.util';
import { Actions } from 'src/bot/constants/actions.constant';
import { ExportType } from 'src/database/schemas/export-job.schema';

@Injectable()
export class TransactionsHandler {
  private readonly logger = new Logger(TransactionsHandler.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly slashApiService: SlashApiService,
    private readonly transactionsService: TransactionsService,
    private readonly exportsService: ExportsService,
    private readonly configService: ConfigService,
  ) {}

  async handleTransactionListAction(ctx: BotContext) {
    await ctx.answerCbQuery();
    await ctx.reply(Messages.transactionsMenu, {
      parse_mode: 'Markdown',
      ...Keyboards.transactionTimeFilterMenu(),
    });
  }

  async handleSubscribeTransactionsAction(ctx: BotContext) {
    await ctx.answerCbQuery('Subscribing...');
    await this.usersService.updateSubscription(ctx.from!.id, true);
    await ctx.editMessageText(Messages.subscribeTransactionsSuccess, {
      parse_mode: 'Markdown',
      ...Keyboards.backToTransaction(),
    });
  }

  async handleUnsubscribeTransactionsAction(ctx: BotContext) {
    await ctx.answerCbQuery('Unsubscribing...');
    await this.usersService.updateSubscription(ctx.from!.id, false);
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
    });
  }

  async handleTransactionInput(ctx: BotContext, transactionId: string) {
    if (!ctx.session) return;

    const userData = ctx.userData!;
    const trimmed = (transactionId || '').trim();
    if (!trimmed) {
      await ctx.reply(Messages.noTransactionsFound);
      return;
    }

    await ctx.sendChatAction('typing');
    try {
      const transactionDetail =
        await this.slashApiService.getTransaction(trimmed);
      if (
        !transactionDetail ||
        transactionDetail.virtualAccountId !== userData.virtualAccountId
      ) {
        await ctx.reply(Messages.noTransactionsFound);
        return;
      }

      const detail = this.formatTransactionDetail(transactionDetail);
      await ctx.reply(detail, {
        parse_mode: 'Markdown',
        ...Keyboards.backToTransaction(),
      });
    } catch (error) {
      this.logger.error(`Error fetching transaction ${trimmed}:`, error);
      await ctx.reply(Messages.errorFetchingTransactions);
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

    const now = new Date();
    const dateFrom = new Date(now);
    const dateTo = new Date(now);
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);

    switch (callbackQuery.data) {
      case Actions.transaction.listToday:
        break;
      case Actions.transaction.listYesterday:
        dateFrom.setDate(dateFrom.getDate() - 1);
        dateTo.setDate(dateTo.getDate() - 1);
        break;
      case Actions.transaction.listThisWeek:
        dateFrom.setDate(dateFrom.getDate() - dateFrom.getDay());
        break;
      case Actions.transaction.listThisMonth:
        dateFrom.setDate(1);
        break;
    }

    try {
      // Create async export job
      const exportJob = await this.exportsService.createExport(
        ctx.from!.id,
        ctx.chat!.id,
        {
          type: ExportType.TRANSACTIONS,
          filters: {
            virtualAccountId: ctx.virtualAccount?.slashId,
            startDate: dateFrom.toISOString(),
            endDate: dateTo.toISOString(),
          },
        },
      );

      await ctx.reply(
        '⏳ *Generating your export...*\n\n' +
          'This may take a moment. You\'ll receive a download link when it\'s ready.',
        { parse_mode: 'Markdown' },
      );

      this.logger.log(`Export job ${exportJob.id} created for user ${ctx.from!.id}`);
    } catch (err) {
      this.logger.error('Failed to create export job', err as any);
      await ctx.reply(Messages.errorFetchingTransactions);
    }
  }
}

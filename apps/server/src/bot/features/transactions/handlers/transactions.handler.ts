import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { SlashApiService } from 'src/integrations/slash/services/slash-api.service';
import { TransactionsService } from 'src/domain/transactions/transactions.service';
import { Messages } from 'src/bot/constants/messages.constant';
import { Keyboards } from 'src/bot/constants/keyboards.constant';
import { BotContext } from 'src/bot/interfaces/bot-context.interface';
import { ValidateUser } from 'src/bot/decorators/validate-user.decorator';
import { UserValidationGuard } from 'src/bot/guards/user-validation.guard';
import { TransactionDto, TransactionStatus } from 'src/integrations/slash/dto/transaction.dto';
import { SessionSteps } from 'src/bot/constants/session-steps.constant';
import { formatCurrency } from 'src/shared/utils/formatCurrency.util';

@Injectable()
@UseGuards(UserValidationGuard)
export class TransactionsHandler {

  private readonly logger = new Logger(TransactionsHandler.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly slashApiService: SlashApiService,
    private readonly transactionsService: TransactionsService,
    private readonly configService: ConfigService,
  ) {}

  // MENU
  @ValidateUser({ answerCallback: true })
  async handleSubscribeTransactionsAction(ctx: BotContext) {
    await ctx.answerCbQuery('Subscribing...');
    await this.usersService.updateSubscription(ctx.from!.id, true);
    await ctx.editMessageText(Messages.subscribeTransactionsSuccess, {
      parse_mode: 'Markdown',
      ...Keyboards.backToTransactions(),
    });
  }

  @ValidateUser({ answerCallback: true })
  async handleUnsubscribeTransactionsAction(ctx: BotContext) {
    await ctx.answerCbQuery('Unsubscribing...');
    await this.usersService.updateSubscription(ctx.from!.id, false);
    await ctx.editMessageText(Messages.unsubscribeTransactionsSuccess, {
      parse_mode: 'Markdown',
      ...Keyboards.backToTransactions(),
    });
  }

  @ValidateUser({ requireAccount: true, answerCallback: true })
  async handleTransactionDetailAction(ctx: BotContext) {
    if (!ctx.session) return;
    ctx.session.step = SessionSteps.AWAITING_TRANSACTION_ID;
    await ctx.answerCbQuery();
    await ctx.reply(Messages.transactionInfoPrompt, {
      parse_mode: 'Markdown',
    });
  }

  // INPUT
  @ValidateUser({ requireAccount: true })
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
      const transactionDetail = await this.slashApiService.getTransaction(trimmed);
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
        ...Keyboards.backToTransactions(),
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
}

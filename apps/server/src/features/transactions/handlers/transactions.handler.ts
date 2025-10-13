import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../../users/users.service';
import { SlashService } from '../../../slash/slash.service';
import { Messages } from '../../../bot/constants/messages.constant';
import { Keyboards } from '../../../bot/constants/keyboards.constant';
import { BotContext } from '../../../bot/interfaces/bot-context.interface';
import { ValidateUser } from '../../../shared/decorators/validate-user.decorator';
import type { TransactionDto } from 'src/slash';

@Injectable()
export class TransactionsHandler {
  private readonly logger = new Logger(TransactionsHandler.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly slashService: SlashService,
    private readonly configService: ConfigService,
  ) {}

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

  @ValidateUser({ requireAccount: true })
  async handleListTransactions(ctx: BotContext, cursor?: string) {
    const userData = ctx.userData!;

    try {
      const response = await this.slashService.listTransactions({ cursor });

      if (!response.data || response.data.length === 0) {
        if (cursor) {
          await ctx.answerCbQuery('No more transactions found');
        } else {
          await ctx.reply(Messages.noTransactionsFound);
        }
        return;
      }

      const transactionsList = this.formatTransactionsList(response.data);

      await ctx.reply(transactionsList, {
        parse_mode: 'Markdown',
        ...Keyboards.backToTransactions(),
      });
    } catch (error) {
      this.logger.error(
        `Error fetching transactions for user ${ctx.from?.id}:`,
        error,
      );
      await ctx.reply(Messages.errorFetchingTransactions);
    }
  }

  private formatTransactionsList(transactions: TransactionDto[]): string {
    let message = `💳 *Your Transactions*\n\n`;

    transactions.forEach((transaction, index) => {
      const statusEmoji = this.getStatusEmoji(transaction.status);
      message += `${index + 1}. *${transaction.merchantName}* \n`;
      message += `   Status: ${statusEmoji} ${transaction.status}\n\n`;
    });

    return message;
  }
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'active':
        return '✅';
      case 'paused':
        return '⏸️';
      case 'inactive':
        return '⏹️';
      case 'closed':
        return '🔒';
      default:
        return '❓';
    }
  }
}

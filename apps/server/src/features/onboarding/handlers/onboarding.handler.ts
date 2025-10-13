import { Injectable, Logger } from '@nestjs/common';
import { BotContext } from '../../../bot/interfaces/bot-context.interface';
import { UsersService } from '../../../users/users.service';
import { Messages } from '../../../bot/constants/messages.constant';
import { Keyboards } from '../../../bot/constants/keyboards.constant';
import { SessionSteps } from '../../../bot/constants/session-steps.constant';
import { SlashService } from '../../../slash/slash.service';

@Injectable()
export class OnboardingHandler {
  private readonly logger = new Logger(OnboardingHandler.name);

  constructor(private readonly usersService: UsersService, private readonly slashService: SlashService) {}

  async initiateAccountLinking(ctx: BotContext, firstName: string): Promise<void> {
    ctx.session = { step: SessionSteps.AWAITING_ACCOUNT_NUMBER, data: {} };
    await ctx.reply(Messages.requestAccountNumber(firstName), {
      parse_mode: 'Markdown',
    });
  }

  async linkAccountToUser(
    ctx: BotContext,
    telegramId: number,
    virtualAccountId: string,
  ): Promise<void> {
    try {
      const response = await this.slashService.getVirtualAccount(virtualAccountId);
      await this.usersService.linkAccountNumber(telegramId, virtualAccountId);

      ctx.session = undefined;

      await ctx.reply(Messages.accountNumberLinked(response.virtualAccount.name), {
        parse_mode: 'Markdown',
        ...Keyboards.mainMenu(),
      });

      this.logger.log(`Account ${virtualAccountId} linked to user ${telegramId}`);

      // TODO: Add additional actions here after account linking
      // For example: fetch account details, send welcome message with account info, etc.
    } catch (error) {
      this.logger.error(`Failed to link account for user ${telegramId}:`, error);
      await ctx.reply('❌ Failed to link account. Please try again later. \n Error details: ' + error.message, {
        parse_mode: 'Markdown',
      });
    }
  }
}

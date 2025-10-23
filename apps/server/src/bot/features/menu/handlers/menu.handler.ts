import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { BotContext } from 'src/bot/interfaces/bot-context.interface';
import { UsersService } from 'src/users/users.service';
import { Messages } from 'src/bot/constants/messages.constant';
import { Keyboards } from 'src/bot/constants/keyboards.constant';
import { OnboardingHandler } from 'src/bot/features/onboarding/handlers/onboarding.handler';
import { AccountsService } from 'src/domain/accounts/accounts.service';

@Injectable()
export class MenuHandler {
  private readonly logger = new Logger(MenuHandler.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly accountsService: AccountsService,
    private readonly onboardingHandler: OnboardingHandler,
  ) {}

  async handleStart(ctx: BotContext) {
    await ctx.sendChatAction('typing');
    await ctx.reply(
      Messages.mainMenu,
      { parse_mode: 'Markdown', ...Keyboards.mainMenu() }
    );
  }

  async handleHelp(ctx: Context) {
    await ctx.reply(Messages.help, { parse_mode: 'Markdown' });
  }

  async handleMenu(ctx: Context) {
    await ctx.reply(Messages.mainMenu, {
      parse_mode: 'Markdown',
      ...Keyboards.mainMenu(),
    });
  }

  async handleMenuAction(ctx: Context) {
    await ctx.answerCbQuery();
    await this.handleMenu(ctx);
  }

  async handleTransactionAction(ctx: BotContext) {
    await ctx.answerCbQuery();
    await ctx.reply(Messages.transactionsMenu, {
      parse_mode: 'Markdown',
      ...Keyboards.transactionMenu(),
    });
  }

  async handleTransactionNotificationAction(ctx: BotContext) {
    const userData = ctx.userData!;
    const isSubscribed = userData.notificationChatIds.includes(ctx.chat!.id);
    await ctx.answerCbQuery();
    await ctx.reply(
      Messages.transactionNotificationMenu(isSubscribed),
      {
        parse_mode: 'Markdown',
        ...Keyboards.transactionNotificationMenu(isSubscribed),
      },
    );
  }

  async handleAboutAction(ctx: Context) {
    const user = ctx.from;
    if (!user) {
      await ctx.answerCbQuery('Error: User not found');
      return;
    }

    const userData = await this.usersService.findByTelegramId(user.id);
    if (!userData) {
      await ctx.answerCbQuery('Please use /start first');
      await ctx.reply(Messages.mustStartBot);
      return;
    }

    await ctx.answerCbQuery();
    await ctx.reply(Messages.about, {
      parse_mode: 'Markdown',
      ...Keyboards.backToMenu(),
    });
  }

  async linkAccountToUser(ctx: BotContext, telegramId: number, accountNumber: string) {
    // Delegate to onboarding handler
    await this.onboardingHandler.linkAccountToUser(ctx, telegramId, accountNumber);
  }
}

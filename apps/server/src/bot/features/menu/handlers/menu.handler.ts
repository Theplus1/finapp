import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { Context } from 'telegraf';
import { BotContext } from 'src/bot/interfaces/bot-context.interface';
import { UsersService } from 'src/users/users.service';
import { Messages } from 'src/bot/constants/messages.constant';
import { Keyboards } from 'src/bot/constants/keyboards.constant';
import { OnboardingHandler } from 'src/bot/features/onboarding/handlers/onboarding.handler';
import { ValidateUser } from 'src/bot/decorators/validate-user.decorator';
import { UserValidationGuard } from 'src/bot/guards/user-validation.guard';
import { AccountsService } from 'src/domain/accounts/accounts.service';

@Injectable()
@UseGuards(UserValidationGuard)
export class MenuHandler {
  private readonly logger = new Logger(MenuHandler.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly accountsService: AccountsService,
    private readonly onboardingHandler: OnboardingHandler,
  ) {}

  async handleStart(ctx: BotContext) {
    await ctx.sendChatAction('typing');
    const user = ctx.from;
    if (!user) return;

    const linkedVirtualAccount = await this.accountsService.findByTelegramId(user.id);
    
    if (!linkedVirtualAccount){
      await ctx.reply(
        Messages.accessDenied(),
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    await ctx.reply(
      Messages.mainMenu,
      { parse_mode: 'Markdown', ...Keyboards.mainMenu() }
    );
  }

  async handleHelp(ctx: Context) {
    await ctx.reply(Messages.help, { parse_mode: 'Markdown' });
  }

  async handleMenu(ctx: Context) {
    const user = ctx.from;
    if (!user) return;

    const userData = await this.usersService.findByTelegramId(user.id);
    if (!userData) {
      await ctx.reply(Messages.mustStartBot);
      return;
    }

    await ctx.reply(Messages.mainMenu, {
      parse_mode: 'Markdown',
      ...Keyboards.mainMenu(),
    });
  }

  async handleMenuAction(ctx: Context) {
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
    await this.handleMenu(ctx);
  }

  @ValidateUser({ answerCallback: true })
  async handleTransactionAction(ctx: BotContext) {
    await ctx.answerCbQuery();
    await ctx.reply(Messages.transactionsMenu, {
      parse_mode: 'Markdown',
      ...Keyboards.transactionMenu(),
    });
  }

  @ValidateUser({ answerCallback: true })
  async handleTransactionNotificationAction(ctx: BotContext) {
    const userData = ctx.userData!;

    await ctx.answerCbQuery();
    await ctx.reply(
      Messages.transactionNotificationMenu(userData.isSubscribed),
      {
        parse_mode: 'Markdown',
        ...Keyboards.transactionNotificationMenu(userData.isSubscribed),
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

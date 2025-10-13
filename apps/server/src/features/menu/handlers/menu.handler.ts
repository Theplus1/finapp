import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { BotContext } from '../../../bot/interfaces/bot-context.interface';
import { UsersService } from '../../../users/users.service';
import { Messages } from '../../../bot/constants/messages.constant';
import { Keyboards } from '../../../bot/constants/keyboards.constant';
import { OnboardingHandler } from '../../onboarding/handlers/onboarding.handler';
import { ValidateUser } from 'src/shared/decorators/validate-user.decorator';

@Injectable()
export class MenuHandler {
  private readonly logger = new Logger(MenuHandler.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly onboardingHandler: OnboardingHandler,
  ) {}

  async handleStart(ctx: BotContext) {
    await ctx.sendChatAction('typing');
    const user = ctx.from;
    if (!user) return;

    // Find or create user
    const existingUser = await this.usersService.findOrCreate(user.id, {
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
    });

    // Check if user already has an account number linked
    if (existingUser.virtualAccountId) {
      await ctx.reply(
        Messages.welcome(user.first_name || user.username || ''),
        { parse_mode: 'Markdown', ...Keyboards.mainMenu() }
      );
      return;
    }

    // Request account number via onboarding handler
    await this.onboardingHandler.initiateAccountLinking(ctx, user.first_name);
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
  async handleTransactionsAction(ctx: BotContext) {
    const userData = ctx.userData!;

    await ctx.answerCbQuery();
    await ctx.reply(Messages.transactionsMenu, {
      parse_mode: 'Markdown',
      ...Keyboards.transactionsMenu(userData.isSubscribed),
    });
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

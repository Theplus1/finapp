import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { BotContext } from '../../../bot/interfaces/bot-context.interface';
import { UsersService } from '../../../users/users.service';
import { Messages } from '../../../bot/constants/messages.constant';
import { Keyboards } from '../../../bot/constants/keyboards.constant';
import { OnboardingHandler } from '../../onboarding/handlers/onboarding.handler';
import { AdminHandler } from '../../admin/handlers/admin.handler';
import { ValidateUser } from 'src/shared/decorators/validate-user.decorator';
import { AccessStatus } from 'src/users/users.schema';

@Injectable()
export class MenuHandler {
  private readonly logger = new Logger(MenuHandler.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly onboardingHandler: OnboardingHandler,
    private readonly adminHandler: AdminHandler,
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

    const isNewUser = !existingUser.accessRequestedAt;

    // If new user, set access request timestamp and notify admins
    if (isNewUser) {
      await this.usersService.requestAccess(user.id);
      
      // Notify admins about new registration
      await this.adminHandler.notifyAdminsNewRequest(
        user.id,
        user.username,
        user.first_name,
        user.last_name,
      );

      await ctx.reply(
        Messages.accessRequestSubmitted(user.first_name || user.username || 'User'),
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Check access status
    switch (existingUser.accessStatus) {
      case AccessStatus.PENDING:
        await ctx.reply(Messages.accessPending, { parse_mode: 'Markdown' });
        return;

      case AccessStatus.DENIED:
        await ctx.reply(
          Messages.accessDenied(existingUser.accessDeniedReason),
          { parse_mode: 'Markdown' }
        );
        return;

      case AccessStatus.REVOKED:
        await ctx.reply(
          Messages.accessRevoked(existingUser.accessDeniedReason),
          { parse_mode: 'Markdown' }
        );
        return;

      case AccessStatus.APPROVED:
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
        return;
    }
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

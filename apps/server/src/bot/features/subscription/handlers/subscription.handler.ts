import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { Messages } from 'src/bot/constants/messages.constant';
import { Keyboards } from 'src/bot/constants/keyboards.constant';
import { BotContext } from 'src/bot/interfaces/bot-context.interface';
import { ValidateUser } from 'src/bot/decorators/validate-user.decorator';
import { UserValidationGuard } from 'src/bot/guards/user-validation.guard';

@Injectable()
@UseGuards(UserValidationGuard)
export class SubscriptionHandler {
  private readonly logger = new Logger(SubscriptionHandler.name);

  constructor(private readonly usersService: UsersService) {}

  async handleSubscribe(ctx: BotContext) {
    const user = ctx.from;
    if (!user) return;

    const userData = await this.usersService.findByTelegramId(user.id);
    if (!userData) {
      await ctx.reply(Messages.mustStartBot);
      return;
    }
    if (!userData.virtualAccountId?.trim()) {
      await ctx.reply(Messages.mustLinkAccount);
      return;
    }

    await this.usersService.updateSubscription(user.id, true);
    await ctx.reply(Messages.subscribed);
  }

  @ValidateUser()
  async handleUnsubscribe(ctx: BotContext) {
    await this.usersService.updateSubscription(ctx.from!.id, false);
    await ctx.reply(Messages.unsubscribed);
  }

  @ValidateUser()
  async handleStatus(ctx: BotContext) {
    const userData = ctx.userData!;

    await ctx.reply(
      Messages.userStatus(
        userData.telegramId,
        userData.username,
        userData.isSubscribed,
        userData.createdAt,
      ),
      { parse_mode: 'Markdown' },
    );
  }

  @ValidateUser()
  async handleNotificationSettings(ctx: BotContext) {
    const userData = ctx.userData!;

    await ctx.reply(Messages.notificationSettings(userData.isSubscribed), {
      parse_mode: 'Markdown',
      ...Keyboards.notificationSettings(userData.isSubscribed),
    });
  }

  async handleSubscribeAction(ctx: BotContext) {
    const user = ctx.from;
    if (!user) {
      await ctx.answerCbQuery('Error: User not found');
      return;
    }

    const userData = await this.usersService.findByTelegramId(user.id);
    if (!userData) {
      await ctx.answerCbQuery('Please use /start first');
      await ctx.editMessageText(Messages.mustStartBot);
      return;
    }
    if (!userData.virtualAccountId?.trim()) {
      await ctx.answerCbQuery('Please link your virtual account first');
      await ctx.editMessageText(Messages.mustLinkAccount);
      return;
    }

    await ctx.answerCbQuery('Subscribing...');
    await this.usersService.updateSubscription(ctx.from!.id, true);
    await ctx.editMessageText(Messages.subscribeSuccess, {
      parse_mode: 'Markdown',
      ...Keyboards.backToNotifications(),
    });
  }

  @ValidateUser({ answerCallback: true })
  async handleUnsubscribeAction(ctx: BotContext) {
    await ctx.answerCbQuery('Unsubscribing...');
    await this.usersService.updateSubscription(ctx.from!.id, false);
    await ctx.editMessageText(Messages.unsubscribeSuccess, {
      parse_mode: 'Markdown',
      ...Keyboards.backToNotifications(),
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { BotService } from '../bot/bot.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly botService: BotService,
    private readonly usersService: UsersService,
  ) {}

  async sendDailyNotification() {
    this.logger.log('Starting daily notification job...');

    const subscribedUsers = await this.usersService.getSubscribedUsers();

    if (subscribedUsers.length === 0) {
      this.logger.log('No subscribed users found');
      return;
    }

    const message =
      '🌅 *Good Morning!*\n\n' +
      'This is your daily notification from the bot.\n\n' +
      `📅 Date: ${new Date().toLocaleDateString()}\n` +
      `⏰ Time: ${new Date().toLocaleTimeString()}\n\n` +
      'Have a great day! 🚀';

    const chatIds = subscribedUsers.map((user) => user.telegramId);

    await this.botService.sendMessageToMultiple(chatIds, message);

    this.logger.log(`Daily notification sent to ${chatIds.length} users`);
  }

  async sendCustomNotification(message: string) {
    this.logger.log('Sending custom notification...');

    const subscribedUsers = await this.usersService.getSubscribedUsers();
    const chatIds = subscribedUsers.map((user) => user.telegramId);

    await this.botService.sendMessageToMultiple(chatIds, message);

    this.logger.log(`Custom notification sent to ${chatIds.length} users`);
  }
}

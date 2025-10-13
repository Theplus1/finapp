import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsJob {
  private readonly logger = new Logger(NotificationsJob.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  // Daily notification at 9:00 AM
  // Can be configured via NOTIFICATION_CRON environment variable
  @Cron(process.env.NOTIFICATION_CRON || '0 9 * * *', {
    name: 'daily-notification',
    timeZone: 'Asia/Bangkok', // Change to your timezone
  })
  async handleDailyNotification() {
    this.logger.log('Executing daily notification job');
    try {
      await this.notificationsService.sendDailyNotification();
    } catch (error) {
      this.logger.error('Error in daily notification job:', error);
    }
  }

  // Example: Send a notification every hour (disabled by default)
  // Uncomment to enable
  // @Cron(CronExpression.EVERY_HOUR)
  // async handleHourlyNotification() {
  //   this.logger.log('Executing hourly notification job');
  //   await this.notificationsService.sendCustomNotification(
  //     '⏰ Hourly reminder: Stay productive!',
  //   );
  // }

  // Example: Send a notification every Monday at 10:00 AM
  // @Cron('0 10 * * 1')
  // async handleWeeklyNotification() {
  //   this.logger.log('Executing weekly notification job');
  //   await this.notificationsService.sendCustomNotification(
  //     '📅 Happy Monday! Start your week strong! 💪',
  //   );
  // }
}

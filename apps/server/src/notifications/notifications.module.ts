import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsJob } from './notifications.job';
import { BotModule } from '../bot/bot.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [BotModule, UsersModule],
  providers: [NotificationsService, NotificationsJob],
  exports: [NotificationsService],
})
export class NotificationsModule {}

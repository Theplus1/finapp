import { Module } from '@nestjs/common';
import { NotificationsHandler } from './handlers/notifications.handler';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [UsersModule],
  providers: [NotificationsHandler],
  exports: [NotificationsHandler],
})
export class NotificationsModule {}

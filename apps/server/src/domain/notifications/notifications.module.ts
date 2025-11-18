import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}

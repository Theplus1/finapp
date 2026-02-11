import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { TransactionNotificationsService } from './transaction-notifications.service';
import { TransactionNotificationsJob } from './transaction-notifications.job';
import { DatabaseModule } from 'src/database/database.module';
import { UsersModule } from 'src/users/users.module';
import { BotModule } from 'src/bot/bot.module';
import { SlashIntegrationModule } from 'src/integrations/slash/slash-integration.module';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    forwardRef(() => BotModule),
    forwardRef(() => SlashIntegrationModule),
  ],
  providers: [
    NotificationsService,
    TransactionNotificationsService,
    TransactionNotificationsJob,
  ],
  exports: [
    NotificationsService,
    TransactionNotificationsService,
  ],
})
export class NotificationsModule {}

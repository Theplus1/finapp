import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { UsersModule } from '../../users/users.module';
import { BotModule } from '../../bot/bot.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GoogleSheetsModule } from '../../integrations/google-sheets/google-sheets.module';
import { CardSpendingAlertsService } from './card-spending-alerts.service';
import { CardSpendingAlertsJob } from './card-spending-alerts.job';

@Module({
  imports: [AccountsModule, UsersModule, BotModule, NotificationsModule, GoogleSheetsModule],
  providers: [CardSpendingAlertsService, CardSpendingAlertsJob],
  exports: [CardSpendingAlertsService],
})
export class CardSpendingAlertsModule {}

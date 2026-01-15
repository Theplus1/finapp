import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { UsersModule } from '../../users/users.module';
import { BotModule } from '../../bot/bot.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GoogleSheetsModule } from '../../integrations/google-sheets/google-sheets.module';
import { BalanceAlertsService } from './balance-alerts.service';
import { BalanceAlertsJob } from './balance-alerts.job';

@Module({
  imports: [AccountsModule, UsersModule, BotModule, NotificationsModule, GoogleSheetsModule],
  providers: [BalanceAlertsService, BalanceAlertsJob],
  exports: [BalanceAlertsService],
})
export class BalanceAlertsModule {}



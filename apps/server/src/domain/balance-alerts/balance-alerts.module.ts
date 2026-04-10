import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { UsersModule } from '../../users/users.module';
import { BotModule } from '../../bot/bot.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DailyPaymentSummariesModule } from '../daily-payment-summaries/daily-payment-summaries.module';
import { DatabaseModule } from '../../database/database.module';
import { SlashIntegrationModule } from '../../integrations/slash/slash-integration.module';
import { BalanceAlertsService } from './balance-alerts.service';
import { BalanceAlertsJob } from './balance-alerts.job';
import { SlashBalanceAlertsService } from './slash-balance-alerts.service';
import { SlashBalanceAlertsJob } from './slash-balance-alerts.job';

@Module({
  imports: [
    AccountsModule,
    UsersModule,
    BotModule,
    NotificationsModule,
    DailyPaymentSummariesModule,
    DatabaseModule,
    SlashIntegrationModule,
  ],
  providers: [
    BalanceAlertsService,
    BalanceAlertsJob,
    SlashBalanceAlertsService,
    SlashBalanceAlertsJob,
  ],
  exports: [BalanceAlertsService, SlashBalanceAlertsService],
})
export class BalanceAlertsModule {}

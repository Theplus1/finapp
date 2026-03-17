import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { UsersModule } from '../../users/users.module';
import { BotModule } from '../../bot/bot.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SlashIntegrationModule } from '../../integrations/slash/slash-integration.module';
import { BalanceAlertsService } from './balance-alerts.service';
import { BalanceAlertsJob } from './balance-alerts.job';

@Module({
  imports: [
    AccountsModule,
    UsersModule,
    BotModule,
    NotificationsModule,
    SlashIntegrationModule,
  ],
  providers: [BalanceAlertsService, BalanceAlertsJob],
  exports: [BalanceAlertsService],
})
export class BalanceAlertsModule {}

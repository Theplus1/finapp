import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { BotService } from './bot.service';
import { MenuModule } from './features/menu/menu.module';
import { OnboardingModule } from './features/onboarding/onboarding.module';
import { CardsModule } from './features/cards/cards.module';
import { TransactionsModule } from './features/transactions/transactions.module';
import { NotificationsModule } from './features/notifications/notifications.module';
import { UserValidationInterceptor } from './interceptors/user-validation.interceptor';
import { AccountsModule } from '../domain/accounts/accounts.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    MenuModule,
    OnboardingModule,
    CardsModule,
    TransactionsModule,
    NotificationsModule,
    AccountsModule,
    UsersModule,
  ],
  providers: [BotUpdate, BotService, UserValidationInterceptor],
  exports: [BotService],
})
export class BotModule {}

import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { BotService } from './bot.service';
import { MenuModule } from './features/menu/menu.module';
import { SubscriptionModule } from './features/subscription/subscription.module';
import { OnboardingModule } from './features/onboarding/onboarding.module';
import { CardsModule } from './features/cards/cards.module';
import { TransactionsModule } from './features/transactions/transactions.module';
import { UserValidationInterceptor } from './interceptors/user-validation.interceptor';
import { AccountsModule } from '../domain/accounts/accounts.module';

@Module({
  imports: [
    MenuModule,
    SubscriptionModule,
    OnboardingModule,
    CardsModule,
    TransactionsModule,
    AccountsModule,
  ],
  providers: [BotUpdate, BotService, UserValidationInterceptor],
  exports: [BotService],
})
export class BotModule {}

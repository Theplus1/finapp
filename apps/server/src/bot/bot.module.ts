import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { BotService } from './bot.service';
import { MenuModule } from '../features/menu/menu.module';
import { SubscriptionModule } from '../features/subscription/subscription.module';
import { OnboardingModule } from '../features/onboarding/onboarding.module';
import { CardsModule } from 'src/features/cards/cards.module';
import { TransactionsModule } from 'src/features/transactions/transactions.module';
import { AdminModule } from 'src/features/admin/admin.module';

@Module({
  imports: [
    MenuModule,
    SubscriptionModule,
    OnboardingModule,
    CardsModule,
    TransactionsModule,
    AdminModule,
  ],
  providers: [BotUpdate, BotService],
  exports: [BotService],
})
export class BotModule {}

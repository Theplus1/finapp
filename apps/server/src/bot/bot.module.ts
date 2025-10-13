import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { BotService } from './bot.service';
import { MenuModule } from '../features/menu/menu.module';
import { SubscriptionModule } from '../features/subscription/subscription.module';
import { OnboardingModule } from '../features/onboarding/onboarding.module';
import { CardsModule } from 'src/features/cards/cards.module';
import { TransactionsModule } from 'src/features/transactions/transactions.module';

// TODO: Import future feature modules
// import { CardsModule } from '../features/cards/cards.module';
// import { OtpModule } from '../features/otp/otp.module';
// import { TransactionsModule } from '../features/transactions/transactions.module';

@Module({
  imports: [
    MenuModule,
    SubscriptionModule,
    OnboardingModule,
    CardsModule,
    TransactionsModule
  ],
  providers: [BotUpdate, BotService],
  exports: [BotService],
})
export class BotModule {}

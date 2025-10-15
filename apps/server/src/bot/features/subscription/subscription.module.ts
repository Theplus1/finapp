import { Module } from '@nestjs/common';
import { SubscriptionHandler } from './handlers/subscription.handler';
import { UsersModule } from 'src/users/users.module';
import { AccountsModule } from 'src/domain/accounts/accounts.module';
import { UserValidationGuard } from 'src/bot/guards/user-validation.guard';

@Module({
  imports: [
    UsersModule,
    AccountsModule,
  ],
  providers: [
    SubscriptionHandler,
    UserValidationGuard,
  ],
  exports: [SubscriptionHandler],
})
export class SubscriptionModule {}

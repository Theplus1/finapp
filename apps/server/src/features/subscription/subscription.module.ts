import { Module } from '@nestjs/common';
import { SubscriptionHandler } from './handlers/subscription.handler';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [SubscriptionHandler],
  exports: [SubscriptionHandler],
})
export class SubscriptionModule {}

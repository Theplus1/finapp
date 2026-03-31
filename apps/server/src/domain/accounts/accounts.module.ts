import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../../users/users.module';
import { AdminUsersModule } from '../admin-users/admin-users.module';
import { DailyPaymentSummariesModule } from '../daily-payment-summaries/daily-payment-summaries.module';
import { AccountsService } from './accounts.service';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    AdminUsersModule,
    forwardRef(() => DailyPaymentSummariesModule),
  ],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}

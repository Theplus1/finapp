import { Module } from '@nestjs/common';
import { TransactionsHandler } from './handlers/transactions.handler';
import { UsersModule } from '../../users/users.module';
import { SlashModule } from '../../slash/slash.module';

// TODO: Implement transaction feature
// - List transactions (daily/weekly/monthly)
// - Transaction detail
// - Scheduled reports
// - On-demand queries

@Module({
  imports: [UsersModule, SlashModule],
  providers: [TransactionsHandler],
  exports: [TransactionsHandler],
})
export class TransactionsModule {}

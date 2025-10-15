import { Module } from '@nestjs/common';
import { TransactionsHandler } from './handlers/transactions.handler';
import { UsersModule } from '../../../users/users.module';
import { SlashIntegrationModule } from '../../../integrations/slash/slash-integration.module';
import { TransactionsModule as DomainTransactionsModule } from '../../../domain/transactions/transactions.module';
import { AccountsModule } from '../../../domain/accounts/accounts.module';
import { UserValidationGuard } from '../../guards/user-validation.guard';

// TODO: Implement transaction feature
// - List transactions (daily/weekly/monthly)
// - Transaction detail
// - Scheduled reports
// - On-demand queries

@Module({
  imports: [
    UsersModule,
    SlashIntegrationModule,
    DomainTransactionsModule,
    AccountsModule,
  ],
  providers: [
    TransactionsHandler,
    UserValidationGuard,
  ],
  exports: [TransactionsHandler],
})
export class TransactionsModule {}

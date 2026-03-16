import { Module } from '@nestjs/common';
import { AdminApiModule } from '../admin-api/admin-api.module';
import { AdminUsersModule } from '../domain/admin-users/admin-users.module';
import { CardsModule } from '../domain/cards/cards.module';
import { TransactionsModule } from '../domain/transactions/transactions.module';
import { SlashIntegrationModule } from '../integrations/slash/slash-integration.module';
import { DatabaseModule } from '../database/database.module';
import { EmployeesController } from './controllers/employees.controller';
import { CustomerCardsController } from './controllers/cards.controller';
import { CustomerTransactionsController } from './controllers/transactions.controller';
import { CustomerAuthController } from './controllers/auth.controller';
import { DailyPaymentSummariesModule } from '../domain/daily-payment-summaries/daily-payment-summaries.module';
import { PaymentSummaryModule } from '../domain/payment-summary/payment-summary.module';
import { CustomerPaymentsController } from './controllers/payments.controller';
import { CustomerCardSpendController } from './controllers/card-spend.controller';

@Module({
  imports: [
    AdminApiModule,
    AdminUsersModule,
    CardsModule,
    TransactionsModule,
    SlashIntegrationModule,
    DatabaseModule,
    DailyPaymentSummariesModule,
    PaymentSummaryModule,
  ],
  controllers: [
    CustomerAuthController,
    EmployeesController,
    CustomerCardsController,
    CustomerTransactionsController,
    CustomerPaymentsController,
    CustomerCardSpendController,
  ],
})
export class CustomerApiModule {}

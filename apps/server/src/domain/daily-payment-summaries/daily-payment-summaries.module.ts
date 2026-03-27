import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyPaymentSummariesService } from './daily-payment-summaries.service';
import {
  DailyPaymentSummary,
  DailyPaymentSummarySchema,
} from 'src/database/schemas/daily-payment-summary.schema';
import { TransactionsModule } from '../transactions/transactions.module';
import { DailyPaymentSummariesJob } from './daily-payment-summaries.job';
import { AccountsModule } from '../accounts/accounts.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyPaymentSummary.name, schema: DailyPaymentSummarySchema },
    ]),
    TransactionsModule,
    forwardRef(() => AccountsModule),
    DatabaseModule,
  ],
  providers: [DailyPaymentSummariesService, DailyPaymentSummariesJob],
  exports: [DailyPaymentSummariesService],
})
export class DailyPaymentSummariesModule {}

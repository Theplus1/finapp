import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyPaymentSummariesService } from './daily-payment-summaries.service';
import { DailyPaymentSummary, DailyPaymentSummarySchema } from 'src/database/schemas/daily-payment-summary.schema';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyPaymentSummary.name, schema: DailyPaymentSummarySchema },
    ]),
    TransactionsModule,
  ],
  providers: [DailyPaymentSummariesService],
  exports: [DailyPaymentSummariesService],
})
export class DailyPaymentSummariesModule {}

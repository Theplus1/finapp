import { Module } from '@nestjs/common';
import { DailyPaymentSummariesModule } from '../daily-payment-summaries/daily-payment-summaries.module';
import { PaymentSummaryService } from './payment-summary.service';

@Module({
  imports: [DailyPaymentSummariesModule],
  providers: [PaymentSummaryService],
  exports: [PaymentSummaryService],
})
export class PaymentSummaryModule {}


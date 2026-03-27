import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DailyPaymentSummaryDocument = DailyPaymentSummary & Document;

@Schema({ timestamps: true, collection: 'daily_payment_summaries' })
export class DailyPaymentSummary {
  @Prop({ required: true, index: true })
  virtualAccountId: string;

  @Prop({ required: true, index: true })
  date: Date; // Date at start of day (00:00:00)

  @Prop({ default: 0 })
  totalDepositCents: number;

  @Prop({ default: 0 })
  totalSpendNonUSCents: number;

  @Prop({ default: 0 })
  totalSpendUSCents: number;

  // Admin-specific totals (settled spend only)
  @Prop({ default: 0 })
  totalSpendNonUSCentsForAdmin: number;

  @Prop({ default: 0 })
  totalSpendUSCentsForAdmin: number;

  @Prop({ default: 0 })
  totalRefundCents: number;

  @Prop({ default: 0 })
  accountBalanceCents: number;

  @Prop({ required: true })
  currency: string;

  @Prop()
  calculatedAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const DailyPaymentSummarySchema = SchemaFactory.createForClass(DailyPaymentSummary);

// Compound index for efficient querying
DailyPaymentSummarySchema.index({ virtualAccountId: 1, date: 1 }, { unique: true });
DailyPaymentSummarySchema.index({ virtualAccountId: 1, date: -1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DepositHistoryDocument = DepositHistory & Document;

@Schema({ timestamps: true, collection: 'deposit_history' })
export class DepositHistory {
  @Prop({ required: true, index: true })
  virtualAccountId: string;

  @Prop({ required: true, index: true })
  date: Date; // Normalized date at start of day

  @Prop({ required: true })
  amountCents: number;

  @Prop({ required: true })
  currency: string;

  @Prop()
  note?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const DepositHistorySchema =
  SchemaFactory.createForClass(DepositHistory);

DepositHistorySchema.index(
  { virtualAccountId: 1, date: 1, createdAt: 1 },
  { name: 'va_date_created_idx' },
);


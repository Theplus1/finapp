import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MerchantDTO } from 'src/integrations/slash/dto/merchant.dto';
import { TransactionDetailedStatus, TransactionStatus } from 'src/integrations/slash/types';
import { FeeInfoDto } from 'src/integrations/slash/dto/fee-info.dto';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true, collection: 'slash_transactions' })
export class Transaction {
  @Prop({ required: true, unique: true, index: true })
  slashId: string; // Original ID from Slash API

  @Prop({ required: true, index: true })
  virtualAccountId: string;

  @Prop({ index: true })
  accountId?: string;

  @Prop({ index: true })
  cardId?: string;

  @Prop({ required: true })
  amountCents: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ type: Object })
  originalCurrency?: {
    code: string;
    amountCents: number;
  };

  @Prop()
  description?: string;

  @Prop()
  note?: string;

  @Prop({ required: true })
  status: TransactionStatus;

  @Prop({ required: true })
  detailedStatus: TransactionDetailedStatus;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: Object })
  merchantData?: MerchantDTO;

  @Prop({ type: Object })
  metadata?: any;

  @Prop()
  authorizedAt?: Date;

  @Prop({ type: Object })
  feeInfo?: FeeInfoDto;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  // Sync metadata
  @Prop({ default: Date.now })
  lastSyncedAt: Date;

  @Prop({ default: 'webhook' })
  syncSource: 'webhook' | 'scheduled' | 'manual';

  @Prop({ default: false })
  isDeleted: boolean;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Indexes for efficient querying
TransactionSchema.index({ virtualAccountId: 1, date: -1 });
TransactionSchema.index({ virtualAccountId: 1, status: 1 });
TransactionSchema.index({ virtualAccountId: 1, type: 1 });
TransactionSchema.index({ cardId: 1, date: -1 });
TransactionSchema.index({ date: -1 });
TransactionSchema.index({ lastSyncedAt: 1 });
TransactionSchema.index({ 'merchantData.category': 1 });

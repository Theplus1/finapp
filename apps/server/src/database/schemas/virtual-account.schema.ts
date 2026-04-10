import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CommissionRuleDto, VirtualAccountBalanceDto, VirtualAccountSpendDto } from 'src/integrations/slash/dto/account.dto';

export type VirtualAccountDocument = VirtualAccount & Document;

@Schema({ timestamps: true, collection: 'slash_virtual_accounts' })
export class VirtualAccount {
  @Prop({ required: true, unique: true, index: true })
  slashId: string; // Original ID from Slash API

  @Prop({ required: true, index: true })
  accountId: string;

  @Prop()
  legalEntityId?: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  currency: string;

  @Prop({ default: 0 })
  balanceCents: number;

  @Prop({ default: 0 })
  availableBalanceCents: number;

  @Prop({ default: 0 })
  pendingBalanceCents: number;

  @Prop({ default: 0 })
  transferNetChange: number;

  @Prop({ required: true, index: true })
  status: string;

  @Prop({ type: Object })
  metadata?: any;

  @Prop()
  accountNumber?: string;

  @Prop()
  routingNumber?: string;

  @Prop({ type: Object })
  commissionRule: CommissionRuleDto;

  @Prop({ type: Object })
  spend: VirtualAccountSpendDto;

  @Prop({ type: Object })
  balance: VirtualAccountBalanceDto;

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

  @Prop({ default: false, index: true })
  isHidden: boolean;

  @Prop({ default: false, index: true })
  balanceAlertEnabled: boolean;

  @Prop({ default: 10000 })
  balanceAlertThresholdUsd: number;

  @Prop()
  lastBalanceAlertAt?: Date;
}

export const VirtualAccountSchema = SchemaFactory.createForClass(VirtualAccount);

// Indexes for efficient querying
VirtualAccountSchema.index({ accountId: 1, status: 1 });
VirtualAccountSchema.index({ lastSyncedAt: 1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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

  @Prop({ required: true, index: true })
  status: string;

  @Prop({ type: Object })
  metadata?: any;

  // User Linking (Simple approach)
  @Prop({ index: true })
  linkedTelegramId?: number; // Telegram ID of linked user

  @Prop()
  linkedUserId?: string; // MongoDB User._id (optional reference)

  @Prop()
  linkedAt?: Date; // When the link was created

  @Prop()
  linkedBy?: string; // Admin who created the link

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  // Sync metadata
  @Prop({ default: Date.now, index: true })
  lastSyncedAt: Date;

  @Prop({ default: 'webhook' })
  syncSource: 'webhook' | 'scheduled' | 'manual';

  @Prop({ default: false })
  isDeleted: boolean;
}

export const VirtualAccountSchema = SchemaFactory.createForClass(VirtualAccount);

// Indexes for efficient querying
VirtualAccountSchema.index({ accountId: 1, status: 1 });
VirtualAccountSchema.index({ lastSyncedAt: 1 });
VirtualAccountSchema.index({ linkedTelegramId: 1 }); // For finding user's account
VirtualAccountSchema.index({ linkedTelegramId: 1, status: 1 }); // For active user accounts

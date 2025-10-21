import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CardStatus } from 'src/integrations/slash/types';

export type CardDocument = Card & Document;

@Schema({ timestamps: true, collection: 'slash_cards' })
export class Card {
  @Prop({ required: true, unique: true, index: true })
  slashId: string; // Original ID from Slash API

  @Prop({ required: true, index: true })
  virtualAccountId: string;

  @Prop({ required: true, index: true })
  cardGroupId?: string;

  @Prop({ index: true })
  accountId?: string;

  @Prop({ index: true })
  legalEntityId?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  last4: string;

  @Prop()
  expiryMonth?: string;

  @Prop()
  expiryYear?: string;

  @Prop({ required: true, index: true })
  status: CardStatus; // ACTIVE, PAUSED, INACTIVE, CLOSED

  @Prop({ default: false })
  isPhysical: boolean;

  @Prop({ default: false })
  isSingleUse: boolean;

  @Prop()
  cardGroupName?: string;

  @Prop({ type: Object })
  spendingConstraint?: any;

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

export const CardSchema = SchemaFactory.createForClass(Card);

// Indexes for efficient querying
CardSchema.index({ virtualAccountId: 1, status: 1 });
CardSchema.index({ virtualAccountId: 1, isDeleted: 1 });
CardSchema.index({ lastSyncedAt: 1 });

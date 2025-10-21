import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CardGroupDocument = CardGroup & Document;

@Schema({ timestamps: true, collection: 'slash_card_groups' })
export class CardGroup {
  @Prop({ required: true, unique: true, index: true })
  slashId: string; // Original ID from Slash API

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, index: true })
  virtualAccountId: string;

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

export const CardGroupSchema = SchemaFactory.createForClass(CardGroup);

// Indexes for efficient querying
CardGroupSchema.index({ virtualAccountId: 1, isDeleted: 1 });
CardGroupSchema.index({ lastSyncedAt: 1 });
CardGroupSchema.index({ name: 1 });

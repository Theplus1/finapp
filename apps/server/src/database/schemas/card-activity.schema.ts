import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CardActivityDocument = CardActivity & Document;

export const CARD_ACTIVITY_ACTIONS = [
  'get_cvv',
  'get_confirm_code',
  'lock_card',
  'unlock_card',
  'set_spending_limit',
  'unset_spending_limit',
  'set_recurring_only',
  'unset_recurring_only',
] as const;

export type CardActivityAction = (typeof CARD_ACTIVITY_ACTIONS)[number];

@Schema({ timestamps: true, collection: 'card_activities' })
export class CardActivity {
  @Prop({ required: true, index: true })
  cardSlashId: string;

  @Prop({ required: true, index: true })
  virtualAccountId: string;

  @Prop({ required: true, enum: CARD_ACTIVITY_ACTIONS })
  action: CardActivityAction;

  @Prop({ required: true })
  performedByUserId: string;

  @Prop({ required: true })
  performedByUsername: string;

  @Prop({ type: Object })
  details?: Record<string, any>;

  @Prop({ default: () => new Date() })
  performedAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CardActivitySchema = SchemaFactory.createForClass(CardActivity);

CardActivitySchema.index({ cardSlashId: 1, performedAt: -1 });
CardActivitySchema.index({ virtualAccountId: 1, performedAt: -1 });

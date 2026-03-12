import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConfirmCodeRevealDocument = ConfirmCodeReveal & Document;

/**
 * Records who revealed the Facebook verify confirm code first (first-click-wins).
 * Only for transactions with amountCents === -100.
 */
@Schema({ timestamps: true, collection: 'confirm_code_reveals' })
export class ConfirmCodeReveal {
  @Prop({ required: true, unique: true, index: true })
  transactionSlashId: string;

  @Prop({ required: true, index: true })
  revealedByUserId: string;

  @Prop({ required: true })
  revealedByUsername: string;

  @Prop({ default: () => new Date() })
  revealedAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ConfirmCodeRevealSchema = SchemaFactory.createForClass(ConfirmCodeReveal);

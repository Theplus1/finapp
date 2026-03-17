import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CvvRevealDocument = CvvReveal & Document;

@Schema({ timestamps: true, collection: 'cvv_reveals' })
export class CvvReveal {
  @Prop({ required: true, index: true })
  cardSlashId: string;

  @Prop({ required: true, index: true })
  virtualAccountId: string;

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

export const CvvRevealSchema = SchemaFactory.createForClass(CvvReveal);

// Index to query history per card ordered by time
CvvRevealSchema.index(
  { cardSlashId: 1, revealedAt: -1 },
  { name: 'card_revealedAt_desc_idx' },
);


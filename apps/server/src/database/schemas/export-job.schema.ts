import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ExportType {
  TRANSACTIONS = 'transactions',
  CARDS = 'cards',
}

export interface ExportJobDocument extends Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

@Schema({ timestamps: true })
export class ExportJob {
  @Prop({ required: true })
  userId: number;

  @Prop({ required: true })
  chatId: number;

  @Prop({ required: true, enum: ExportType })
  type: ExportType;

  @Prop({ required: true, enum: ExportStatus, default: ExportStatus.PENDING })
  status: ExportStatus;

  @Prop({ type: Object })
  filters: Record<string, any>;

  @Prop()
  fileName?: string;

  @Prop()
  filePath?: string;

  @Prop()
  fileSize?: number;

  @Prop()
  recordCount?: number;

  @Prop()
  errorMessage?: string;

  @Prop()
  expiresAt?: Date;

  @Prop()
  downloadedAt?: Date;

  @Prop({ default: 0 })
  downloadCount: number;
}

export const ExportJobSchema = SchemaFactory.createForClass(ExportJob);

export type ExportJobDoc = ExportJob & ExportJobDocument;

// Index for cleanup queries
ExportJobSchema.index({ expiresAt: 1 });
ExportJobSchema.index({ userId: 1, createdAt: -1 });

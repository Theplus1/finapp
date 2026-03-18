import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SyncCheckpointDocument = SyncCheckpoint & Document;

@Schema({ timestamps: true })
export class SyncCheckpoint {
  @Prop({ required: true, index: true })
  syncId: string;

  @Prop({ required: true })
  entityType: string;

  @Prop({ required: true })
  status: 'running' | 'completed' | 'failed' | 'paused';

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop()
  lastProcessedCursor?: string;

  @Prop({ type: Date })
  lastProcessedDate?: Date;

  @Prop({ default: 0 })
  totalProcessed: number;

  @Prop({ default: 0 })
  totalCreated: number;

  @Prop({ default: 0 })
  totalUpdated: number;

  @Prop({ default: 0 })
  totalFailed: number;

  @Prop({ type: Date })
  lastHeartbeat: Date;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const SyncCheckpointSchema = SchemaFactory.createForClass(SyncCheckpoint);

SyncCheckpointSchema.index({ syncId: 1 }, { unique: true });
SyncCheckpointSchema.index({ status: 1, lastHeartbeat: 1 });

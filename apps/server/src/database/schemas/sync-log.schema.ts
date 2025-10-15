import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SyncLogDocument = SyncLog & Document;

@Schema({ timestamps: true, collection: 'slash_sync_logs' })
export class SyncLog {
  @Prop({ required: true, index: true })
  entityType: 'card' | 'transaction' | 'virtual_account' | 'account';

  @Prop({ required: true, index: true })
  syncType: 'webhook' | 'scheduled_full' | 'scheduled_incremental' | 'manual';

  @Prop({ required: true, index: true })
  status: 'started' | 'completed' | 'failed' | 'partial';

  @Prop({ required: true })
  startedAt: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ default: 0 })
  recordsProcessed: number;

  @Prop({ default: 0 })
  recordsCreated: number;

  @Prop({ default: 0 })
  recordsUpdated: number;

  @Prop({ default: 0 })
  recordsFailed: number;

  @Prop()
  error?: string;

  @Prop({ type: Object })
  metadata?: {
    cursor?: string;
    lastSyncedId?: string;
    filters?: any;
  };
}

export const SyncLogSchema = SchemaFactory.createForClass(SyncLog);

// Indexes
SyncLogSchema.index({ entityType: 1, syncType: 1, startedAt: -1 });
SyncLogSchema.index({ status: 1, startedAt: -1 });

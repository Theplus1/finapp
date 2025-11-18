import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  READ = 'read',
  FAILED = 'failed',
}

export enum NotificationType {
  TRANSACTION = 'transaction',
  PAYMENT = 'payment',
  ALERT = 'alert',
  SYSTEM = 'system',
}

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  status: NotificationStatus;

  @Prop({ required: true, index: true })
  type: NotificationType;

  @Prop({ type: Object })
  data: any;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);


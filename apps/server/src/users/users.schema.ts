import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum AccessStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  REVOKED = 'revoked',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  telegramId: number;

  @Prop()
  username?: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  // Slash Virtual Account Linking
  @Prop({ index: true })
  virtualAccountId?: string; // Slash virtual account ID

  @Prop()
  virtualAccountLinkedAt?: Date; // When the account was linked

  @Prop()
  virtualAccountStatus?: 'active' | 'inactive' | 'suspended'; // Account status

  @Prop({ default: false })
  isSubscribed: boolean;

  // Notification Destinations
  @Prop({ type: [Number], default: [] })
  notificationChatIds: number[];

  // Access Control Fields
  @Prop({ 
    type: String, 
    enum: Object.values(AccessStatus), 
    default: AccessStatus.PENDING 
  })
  accessStatus: AccessStatus;

  @Prop()
  accessRequestedAt?: Date;

  @Prop()
  accessApprovedAt?: Date;

  @Prop()
  accessApprovedBy?: number; // Admin Telegram ID

  @Prop()
  accessDeniedReason?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

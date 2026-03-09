import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

/** Một destination nhận thông báo: chatId + optional thread cho warning (balance/card alert). */
export interface NotificationDestination {
  chatId: number;
  /** Thread id trong group (forum); nếu có thì balance/card alert gửi vào topic này. */
  warningThreadId?: number;
}

export enum AccessStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  REVOKED = 'revoked',
}

@Schema({ timestamps: true })
export class User {
  @Prop()
  telegramId?: number;

  @Prop({ index: true, type: [Number], default: [] })
  telegramIds?: number[];

  @Prop({ type: [Number], default: [] })
  telegramIds?: number[];

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

  /** Chat + thread cho warning; ưu tiên đọc. Nếu rỗng thì fallback notificationChatIds. */
  @Prop({
    type: [{ chatId: Number, warningThreadId: Number }],
    default: [],
    _id: false,
  })
  notificationDestinations?: NotificationDestination[];

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

UserSchema.index(
  { telegramId: 1 },
  {
    unique: true,
    partialFilterExpression: { telegramId: { $exists: true, $ne: null } },
  },
);
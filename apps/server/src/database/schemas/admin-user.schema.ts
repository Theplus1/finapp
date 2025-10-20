import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminUserDocument = AdminUser & Document;

@Schema({ timestamps: true, collection: 'admin_users' })
export class AdminUser {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, enum: ['super-admin', 'admin'], default: 'admin' })
  role: 'super-admin' | 'admin';

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  email?: string;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const AdminUserSchema = SchemaFactory.createForClass(AdminUser);

// Add indexes
AdminUserSchema.index({ username: 1 }, { unique: true });
AdminUserSchema.index({ isActive: 1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminUserDocument = AdminUser & Document;

export const ADMIN_USER_ROLES = [
  'super-admin',
  'admin',
  'boss',
  'ads',
  'accountant',
  'employee',
] as const;

export const EMPLOYEE_PERMISSIONS = [
  'transactions',
  'transactions_full',
  'card_list_own',
  'card_list_all',
  'payments',
  'card_spend',
] as const;

export type EmployeePermission = (typeof EMPLOYEE_PERMISSIONS)[number];

export type AdminUserRole = (typeof ADMIN_USER_ROLES)[number];

@Schema({ timestamps: true, collection: 'admin_users' })
export class AdminUser {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, enum: ADMIN_USER_ROLES, default: 'admin' })
  role: AdminUserRole;

  /**
   * Slash Virtual Account ID.
   * - Boss: required (1 VA ↔ 1 Boss)
   * - Ads/Accountant: inherited from Boss (optional on record if bossId present)
   */
  @Prop({ index: true })
  virtualAccountId?: string;

  /**
   * Boss linkage for employee accounts (ads/accountant).
   * Store the boss AdminUser _id as string for simpler queries.
   */
  @Prop({ index: true })
  bossId?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  email?: string;

  @Prop({ type: [String], default: [] })
  permissions: EmployeePermission[];

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
AdminUserSchema.index(
  { email: 1 },
  {
    unique: true,
    sparse: true,
  },
);
AdminUserSchema.index({ isActive: 1 });

// Enforce 1 VA ↔ 1 Boss (only for boss accounts with virtualAccountId set)
AdminUserSchema.index(
  { virtualAccountId: 1 },
  {
    unique: true,
    partialFilterExpression: { role: 'boss', virtualAccountId: { $exists: true, $ne: null } },
  },
);

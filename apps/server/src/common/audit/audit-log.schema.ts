import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

/**
 * Security audit trail for sensitive admin/boss actions.
 * Write-only from the application's perspective — there is no API endpoint
 * that mutates or deletes audit log entries. Entries are meant to survive the
 * actions they describe so operators can reconstruct who did what after the
 * fact (e.g. after a compromise or a dispute).
 */
@Schema({
  collection: 'audit_logs',
  timestamps: { createdAt: true, updatedAt: false },
  // Never return passwordHash-like fields if the doc is ever serialized.
  toJSON: { virtuals: false },
})
export class AuditLog {
  /**
   * Stable identifier for the kind of action that happened. Enum-ish string
   * (kept free-form so we can add new actions without a migration).
   *
   * Examples:
   *   admin.boss.delete
   *   admin.boss.update
   *   admin.boss.password_reset
   *   admin.card.lock
   *   admin.card.unlock
   *   admin.card.set_limit
   *   customer.card.reveal_cvv
   *   customer.card.lock
   *   customer.card.unlock
   *   customer.card.set_limit
   *   customer.password.change
   */
  @Prop({ required: true, index: true })
  action: string;

  /** User identifier performing the action (admin_users._id as string). */
  @Prop({ index: true })
  actorId?: string;

  /** Human-readable username of the actor at the time of the action. */
  @Prop({ index: true })
  actorUsername?: string;

  /** Role of the actor at the time of the action (snapshot). */
  @Prop()
  actorRole?: string;

  /**
   * ID of the entity affected (boss._id, card.slashId, va.slashId, etc).
   * Kept as a string so we can store any identifier shape.
   */
  @Prop({ index: true })
  targetId?: string;

  /** Entity type for the target (for easier filtering). */
  @Prop()
  targetType?: string;

  /**
   * Optional structured payload describing the change. Do NOT put PAN/CVV or
   * passwords here — the write code is responsible for redacting.
   */
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  /** Client IP if the action came in over HTTP. */
  @Prop()
  ip?: string;

  /** User agent string if the action came in over HTTP. */
  @Prop()
  userAgent?: string;

  /** HTTP method + path for easier debugging. */
  @Prop()
  requestPath?: string;

  /** 'success' or 'failed' — write even failed attempts so we can detect probing. */
  @Prop({ default: 'success', index: true })
  status: 'success' | 'failed';

  /** Error message if status === 'failed'. */
  @Prop()
  errorMessage?: string;

  @Prop({ index: true })
  createdAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Compound indexes commonly used by forensic queries
AuditLogSchema.index({ actorUsername: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ targetId: 1, createdAt: -1 });

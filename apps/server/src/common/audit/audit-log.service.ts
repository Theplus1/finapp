import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit-log.schema';

export interface AuditLogInput {
  action: string;
  actorId?: string;
  actorUsername?: string;
  actorRole?: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  requestPath?: string;
  status?: 'success' | 'failed';
  errorMessage?: string;
}

/**
 * Write-only audit trail service. All methods swallow their own errors and
 * log a warning — the audit log must never block a real action from
 * completing, even if Mongo is momentarily unavailable.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Extract IP / user agent / path from an Express-style request object.
   * Safe to call with `undefined` — fields simply remain unset.
   */
  static requestContext(req?: any): Pick<AuditLogInput, 'ip' | 'userAgent' | 'requestPath'> {
    if (!req) return {};
    const fwd = (req.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    const ip = fwd || (req.headers?.['x-real-ip'] as string | undefined) || req.ip || req.connection?.remoteAddress;
    return {
      ip: ip || undefined,
      userAgent: (req.headers?.['user-agent'] as string | undefined) || undefined,
      requestPath: req.method && req.url ? `${req.method} ${req.url}` : undefined,
    };
  }

  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.auditLogModel.create({
        ...input,
        status: input.status ?? 'success',
      });
    } catch (error) {
      // Never bubble up — audit failure must not fail the real action.
      this.logger.warn(
        `Failed to write audit log for action=${input.action}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

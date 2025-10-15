/**
 * Interfaces for sync operations
 */

import { Types } from 'mongoose';
import { EntityType, SyncType, SyncStatus } from '../constants/sync.constants';

/**
 * Sync statistics for tracking sync operations
 */
export interface SyncStats {
  recordsProcessed?: number;
  recordsCreated?: number;
  recordsUpdated?: number;
  recordsFailed?: number;
}

/**
 * Sync log creation parameters
 */
export interface CreateSyncLogParams {
  entityType: EntityType;
  syncType: SyncType;
}

/**
 * Sync log completion parameters
 */
export interface CompleteSyncLogParams {
  syncLogId: Types.ObjectId;
  status: Extract<SyncStatus, 'completed' | 'partial'>;
  stats: SyncStats;
}

/**
 * Sync log failure parameters
 */
export interface FailSyncLogParams {
  syncLogId: Types.ObjectId;
  error: string;
}

/**
 * Pagination options for sync operations
 */
export interface PaginationOptions {
  cursor?: string;
  limit?: number;
  page?: number;
}

/**
 * Date range filter for sync operations
 */
export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  totalProcessed: number;
  totalCreated: number;
  totalUpdated: number;
  totalFailed: number;
}

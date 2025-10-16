/**
 * Constants for Slash sync operations
 */

export const SYNC_CONSTANTS = {
  // Default values for missing fields
  DEFAULT_CURRENCY: 'USD',
  DEFAULT_LEGAL_ENTITY_ID: '',
  DEFAULT_CARD_GROUP_NAME: '',
  DEFAULT_DESCRIPTION: '',
  DEFAULT_NOTE: '',
  DEFAULT_STATUS: 'active' as const,

  // Pagination
  DEFAULT_PAGE_SIZE: 100,
  DEFAULT_HOURS_BACK: 24,
  DEFAULT_DAYS_BACK: 90,

  // Sync types
  SYNC_SOURCE: {
    WEBHOOK: 'webhook' as const,
    SCHEDULED: 'scheduled' as const,
    MANUAL: 'manual' as const,
  },

  // Entity types
  ENTITY_TYPE: {
    CARD: 'card' as const,
    CARD_GROUP: 'card_group' as const,
    TRANSACTION: 'transaction' as const,
    VIRTUAL_ACCOUNT: 'virtual_account' as const,
    ACCOUNT: 'account' as const,
  },

  // Sync types
  SYNC_TYPE: {
    WEBHOOK: 'webhook' as const,
    SCHEDULED_FULL: 'scheduled_full' as const,
    SCHEDULED_INCREMENTAL: 'scheduled_incremental' as const,
    MANUAL: 'manual' as const,
  },

  // Sync status
  SYNC_STATUS: {
    STARTED: 'started' as const,
    COMPLETED: 'completed' as const,
    PARTIAL: 'partial' as const,
    FAILED: 'failed' as const,
  },
} as const;

export type SyncSource = typeof SYNC_CONSTANTS.SYNC_SOURCE[keyof typeof SYNC_CONSTANTS.SYNC_SOURCE];
export type EntityType = typeof SYNC_CONSTANTS.ENTITY_TYPE[keyof typeof SYNC_CONSTANTS.ENTITY_TYPE];
export type SyncType = typeof SYNC_CONSTANTS.SYNC_TYPE[keyof typeof SYNC_CONSTANTS.SYNC_TYPE];
export type SyncStatus = typeof SYNC_CONSTANTS.SYNC_STATUS[keyof typeof SYNC_CONSTANTS.SYNC_STATUS];

import { VirtualAccount } from '../../../database/schemas/virtual-account.schema';

/**
 * Minimal user info for account response
 */
export interface UserInfo {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Virtual account with populated user relation
 */
export interface VirtualAccountDetail extends Omit<VirtualAccount, 'toObject'> {
  linkedTelegramId?: number;
}

/**
 * Account statistics
 */
export interface AccountStats {
  total: number;
  byStatus: Record<string, number>;
  totalBalance: number;
  totalAvailableBalance: number;
}

/**
 * Account filters for querying
 */
export interface AccountFilters {
  accountId?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

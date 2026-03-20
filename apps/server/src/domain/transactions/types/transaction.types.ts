import { Transaction } from '../../../database/schemas/transaction.schema';

/**
 * Minimal card info for transaction response
 */
export interface CardInfo {
  slashId: string;
  name: string;
  last4: string;
}

/**
 * Minimal virtual account info for transaction response
 */
export interface VirtualAccountInfo {
  slashId: string;
  name: string;
}

export interface TransactionConfirmCodeTakenItem {
  name: string;
  gettedAt: string;
}

/**
 * Transaction with populated relations (card and virtual account)
 */
export interface TransactionWithRelations extends Omit<Transaction, 'toObject'> {
  card?: CardInfo | null;
  virtualAccount?: VirtualAccountInfo | null;
  confirmCodeTaken: TransactionConfirmCodeTakenItem[];
}

/**
 * Transaction statistics
 */
export interface TransactionStats {
  total: number;
  totalAmount: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

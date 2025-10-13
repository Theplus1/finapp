export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DECLINED = 'declined',
}

export enum TransactionType {
  CARD_AUTHORIZATION = 'card_authorization',
  CARD_SETTLEMENT = 'card_settlement',
  TRANSFER = 'transfer',
  REFUND = 'refund',
}

export interface TransactionDto {
  id: string;
  accountId: string;
  cardId?: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  type: TransactionType;
  description?: string;
  merchantName?: string;
  merchantCategory?: string;
  createdAt: string;
  settledAt?: string;
  metadata?: Record<string, any>;
}

export interface ListTransactionsQuery {
  accountId?: string;
  cardId?: string;
  status?: TransactionStatus;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
}

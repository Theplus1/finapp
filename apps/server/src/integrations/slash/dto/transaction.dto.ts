import type { MerchantDTO } from './merchant.dto';
import { OriginalCurrencyDto } from './original-currency.dto';

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DECLINED = 'declined',
  POSTED = 'posted',
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
  virtualAccountId?: string;
  amountCents: number;
  originalCurrency: OriginalCurrencyDto;
  date: string;
  accountSubtype: string;
  merchantDescription: string;
  merchantData: MerchantDTO;
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
  cursor?: string;
  'filter:legalEntityId'?: string;
  'filter:accountId'?: string;
  'filter:virtualAccountId'?: string;
  'filter:from_date'?: number; // Unix timestamp in milliseconds
  'filter:to_date'?: number; // Unix timestamp in milliseconds
  'filter:from_authorized_at'?: number; // Unix timestamp in milliseconds
  'filter:to_authorized_at'?: number; // Unix timestamp in milliseconds
  'filter:status'?: TransactionStatus;
  'filter:detailedStatus'?: TransactionDetailedStatus;
  'filter:cardId'?: string;
  'filter:providerAuthorizationId'?: string;
}

export enum TransactionDetailedStatus {
  PENDING = 'pending',
  PENDING_APPROVAL = 'pending_approval',
  CANCELED = 'canceled',
  FAILED = 'failed',
  SETTLED = 'settled',
  DECLINED = 'declined',
  REFUND = 'refund',
  REVERSED = 'reversed',
  RETURNED = 'returned',
  DISPUTE = 'dispute',
}

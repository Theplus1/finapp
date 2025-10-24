import type { MerchantDTO } from "./merchant.dto";

export enum WebhookEventType {
  CARD_CREATED = 'card_creation.event',
  CARD_UPDATED = 'card.update',
  CARD_CLOSED = 'card.delete',
  TRANSACTION_CREATED = 'aggregated_transaction.create',
  TRANSACTION_UPDATED = 'aggregated_transaction.update',
}

export interface WebhookDto {
  id: string;
  legalEntityId: string;
  url: string;
  name: string;
  events: WebhookEventType[];
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface CreateWebhookDto {
  legalEntityId: string;
  url: string;
  name: string;
  events?: WebhookEventType[];
}

export interface WebhookEventDto {
  event: WebhookEventType;
  entityId: string;
  eventId: string;
}

export interface TransactionDataDTO {
  id: string;
  date: string;
  amountCents?: number;
  status?: string;
  detailedStatus?: string;
  merchantData: MerchantDTO;
  description?: string;
  merchantDescription?: string;
  accountId?: string;
  cardId?: string;
  originalCurrency?: {
    code?: string;
    amountCents?: number;
    conversionRate?: number;
  };
  referenceNumber?: string;
  authorizedAt?: string;
  virtualAccountId?: string;
  declineReason?: string;
}

export interface AuthorizationWebhookPayload {
  id: string;
  cardId: string;
  amount: number;
  currency: string;
  merchantName: string;
  merchantCategory?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AuthorizationWebhookResponse {
  approved: boolean;
  reason?: string;
}

import type { MerchantDTO } from "./merchant.dto";

export enum WebhookEventType {
  CARD_CREATED = 'card.created',
  CARD_UPDATED = 'card.updated',
  CARD_CLOSED = 'card.closed',
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_UPDATED = 'transaction.updated',
  AUTHORIZATION_REQUEST = 'authorization.request',
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
  id: string;
  type: WebhookEventType;
  entityId: string;
  entityType: string;
  createdAt: string;
  data: Record<string, any>;
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
  originalCurrency?: {
    code?: string;
    amountCents?: number;
    conversionRate?: number;
  };
  referenceNumber?: string;
  authorizedAt?: string;
  virtualAccountId?: string;
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

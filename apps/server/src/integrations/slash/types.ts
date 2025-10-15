/**
 * Centralized type definitions for Slash API integration
 * Import from this file for better type safety
 */

export {
  CardDto,
  CreateCardDto,
  UpdateCardDto,
  CardStatus,
  SpendingConstraintDto,
} from './dto/card.dto';

export {
  TransactionDto,
  ListTransactionsQuery,
  TransactionStatus,
  TransactionType,
  TransactionDetailedStatus,
  OriginalCurrency,
} from './dto/transaction.dto';

export {
  AccountDto,
  BalanceDto,
  VirtualAccountDto,
  VirtualAccountType,
  VirtualAccountBalanceDto,
  VirtualAccountSpendDto,
  CommissionDetailsDto,
  CommissionRuleDto,
  VirtualAccountWithDetailsDto,
  ListVirtualAccountsResponse,
  ListVirtualAccountsQuery,
  CreateVirtualAccountDto,
  UpdateVirtualAccountDto,
} from './dto/account.dto';

export {
  WebhookDto,
  CreateWebhookDto,
  WebhookEventDto,
  WebhookEventType,
  AuthorizationWebhookPayload,
  AuthorizationWebhookResponse,
} from './dto/webhook.dto';

// Re-export interfaces
export {
  SlashConfig,
} from './interfaces/slash-config.interface';

export {
  SlashApiResponse,
  PaginatedResponse,
  ListResponse,
} from './interfaces/slash-response.interface';

// Utility types
export type CardId = string;
export type AccountId = string;
export type TransactionId = string;
export type WebhookId = string;

// Common response types
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface ApiSuccess<T = any> {
  data: T;
  message?: string;
}

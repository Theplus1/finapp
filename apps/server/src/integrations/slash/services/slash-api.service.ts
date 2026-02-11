import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import {
  CardDto,
  CardStatus,
  CreateCardDto,
  SpendingConstraintDto,
  UpdateCardDto,
} from '../dto/card.dto';
import {
  TransactionDto,
  ListTransactionsQuery,
} from '../dto/transaction.dto';
import {
  AccountDto,
  BalanceDto,
  VirtualAccountDto,
  VirtualAccountWithDetailsDto,
  ListVirtualAccountsResponse,
  ListVirtualAccountsQuery,
  CreateVirtualAccountDto,
  UpdateVirtualAccountDto,
} from '../dto/account.dto';
import {
  WebhookDto,
  CreateWebhookDto,
  WebhookEventDto,
} from '../dto/webhook.dto';
import {
  CardGroupDto,
  CreateCardGroupDto,
  UpdateCardGroupDto,
  ListCardGroupsQuery,
} from '../dto/card-group.dto';
import { CardModifierDto, CardModifiersResponseDto } from '../dto/card-modifier.dto';
import { SlashApiResponse, PaginatedResponse, ListResponse } from '../interfaces/slash-response.interface';

/**
 * Slash API Client Service
 * Handles all HTTP communication with the Slash API
 */
@Injectable()
export class SlashApiService {
  private readonly logger = new Logger(SlashApiService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('slash.baseUrl', 'https://api.joinslash.com');
    this.apiKey = this.configService.get<string>('slash.apiKey') || '';
    const timeout = this.configService.get<number>('slash.timeout', 30000);

    if (!this.apiKey) {
      this.logger.warn('Slash API key is not configured');
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making request to ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response from ${response.config.url}: ${response.status}`);
        return response;
      },
      (error: AxiosError) => {
        this.handleApiError(error);
        return Promise.reject(error);
      },
    );
  }

  private handleApiError(error: AxiosError): void {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      
      this.logger.error(
        `Slash API error: ${status} - ${data?.message || error.message}`,
        error.stack,
      );

      switch (status) {
        case 401:
          throw new HttpException('Unauthorized: Invalid API key', HttpStatus.UNAUTHORIZED);
        case 403:
          throw new HttpException('Forbidden: Access denied', HttpStatus.FORBIDDEN);
        case 404:
          throw new HttpException('Resource not found', HttpStatus.NOT_FOUND);
        case 429:
          throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
        default:
          throw new HttpException(
            data?.message || 'Slash API error',
            status,
          );
      }
    } else if (error.request) {
      this.logger.error('No response received from Slash API', error.stack);
      throw new HttpException(
        'No response from Slash API',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } else {
      this.logger.error('Error setting up request', error.stack);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.request<{ data?: T } & Record<string, unknown>>(config);
      const body = response.data;
      if (body != null && typeof body === 'object' && 'data' in body && body.data !== undefined) {
        return body.data as T;
      }
      return (body ?? response.data) as T;
    } catch (error) {
      throw error;
    }
  }

  private mergeSpendingConstraint(
    existing: Record<string, unknown>,
    incoming: SpendingConstraintDto | null,
  ): SpendingConstraintDto | null {
    const existingRule = (existing.spendingRule ?? {}) as Record<string, unknown>;

    if (incoming === null) {
      const { utilizationLimit: _u, utilizationLimitV2: _v, ...restRule } = existingRule;
      const mergedRule = { ...restRule };
      const hasOtherConstraintFields = Object.keys(existing).some((k) => k !== 'spendingRule');
      const hasOtherRuleFields = Object.keys(mergedRule).length > 0;
      if (!hasOtherConstraintFields && !hasOtherRuleFields) {
        return null;
      }
      return { ...existing, spendingRule: mergedRule } as SpendingConstraintDto;
    }

    const newLimit = incoming.spendingRule?.utilizationLimit;
    const mergedRule: Record<string, unknown> = {
      ...existingRule,
    };
    if (newLimit) {
      const existingLimit = existingRule.utilizationLimit as Record<string, unknown> | undefined;
      const mergedLimit = {
        ...newLimit,
        timezone: newLimit.timezone ?? existingLimit?.timezone,
      };
      mergedRule.utilizationLimit = mergedLimit;
      mergedRule.utilizationLimitV2 = [mergedLimit];
    } else {
      delete mergedRule.utilizationLimit;
      delete mergedRule.utilizationLimitV2;
    }

    return { ...existing, spendingRule: mergedRule } as SpendingConstraintDto;
  }

  // ==================== Account Methods ====================

  async listAccounts(): Promise<AccountDto[]> {
    return this.request<AccountDto[]>({
      method: 'GET',
      url: '/accounts',
    });
  }

  async getAccount(accountId: string): Promise<AccountDto> {
    return this.request<AccountDto>({
      method: 'GET',
      url: `/accounts/${accountId}`,
    });
  }

  async getAccountBalance(accountId: string): Promise<BalanceDto> {
    return this.request<BalanceDto>({
      method: 'GET',
      url: `/accounts/${accountId}/balance`,
    });
  }

  async listAccountBalances(accountId: string): Promise<BalanceDto[]> {
    return this.request<BalanceDto[]>({
      method: 'GET',
      url: `/accounts/${accountId}/balances`,
    });
  }

  // ==================== Card Methods ====================

  async listCards(params?: {
    filter?: {
      legalEntityId?: string;
      accountId?: string;
      virtualAccountId?: string;
      status?: CardStatus;
      cardGroupId?: string;
      cardGroupName?: string;
    };
    cursor?: string;
    sort?: 'createdAt' | 'name';
    direction?: 'ASC' | 'DESC';
  }): Promise<ListResponse<CardDto>> {
    // Flatten filter object to match API's expected format: filter:key=value
    const flatParams: Record<string, any> = {};
    
    if (params?.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        if (value !== undefined) {
          flatParams[`filter:${key}`] = value;
        }
      });
    }
    
    if (params?.cursor) flatParams.cursor = params.cursor;
    if (params?.sort) flatParams.sort = params.sort;
    if (params?.direction) flatParams.direction = params.direction;

    return this.request<ListResponse<CardDto>>({
      method: 'GET',
      url: '/card',
      params: flatParams,
    });
  }

  async getCard(cardId: string, includePan = false, includeCvv = false): Promise<CardDto> {
    return this.request<CardDto>({
      method: 'GET',
      url: `/card/${cardId}`,
      params: { include_pan: includePan, include_cvv: includeCvv },
    });
  }

  /**
   * Get card with decrypted sensitive data (PAN and CVV) from vault endpoint
   * This uses the vault.joinslash.com endpoint to retrieve decrypted card information
   */
  async getCardDecrypted(cardId: string, includePan = true, includeCvv = true): Promise<CardDto> {
    const vaultUrl = this.configService.get<string>('slash.vaultUrl', 'https://vault.joinslash.com');
    
    try {
      const response = await axios.request<CardDto>({
        method: 'GET',
        baseURL: vaultUrl,
        url: `/card/${cardId}`,
        params: { 
          include_pan: includePan, 
          include_cvv: includeCvv 
        },
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        timeout: this.configService.get<number>('slash.timeout', 30000),
      });
      
      this.logger.debug(`Retrieved decrypted card data for ${cardId} from vault`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error retrieving decrypted card ${cardId} from vault:`, error);
      throw error;
    }
  }

  async createCard(data: CreateCardDto): Promise<CardDto> {
    return this.request<CardDto>({
      method: 'POST',
      url: '/cards',
      data,
    });
  }

  async updateCard(cardId: string, data: UpdateCardDto): Promise<CardDto> {
    return this.request<CardDto>({
      method: 'PATCH',
      url: `/card/${cardId}`,
      data,
    });
  }

  async updateCardSpendingConstraint(
    cardId: string,
    spendingConstraint: SpendingConstraintDto | null,
  ): Promise<CardDto> {
    this.logger.log(
      `[Slash] updateCardSpendingConstraint called: cardId=${cardId}, payload=${JSON.stringify(spendingConstraint)}`,
    );
    try {
      const current = await this.getCard(cardId);
      const mergedConstraint = this.mergeSpendingConstraint(
        (current.spendingConstraint ?? {}) as Record<string, unknown>,
        spendingConstraint,
      );
      const updatePayload: UpdateCardDto = {
        name: current.name,
        status: current.status,
        spendingConstraint: mergedConstraint,
      };
      if (current.userData != null && Object.keys(current.userData).length > 0) {
        updatePayload.userData = current.userData;
      }
      const card = await this.updateCard(cardId, updatePayload);
      this.logger.log(
        `[Slash] updateCardSpendingConstraint success: cardId=${cardId}, constraint=${JSON.stringify(card.spendingConstraint ?? null)}`,
      );
      return card;
    } catch (err) {
      const e = err as Error & { getResponse?: () => unknown; getStatus?: () => number; response?: { status?: number; data?: unknown } };
      const status = typeof e.getStatus === 'function' ? e.getStatus() : e.response?.status;
      const body = typeof e.getResponse === 'function' ? e.getResponse() : e.response?.data;
      this.logger.error(
        `[Slash] updateCardSpendingConstraint failed: cardId=${cardId}, status=${status}, response=${JSON.stringify(body)}`,
        e.stack,
      );
      throw err;
    }
  }

  async getCardUtilization(cardId: string): Promise<any> {
    return this.request<any>({
      method: 'GET',
      url: `/card/${cardId}/utilization`,
    });
  }

  async getCardModifiers(cardId: string): Promise<CardModifierDto[]> {
    const response = await this.request<CardModifiersResponseDto>({
      method: 'GET',
      url: `/card/${cardId}/modifier`,
    });
    return response.modifiers;
  }

  async setCardModifier(cardId: string, modifier: CardModifierDto): Promise<void> {
    await this.request<{ success: boolean }>({
      method: 'PUT',
      url: `/card/${cardId}/modifier`,
      data: modifier,
    });
  }

  // ==================== Transaction Methods ====================

  async listTransactions(query?: ListTransactionsQuery): Promise<ListResponse<TransactionDto>> {
    return this.request<ListResponse<TransactionDto>>({
      method: 'GET',
      url: '/transaction', // Singular, not plural
      params: query,
    });
  }

  async getTransaction(transactionId: string): Promise<TransactionDto> {
    return this.request<TransactionDto>({
      method: 'GET',
      url: `/transaction/${transactionId}`,
    });
  }

  async addTransactionNote(transactionId: string, note: string): Promise<TransactionDto> {
    return this.request<TransactionDto>({
      method: 'POST',
      url: `/transaction/${transactionId}/note`, // Singular, not plural
      data: { note },
    });
  }

  // ==================== Virtual Account Methods ====================

  async listVirtualAccounts(query?: ListVirtualAccountsQuery): Promise<ListVirtualAccountsResponse> {
    return this.request<ListVirtualAccountsResponse>({
      method: 'GET',
      url: '/virtual-account',
      params: query,
    });
  }

  async getVirtualAccount(virtualAccountId: string): Promise<VirtualAccountWithDetailsDto> {
    return this.request<VirtualAccountWithDetailsDto>({
      method: 'GET',
      url: `/virtual-account/${virtualAccountId}`,
    });
  }

  async createVirtualAccount(data: CreateVirtualAccountDto): Promise<VirtualAccountDto> {
    return this.request<VirtualAccountDto>({
      method: 'POST',
      url: '/virtual-account',
      data,
    });
  }

  async updateVirtualAccount(
    virtualAccountId: string,
    data: UpdateVirtualAccountDto,
  ): Promise<VirtualAccountDto> {
    return this.request<VirtualAccountDto>({
      method: 'PATCH',
      url: `/virtual-account/${virtualAccountId}`,
      data,
    });
  }

  async createVirtualAccountTransfer(data: {
    fromVirtualAccountId: string;
    toVirtualAccountId: string;
    amountCents: number;
    description?: string;
  }): Promise<any> {
    return this.request<any>({
      method: 'POST',
      url: '/virtual-account/transfer',
      data,
    });
  }

  // ==================== Card Group Methods ====================

  async listCardGroups(query?: ListCardGroupsQuery): Promise<ListResponse<CardGroupDto>> {
    return this.request<ListResponse<CardGroupDto>>({
      method: 'GET',
      url: '/card-group',
      params: query,
    });
  }

  async getCardGroup(cardGroupId: string): Promise<CardGroupDto> {
    return this.request<CardGroupDto>({
      method: 'GET',
      url: `/card-group/${cardGroupId}`,
    });
  }

  async createCardGroup(data: CreateCardGroupDto): Promise<CardGroupDto> {
    return this.request<CardGroupDto>({
      method: 'POST',
      url: '/card-group',
      data,
    });
  }

  async updateCardGroup(cardGroupId: string, data: UpdateCardGroupDto): Promise<CardGroupDto> {
    return this.request<CardGroupDto>({
      method: 'PATCH',
      url: `/card-group/${cardGroupId}`,
      data,
    });
  }

  async getCardGroupUtilization(cardGroupId: string): Promise<any> {
    return this.request<any>({
      method: 'GET',
      url: `/card-group/${cardGroupId}/utilization`,
    });
  }

  // ==================== Webhook Methods ====================

  async listWebhooks(legalEntityId: string): Promise<WebhookDto[]> {
    return this.request<WebhookDto[]>({
      method: 'GET',
      url: '/webhooks',
      params: { legalEntityId },
    });
  }

  async createWebhook(data: CreateWebhookDto): Promise<WebhookDto> {
    return this.request<WebhookDto>({
      method: 'POST',
      url: '/webhooks',
      data,
    });
  }

  async updateWebhook(webhookId: string, data: Partial<CreateWebhookDto>): Promise<WebhookDto> {
    return this.request<WebhookDto>({
      method: 'PATCH',
      url: `/webhooks/${webhookId}`,
      data,
    });
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      url: `/webhooks/${webhookId}`,
    });
  }

  // ==================== Utility Methods ====================

  async healthCheck(): Promise<boolean> {
    try {
      await this.listAccounts();
      return true;
    } catch (error) {
      this.logger.error('Slash API health check failed', error);
      return false;
    }
  }
}

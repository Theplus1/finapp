import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import {
  CardDto,
  CreateCardDto,
  UpdateCardDto,
} from './dto/card.dto';
import {
  TransactionDto,
  ListTransactionsQuery,
} from './dto/transaction.dto';
import {
  AccountDto,
  BalanceDto,
  VirtualAccountDto,
  VirtualAccountWithDetailsDto,
  ListVirtualAccountsResponse,
  ListVirtualAccountsQuery,
  CreateVirtualAccountDto,
  UpdateVirtualAccountDto,
} from './dto/account.dto';
import {
  WebhookDto,
  CreateWebhookDto,
  WebhookEventDto,
} from './dto/webhook.dto';
import { SlashApiResponse, PaginatedResponse, ListResponse } from './interfaces/slash-response.interface';

@Injectable()
export class SlashService {
  private readonly logger = new Logger(SlashService.name);
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
      const response = await this.axiosInstance.request<T>(config);
      return response.data;
    } catch (error) {
      throw error;
    }
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
      status?: 'active' | 'paused' | 'closed' | 'inactive';
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
      url: `/cards/${cardId}`,
      data,
    });
  }

  async getCardUtilization(cardId: string): Promise<any> {
    return this.request<any>({
      method: 'GET',
      url: `/cards/${cardId}/utilization`,
    });
  }

  // ==================== Transaction Methods ====================

  async listTransactions(query?: ListTransactionsQuery): Promise<PaginatedResponse<TransactionDto>> {
    return this.request<PaginatedResponse<TransactionDto>>({
      method: 'GET',
      url: '/transactions',
      params: query,
    });
  }

  async getTransaction(transactionId: string): Promise<TransactionDto> {
    return this.request<TransactionDto>({
      method: 'GET',
      url: `/transactions/${transactionId}`,
    });
  }

  async addTransactionNote(transactionId: string, note: string): Promise<TransactionDto> {
    return this.request<TransactionDto>({
      method: 'POST',
      url: `/transactions/${transactionId}/note`,
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

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TransactionRepository, TransactionFilters } from '../../database/repositories/transaction.repository';
import { CardRepository } from '../../database/repositories/card.repository';
import { VirtualAccountRepository } from '../../database/repositories/virtual-account.repository';
import { TransactionDocument } from '../../database/schemas/transaction.schema';
import { CardDocument } from '../../database/schemas/card.schema';
import { VirtualAccountDocument } from '../../database/schemas/virtual-account.schema';
import { PaginationOptions } from '../../common/types/repository-query.types';
import { TransactionWithRelations, TransactionStats } from './types/transaction.types';
import { SortOrder } from '../../common/constants/pagination.constants';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly cardRepository: CardRepository,
    private readonly virtualAccountRepository: VirtualAccountRepository,
  ) {}

  /**
   * Find transactions with filters
   */
  async find(filters: TransactionFilters): Promise<TransactionDocument[]> {
    return this.transactionRepository.find(filters);
  }

  /**
   * Count transactions with filters
   */
  async count(filters: Omit<TransactionFilters, 'limit' | 'skip'>): Promise<number> {
    return this.transactionRepository.count(filters);
  }

  /**
   * Find transactions with filters and pagination
   */
  async findAllWithFiltersAndPagination(
    filters: {
      virtualAccountId?: string;
      slashId?: string;
      cardId?: string | any;
      status?: string | any;
      detailedStatus?: string | any;
      amountCents?: any;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: SortOrder;
      merchantData?: any;
    },
    pagination: PaginationOptions,
  ): Promise<[TransactionWithRelations[], number]> {
    const dbFilters: any = {};
    if (filters.virtualAccountId) dbFilters.virtualAccountId = filters.virtualAccountId;
    if (filters.slashId) dbFilters.slashId = filters.slashId;
    if (filters.cardId) dbFilters.cardId = filters.cardId;
    if (filters.status) dbFilters.status = filters.status;
    if (filters.detailedStatus) dbFilters.detailedStatus = filters.detailedStatus;
    if (filters.amountCents !== undefined) dbFilters.amountCents = filters.amountCents;
    if (filters.startDate) dbFilters.startDate = new Date(filters.startDate);
    if (filters.endDate) dbFilters.endDate = new Date(filters.endDate);
    if (filters.merchantData) dbFilters.merchantData = filters.merchantData;
    
    const sortField = filters.sortBy || 'createdAt';
    const sortDirection = filters.sortOrder === SortOrder.ASC ? 1 : -1;
    
    const [data, total] = await Promise.all([
      this.find({ 
        ...dbFilters, 
        limit: pagination.limit, 
        skip: (pagination.page - 1) * pagination.limit,
        sort: { [sortField]: sortDirection },
      }),
      this.count(dbFilters),
    ]);
    
    const enrichedData = await this.enrichTransactions(data);
    return [enrichedData, total];
  }


  /**
   * Find transactions with filters and pagination
   */
  async findAllWithFilters(
    filters: {
      virtualAccountId?: string;
      slashId?: string;
      cardId?: string | any;
      status?: string;
      detailedStatus?: string | any;
      amountCents?: any;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: SortOrder;
      merchantData?: any;
    },
  ): Promise<TransactionWithRelations[]> {
    const dbFilters: any = {};
    if (filters.virtualAccountId) dbFilters.virtualAccountId = filters.virtualAccountId;
    if (filters.slashId) dbFilters.slashId = filters.slashId;
    if (filters.cardId) dbFilters.cardId = filters.cardId;
    if (filters.status) dbFilters.status = filters.status;
    if (filters.detailedStatus) dbFilters.detailedStatus = filters.detailedStatus;
    if (filters.amountCents) dbFilters.amountCents = filters.amountCents;
    if (filters.startDate) dbFilters.startDate = new Date(filters.startDate);
    if (filters.endDate) dbFilters.endDate = new Date(filters.endDate);
    if (filters.merchantData) dbFilters.merchantData = filters.merchantData;
    const data = await this.find(dbFilters);
    const enrichedData = await this.enrichTransactions(data);
    return enrichedData;
  }

  /**
   * Get transaction statistics with filters
   */
  async getStatsWithFilters(query: {
    virtualAccountId?: string;
    cardId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TransactionStats> {
    const filters: any = {};
    if (query.virtualAccountId) filters.virtualAccountId = query.virtualAccountId;
    if (query.cardId) filters.cardId = query.cardId;
    if (query.status) filters.status = query.status;
    if (query.startDate) filters.startDate = new Date(query.startDate);
    if (query.endDate) filters.endDate = new Date(query.endDate);
    
    return this.getStats(filters);
  }

  async findFirstByVirtualAccountId(
    virtualAccountId: string,
  ): Promise<TransactionDocument | null> {
    return this.transactionRepository.findFirstByVirtualAccountId(
      virtualAccountId,
    );
  }

  /**
   * Find transaction by Slash ID
   */
  async findBySlashId(slashId: string): Promise<TransactionDocument> {
    const transaction = await this.transactionRepository.findBySlashId(slashId);
    
    if (!transaction) {
      throw new NotFoundException(`Transaction ${slashId} not found`);
    }

    return transaction;
  }

  /**
   * Find transaction with enriched data (includes card and virtual account info)
   */
  async findBySlashIdWithDetails(slashId: string): Promise<TransactionDocument> {
    return await this.findBySlashId(slashId);
  }

  /**
   * Find one transaction by Slash ID and virtual account ID, returns enriched or null
   */
  async findBySlashIdAndVirtualAccountId(
    slashId: string,
    virtualAccountId: string,
  ): Promise<TransactionWithRelations | null> {
    const transaction = await this.transactionRepository.findBySlashId(slashId);
    if (!transaction || transaction.virtualAccountId !== virtualAccountId) {
      return null;
    }
    const [enriched] = await this.enrichTransactions([transaction]);
    return enriched ?? null;
  }

  /**
   * Enrich transactions with card and virtual account data
   * Uses batch queries to avoid N+1 problem
   */
  private async enrichTransactions(
    transactions: TransactionDocument[],
  ): Promise<TransactionWithRelations[]> {
    if (transactions.length === 0) {
      return [];
    }

    const cardIds = [...new Set(transactions.map(t => t.cardId).filter(Boolean))];
    const virtualAccountIds = [...new Set(transactions.map(t => t.virtualAccountId).filter(Boolean))];

    const [cards, virtualAccounts] = await Promise.all([
      cardIds.length > 0
        ? this.cardRepository.find({
            filter: { slashId: { $in: cardIds }, isDeleted: false },
            skip: 0,
            limit: cardIds.length,
          })
        : Promise.resolve([]),
      virtualAccountIds.length > 0
        ? this.virtualAccountRepository.find({
            filter: { slashId: { $in: virtualAccountIds }, isDeleted: false },
            skip: 0,
            limit: virtualAccountIds.length,
          })
        : Promise.resolve([]),
    ]);

    const cardMap = new Map<string, CardDocument>();
    cards.forEach(card => cardMap.set(card.slashId, card));

    const virtualAccountMap = new Map<string, VirtualAccountDocument>();
    virtualAccounts.forEach(va => virtualAccountMap.set(va.slashId, va));

    return transactions.map(transaction => {
      const txnData = transaction.toObject();
      const enriched: TransactionWithRelations = { ...txnData };

      if (transaction.cardId) {
        const card = cardMap.get(transaction.cardId);
        enriched.card = card ? {
          slashId: card.slashId,
          name: card.name,
          last4: card.last4,
        } : null;
      }

      const virtualAccount = virtualAccountMap.get(transaction.virtualAccountId);
      enriched.virtualAccount = virtualAccount ? {
        slashId: virtualAccount.slashId,
        name: virtualAccount.name,
      } : null;

      return enriched;
    });
  }

  /**
   * Get transaction statistics
   */
  async getStats(filters: Partial<TransactionFilters>): Promise<TransactionStats> {
    const transactions = await this.transactionRepository.find(filters);

    const stats: TransactionStats = {
      total: transactions.length,
      totalAmount: 0,
      byStatus: {},
      byType: {},
    };

    transactions.forEach((txn) => {
      stats.totalAmount += txn.amountCents;
      stats.byStatus[txn.status] = (stats.byStatus[txn.status] || 0) + 1;
      stats.byType[txn.type] = (stats.byType[txn.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Get spending by category
   */
  async getSpendingByCategory(
    virtualAccountId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Array<{ category: string; totalCents: number; count: number }>> {
    return this.transactionRepository.getSpendingByCategory(
      virtualAccountId,
      startDate,
      endDate,
    );
  }

  /**
   * Get monthly spending
   */
  async getMonthlySpending(
    virtualAccountId: string,
    year: number,
  ): Promise<Array<{ month: number; totalCents: number; count: number }>> {
    return this.transactionRepository.getMonthlySpending(virtualAccountId, year);
  }
}

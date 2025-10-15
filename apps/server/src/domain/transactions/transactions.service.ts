import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TransactionRepository, TransactionFilters } from '../../database/repositories/transaction.repository';
import { CardRepository } from '../../database/repositories/card.repository';
import { TransactionDocument } from '../../database/schemas/transaction.schema';
import { PaginationOptions } from '../../common/types/repository-query.types';

export interface EnrichedTransaction {
  [key: string]: any;
  card?: any;
}

export interface TransactionStats {
  total: number;
  totalAmount: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly cardRepository: CardRepository,
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
   * Optimized: Filters and paginates at database level
   */
  async findAllWithFilters(
    filters: {
      virtualAccountId?: string;
      cardId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
    pagination: PaginationOptions,
  ): Promise<[TransactionDocument[], number]> {
    // Build filters with date parsing
    const dbFilters: any = {};
    if (filters.virtualAccountId) dbFilters.virtualAccountId = filters.virtualAccountId;
    if (filters.cardId) dbFilters.cardId = filters.cardId;
    if (filters.status) dbFilters.status = filters.status;
    if (filters.startDate) dbFilters.startDate = new Date(filters.startDate);
    if (filters.endDate) dbFilters.endDate = new Date(filters.endDate);
    
    const [data, total] = await Promise.all([
      this.find({ 
        ...dbFilters, 
        limit: pagination.limit, 
        skip: (pagination.page - 1) * pagination.limit 
      }),
      this.count(dbFilters),
    ]);
    
    return [data, total];
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
    // Build filters
    const filters: any = {};
    if (query.virtualAccountId) filters.virtualAccountId = query.virtualAccountId;
    if (query.cardId) filters.cardId = query.cardId;
    if (query.status) filters.status = query.status;
    if (query.startDate) filters.startDate = new Date(query.startDate);
    if (query.endDate) filters.endDate = new Date(query.endDate);
    
    return this.getStats(filters);
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
   * Find transaction with enriched data (includes card info)
   */
  async findBySlashIdWithDetails(slashId: string): Promise<EnrichedTransaction> {
    const transaction = await this.findBySlashId(slashId);
    
    // Fetch related card if exists
    let card = null;
    if (transaction.cardId) {
      card = await this.cardRepository.findBySlashId(transaction.cardId);
    }

    const txnData = transaction.toObject();
    return {
      ...txnData,
      card: card ? card.toObject() : null,
    };
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

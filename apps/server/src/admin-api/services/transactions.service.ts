import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TransactionRepository } from '../../slash/repositories/transaction.repository';
import { CardRepository } from '../../slash/repositories/card.repository';
import { TransactionDocument } from '../../slash/schemas/transaction.schema';
import { TransactionQueryDto } from '../dto/transaction-query.dto';
import { createPaginatedResponse } from '../../common/dto/api-response.dto';

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

export interface TransactionFilters {
  virtualAccountId?: string;
  cardId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly transactionRepo: TransactionRepository,
    private readonly cardRepo: CardRepository,
  ) {}

  /**
   * Get transactions with filters and pagination
   */
  async findAll(query: TransactionQueryDto) {
    this.logger.log(`Finding transactions with query: ${JSON.stringify(query)}`);

    const filters = this.buildFilter(query);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.transactionRepo.find({ ...filters, limit, skip }),
      this.transactionRepo.count(filters),
    ]);

    return createPaginatedResponse(data, page, limit, total, 'Transactions retrieved successfully');
  }

  /**
   * Get single transaction by ID
   */
  async findById(id: string): Promise<TransactionDocument> {
    const transaction = await this.transactionRepo.findBySlashId(id);
    
    if (!transaction) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }

    return transaction;
  }

  /**
   * Get transaction with related data (card info)
   */
  async findByIdWithDetails(id: string): Promise<EnrichedTransaction> {
    const transaction = await this.findById(id);
    
    // Fetch related card if exists
    let card = null;
    if (transaction.cardId) {
      card = await this.cardRepo.findBySlashId(transaction.cardId);
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
  async getStats(filters: Partial<TransactionQueryDto>): Promise<TransactionStats> {
    const filterQuery = this.buildFilter(filters);
    
    const transactions = await this.transactionRepo.find(filterQuery);

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
   * Build filter from query DTO
   */
  private buildFilter(query: Partial<TransactionQueryDto>): TransactionFilters {
    const filter: TransactionFilters = {};

    if (query.virtualAccountId) {
      filter.virtualAccountId = query.virtualAccountId;
    }

    if (query.cardId) {
      filter.cardId = query.cardId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.startDate) {
      filter.startDate = new Date(query.startDate);
    }

    if (query.endDate) {
      filter.endDate = new Date(query.endDate);
    }

    return filter;
  }
}

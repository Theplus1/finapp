import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CardRepository } from '../../database/repositories/card.repository';
import { VirtualAccountRepository } from '../../database/repositories/virtual-account.repository';
import { CardDocument } from '../../database/schemas/card.schema';
import { PaginationOptions, RepositoryQuery } from '../../common/types/repository-query.types';

export interface CardStats {
  total: number;
  byStatus: Record<string, number>;
  physical: number;
  virtual: number;
  singleUse: number;
}

export interface CardFilters {
  status?: string;
  cardGroupId?: string;
  virtualAccountId?: string;
}

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);

  constructor(
    private readonly cardRepository: CardRepository,
    private readonly virtualAccountRepository: VirtualAccountRepository,
  ) {}

  /**
   * Find card by Slash ID
   */
  async findBySlashId(slashId: string): Promise<CardDocument> {
    const card = await this.cardRepository.findBySlashId(slashId);
    
    if (!card) {
      throw new NotFoundException(`Card ${slashId} not found`);
    }

    return card;
  }

  /**
   * Find cards by virtual account ID
   */
  async findByVirtualAccountId(
    virtualAccountId: string,
    filters?: {
      status?: string;
      cardGroupId?: string;
      limit?: number;
      skip?: number;
    },
  ): Promise<CardDocument[]> {
    return this.cardRepository.findByVirtualAccountId(virtualAccountId, filters);
  }

  /**
   * Count cards by virtual account ID
   */
  async countByVirtualAccountId(
    virtualAccountId: string,
    filters?: { status?: string },
  ): Promise<number> {
    return this.cardRepository.count(virtualAccountId, filters);
  }

  /**
   * Verify card ownership
   */
  async verifyOwnership(slashId: string, virtualAccountId: string): Promise<boolean> {
    const card = await this.cardRepository.findBySlashId(slashId);
    
    if (!card) {
      return false;
    }

    return card.virtualAccountId === virtualAccountId;
  }

  /**
   * Find all cards with filters and pagination
   * Optimized: Filters and paginates at database level
   */
  async findAllWithFilters(
    filters: CardFilters,
    pagination: PaginationOptions,
  ): Promise<[CardDocument[], number]> {
    // Build MongoDB filter
    const mongoFilter = this.buildMongoFilter(filters);
    
    // Build repository query
    const query: RepositoryQuery = {
      filter: mongoFilter,
      skip: (pagination.page - 1) * pagination.limit,
      limit: pagination.limit,
      sort: { createdAt: -1 },
    };

    // Execute at DB level
    return Promise.all([
      this.cardRepository.find(query),
      this.cardRepository.countWithFilter(mongoFilter),
    ]);
  }

  /**
   * Build MongoDB filter from card filters
   * Private method to encapsulate query building logic
   */
  private buildMongoFilter(filters: CardFilters): any {
    const mongoFilter: any = {
      isDeleted: false, // Always filter out deleted cards
    };

    // Simple equality filters
    if (filters.status) {
      mongoFilter.status = filters.status;
    }

    if (filters.cardGroupId) {
      mongoFilter.cardGroupId = filters.cardGroupId;
    }

    if (filters.virtualAccountId) {
      mongoFilter.virtualAccountId = filters.virtualAccountId;
    }

    return mongoFilter;
  }

  /**
   * Find card by ID with details (including virtual account)
   */
  async findBySlashIdWithDetails(slashId: string): Promise<any> {
    const card = await this.findBySlashId(slashId);
    
    // Fetch related virtual account
    let virtualAccount = null;
    if (card.virtualAccountId) {
      virtualAccount = await this.virtualAccountRepository.findBySlashId(card.virtualAccountId);
    }

    const cardData = card.toObject();
    return {
      ...cardData,
      virtualAccount: virtualAccount ? virtualAccount.toObject() : null,
    };
  }

}

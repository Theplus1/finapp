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
   * Find all cards with optional filters
   */
  async findAll(filters?: {
    status?: string;
    cardGroupId?: string;
    virtualAccountId?: string;
  }): Promise<CardDocument[]> {
    if (filters?.virtualAccountId) {
      return this.cardRepository.findByVirtualAccountId(filters.virtualAccountId, filters);
    }

    // Get all virtual accounts and fetch their cards
    const allAccounts = await this.virtualAccountRepository.findAll();
    const allCards: CardDocument[] = [];

    for (const account of allAccounts) {
      const cards = await this.cardRepository.findByVirtualAccountId(account.slashId, filters);
      allCards.push(...cards);
    }

    return allCards;
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

  /**
   * Get card statistics
   */
  async getStats(filters?: {
    status?: string;
    cardGroupId?: string;
  }): Promise<CardStats> {
    const allCards = await this.findAll(filters);

    const stats: CardStats = {
      total: allCards.length,
      byStatus: {},
      physical: 0,
      virtual: 0,
      singleUse: 0,
    };

    allCards.forEach((card) => {
      stats.byStatus[card.status] = (stats.byStatus[card.status] || 0) + 1;
      if (card.isPhysical) stats.physical++;
      else stats.virtual++;
      if (card.isSingleUse) stats.singleUse++;
    });

    return stats;
  }

  /**
   * Create a new card
   * Business logic: Validate and create in local database
   */
  async createCard(createDto: any): Promise<CardDocument> {
    this.logger.log(`Creating card: ${JSON.stringify(createDto)}`);
    
    // Business validation
    // Check if virtual account exists
    if (createDto.virtualAccountId) {
      const account = await this.virtualAccountRepository.findBySlashId(createDto.virtualAccountId);
      if (!account) {
        throw new NotFoundException(`Virtual account ${createDto.virtualAccountId} not found`);
      }
    }
    
    // Create in local database
    const createdCard = await this.cardRepository.create(createDto);
    
    this.logger.log(`Card created successfully: ${createdCard.slashId}`);
    
    return createdCard;
  }

  /**
   * Update a card
   * Business logic: Validate and update in local database
   */
  async updateCard(cardId: string, updateDto: any): Promise<CardDocument> {
    this.logger.log(`Updating card ${cardId}: ${JSON.stringify(updateDto)}`);
    
    // Business validation - check if card exists
    const existingCard = await this.cardRepository.findBySlashId(cardId);
    if (!existingCard) {
      throw new NotFoundException(`Card ${cardId} not found`);
    }
    
    // Update in local database
    const updatedCard = await this.cardRepository.upsert(cardId, updateDto);
    
    this.logger.log(`Card updated successfully: ${cardId}`);
    
    return updatedCard;
  }
}

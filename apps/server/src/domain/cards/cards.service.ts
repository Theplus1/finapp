import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CardRepository } from '../../database/repositories/card.repository';
import { VirtualAccountRepository } from '../../database/repositories/virtual-account.repository';
import { CardDocument } from '../../database/schemas/card.schema';
import { VirtualAccountDocument } from '../../database/schemas/virtual-account.schema';
import {
  PaginationOptions,
  RepositoryQuery,
} from '../../common/types/repository-query.types';
import { CardWithRelations } from './types/card.types';
import { SortOrder } from '../../common/constants/pagination.constants';
import { CardGroupDocument } from 'src/database/schemas/card-group.schema';
import { CardGroupRepository } from 'src/database/repositories/card-group.repository';

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
  sortBy?: string;
  sortOrder?: SortOrder;
}

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);

  constructor(
    private readonly cardRepository: CardRepository,
    private readonly virtualAccountRepository: VirtualAccountRepository,
    private readonly cardGroupRepository: CardGroupRepository,
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
    const mongoFilter: any = {
      virtualAccountId,
      isDeleted: false,
    };

    if (filters?.status) {
      mongoFilter.status = filters.status;
    }

    if (filters?.cardGroupId) {
      mongoFilter.cardGroupId = filters.cardGroupId;
    }

    const query: RepositoryQuery = {
      filter: mongoFilter,
      skip: filters?.skip || 0,
      limit: filters?.limit || 100,
      sort: { createdAt: -1 },
    };

    return this.cardRepository.find(query);
  }

  /**
   * Count cards by virtual account ID
   */
  async countByVirtualAccountId(
    virtualAccountId: string,
    filters?: { status?: string },
  ): Promise<number> {
    const mongoFilter: any = {
      virtualAccountId,
      isDeleted: false,
    };

    if (filters?.status) {
      mongoFilter.status = filters.status;
    }

    return this.cardRepository.count(mongoFilter);
  }

  /**
   * Verify card ownership
   */
  async verifyOwnership(
    slashId: string,
    virtualAccountId: string,
  ): Promise<boolean> {
    const card = await this.cardRepository.findBySlashId(slashId);

    if (!card) {
      return false;
    }

    return card.virtualAccountId === virtualAccountId;
  }

  /**
   * Find all cards with filters and pagination
   * Returns cards with virtual account information
   */
  async findAllWithFilters(
    filters: CardFilters,
    pagination?: PaginationOptions,
  ): Promise<[CardWithRelations[], number]> {
    const mongoFilter = this.buildMongoFilter(filters);

    // Build sort
    const sortField = filters.sortBy || 'createdAt';
    const sortDirection = filters.sortOrder === SortOrder.ASC ? 1 : -1;

    let query: RepositoryQuery = {
      filter: mongoFilter,
      sort: { [sortField]: sortDirection },
    };

    if (pagination) {
      query.skip = (pagination.page - 1) * pagination.limit;
      query.limit = pagination.limit;
    }

    const [cards, total] = await Promise.all([
      this.cardRepository.find(query),
      this.cardRepository.count(mongoFilter),
    ]);
    if (total === 0) {
      return [cards, total];
    }
    const enrichedCards = await this.enrichCards(cards);
    return [enrichedCards, total];
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
  async findBySlashIdWithDetails(slashId: string): Promise<CardDocument> {
    return await this.findBySlashId(slashId);
  }

  /**
   * Enrich cards with virtual account data
   * Uses batch queries to avoid N+1 problem
   */
  private async enrichCards(
    cards: CardDocument[],
  ): Promise<CardWithRelations[]> {
    if (cards.length === 0) {
      return [];
    }

    const virtualAccountIds = [
      ...new Set(cards.map((c) => c.virtualAccountId).filter(Boolean)),
    ];

    const virtualAccounts =
      virtualAccountIds.length > 0
        ? await this.virtualAccountRepository.find({
            filter: { slashId: { $in: virtualAccountIds }, isDeleted: false },
            skip: 0,
            limit: virtualAccountIds.length,
          })
        : [];

    const virtualAccountMap = new Map<string, VirtualAccountDocument>();
    virtualAccounts.forEach((va) => virtualAccountMap.set(va.slashId, va));

    const cardGroupIds = [
      ...new Set(cards.map((c) => c.cardGroupId).filter(Boolean)),
    ];

    const cardGroups =
      cardGroupIds.length > 0
        ? await this.cardGroupRepository.find({
            filter: { slashId: { $in: cardGroupIds }, isDeleted: false },
            skip: 0,
            limit: cardGroupIds.length,
          })
        : [];

    const cardGroupMap = new Map<string, CardGroupDocument>();
    cardGroups.forEach((cg) => cardGroupMap.set(cg.slashId, cg));

    return cards.map((card) => {
      const cardData = card.toObject();
      const enriched: CardWithRelations = { ...cardData };

      const virtualAccount = virtualAccountMap.get(card.virtualAccountId);
      const cardGroup = cardGroupMap.get(card.cardGroupId || '');
      enriched.virtualAccount = virtualAccount
        ? {
            slashId: virtualAccount.slashId,
            name: virtualAccount.name,
          }
        : null;
      enriched.cardGroup = cardGroup
        ? {
            slashId: cardGroup.slashId,
            name: cardGroup.name,
          }
        : null;

      return enriched;
    });
  }
}

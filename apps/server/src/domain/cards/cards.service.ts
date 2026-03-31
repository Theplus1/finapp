import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CardRepository } from '../../database/repositories/card.repository';
import { CvvRevealRepository } from '../../database/repositories/cvv-reveal.repository';
import { VirtualAccountRepository } from '../../database/repositories/virtual-account.repository';
import { Card, CardDocument } from '../../database/schemas/card.schema';
import { VirtualAccountDocument } from '../../database/schemas/virtual-account.schema';
import {
  PaginationOptions,
  RepositoryQuery,
} from '../../common/types/repository-query.types';
import {
  CardCvvHistoryItem,
  CardWithRelations,
} from './types/card.types';
import { SortOrder } from '../../common/constants/pagination.constants';
import { CardGroupDocument } from 'src/database/schemas/card-group.schema';
import { CardGroupRepository } from 'src/database/repositories/card-group.repository';
import { CvvRevealDocument } from 'src/database/schemas/cvv-reveal.schema';
import {
  CardDto,
  CardStatus,
  SpendingConstraintDto,
} from '../../integrations/slash/dto/card.dto';
import { mapCardDtoToEntity } from '../../integrations/slash/utils/sync-mappers.util';
import {
  SYNC_CONSTANTS,
  SyncSource,
} from '../../integrations/slash/constants/sync.constants';
import { normalizeSpendingLimitForListResponse } from './utils/card-spending-limit-snapshot.util';

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
  slashId?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
  search?: string;
}

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);

  constructor(
    private readonly cardRepository: CardRepository,
    private readonly virtualAccountRepository: VirtualAccountRepository,
    private readonly cardGroupRepository: CardGroupRepository,
    private readonly cvvRevealRepository: CvvRevealRepository,
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

    if (filters.slashId) {
      mongoFilter.slashId = filters.slashId;
    }

    if (filters.search && filters.search.trim().length > 0) {
      const regex = new RegExp(filters.search.trim(), 'i');
      mongoFilter.$or = [
        { name: regex },
        { last4: regex },
      ];
    }

    return mongoFilter;
  }

  /**
   * Find card by ID with details (including virtual account)
   */
  async findBySlashIdWithDetails(slashId: string): Promise<CardDocument> {
    return await this.findBySlashId(slashId);
  }

  private buildCvvHistoriesByCardSlashId(
    reveals: CvvRevealDocument[],
  ): Map<string, CardCvvHistoryItem[]> {
    const buckets = new Map<string, CvvRevealDocument[]>();
    for (const r of reveals) {
      const list = buckets.get(r.cardSlashId) ?? [];
      list.push(r);
      buckets.set(r.cardSlashId, list);
    }
    const out = new Map<string, CardCvvHistoryItem[]>();
    for (const [cardSlashId, docs] of buckets) {
      const sorted = [...docs].sort((a, b) => {
        const tb = b.revealedAt.getTime();
        const ta = a.revealedAt.getTime();
        return tb - ta;
      });
      out.set(
        cardSlashId,
        sorted.map((d) => ({
          name: d.revealedByUsername,
          gettedAt: d.revealedAt.toISOString(),
        })),
      );
    }
    return out;
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

    const cardSlashIds = [
      ...new Set(cards.map((c) => c.slashId).filter(Boolean)),
    ];
    const cvvReveals =
      cardSlashIds.length > 0
        ? await this.cvvRevealRepository.findAllByCardSlashIds(cardSlashIds)
        : [];
    const cvvHistoriesMap = this.buildCvvHistoriesByCardSlashId(cvvReveals);

    return cards.map((card) => {
      const cardData = card.toObject();
      const enriched: CardWithRelations = {
        ...cardData,
        isRecurringOnly: cardData.isRecurringOnly ?? false,
        spendingLimit: normalizeSpendingLimitForListResponse(
          cardData.spendingLimit,
          cardData.spendingConstraint as SpendingConstraintDto | null | undefined,
        ),
        isLocked: cardData.status === CardStatus.PAUSED,
        cvvHistories: cvvHistoriesMap.get(card.slashId) ?? [],
      };

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

  /**
   * Overwrite card document from Slash (webhook/sync/manual) and merge additional fields (e.g. isRecurringOnly).
   */
  async syncCardDocumentFromSlashDto(
    cardDto: CardDto,
    syncSource: SyncSource = SYNC_CONSTANTS.SYNC_SOURCE.MANUAL,
    extra?: Partial<Pick<Card, 'isRecurringOnly'>>,
  ): Promise<void> {
    const entityData = mapCardDtoToEntity(cardDto, syncSource);
    await this.cardRepository.upsert(cardDto.id, { ...entityData, ...extra });
  }
}

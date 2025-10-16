import { Injectable, Logger } from '@nestjs/common';
import { CardGroupRepository } from '../../database/repositories/card-group.repository';
import { CardGroupDocument } from '../../database/schemas/card-group.schema';
import { PaginationOptions, RepositoryQuery } from '../../common/types/repository-query.types';
import { SortOrder } from '../../common/constants/pagination.constants';
import { CardGroupWithRelations } from './types/card-groups.types';
import { VirtualAccountRepository } from '../../database/repositories/virtual-account.repository';
import { VirtualAccountDocument } from '../../database/schemas/virtual-account.schema';

export interface CardGroupFilters {
  virtualAccountId?: string;
  name?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

@Injectable()
export class CardGroupsService {
  private readonly logger = new Logger(CardGroupsService.name);

  constructor(
    private readonly cardGroupRepository: CardGroupRepository,
    private readonly virtualAccountRepository: VirtualAccountRepository,
  ) { }

  async findAllWithFilters(
    filters: CardGroupFilters,
    pagination: PaginationOptions,
  ): Promise<[CardGroupWithRelations[], number]> {
    // Build MongoDB filter
    const mongoFilter: any = {
      isDeleted: false,
    };

    if (filters.virtualAccountId) {
      mongoFilter.virtualAccountId = filters.virtualAccountId;
    }

    if (filters.name) {
      mongoFilter.name = { $regex: filters.name, $options: 'i' };
    }

    // Build sort
    const sortField = filters.sortBy || 'createdAt';
    const sortDirection = filters.sortOrder === SortOrder.ASC ? 1 : -1;

    // Build query
    const query = {
      filter: mongoFilter,
      skip: (pagination.page - 1) * pagination.limit,
      limit: pagination.limit,
      sort: { [sortField]: sortDirection },
    };

    const [cardGroups, total] = await Promise.all([
      this.cardGroupRepository.find(query),
      this.cardGroupRepository.count(mongoFilter),
    ]);
    const enrichedCardGroups = await this.enrichCardGroups(cardGroups);

    return [enrichedCardGroups, total];
  }

  /**
   * Enrich cards with virtual account data
   * Uses batch queries to avoid N+1 problem
   */
  private async enrichCardGroups(cardGroups: CardGroupDocument[]): Promise<CardGroupWithRelations[]> {
    if (cardGroups.length === 0) {
      return [];
    }

    const virtualAccountIds = [...new Set(cardGroups.map(c => c.virtualAccountId).filter(Boolean))];

    const virtualAccounts = virtualAccountIds.length > 0
      ? await this.virtualAccountRepository.find({
        filter: { slashId: { $in: virtualAccountIds }, isDeleted: false },
        skip: 0,
        limit: virtualAccountIds.length,
      })
      : [];

    const virtualAccountMap = new Map<string, VirtualAccountDocument>();
    virtualAccounts.forEach(va => virtualAccountMap.set(va.slashId, va));

    return cardGroups.map(cardGroup => {
      const cardGroupData = cardGroup.toObject();
      const enriched: CardGroupWithRelations = { ...cardGroupData };

      const virtualAccount = virtualAccountMap.get(cardGroup.virtualAccountId);
      enriched.virtualAccount = virtualAccount ? {
        slashId: virtualAccount.slashId,
        name: virtualAccount.name,
      } : null;

      return enriched;
    });
  }
}

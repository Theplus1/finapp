import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CardRepository } from '../../slash/repositories/card.repository';
import { VirtualAccountRepository } from '../../slash/repositories/virtual-account.repository';
import { CardDocument } from '../../slash/schemas/card.schema';
import { CardQueryDto } from '../dto/card-query.dto';
import { SlashService } from '../../slash/slash.service';
import { CreateCardDto, UpdateCardDto } from '../../slash/dto/card.dto';
import { createPaginatedResponse } from '../../common/dto/api-response.dto';

export interface EnrichedCard {
  [key: string]: any;
  virtualAccount?: any;
}

export interface CardStats {
  total: number;
  byStatus: Record<string, number>;
  physical: number;
  virtual: number;
  singleUse: number;
}

export interface CardFilters {
  virtualAccountId?: string;
  status?: string;
  cardGroupId?: string;
}
@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);

  constructor(
    private readonly cardRepo: CardRepository,
    private readonly virtualAccountRepo: VirtualAccountRepository,
    private readonly slashService: SlashService,
  ) {}

  /**
   * Get cards with filters and pagination
   */
  async findAll(query: CardQueryDto) {
    this.logger.log(`Finding cards with query: ${JSON.stringify(query)}`);
    const filters = this.buildFilter(query);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.cardRepo.find({ ...filters, limit, skip }),
      this.cardRepo.count(filters),
    ]);

    return createPaginatedResponse(
      data,
      page,
      limit,
      total,
      'Cards retrieved successfully',
    );
  }

  /**
   * Get single card by ID
   */
  async findById(id: string): Promise<CardDocument> {
    const card = await this.cardRepo.findBySlashId(id);

    if (!card) {
      throw new NotFoundException(`Card ${id} not found`);
    }

    return card;
  }

  /**
   * Get card with related data (virtual account info)
   */
  async findByIdWithDetails(id: string): Promise<EnrichedCard> {
    const card = await this.findById(id);

    // Fetch related virtual account
    let virtualAccount = null;
    if (card.virtualAccountId) {
      virtualAccount = await this.virtualAccountRepo.findBySlashId(
        card.virtualAccountId,
      );
    }

    const cardData = card.toObject();
    return {
      ...cardData,
      virtualAccount: virtualAccount ? virtualAccount.toObject() : null,
    };
  }

  /**
   * Create a new card (proxy to Slash API)
   */
  async create(dto: CreateCardDto): Promise<CardDocument> {
    this.logger.log(`Creating card: ${JSON.stringify(dto)}`);

    // Call Slash API to create card
    const slashCard = await this.slashService.createCard(dto);

    // Save to local DB
    const card = await this.cardRepo.create({
      slashId: slashCard.id,
      virtualAccountId: slashCard.virtualAccountId,
      accountId: slashCard.accountId,
      legalEntityId: 'default', // Update based on your logic
      name: slashCard.name,
      last4: slashCard.last4,
      expiryMonth: slashCard.expiryMonth,
      expiryYear: slashCard.expiryYear,
      status: slashCard.status,
      isPhysical: slashCard.isPhysical,
      isSingleUse: slashCard.isSingleUse,
      cardGroupId: slashCard.cardGroupId,
      cardGroupName: 'default',
      spendingConstraint: slashCard.spendingConstraint,
      createdAt: new Date(slashCard.createdAt),
      updatedAt: new Date(slashCard.createdAt),
      syncSource: 'manual',
    });

    return card;
  }

  /**
   * Update card (proxy to Slash API)
   */
  async update(id: string, dto: UpdateCardDto): Promise<CardDocument> {
    this.logger.log(`Updating card ${id}: ${JSON.stringify(dto)}`);

    // Update in Slash API
    const updated = await this.slashService.updateCard(id, dto);

    // Update local DB
    await this.cardRepo.upsert(id, {
      name: updated.name,
      status: updated.status,
      spendingConstraint: updated.spendingConstraint,
      updatedAt: new Date(),
    });

    return this.findById(id);
  }

  /**
   * Get card statistics
   */
  async getStats(filters: Partial<CardQueryDto>): Promise<CardStats> {
    // Get all virtual accounts and aggregate card stats
    const allVAs = await this.virtualAccountRepo.findAll();
    const allCards: CardDocument[] = [];

    for (const va of allVAs) {
      const cards = await this.cardRepo.findByVirtualAccountId(va.slashId, {
        status: filters.status,
      });
      allCards.push(...cards);
    }

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
  private buildFilter(query: Partial<CardQueryDto>): CardFilters {
    const filter: CardFilters = {};

    if (query.virtualAccountId) {
      filter.virtualAccountId = query.virtualAccountId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.cardGroupId) {
      filter.cardGroupId = query.cardGroupId;
    }

    return filter;
  }
}

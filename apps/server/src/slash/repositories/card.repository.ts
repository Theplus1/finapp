import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Card, CardDocument } from '../schemas/card.schema';

@Injectable()
export class CardRepository {
  private readonly logger = new Logger(CardRepository.name);

  constructor(
    @InjectModel(Card.name) private cardModel: Model<CardDocument>,
  ) {}

  async create(cardData: Partial<Card>): Promise<CardDocument> {
    const card = new this.cardModel(cardData);
    return card.save();
  }

  async upsert(slashId: string, cardData: Partial<Card>): Promise<CardDocument> {
    return this.cardModel.findOneAndUpdate(
      { slashId },
      { 
        ...cardData, 
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true },
    ).exec();
  }

  async findBySlashId(slashId: string): Promise<CardDocument | null> {
    return this.cardModel.findOne({ slashId, isDeleted: false }).exec();
  }

  async findByVirtualAccountId(
    virtualAccountId: string,
    filters?: {
      status?: string;
      cardGroupId?: string;
      limit?: number;
      skip?: number;
    },
  ): Promise<CardDocument[]> {
    const query: FilterQuery<CardDocument> = {
      virtualAccountId,
      isDeleted: false,
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.cardGroupId) {
      query.cardGroupId = filters.cardGroupId;
    }

    let queryBuilder = this.cardModel.find(query).sort({ createdAt: -1 });

    if (filters?.skip) {
      queryBuilder = queryBuilder.skip(filters.skip);
    }

    if (filters?.limit) {
      queryBuilder = queryBuilder.limit(filters.limit);
    }

    return queryBuilder.exec();
  }

  async count(virtualAccountId: string, filters?: { status?: string }): Promise<number> {
    const query: FilterQuery<CardDocument> = {
      virtualAccountId,
      isDeleted: false,
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    return this.cardModel.countDocuments(query).exec();
  }

  async softDelete(slashId: string): Promise<void> {
    await this.cardModel.updateOne(
      { slashId },
      { isDeleted: true, lastSyncedAt: new Date() },
    ).exec();
  }

  async findStale(olderThanMinutes: number): Promise<CardDocument[]> {
    const staleDate = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    return this.cardModel
      .find({
        lastSyncedAt: { $lt: staleDate },
        isDeleted: false,
      })
      .limit(100)
      .exec();
  }

  async bulkUpsert(cards: Partial<Card>[]): Promise<void> {
    const bulkOps = cards.map((card) => ({
      updateOne: {
        filter: { slashId: card.slashId },
        update: { 
          $set: { 
            ...card, 
            lastSyncedAt: new Date() 
          } 
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await this.cardModel.bulkWrite(bulkOps);
    }
  }
}

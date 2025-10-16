import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Card, CardDocument } from '../schemas/card.schema';
import { RepositoryQuery } from '../../common/types/repository-query.types';

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

  /**
   * Generic find method with filters and pagination
   * Used by domain services for optimized queries
   */
  async find(query: RepositoryQuery): Promise<CardDocument[]> {
    return this.cardModel
      .find(query.filter)
      .skip(query.skip)
      .limit(query.limit)
      .sort(query.sort || { createdAt: -1 })
      .exec();
  }

  /**
   * Generic count method with filters
   * Used by domain services for pagination
   */
  async count(filter: any): Promise<number> {
    return this.cardModel.countDocuments(filter).exec();
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

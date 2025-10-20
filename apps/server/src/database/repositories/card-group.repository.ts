import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CardGroup, CardGroupDocument } from '../schemas/card-group.schema';
import { RepositoryQuery } from 'src/common/types/repository-query.types';

@Injectable()
export class CardGroupRepository {
  private readonly logger = new Logger(CardGroupRepository.name);

  constructor(
    @InjectModel(CardGroup.name)
    private cardGroupModel: Model<CardGroupDocument>,
  ) {}

  async create(cardGroupData: Partial<CardGroup>): Promise<CardGroupDocument> {
    const cardGroup = new this.cardGroupModel(cardGroupData);
    return cardGroup.save();
  }

  async upsert(
    slashId: string,
    cardGroupData: Partial<CardGroup>,
  ): Promise<CardGroupDocument> {
    return this.cardGroupModel
      .findOneAndUpdate(
        { slashId },
        {
          ...cardGroupData,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  async findBySlashId(slashId: string): Promise<CardGroupDocument | null> {
    return this.cardGroupModel.findOne({ slashId, isDeleted: false }).exec();
  }

  /**
   * Generic find method with filters and pagination
   */
  async find(query: RepositoryQuery): Promise<CardGroupDocument[]> {
    return this.cardGroupModel
      .find(query.filter)
      .skip(query.skip || 0)
      .limit(query.limit || 100)
      .sort(query.sort)
      .exec();
  }

  async findAll(): Promise<CardGroupDocument[]> {
    return this.cardGroupModel.find({ isDeleted: false }).exec();
  }

  /**
   * Generic count method with filters
   */
  async count(filter: any): Promise<number> {
    return this.cardGroupModel.countDocuments(filter).exec();
  }

  async softDelete(slashId: string): Promise<void> {
    await this.cardGroupModel
      .updateOne({ slashId }, { isDeleted: true, lastSyncedAt: new Date() })
      .exec();
  }

  async findStale(olderThanMinutes: number): Promise<CardGroupDocument[]> {
    const staleDate = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    return this.cardGroupModel
      .find({
        lastSyncedAt: { $lt: staleDate },
        isDeleted: false,
      })
      .limit(100)
      .exec();
  }

  async bulkUpsert(cardGroups: Partial<CardGroup>[]): Promise<void> {
    const bulkOps = cardGroups.map((cardGroup) => ({
      updateOne: {
        filter: { slashId: cardGroup.slashId },
        update: {
          $set: {
            ...cardGroup,
            lastSyncedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await this.cardGroupModel.bulkWrite(bulkOps);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CardActivity,
  CardActivityDocument,
  CardActivityAction,
} from '../schemas/card-activity.schema';

@Injectable()
export class CardActivityRepository {
  private readonly logger = new Logger(CardActivityRepository.name);

  constructor(
    @InjectModel(CardActivity.name)
    private readonly model: Model<CardActivityDocument>,
  ) {}

  async record(data: {
    cardSlashId: string;
    virtualAccountId: string;
    action: CardActivityAction;
    performedByUserId: string;
    performedByUsername: string;
    details?: Record<string, any>;
  }): Promise<CardActivityDocument> {
    const doc = new this.model({
      ...data,
      performedAt: new Date(),
    });
    return doc.save();
  }

  async findByCardSlashId(
    cardSlashId: string,
    page: number,
    limit: number,
  ): Promise<[CardActivityDocument[], number]> {
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? Math.min(limit, 100) : 20;

    const [items, total] = await Promise.all([
      this.model
        .find({ cardSlashId })
        .sort({ performedAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.model.countDocuments({ cardSlashId }).exec(),
    ]);

    return [items, total];
  }

  async countByCardSlashIds(
    cardSlashIds: string[],
  ): Promise<Map<string, number>> {
    if (cardSlashIds.length === 0) return new Map();
    const results = await this.model.aggregate([
      { $match: { cardSlashId: { $in: cardSlashIds } } },
      { $group: { _id: '$cardSlashId', count: { $sum: 1 } } },
    ]).exec();
    const map = new Map<string, number>();
    for (const r of results) {
      map.set(r._id, r.count);
    }
    return map;
  }
}

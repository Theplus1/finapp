import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DepositHistory,
  DepositHistoryDocument,
} from '../schemas/deposit-history.schema';

@Injectable()
export class DepositHistoryRepository {
  private readonly logger = new Logger(DepositHistoryRepository.name);

  constructor(
    @InjectModel(DepositHistory.name)
    private readonly model: Model<DepositHistoryDocument>,
  ) {}

  async create(entry: {
    virtualAccountId: string;
    date: Date;
    amountCents: number;
    currency: string;
    note?: string;
  }): Promise<DepositHistoryDocument> {
    const doc = new this.model(entry);
    return doc.save();
  }

  async sumByVirtualAccountAndDate(
    virtualAccountId: string,
    date: Date,
  ): Promise<number> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const result = await this.model
      .aggregate<{ total: number }>([
        {
          $match: {
            virtualAccountId,
            date: {
              $gte: start,
              $lt: end,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amountCents' },
          },
        },
      ])
      .exec();

    if (!result || result.length === 0) {
      return 0;
    }

    return result[0].total ?? 0;
  }

  /**
   * List deposit history for a VA with pagination (newest date first).
   * If `forDate` is provided, only records for that day are returned.
   */
  async findWithPagination(
    virtualAccountId: string,
    page: number,
    limit: number,
    forDate?: Date,
  ): Promise<[DepositHistoryDocument[], number]> {
    const skip = (page - 1) * limit;

    const baseFilter: any = { virtualAccountId };

    if (forDate) {
      const start = new Date(forDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      baseFilter.date = { $gte: start, $lt: end };
    }

    const [data, total] = await Promise.all([
      this.model
        .find(baseFilter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(baseFilter).exec(),
    ]);

    return [data, total];
  }

  async deleteById(id: string): Promise<DepositHistoryDocument | null> {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) {
      this.logger.warn(`No deposit history found to delete with id ${id}`);
      return null;
    }

    this.logger.log(
      `Deleted deposit history ${id} for VA ${doc.virtualAccountId} on ${doc.date.toISOString()}`,
    );

    return doc;
  }
}


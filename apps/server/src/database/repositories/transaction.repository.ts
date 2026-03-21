import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';

export interface TransactionFilters {
  virtualAccountId?: string;
  slashId?: string;
  cardId?: string;
  status?: string;
  detailedStatus?: string | any;
  amountCents?: number | any;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  merchantCategory?: string;
  merchantData?: any;
  limit?: number;
  skip?: number;
}

export interface CardSpendAggregateFilters {
  virtualAccountId: string;
  detailedStatuses: string[];
  startDate: Date;
  endDate: Date;
}

export interface CardSpendAggregateRow {
  cardId: string;
  day: string;
  amountCents: number;
  cardName: string;
  cardLast4?: string;
}

export interface CardSpendAggregateResult {
  rows: CardSpendAggregateRow[];
  currency?: string;
}

@Injectable()
export class TransactionRepository {
  private readonly logger = new Logger(TransactionRepository.name);

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  /**
   * Builds a MongoDB filter query from TransactionFilters
   * @param filters - The transaction filters to apply
   * @returns FilterQuery object for MongoDB
   */
  private buildFilterQuery(filters: Omit<TransactionFilters, 'limit' | 'skip'>): FilterQuery<TransactionDocument> {
    const query: FilterQuery<TransactionDocument> = {
      isDeleted: false,
    };

    if (filters.virtualAccountId) {
      query.virtualAccountId = filters.virtualAccountId;
    }

    if (filters.slashId) {
      query.slashId = filters.slashId;
    }

    if (filters.cardId) {
      query.cardId = filters.cardId;
    }

    if (filters.merchantData) {
      query.merchantData = filters.merchantData;
    }

    if (filters.detailedStatus) {
      query.detailedStatus = filters.detailedStatus;
    }

    if (filters.amountCents) {
      query.amountCents = filters.amountCents;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.date.$lte = filters.endDate;
      }
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      query.amountCents = {};
      if (filters.minAmount !== undefined) {
        query.amountCents.$gte = filters.minAmount;
      }
      if (filters.maxAmount !== undefined) {
        query.amountCents.$lte = filters.maxAmount;
      }
    }

    if (filters.merchantCategory) {
      query['merchantData.category'] = filters.merchantCategory;
    }

    return query;
  }

  async create(transactionData: Partial<Transaction>): Promise<TransactionDocument> {
    const transaction = new this.transactionModel(transactionData);
    return transaction.save();
  }

  async upsert(
    slashId: string,
    transactionData: Partial<Transaction>,
  ): Promise<TransactionDocument> {
    return this.transactionModel.findOneAndUpdate(
      { slashId },
      {
        ...transactionData,
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true },
    ).exec();
  }

  async findBySlashId(slashId: string): Promise<TransactionDocument | null> {
    return this.transactionModel
      .findOne({ slashId, isDeleted: false })
      .exec();
  }

  async find(filters: TransactionFilters): Promise<TransactionDocument[]> {
    const query = this.buildFilterQuery(filters);

    let queryBuilder = this.transactionModel.find(query).sort({ date: -1 });

    if (filters.skip) {
      queryBuilder = queryBuilder.skip(filters.skip);
    }

    if (filters.limit) {
      queryBuilder = queryBuilder.limit(filters.limit);
    }

    return queryBuilder.exec();
  }

  async count(filters: Omit<TransactionFilters, 'limit' | 'skip'>): Promise<number> {
    const query = this.buildFilterQuery(filters);
    return this.transactionModel.countDocuments(query).exec();
  }

  async findFirstByVirtualAccountId(
    virtualAccountId: string,
  ): Promise<TransactionDocument | null> {
    return this.transactionModel
      .findOne({ virtualAccountId, isDeleted: false })
      .sort({ date: 1 })
      .exec();
  }

  async aggregateCardSpendByCardAndDay(
    filters: CardSpendAggregateFilters,
  ): Promise<CardSpendAggregateResult> {
    type AggregateFacetResult = {
      grouped: CardSpendAggregateRow[];
      currency: Array<{ currency?: string }>;
    };
    type MatchStage = {
      isDeleted: boolean;
      virtualAccountId: string;
      detailedStatus: { $in: string[] };
      date: { $gte: Date; $lte: Date };
      cardId: { $exists: boolean; $ne: null };
    };

    const matchStage: MatchStage = {
      isDeleted: false,
      virtualAccountId: filters.virtualAccountId,
      detailedStatus: { $in: filters.detailedStatuses },
      date: { $gte: filters.startDate, $lte: filters.endDate },
      cardId: { $exists: true, $ne: null },
    };

    const [result] = await this.transactionModel.aggregate<AggregateFacetResult>([
      {
        $match: matchStage,
      },
      {
        $facet: {
          grouped: [
            {
              $lookup: {
                from: 'slash_cards',
                let: { txCardId: '$cardId' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$slashId', '$$txCardId'] },
                          { $ne: ['$isDeleted', true] },
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      slashId: 1,
                      name: 1,
                      last4: 1,
                    },
                  },
                ],
                as: 'card',
              },
            },
            {
              $unwind: {
                path: '$card',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $addFields: {
                day: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$date',
                    timezone: 'UTC',
                  },
                },
              },
            },
            {
              $group: {
                _id: {
                  cardId: '$cardId',
                  day: '$day',
                },
                amountCents: { $sum: { $abs: '$amountCents' } },
                cardName: {
                  $first: {
                    $ifNull: ['$card.name', '$cardId'],
                  },
                },
                cardLast4: {
                  $first: '$card.last4',
                },
              },
            },
            {
              $project: {
                _id: 0,
                cardId: '$_id.cardId',
                day: '$_id.day',
                amountCents: 1,
                cardName: 1,
                cardLast4: 1,
              },
            },
            {
              $sort: {
                day: 1,
                cardName: 1,
              },
            },
          ],
          currency: [
            {
              $project: {
                _id: 0,
                currency: {
                  $ifNull: ['$originalCurrency.code', '$currency'],
                },
              },
            },
            { $match: { currency: { $ne: null } } },
            { $limit: 1 },
          ],
        },
      },
    ]);

    return {
      rows: result?.grouped ?? [],
      currency: result?.currency?.[0]?.currency,
    };
  }

  async getSpendingByCategory(
    virtualAccountId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Array<{ category: string; totalCents: number; count: number }>> {
    const matchStage: any = {
      virtualAccountId,
      isDeleted: false,
      type: 'DEBIT',
    };

    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = startDate;
      if (endDate) matchStage.date.$lte = endDate;
    }

    return this.transactionModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$merchantData.category',
          totalCents: { $sum: '$amountCents' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalCents: 1,
          count: 1,
        },
      },
      { $sort: { totalCents: -1 } },
    ]);
  }

  async getMonthlySpending(
    virtualAccountId: string,
    year: number,
  ): Promise<Array<{ month: number; totalCents: number; count: number }>> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    return this.transactionModel.aggregate([
      {
        $match: {
          virtualAccountId,
          isDeleted: false,
          type: 'DEBIT',
          date: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: { $month: '$date' },
          totalCents: { $sum: '$amountCents' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          month: '$_id',
          totalCents: 1,
          count: 1,
        },
      },
      { $sort: { month: 1 } },
    ]);
  }

  async softDelete(slashId: string): Promise<void> {
    await this.transactionModel.updateOne(
      { slashId },
      { isDeleted: true, lastSyncedAt: new Date() },
    ).exec();
  }

  async findStale(olderThanMinutes: number): Promise<TransactionDocument[]> {
    const staleDate = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    return this.transactionModel
      .find({
        lastSyncedAt: { $lt: staleDate },
        isDeleted: false,
      })
      .limit(100)
      .exec();
  }

  async bulkUpsert(transactions: Partial<Transaction>[]): Promise<void> {
    const bulkOps = transactions.map((transaction) => ({
      updateOne: {
        filter: { slashId: transaction.slashId },
        update: {
          $set: {
            ...transaction,
            lastSyncedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await this.transactionModel.bulkWrite(bulkOps);
    }
  }
}

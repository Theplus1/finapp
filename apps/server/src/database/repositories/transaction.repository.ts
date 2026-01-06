import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';

export interface TransactionFilters {
  virtualAccountId?: string;
  cardId?: string;
  status?: string;
  detailedStatus?: string;
  amountCents?: number;
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

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VirtualAccount, VirtualAccountDocument } from '../schemas/virtual-account.schema';
import { RepositoryQuery } from '../../common/types/repository-query.types';

@Injectable()
export class VirtualAccountRepository {
  private readonly logger = new Logger(VirtualAccountRepository.name);

  constructor(
    @InjectModel(VirtualAccount.name)
    private virtualAccountModel: Model<VirtualAccountDocument>,
  ) {}

  async create(accountData: Partial<VirtualAccount>): Promise<VirtualAccountDocument> {
    const account = new this.virtualAccountModel(accountData);
    return account.save();
  }

  async upsert(
    slashId: string,
    accountData: Partial<VirtualAccount>,
  ): Promise<VirtualAccountDocument> {
    return this.virtualAccountModel.findOneAndUpdate(
      { slashId },
      {
        ...accountData,
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true },
    ).exec();
  }

  async findBySlashId(slashId: string): Promise<VirtualAccountDocument | null> {
    return this.virtualAccountModel
      .findOne({ slashId, isDeleted: false })
      .exec();
  }

  async findById(id: string): Promise<VirtualAccountDocument | null> {
    return this.virtualAccountModel
      .findOne({ _id: id, isDeleted: false })
      .exec();
  }

  async findByAccountId(accountId: string): Promise<VirtualAccountDocument[]> {
    return this.virtualAccountModel
      .find({ accountId, isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAll(): Promise<VirtualAccountDocument[]> {
    return this.virtualAccountModel
      .find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Generic find method with filters and pagination
   * Used by domain services for optimized queries
   */
  async find(query: RepositoryQuery): Promise<VirtualAccountDocument[]> {
    let queryBuilder = this.virtualAccountModel
      .find(query.filter)
      .sort(query.sort || { createdAt: -1 });
    
    if (query.skip) {
      queryBuilder = queryBuilder.skip(query.skip);
    }
    if (query.limit) {
      queryBuilder = queryBuilder.limit(query.limit);
    }

    return queryBuilder.exec();
  }

  /**
   * Generic count method with filters
   * Used by domain services for pagination
   */
  async count(filter: any): Promise<number> {
    return this.virtualAccountModel.countDocuments(filter).exec();
  }

  async updateBalance(
    slashId: string,
    balanceCents: number,
    availableBalanceCents?: number,
    pendingBalanceCents?: number,
  ): Promise<void> {
    const updateData: any = {
      balanceCents,
      lastSyncedAt: new Date(),
    };

    if (availableBalanceCents !== undefined) {
      updateData.availableBalanceCents = availableBalanceCents;
    }

    if (pendingBalanceCents !== undefined) {
      updateData.pendingBalanceCents = pendingBalanceCents;
    }

    await this.virtualAccountModel.updateOne({ slashId }, updateData).exec();
  }

  async updateTransferNetChange(slashId: string, transferNetChange: number): Promise<void> {
    await this.virtualAccountModel
      .updateOne(
        { slashId },
        {
          transferNetChange,
          lastSyncedAt: new Date(),
        },
      )
      .exec();
  }

  async softDelete(slashId: string): Promise<void> {
    await this.virtualAccountModel.updateOne(
      { slashId },
      { isDeleted: true, lastSyncedAt: new Date() },
    ).exec();
  }

  async findStale(olderThanMinutes: number): Promise<VirtualAccountDocument[]> {
    const staleDate = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    return this.virtualAccountModel
      .find({
        lastSyncedAt: { $lt: staleDate },
        isDeleted: false,
      })
      .limit(100)
      .exec();
  }

  async bulkUpsert(accounts: Partial<VirtualAccount>[]): Promise<void> {
    const bulkOps = accounts.map((account) => ({
      updateOne: {
        filter: { slashId: account.slashId },
        update: {
          $set: {
            ...account,
            lastSyncedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await this.virtualAccountModel.bulkWrite(bulkOps);
    }
  }
}

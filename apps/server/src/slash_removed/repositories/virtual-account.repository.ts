import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VirtualAccount, VirtualAccountDocument } from '../schemas/virtual-account.schema';

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

  // ===== User Linking Methods =====

  /**
   * Link a virtual account to a user (by MongoDB ID)
   */
  async linkToUser(
    id: string,
    telegramId: number,
    userId?: string,
    linkedBy?: string,
  ): Promise<VirtualAccountDocument | null> {
    return this.virtualAccountModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $set: {
          linkedTelegramId: telegramId,
          linkedUserId: userId,
          linkedAt: new Date(),
          linkedBy,
        },
      },
      { new: true },
    ).exec();
  }

  /**
   * Unlink a virtual account from a user (by MongoDB ID)
   */
  async unlinkFromUser(id: string): Promise<VirtualAccountDocument | null> {
    return this.virtualAccountModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $unset: {
          linkedTelegramId: '',
          linkedUserId: '',
          linkedAt: '',
          linkedBy: '',
        },
      },
      { new: true },
    ).exec();
  }

  /**
   * Find virtual account by linked telegram ID
   */
  async findByLinkedTelegramId(telegramId: number): Promise<VirtualAccountDocument | null> {
    return this.virtualAccountModel
      .findOne({ linkedTelegramId: telegramId, isDeleted: false })
      .exec();
  }

  /**
   * Find all unlinked virtual accounts
   */
  async findUnlinked(): Promise<VirtualAccountDocument[]> {
    return this.virtualAccountModel
      .find({
        linkedTelegramId: { $exists: false },
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find all linked virtual accounts
   */
  async findLinked(): Promise<VirtualAccountDocument[]> {
    return this.virtualAccountModel
      .find({
        linkedTelegramId: { $exists: true },
        isDeleted: false,
      })
      .sort({ linkedAt: -1 })
      .exec();
  }

  /**
   * Check if telegram ID already has a linked account
   */
  async hasLinkedAccount(telegramId: number): Promise<boolean> {
    const count = await this.virtualAccountModel
      .countDocuments({ linkedTelegramId: telegramId, isDeleted: false })
      .exec();
    return count > 0;
  }
}

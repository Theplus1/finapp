import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SlashApiService } from './slash-api.service';
import { CardRepository } from '../../../database/repositories/card.repository';
import { TransactionRepository } from '../../../database/repositories/transaction.repository';
import { VirtualAccountRepository } from '../../../database/repositories/virtual-account.repository';
import { SyncLog, SyncLogDocument } from '../../../database/schemas/sync-log.schema';
import { CardDto } from '../dto/card.dto';
import { TransactionDto } from '../dto/transaction.dto';
import { VirtualAccountDto } from '../dto/account.dto';
import {
  SYNC_CONSTANTS,
  EntityType,
  SyncType,
  SyncStatus,
} from '../constants/sync.constants';
import {
  mapCardDtoToEntity,
  mapTransactionDtoToEntity,
  mapVirtualAccountDtoToEntity,
  mapVirtualAccountWithDetailsDtoToEntity,
} from '../utils/sync-mappers.util';
import {
  SyncStats,
  SyncResult,
  DateRangeFilter,
} from '../interfaces/sync.interface';

/**
 * Slash Sync Service
 * Handles synchronization of data from Slash API to local database
 */
@Injectable()
export class SlashSyncService {
  private readonly logger = new Logger(SlashSyncService.name);

  constructor(
    private readonly slashApiService: SlashApiService,
    private readonly cardRepository: CardRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly virtualAccountRepository: VirtualAccountRepository,
    @InjectModel(SyncLog.name) private syncLogModel: Model<SyncLogDocument>,
  ) {}

  // ==================== Webhook Sync Methods ====================

  /**
   * Sync card from webhook event
   */
  async syncCardFromWebhook(cardData: CardDto): Promise<void> {
    try {
      const entityData = mapCardDtoToEntity(cardData, SYNC_CONSTANTS.SYNC_SOURCE.WEBHOOK);
      await this.cardRepository.upsert(cardData.id, entityData);
      this.logger.log(`Synced card ${cardData.id} from webhook`);
    } catch (error) {
      this.logger.error(`Error syncing card ${cardData.id} from webhook:`, error);
      throw error;
    }
  }

  /**
   * Sync transaction from webhook event
   */
  async syncTransactionFromWebhook(transactionData: TransactionDto): Promise<void> {
    try {
      const entityData = mapTransactionDtoToEntity(transactionData, SYNC_CONSTANTS.SYNC_SOURCE.WEBHOOK);
      await this.transactionRepository.upsert(transactionData.id, entityData);
      this.logger.log(`Synced transaction ${transactionData.id} from webhook`);
    } catch (error) {
      this.logger.error(`Error syncing transaction ${transactionData.id} from webhook:`, error);
      throw error;
    }
  }

  /**
   * Sync virtual account from webhook event
   */
  async syncVirtualAccountFromWebhook(accountData: VirtualAccountDto): Promise<void> {
    try {
      const entityData = mapVirtualAccountDtoToEntity(accountData, SYNC_CONSTANTS.SYNC_SOURCE.WEBHOOK);
      await this.virtualAccountRepository.upsert(accountData.id, entityData);
      this.logger.log(`Synced virtual account ${accountData.id} from webhook`);
    } catch (error) {
      this.logger.error(`Error syncing virtual account ${accountData.id} from webhook:`, error);
      throw error;
    }
  }

  // ==================== Scheduled Sync Methods ====================

  /**
   * Full sync of all cards
   */
  async syncAllCards(): Promise<void> {
    const syncLog = await this.createSyncLog(
      SYNC_CONSTANTS.ENTITY_TYPE.CARD,
      SYNC_CONSTANTS.SYNC_TYPE.SCHEDULED_FULL,
    );

    try {
      const result = await this.syncCardsWithPagination();
      
      await this.completeSyncLog(syncLog._id as Types.ObjectId, SYNC_CONSTANTS.SYNC_STATUS.COMPLETED, {
        recordsProcessed: result.totalProcessed,
        recordsCreated: result.totalCreated,
        recordsUpdated: result.totalUpdated,
        recordsFailed: result.totalFailed,
      });

      this.logger.log(
        `Completed full card sync: ${result.totalProcessed} processed, ` +
        `${result.totalCreated} created, ${result.totalUpdated} updated, ${result.totalFailed} failed`,
      );
    } catch (error) {
      await this.failSyncLog(syncLog._id as Types.ObjectId, error.message);
      this.logger.error('Error during full card sync:', error);
      throw error;
    }
  }

  /**
   * Sync cards with cursor-based pagination
   */
  private async syncCardsWithPagination(): Promise<SyncResult> {
    let cursor: string | undefined;
    const result: SyncResult = {
      totalProcessed: 0,
      totalCreated: 0,
      totalUpdated: 0,
      totalFailed: 0,
    };

    do {
      const response = await this.slashApiService.listCards({ cursor });
      
      if (response.items && response.items.length > 0) {
        for (const card of response.items) {
          const itemResult = await this.syncSingleCard(card);
          result.totalProcessed++;
          if (itemResult.created) result.totalCreated++;
          if (itemResult.updated) result.totalUpdated++;
          if (itemResult.failed) result.totalFailed++;
        }
      }

      cursor = response.metadata?.nextCursor;
    } while (cursor);

    return result;
  }

  /**
   * Sync a single card
   */
  private async syncSingleCard(card: CardDto): Promise<{ created: boolean; updated: boolean; failed: boolean }> {
    try {
      const existing = await this.cardRepository.findBySlashId(card.id);
      const entityData = mapCardDtoToEntity(card, SYNC_CONSTANTS.SYNC_SOURCE.SCHEDULED);
      
      await this.cardRepository.upsert(card.id, entityData);
      
      return {
        created: !existing,
        updated: !!existing,
        failed: false,
      };
    } catch (error) {
      this.logger.error(`Error syncing card ${card.id}:`, error);
      return { created: false, updated: false, failed: true };
    }
  }

  /**
   * Full sync of all transactions
   */
  async syncAllTransactions(startDate?: Date, endDate?: Date): Promise<void> {
    const syncLog = await this.createSyncLog(
      SYNC_CONSTANTS.ENTITY_TYPE.TRANSACTION,
      SYNC_CONSTANTS.SYNC_TYPE.SCHEDULED_FULL,
    );

    try {
      const result = await this.syncTransactionsForAllAccounts({ startDate, endDate });
      
      await this.completeSyncLog(syncLog._id as Types.ObjectId, SYNC_CONSTANTS.SYNC_STATUS.COMPLETED, {
        recordsProcessed: result.totalProcessed,
        recordsCreated: result.totalCreated,
        recordsUpdated: result.totalUpdated,
        recordsFailed: result.totalFailed,
      });

      this.logger.log(
        `Completed full transaction sync: ${result.totalProcessed} processed, ` +
        `${result.totalCreated} created, ${result.totalUpdated} updated, ${result.totalFailed} failed`,
      );
    } catch (error) {
      await this.failSyncLog(syncLog._id as Types.ObjectId, error.message);
      this.logger.error('Error during full transaction sync:', error);
      throw error;
    }
  }

  /**
   * Sync transactions for all virtual accounts
   */
  private async syncTransactionsForAllAccounts(filter: DateRangeFilter): Promise<SyncResult> {
    const result: SyncResult = {
      totalProcessed: 0,
      totalCreated: 0,
      totalUpdated: 0,
      totalFailed: 0,
    };

    const virtualAccounts = await this.virtualAccountRepository.findAll();

    for (const virtualAccount of virtualAccounts) {
      const accountResult = await this.syncTransactionsForAccount(virtualAccount.slashId, filter);
      result.totalProcessed += accountResult.totalProcessed;
      result.totalCreated += accountResult.totalCreated;
      result.totalUpdated += accountResult.totalUpdated;
      result.totalFailed += accountResult.totalFailed;
    }

    return result;
  }

  /**
   * Sync transactions for a specific account with pagination
   */
  private async syncTransactionsForAccount(
    virtualAccountId: string,
    filter: DateRangeFilter,
  ): Promise<SyncResult> {
    const result: SyncResult = {
      totalProcessed: 0,
      totalCreated: 0,
      totalUpdated: 0,
      totalFailed: 0,
    };

    let cursor: string | undefined;

    do {
      try {
        const response = await this.slashApiService.listTransactions({
          'filter:virtualAccountId': virtualAccountId,
          'filter:from_date': filter.startDate?.getTime(), // Convert to Unix timestamp in milliseconds
          'filter:to_date': filter.endDate?.getTime(), // Convert to Unix timestamp in milliseconds
          cursor,
        });

        if (response.items && response.items.length > 0) {
          for (const transaction of response.items) {
            const itemResult = await this.syncSingleTransaction(transaction);
            result.totalProcessed++;
            if (itemResult.created) result.totalCreated++;
            if (itemResult.updated) result.totalUpdated++;
            if (itemResult.failed) result.totalFailed++;
          }
        }

        cursor = response.metadata?.nextCursor;
      } catch (error) {
        this.logger.error(`Error fetching transactions for account ${virtualAccountId}:`, error);
        cursor = undefined; // Stop pagination on error
      }
    } while (cursor);

    return result;
  }

  /**
   * Sync a single transaction
   */
  private async syncSingleTransaction(
    transaction: TransactionDto,
  ): Promise<{ created: boolean; updated: boolean; failed: boolean }> {
    try {
      const existing = await this.transactionRepository.findBySlashId(transaction.id);
      const entityData = mapTransactionDtoToEntity(transaction, SYNC_CONSTANTS.SYNC_SOURCE.SCHEDULED);
      
      await this.transactionRepository.upsert(transaction.id, entityData);
      
      return {
        created: !existing,
        updated: !!existing,
        failed: false,
      };
    } catch (error) {
      this.logger.error(`Error syncing transaction ${transaction.id}:`, error);
      return { created: false, updated: false, failed: true };
    }
  }

  /**
   * Incremental sync - only sync recent transactions
   */
  async syncRecentTransactions(hoursBack: number = SYNC_CONSTANTS.DEFAULT_HOURS_BACK): Promise<void> {
    const syncLog = await this.createSyncLog(
      SYNC_CONSTANTS.ENTITY_TYPE.TRANSACTION,
      SYNC_CONSTANTS.SYNC_TYPE.SCHEDULED_INCREMENTAL,
    );
    const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    try {
      await this.syncAllTransactions(startDate);
      await this.completeSyncLog(syncLog._id as Types.ObjectId, SYNC_CONSTANTS.SYNC_STATUS.COMPLETED, {});
    } catch (error) {
      await this.failSyncLog(syncLog._id as Types.ObjectId, error.message);
      throw error;
    }
  }

  /**
   * Sync all virtual accounts
   */
  async syncAllVirtualAccounts(): Promise<void> {
    const syncLog = await this.createSyncLog(
      SYNC_CONSTANTS.ENTITY_TYPE.VIRTUAL_ACCOUNT,
      SYNC_CONSTANTS.SYNC_TYPE.SCHEDULED_FULL,
    );

    try {
      const result = await this.syncVirtualAccountsWithPagination();
      
      await this.completeSyncLog(syncLog._id as Types.ObjectId, SYNC_CONSTANTS.SYNC_STATUS.COMPLETED, {
        recordsProcessed: result.totalProcessed,
        recordsCreated: result.totalCreated,
        recordsUpdated: result.totalUpdated,
        recordsFailed: result.totalFailed,
      });

      this.logger.log(
        `Completed full virtual account sync: ${result.totalProcessed} processed, ` +
        `${result.totalCreated} created, ${result.totalUpdated} updated, ${result.totalFailed} failed`,
      );
    } catch (error) {
      await this.failSyncLog(syncLog._id as Types.ObjectId, error.message);
      this.logger.error('Error during full virtual account sync:', error);
      throw error;
    }
  }

  /**
   * Sync virtual accounts with cursor-based pagination
   */
  private async syncVirtualAccountsWithPagination(): Promise<SyncResult> {
    let cursor: string | undefined;
    const result: SyncResult = {
      totalProcessed: 0,
      totalCreated: 0,
      totalUpdated: 0,
      totalFailed: 0,
    };

    do {
      const response = await this.slashApiService.listVirtualAccounts({ cursor });

      if (response.items && response.items.length > 0) {
        for (const item of response.items) {
          const itemResult = await this.syncSingleVirtualAccount(item);
          result.totalProcessed++;
          if (itemResult.created) result.totalCreated++;
          if (itemResult.updated) result.totalUpdated++;
          if (itemResult.failed) result.totalFailed++;
        }
      }

      cursor = response.metadata?.nextCursor;
    } while (cursor);

    return result;
  }

  /**
   * Sync a single virtual account
   */
  private async syncSingleVirtualAccount(
    item: any,
  ): Promise<{ created: boolean; updated: boolean; failed: boolean }> {
    try {
      const va = item.virtualAccount;
      const existing = await this.virtualAccountRepository.findBySlashId(va.id);
      const entityData = mapVirtualAccountWithDetailsDtoToEntity(item, SYNC_CONSTANTS.SYNC_SOURCE.SCHEDULED);
      
      await this.virtualAccountRepository.upsert(va.id, entityData);
      
      return {
        created: !existing,
        updated: !!existing,
        failed: false,
      };
    } catch (error) {
      this.logger.error(`Error syncing virtual account ${item.virtualAccount.id}:`, error);
      return { created: false, updated: false, failed: true };
    }
  }

  // ==================== Sync Log Helpers ====================

  private async createSyncLog(
    entityType: EntityType,
    syncType: SyncType,
  ): Promise<SyncLogDocument> {
    const syncLog = new this.syncLogModel({
      entityType,
      syncType,
      status: SYNC_CONSTANTS.SYNC_STATUS.STARTED,
      startedAt: new Date(),
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
    });

    return syncLog.save();
  }

  private async completeSyncLog(
    syncLogId: Types.ObjectId,
    status: Extract<SyncStatus, 'completed' | 'partial'>,
    stats: SyncStats,
  ): Promise<void> {
    await this.syncLogModel.updateOne(
      { _id: syncLogId },
      {
        status,
        completedAt: new Date(),
        ...stats,
      },
    );
  }

  private async failSyncLog(syncLogId: Types.ObjectId, error: string): Promise<void> {
    await this.syncLogModel.updateOne(
      { _id: syncLogId },
      {
        status: SYNC_CONSTANTS.SYNC_STATUS.FAILED,
        completedAt: new Date(),
        error,
      },
    );
  }

  // ==================== Utility Methods ====================

  /**
   * Get sync statistics
   */
  async getSyncStats(entityType?: string): Promise<any> {
    const query: any = {};
    if (entityType) {
      query.entityType = entityType;
    }

    const recentLogs = await this.syncLogModel
      .find(query)
      .sort({ startedAt: -1 })
      .limit(10)
      .exec();

    return {
      recentSyncs: recentLogs,
      totalSyncs: await this.syncLogModel.countDocuments(query),
      failedSyncs: await this.syncLogModel.countDocuments({ ...query, status: 'failed' }),
    };
  }
}

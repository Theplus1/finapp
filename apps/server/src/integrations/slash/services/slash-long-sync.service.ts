import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SlashApiService } from './slash-api.service';
import { TransactionRepository } from '../../../database/repositories/transaction.repository';
import { VirtualAccountRepository } from '../../../database/repositories/virtual-account.repository';
import { SyncCheckpoint, SyncCheckpointDocument } from '../../../database/schemas/sync-checkpoint.schema';
import { TransactionDto } from '../dto/transaction.dto';
import { mapTransactionDtoToEntity } from '../utils/sync-mappers.util';
import { SYNC_CONSTANTS } from '../constants/sync.constants';
import { delay } from '../../../common/utils/async.util';
import { DailyPaymentSummariesService } from '../../../domain/daily-payment-summaries/daily-payment-summaries.service';

export interface LongSyncOptions {
  monthsBack: number;
  batchSize?: number;
  delayBetweenBatches?: number;
  heartbeatInterval?: number;
}

export interface SyncProgress {
  syncId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  totalProcessed: number;
  totalCreated: number;
  totalUpdated: number;
  totalFailed: number;
  startDate?: Date;
  endDate?: Date;
  lastProcessedCursor?: string;
  lastHeartbeat: Date;
  errorMessage?: string;
}

@Injectable()
export class SlashLongSyncService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(SlashLongSyncService.name);
  private activeSyncs = new Map<string, NodeJS.Timeout>();
  private cancelledSyncs = new Set<string>();
  private shutdownRequested = false;
  private signalHandlersRegistered = false;

  // Auto-resume safeguards — keep them conservative so we never hammer Slash
  // or revive truly dead jobs after a long outage.
  private static readonly AUTO_RESUME_STARTUP_DELAY_MS = 10_000;
  private static readonly AUTO_RESUME_STALE_CUTOFF_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly AUTO_RESUME_STAGGER_MS = 30_000;
  private static readonly AUTO_RESUME_MAX_JOBS_PER_BOOT = 10;

  constructor(
    private readonly slashApiService: SlashApiService,
    private readonly transactionRepository: TransactionRepository,
    private readonly virtualAccountRepository: VirtualAccountRepository,
    private readonly dailyPaymentSummariesService: DailyPaymentSummariesService,
    @InjectModel(SyncCheckpoint.name) private syncCheckpointModel: Model<SyncCheckpointDocument>,
  ) {
    this.setupGracefulShutdown();
  }

  async onModuleDestroy() {
    this.logger.warn('Module destroying - pausing all active syncs');
    this.shutdownRequested = true;

    for (const [syncId, heartbeatTimer] of this.activeSyncs.entries()) {
      clearInterval(heartbeatTimer);
      await this.pauseSync(syncId);
    }
  }

  /**
   * Automatically resume long-sync jobs that were paused by a previous shutdown
   * (e.g. a CI/CD redeploy). Without this hook the job sits paused forever until
   * someone hits the resume endpoint manually.
   *
   * Safeguards (see constants above):
   *   - Fire-and-forget: bootstrap returns immediately so startup is not blocked.
   *   - Startup grace period: wait for Mongo/Slash/config to be warmed up.
   *   - Stale cutoff: never revive a job whose heartbeat is older than 24h
   *     (cursor may have expired on Slash side; needs manual intervention).
   *   - Sequential resumes with stagger: avoids thundering-herd into Slash API.
   *   - Hard cap on jobs per boot: if many are paused, something is wrong and
   *     auto-resume should not become a retry bomb.
   *   - Env kill switch: LONG_SYNC_AUTO_RESUME=false disables this entirely.
   *   - Errors per job are swallowed (log warn) so one bad checkpoint does not
   *     block the others.
   */
  onApplicationBootstrap() {
    if (process.env.LONG_SYNC_AUTO_RESUME === 'false') {
      this.logger.log('Long-sync auto-resume on bootstrap is disabled via env');
      return;
    }
    // Fire and forget — we deliberately do not await so Nest bootstrap finishes fast.
    this.autoResumePausedSyncs().catch((err) => {
      this.logger.error('Auto-resume bootstrap handler failed:', err);
    });
  }

  private async autoResumePausedSyncs(): Promise<void> {
    await delay(SlashLongSyncService.AUTO_RESUME_STARTUP_DELAY_MS);

    if (this.shutdownRequested) {
      this.logger.warn('Shutdown requested during bootstrap grace period — skipping auto-resume');
      return;
    }

    const cutoff = new Date(Date.now() - SlashLongSyncService.AUTO_RESUME_STALE_CUTOFF_MS);

    const candidates = await this.syncCheckpointModel
      .find({
        status: 'paused',
        lastHeartbeat: { $gte: cutoff },
      })
      .sort({ lastHeartbeat: -1 })
      .limit(SlashLongSyncService.AUTO_RESUME_MAX_JOBS_PER_BOOT)
      .exec();

    // Also log (but do not resume) any stale paused jobs so operators know.
    const stale = await this.syncCheckpointModel
      .countDocuments({
        status: 'paused',
        lastHeartbeat: { $lt: cutoff },
      })
      .exec();
    if (stale > 0) {
      this.logger.warn(
        `Auto-resume skipped ${stale} stale paused job(s) (heartbeat older than 24h). Investigate manually.`,
      );
    }

    if (candidates.length === 0) {
      this.logger.log('Auto-resume: no eligible paused long-sync jobs found');
      return;
    }

    this.logger.log(
      `Auto-resume: found ${candidates.length} paused long-sync job(s) to resume sequentially`,
    );

    for (const cp of candidates) {
      if (this.shutdownRequested) {
        this.logger.warn('Shutdown requested — aborting auto-resume loop');
        return;
      }
      try {
        this.logger.log(
          `Auto-resume: resuming ${cp.syncId} (processed=${cp.totalProcessed}, lastHeartbeat=${cp.lastHeartbeat?.toISOString?.() ?? 'unknown'})`,
        );
        await this.resumeSync(cp.syncId);
        // Stagger subsequent resumes so we do not spike Slash API concurrency.
        await delay(SlashLongSyncService.AUTO_RESUME_STAGGER_MS);
      } catch (error) {
        this.logger.warn(
          `Auto-resume: failed to resume ${cp.syncId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue with remaining candidates — do not bail the whole hook.
      }
    }
  }

  private setupGracefulShutdown() {
    if (this.signalHandlersRegistered) {
      return;
    }

    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        this.logger.warn(`${signal} received - gracefully shutting down syncs`);
        this.shutdownRequested = true;
        
        for (const [syncId, heartbeatTimer] of this.activeSyncs.entries()) {
          clearInterval(heartbeatTimer);
          await this.pauseSync(syncId);
        }
      });
    });

    this.signalHandlersRegistered = true;
  }

  async startLongSync(options: LongSyncOptions): Promise<{ syncId: string; message: string }> {
    const syncId = `long-sync-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - options.monthsBack);

    const checkpoint = await this.createCheckpoint(syncId, startDate, endDate);
    
    this.executeLongSync(syncId, options, checkpoint).catch(error => {
      this.logger.error(`Long sync ${syncId} failed:`, error);
    });

    return {
      syncId,
      message: `Long sync started for ${options.monthsBack} months back. Use syncId to check progress.`,
    };
  }

  async resumeSync(syncId: string, options?: Partial<LongSyncOptions>): Promise<{ message: string }> {
    const checkpoint = await this.syncCheckpointModel.findOne({ syncId }).exec();
    
    if (!checkpoint) {
      throw new Error(`Checkpoint not found for syncId: ${syncId}`);
    }

    if (checkpoint.status === 'completed') {
      throw new Error(`Sync ${syncId} is already completed`);
    }

    if (checkpoint.status === 'running') {
      throw new Error(`Sync ${syncId} is already running`);
    }

    const updated = await this.syncCheckpointModel.findOneAndUpdate(
      { syncId, status: { $ne: 'running' } },
      { $set: { status: 'running', errorMessage: undefined } },
      { new: true },
    ).exec();

    if (!updated) {
      throw new Error(`Sync ${syncId} is already running or was modified`);
    }

    const syncOptions: LongSyncOptions = {
      monthsBack: 0,
      batchSize: options?.batchSize || 100,
      delayBetweenBatches: options?.delayBetweenBatches || 10000,
      heartbeatInterval: options?.heartbeatInterval || 30000,
    };

    this.executeLongSync(syncId, syncOptions, updated).catch(error => {
      this.logger.error(`Resumed sync ${syncId} failed:`, error);
    });

    return { message: `Sync ${syncId} resumed from checkpoint` };
  }

  private async executeLongSync(
    syncId: string,
    options: LongSyncOptions,
    checkpoint: SyncCheckpointDocument,
  ): Promise<void> {
    const heartbeatInterval = options.heartbeatInterval || 30000;
    const delayBetweenBatches = options.delayBetweenBatches || 10000;

    const heartbeatTimer = setInterval(async () => {
      try {
        await this.updateHeartbeat(syncId);
      } catch (error) {
        this.logger.error(`Heartbeat update failed for sync ${syncId}:`, error);
      }
    }, heartbeatInterval);

    this.activeSyncs.set(syncId, heartbeatTimer);

    try {
      let cursor: string | undefined = checkpoint.lastProcessedCursor;
      let totalProcessed = checkpoint.totalProcessed;
      let totalCreated = checkpoint.totalCreated;
      let totalUpdated = checkpoint.totalUpdated;
      let totalFailed = checkpoint.totalFailed;

      this.logger.log(`Starting long sync ${syncId} from cursor: ${cursor || 'beginning'}`);

      do {
        if (this.shutdownRequested) {
          this.logger.warn(`Shutdown requested - pausing sync ${syncId}`);
          await this.pauseSync(syncId);
          clearInterval(heartbeatTimer);
          this.activeSyncs.delete(syncId);
          return;
        }

        if (this.cancelledSyncs.has(syncId)) {
          this.logger.warn(`Sync ${syncId} was cancelled - stopping`);
          clearInterval(heartbeatTimer);
          this.activeSyncs.delete(syncId);
          this.cancelledSyncs.delete(syncId);
          return;
        }

        try {
          const response = await this.slashApiService.listTransactions({
            'filter:from_date': checkpoint.startDate?.getTime(),
            'filter:to_date': checkpoint.endDate?.getTime(),
            cursor,
          });

          if (response.items && response.items.length > 0) {
            // Track (virtualAccountId, date) pairs affected by this batch so we can
            // recalculate the corresponding daily_payment_summaries immediately after upsert.
            // Without this, the cron recalculating only the last 2 days would leave historical
            // summaries frozen with stale values whenever long-sync backfills older data.
            const affectedSummaries = new Map<string, Set<string>>();

            for (const transaction of response.items) {
              if (this.shutdownRequested || this.cancelledSyncs.has(syncId)) {
                await this.updateCheckpoint(syncId, {
                  lastProcessedCursor: cursor,
                  totalProcessed,
                  totalCreated,
                  totalUpdated,
                  totalFailed,
                });
                break;
              }

              const itemResult = await this.syncSingleTransaction(transaction);
              totalProcessed++;
              if (itemResult.created) totalCreated++;
              if (itemResult.updated) totalUpdated++;
              if (itemResult.failed) totalFailed++;

              // Record the (VA, day) affected so we can recalc its summary after the batch.
              if ((itemResult.created || itemResult.updated) && transaction.virtualAccountId && transaction.date) {
                const dayKey = String(transaction.date).substring(0, 10); // YYYY-MM-DD
                let set = affectedSummaries.get(transaction.virtualAccountId);
                if (!set) {
                  set = new Set<string>();
                  affectedSummaries.set(transaction.virtualAccountId, set);
                }
                set.add(dayKey);
              }
            }

            this.logger.log(
              `Sync ${syncId}: Processed ${response.items.length} transactions. ` +
              `Total: ${totalProcessed} (${totalCreated} created, ${totalUpdated} updated, ${totalFailed} failed)`,
            );

            // Recalculate daily summaries for every affected (VA, date) in this batch.
            // This keeps reports consistent with the underlying transactions even when
            // long-sync writes data far older than the DailyPaymentSummariesJob lookback window.
            await this.recalculateAffectedSummaries(syncId, affectedSummaries);
          }

          cursor = response.metadata?.nextCursor;

          await this.updateCheckpoint(syncId, {
            lastProcessedCursor: cursor,
            totalProcessed,
            totalCreated,
            totalUpdated,
            totalFailed,
          });

          if (cursor) {
            await delay(delayBetweenBatches);
          }
        } catch (error) {
          this.logger.error(`Error during sync ${syncId} batch:`, error);
          
          await this.updateCheckpoint(syncId, {
            totalProcessed,
            totalCreated,
            totalUpdated,
            totalFailed,
            errorMessage: error.message,
          });

          await delay(delayBetweenBatches * 2);
        }
      } while (cursor && !this.shutdownRequested && !this.cancelledSyncs.has(syncId));

      if (!this.shutdownRequested) {
        await this.completeSync(syncId);
        this.logger.log(
          `Sync ${syncId} completed: ${totalProcessed} processed, ` +
          `${totalCreated} created, ${totalUpdated} updated, ${totalFailed} failed`,
        );
      }
    } catch (error) {
      this.logger.error(`Fatal error in sync ${syncId}:`, error);
      await this.failSync(syncId, error.message);
    } finally {
      clearInterval(heartbeatTimer);
      this.activeSyncs.delete(syncId);
    }
  }

  /**
   * Recalculate daily_payment_summaries for every (virtualAccountId, day) pair touched
   * by a long-sync batch. Runs one day at a time via calculateAndSaveDailySummary so the
   * results match exactly what a direct on-demand recalculation would produce.
   */
  private async recalculateAffectedSummaries(
    syncId: string,
    affectedSummaries: Map<string, Set<string>>,
  ): Promise<void> {
    if (affectedSummaries.size === 0) return;

    let recalcTotal = 0;
    let recalcFailed = 0;
    for (const [virtualAccountId, days] of affectedSummaries.entries()) {
      for (const dayKey of days) {
        const [y, m, d] = dayKey.split('-').map(Number);
        if (!y || !m || !d) continue;
        const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        try {
          await this.dailyPaymentSummariesService.calculateAndSaveDailySummary(
            virtualAccountId,
            dayStart,
            'USD',
            true,
          );
          recalcTotal++;
        } catch (error) {
          recalcFailed++;
          this.logger.warn(
            `Sync ${syncId}: failed to recalc summary for ${virtualAccountId} on ${dayKey}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    this.logger.log(
      `Sync ${syncId}: recalculated ${recalcTotal} daily summaries (${recalcFailed} failed) across ${affectedSummaries.size} virtual accounts`,
    );
  }

  private async syncSingleTransaction(
    transaction: TransactionDto,
  ): Promise<{ created: boolean; updated: boolean; failed: boolean }> {
    try {
      const existing = await this.transactionRepository.findBySlashId(transaction.id);
      const entityData = mapTransactionDtoToEntity(transaction, SYNC_CONSTANTS.SYNC_SOURCE.MANUAL);
      
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

  private async createCheckpoint(
    syncId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SyncCheckpointDocument> {
    const checkpoint = new this.syncCheckpointModel({
      syncId,
      entityType: SYNC_CONSTANTS.ENTITY_TYPE.TRANSACTION,
      status: 'running',
      startDate,
      endDate,
      totalProcessed: 0,
      totalCreated: 0,
      totalUpdated: 0,
      totalFailed: 0,
      lastHeartbeat: new Date(),
    });

    return checkpoint.save();
  }

  private async updateCheckpoint(
    syncId: string,
    updates: Partial<SyncCheckpointDocument>,
  ): Promise<void> {
    await this.syncCheckpointModel.updateOne(
      { syncId },
      { $set: updates },
    ).exec();
  }

  private async updateHeartbeat(syncId: string): Promise<void> {
    await this.syncCheckpointModel.updateOne(
      { syncId },
      { $set: { lastHeartbeat: new Date() } },
    ).exec();
  }

  private async pauseSync(syncId: string): Promise<void> {
    await this.syncCheckpointModel.updateOne(
      { syncId },
      { 
        $set: { 
          status: 'paused',
          lastHeartbeat: new Date(),
        } 
      },
    ).exec();
    
    this.logger.log(`Sync ${syncId} paused - can be resumed later`);
  }

  private async completeSync(syncId: string): Promise<void> {
    await this.syncCheckpointModel.updateOne(
      { syncId },
      { 
        $set: { 
          status: 'completed',
          lastHeartbeat: new Date(),
        } 
      },
    ).exec();
  }

  private async failSync(syncId: string, errorMessage: string): Promise<void> {
    await this.syncCheckpointModel.updateOne(
      { syncId },
      { 
        $set: { 
          status: 'failed',
          errorMessage,
          lastHeartbeat: new Date(),
        } 
      },
    ).exec();
  }

  async getSyncProgress(syncId: string): Promise<SyncProgress | null> {
    const checkpoint = await this.syncCheckpointModel.findOne({ syncId }).exec();
    
    if (!checkpoint) {
      return null;
    }

    return {
      syncId: checkpoint.syncId,
      status: checkpoint.status,
      totalProcessed: checkpoint.totalProcessed,
      totalCreated: checkpoint.totalCreated,
      totalUpdated: checkpoint.totalUpdated,
      totalFailed: checkpoint.totalFailed,
      startDate: checkpoint.startDate,
      endDate: checkpoint.endDate,
      lastProcessedCursor: checkpoint.lastProcessedCursor,
      lastHeartbeat: checkpoint.lastHeartbeat,
      errorMessage: checkpoint.errorMessage,
    };
  }

  async listActiveSyncs(): Promise<SyncProgress[]> {
    const checkpoints = await this.syncCheckpointModel
      .find({ status: 'running' })
      .sort({ lastHeartbeat: -1 })
      .exec();

    return checkpoints.map(cp => ({
      syncId: cp.syncId,
      status: cp.status,
      totalProcessed: cp.totalProcessed,
      totalCreated: cp.totalCreated,
      totalUpdated: cp.totalUpdated,
      totalFailed: cp.totalFailed,
      startDate: cp.startDate,
      endDate: cp.endDate,
      lastProcessedCursor: cp.lastProcessedCursor,
      lastHeartbeat: cp.lastHeartbeat,
      errorMessage: cp.errorMessage,
    }));
  }

  async cancelSync(syncId: string): Promise<{ message: string }> {
    const checkpoint = await this.syncCheckpointModel.findOne({ syncId }).exec();
    
    if (!checkpoint) {
      throw new Error(`Checkpoint not found for syncId: ${syncId}`);
    }

    if (checkpoint.status === 'completed') {
      throw new Error(`Sync ${syncId} is already completed`);
    }

    if (checkpoint.status === 'failed' && checkpoint.errorMessage === 'Cancelled by user') {
      throw new Error(`Sync ${syncId} is already cancelled`);
    }

    this.cancelledSyncs.add(syncId);

    const heartbeatTimer = this.activeSyncs.get(syncId);
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      this.activeSyncs.delete(syncId);
    }

    await this.syncCheckpointModel.updateOne(
      { syncId },
      { 
        $set: { 
          status: 'failed',
          errorMessage: 'Cancelled by user',
          lastHeartbeat: new Date(),
        } 
      },
    ).exec();

    this.logger.log(`Sync ${syncId} marked for cancellation`);

    return { message: `Sync ${syncId} cancelled - will stop at next checkpoint` };
  }
}

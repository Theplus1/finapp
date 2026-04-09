import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SlashSyncService } from '../services/slash-sync.service';
import { ConfigService } from '@nestjs/config';

/**
 * Slash Sync Job
 * Scheduled jobs for syncing data from Slash API
 */
@Injectable()
export class SlashSyncJob {
  private readonly logger = new Logger(SlashSyncJob.name);
  private readonly enableScheduledSync: boolean;
  private isSyncingTransactions = false;

  constructor(
    private readonly slashSyncService: SlashSyncService,
    private readonly configService: ConfigService,
  ) {
    this.enableScheduledSync = this.configService.get<boolean>(
      'slash.enableScheduledSync',
      true,
    );
    this.logger.log(`SlashSyncJob initialized. Scheduled sync enabled: ${this.enableScheduledSync}`);
  }

  /**
   * Sync cards every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncCards() {
    if (!this.enableScheduledSync) {
      return;
    }

    const startTime = Date.now();
    this.logger.log('Starting scheduled card sync...');
    try {
      await this.slashSyncService.syncAllCards();
      const duration = Date.now() - startTime;
      this.logger.log(`Scheduled card sync completed successfully in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Scheduled card sync failed after ${duration}ms:`, error);
    }
  }

  /**
   * Sync recent transactions every 10 seconds
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async syncRecentTransactions() {
    if (!this.enableScheduledSync) {
      return;
    }

    if (this.isSyncingTransactions) {
      this.logger.debug('Skipping transaction sync — previous run still in progress');
      return;
    }

    this.isSyncingTransactions = true;
    const startTime = Date.now();
    this.logger.log('Starting scheduled recent transaction sync...');
    try {
      // Sync transactions from last 30 seconds (runs every 10s for 3x overlap)
      await this.slashSyncService.syncRecentTransactionsBySeconds(30);
      const duration = Date.now() - startTime;
      this.logger.log(`Scheduled recent transaction sync completed successfully in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Scheduled recent transaction sync failed after ${duration}ms:`, error);
    } finally {
      this.isSyncingTransactions = false;
    }
  }

  /**
   * Sync last 48 hours every day at midnight — safety net for missed/updated transactions
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncRecentTransactionsDaily() {
    if (!this.enableScheduledSync) {
      return;
    }

    const startTime = Date.now();
    this.logger.log('Starting scheduled daily transaction sync (48h back)...');
    try {
      await this.slashSyncService.syncRecentTransactions(48);
      const duration = Date.now() - startTime;
      this.logger.log(`Scheduled daily transaction sync completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Scheduled daily transaction sync failed after ${duration}ms:`, error);
    }
  }

  /**
   * Full transaction sync every Sunday at 2 AM — catch all status changes and missing data
   */
  @Cron('0 2 * * 0')
  async syncAllTransactionsWeekly() {
    if (!this.enableScheduledSync) {
      return;
    }

    this.logger.log('Starting scheduled weekly full transaction sync (7 days)...');
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      await this.slashSyncService.syncAllTransactions(startDate);
      this.logger.log('Scheduled weekly full transaction sync completed');
    } catch (error) {
      this.logger.error('Scheduled weekly full transaction sync failed:', error);
    }
  }

  /**
   * Sync virtual accounts every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncVirtualAccounts() {
    if (!this.enableScheduledSync) {
      return;
    }

    const startTime = Date.now();
    this.logger.log('Starting scheduled virtual account sync...');
    try {
      await this.slashSyncService.syncAllVirtualAccounts();
      const duration = Date.now() - startTime;
      this.logger.log(`Scheduled virtual account sync completed successfully in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Scheduled virtual account sync failed after ${duration}ms:`, error);
    }
  }
}

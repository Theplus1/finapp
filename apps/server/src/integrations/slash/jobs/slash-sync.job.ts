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
    }
  }

  /**
   * Sync recent transactions every day at midnight
   * Reduced to 2 hours since we already sync every 10 seconds
   * This is a safety net for any missed transactions
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncRecentTransactionsDaily() {
    if (!this.enableScheduledSync) {
      return;
    }

    const startTime = Date.now();
    this.logger.log('Starting scheduled daily transaction sync...');
    try {
      // Only sync last 2 hours as safety net (we already sync every 10s)
      // This reduces API calls from ~50-100 to ~5-10
      await this.slashSyncService.syncRecentTransactions(2);
      const duration = Date.now() - startTime;
      this.logger.log(`Scheduled daily transaction sync completed successfully in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Scheduled daily transaction sync failed after ${duration}ms:`, error);
    }
  }

  /**
   * Full transaction sync daily at 2 AM
   */
  // @Cron('0 2 * * *')
  // async syncAllTransactions() {
  //   if (!this.enableScheduledSync) {
  //     return;
  //   }

  //   this.logger.log('Starting scheduled full transaction sync...');
  //   try {
  //     // Sync all transactions from last 90 days
  //     const startDate = new Date();
  //     startDate.setDate(startDate.getDate() - 90);
      
  //     await this.slashSyncService.syncAllTransactions(startDate);
  //     this.logger.log('Scheduled full transaction sync completed successfully');
  //   } catch (error) {
  //     this.logger.error('Scheduled full transaction sync failed:', error);
  //   }
  // }

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

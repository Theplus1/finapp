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
  }

  /**
   * Sync cards daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncCards() {
    if (!this.enableScheduledSync) {
      return;
    }

    this.logger.log('Starting scheduled card sync...');
    try {
      await this.slashSyncService.syncAllCards();
      this.logger.log('Scheduled card sync completed successfully');
    } catch (error) {
      this.logger.error('Scheduled card sync failed:', error);
    }
  }

  /**
   * Sync recent transactions every hour
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncRecentTransactions() {
    if (!this.enableScheduledSync) {
      return;
    }

    this.logger.log('Starting scheduled recent transaction sync...');
    try {
      // Sync transactions from last 24 hours
      await this.slashSyncService.syncRecentTransactions(24);
      this.logger.log('Scheduled recent transaction sync completed successfully');
    } catch (error) {
      this.logger.error('Scheduled recent transaction sync failed:', error);
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
   * Sync virtual accounts daily at midnight
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncVirtualAccounts() {
    if (!this.enableScheduledSync) {
      return;
    }

    this.logger.log('Starting scheduled virtual account sync...');
    try {
      await this.slashSyncService.syncAllVirtualAccounts();
      this.logger.log('Scheduled virtual account sync completed successfully');
    } catch (error) {
      this.logger.error('Scheduled virtual account sync failed:', error);
    }
  }
}

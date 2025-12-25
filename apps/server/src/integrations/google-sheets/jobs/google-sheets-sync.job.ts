import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { GoogleSheetsSyncService } from '../services/google-sheets-sync.service';

/**
 * Google Sheets Sync Job
 * Scheduled jobs to sync data to Google Sheets
 */
@Injectable()
export class GoogleSheetsSyncJob implements OnModuleInit {
  private readonly logger = new Logger(GoogleSheetsSyncJob.name);
  private readonly enableScheduledSync: boolean;
  private readonly syncCron: string;

  constructor(
    private readonly googleSheetsSyncService: GoogleSheetsSyncService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    this.enableScheduledSync = this.configService.get<boolean>(
      'googleSheets.enableScheduledSync',
      true,
    );
    this.syncCron = this.configService.get<string>(
      'googleSheets.syncCron',
      '*/50 * * * *',
    );
  }

  onModuleInit() {
    if (this.enableScheduledSync) {
      this.logger.log(`Registering Google Sheets sync job with cron: ${this.syncCron}`);
      const job = new CronJob(this.syncCron, () => {
        this.syncToGoogleSheets();
      });

      this.schedulerRegistry.addCronJob('googleSheetsSync', job);
      job.start();
      this.logger.log('Google Sheets sync job registered and started');
    } else {
      this.logger.log('Google Sheets scheduled sync is disabled');
    }
  }

  /**
   * Sync all virtual accounts to Google Sheets
   */
  async syncToGoogleSheets() {
    this.logger.log('Starting scheduled Google Sheets sync...');
    
    try {
      const result = await this.googleSheetsSyncService.syncAllVirtualAccounts();
      this.logger.log(
        `Scheduled Google Sheets sync completed: ${result.success} success, ${result.failed} failed`,
      );
    } catch (error) {
      this.logger.error('Scheduled Google Sheets sync failed:', error);
    }
  }
}


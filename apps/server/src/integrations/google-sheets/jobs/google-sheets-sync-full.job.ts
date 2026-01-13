import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { GoogleSheetsSyncFullService } from '../services/google-sheets-sync-full.service';

/**
 * Google Sheets Sync Full Job
 * Scheduled jobs to sync full data to Google Sheets
 */
@Injectable()
export class GoogleSheetsSyncFullJob implements OnModuleInit {
  private readonly logger = new Logger(GoogleSheetsSyncFullJob.name);
  private readonly enableScheduledSync: boolean;
  private readonly syncCron: string;

  constructor(
    private readonly googleSheetsSyncFullService: GoogleSheetsSyncFullService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    this.enableScheduledSync = this.configService.get<boolean>(
      'googleSheets.enableScheduledSyncFull',
      true,
    );
    this.syncCron = this.configService.get<string>(
      'googleSheets.syncCron',
      '*/50 * * * *',
    );
  }

  onModuleInit() {
    if (this.enableScheduledSync) {
      this.logger.log(`Registering Google Sheets sync full job with cron: ${this.syncCron}`);
      const job = new CronJob(this.syncCron, () => {
        this.syncFullDataToGoogleSheets();
      });

      this.schedulerRegistry.addCronJob('googleSheetsSyncFull', job);
      job.start();
      this.logger.log('Google Sheets sync full job registered and started');
    } else {
      this.logger.log('Google Sheets scheduled sync is disabled');
    }
  }

  /**
   * Sync all virtual accounts full data to Google Sheets
   */
  async syncFullDataToGoogleSheets() {
    this.logger.log('Starting scheduled Google Sheets sync full data...');
    
    try {
      await this.googleSheetsSyncFullService.syncFullDataAllVirtualAccounts();
      this.logger.log('Scheduled Google Sheets sync full data completed successfully');
    } catch (error) {
      this.logger.error('Scheduled Google Sheets sync full data failed:', error);
    }
  }
}


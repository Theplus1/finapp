import { Controller, Post, Get, Query, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { SlashSyncService } from '../services/slash-sync.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

/**
 * Slash Sync Controller
 * Manual sync endpoints for administrators
 */
@ApiTags('Slash Sync')
@Controller('slash/sync')
export class SlashSyncController {
  private readonly logger = new Logger(SlashSyncController.name);

  constructor(
    private readonly slashSyncService: SlashSyncService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
  ) {}

  @Post('cards')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually trigger card sync' })
  @ApiResponse({ status: 202, description: 'Sync started' })
  async syncCards() {
    // Run async without waiting
    this.slashSyncService.syncAllCards().catch((error) => {
      this.logger.error('Manual card sync failed:', error);
    });
    
    return { message: 'Card sync started' };
  }

  @Post('cards/details')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually trigger card details sync (PAN and CVV)' })
  @ApiResponse({ status: 202, description: 'Card details sync started' })
  async syncCardDetails() {
    // Run async without waiting
    this.slashSyncService.syncAllCardDetails().catch((error) => {
      this.logger.error('Manual card details sync failed:', error);
    });
    
    return { message: 'Card details sync started (retrieving full PAN and CVV)' };
  }

  @Post('transactions')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually trigger transaction sync' })
  @ApiResponse({ status: 202, description: 'Sync started' })
  async syncTransactions(
    @Query('hoursBack') hoursBack?: number,
  ) {
    const hours = hoursBack ? parseInt(hoursBack.toString(), 10) : 24;
    
    // Run async without waiting
    this.slashSyncService.syncRecentTransactions(hours).catch((error) => {
      this.logger.error('Manual transaction sync failed:', error);
    });
    
    return { message: `Transaction sync started (${hours} hours back)` };
  }

  @Post('transactions/full')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually trigger full transaction sync' })
  @ApiResponse({ status: 202, description: 'Sync started' })
  async syncAllTransactions(
    @Query('daysBack') daysBack?: number,
  ) {
    const days = daysBack ? parseInt(daysBack.toString(), 10) : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Run async without waiting
    this.slashSyncService.syncAllTransactions(startDate).catch((error) => {
      this.logger.error('Manual full transaction sync failed:', error);
    });
    
    return { message: `Full transaction sync started (${days} days back)` };
  }

  @Post('virtual-accounts')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually trigger virtual account sync' })
  @ApiResponse({ status: 202, description: 'Sync started' })
  async syncVirtualAccounts() {
    // Run async without waiting
    this.slashSyncService.syncAllVirtualAccounts().catch((error) => {
      this.logger.error('Manual virtual account sync failed:', error);
    });
    
    return { message: 'Virtual account sync started' };
  }

  @Post('card-groups')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually trigger card group sync' })
  @ApiResponse({ status: 202, description: 'Sync started' })
  async syncCardGroups() {
    this.slashSyncService.syncAllCardGroups().catch((error) => {
      this.logger.error('Manual card group sync failed:', error);
    });
    
    return { message: 'Card group sync started' };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get sync statistics' })
  @ApiResponse({ status: 200, description: 'Sync statistics' })
  async getSyncStats(@Query('entityType') entityType?: string) {
    return this.slashSyncService.getSyncStats(entityType);
  }

  @Get('jobs/status')
  @ApiOperation({ summary: 'Get cron job status' })
  @ApiResponse({ status: 200, description: 'Cron job status' })
  async getJobsStatus() {
    const jobs = this.schedulerRegistry.getCronJobs();
    const enableScheduledSync = this.configService.get<boolean>('slash.enableScheduledSync', true);
    
    const jobStatus: Array<{ name: string; nextRun?: string; lastRun?: string; error?: string }> = [];
    jobs.forEach((job, name) => {
      try {
        jobStatus.push({
          name,
          nextRun: job.nextDate()?.toString() || 'N/A',
          lastRun: job.lastDate()?.toString() || 'N/A',
        });
      } catch (error) {
        jobStatus.push({
          name,
          error: 'Unable to get job details',
        });
      }
    });

    return {
      enableScheduledSync,
      totalJobs: jobs.size,
      jobs: jobStatus,
      message: jobs.size === 0 
        ? '⚠️ No cron jobs registered. Check ScheduleModule and job providers.' 
        : `✅ ${jobs.size} cron job(s) registered`,
    };
  }
}

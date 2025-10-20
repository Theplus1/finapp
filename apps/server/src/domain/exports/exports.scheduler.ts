import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExportsService } from './exports.service';

@Injectable()
export class ExportsScheduler {
  private readonly logger = new Logger(ExportsScheduler.name);

  constructor(private readonly exportsService: ExportsService) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async handleCleanupExpiredExports() {
    this.logger.log('Running cleanup job for expired exports');

    try {
      const deletedCount = await this.exportsService.cleanupExpiredJobs();
      
      if (deletedCount > 0) {
        this.logger.log(`Cleanup completed: ${deletedCount} expired exports removed`);
      }
    } catch (error) {
      this.logger.error('Cleanup job failed:', error);
    }
  }
}

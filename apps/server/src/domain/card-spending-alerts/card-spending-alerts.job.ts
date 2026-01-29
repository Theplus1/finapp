import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { CardSpendingAlertsService } from './card-spending-alerts.service';

/**
 * Card Spending Alert Job
 * Scheduled job to check card spending from Card sheet and send alerts when amount > 1000 today
 */
@Injectable()
export class CardSpendingAlertsJob implements OnModuleInit {
  private readonly logger = new Logger(CardSpendingAlertsJob.name);
  private readonly enableCardSpendingAlert: boolean;
  private readonly cronExpression: string;
  private readonly jobName = 'card-spending-alert-check';

  constructor(
    private readonly cardSpendingAlertsService: CardSpendingAlertsService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    this.enableCardSpendingAlert = this.configService.get<boolean>('cardSpendingAlert.enable', true);
    // Default: Run every hour
    this.cronExpression = this.configService.get<string>('cardSpendingAlert.cron', '0 * * * *');
  }

  onModuleInit() {
    if (!this.enableCardSpendingAlert) {
      this.logger.log('Card spending alert feature is disabled. Cron job will not be registered.');
      return;
    }

    // Register dynamic cron job
    const job = new CronJob(
      this.cronExpression,
      () => {
        this.checkCardSpendingAndSendAlerts();
      },
      null,
      true,
      'UTC',
    );

    this.schedulerRegistry.addCronJob(this.jobName, job);
    this.logger.log(
      `Card spending alert cron job registered with schedule: ${this.cronExpression}`,
    );
  }

  /**
   * Check card spending and send alerts
   */
  async checkCardSpendingAndSendAlerts() {
    if (!this.enableCardSpendingAlert) {
      this.logger.debug('Card spending alert feature is disabled. Skipping check.');
      return;
    }

    this.logger.log('Starting scheduled card spending alert check...');
    try {
      await this.cardSpendingAlertsService.checkAndSendAlerts();
      this.logger.log('Scheduled card spending alert check completed successfully');
    } catch (error) {
      this.logger.error('Scheduled card spending alert check failed:', error);
    }
  }
}

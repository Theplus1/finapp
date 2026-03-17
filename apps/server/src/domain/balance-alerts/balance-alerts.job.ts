import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { BalanceAlertsService } from './balance-alerts.service';

/**
 * Balance Alert Job
 * Scheduled job to check virtual account balances and send alerts
 */
@Injectable()
export class BalanceAlertsJob implements OnModuleInit {
  private readonly logger = new Logger(BalanceAlertsJob.name);
  private readonly enableBalanceAlert: boolean;
  private readonly cronExpression: string;
  private readonly jobName = 'balance-alert-check';

  constructor(
    private readonly balanceAlertsService: BalanceAlertsService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    this.enableBalanceAlert = this.configService.get<boolean>('balanceAlert.enable', true);
    this.cronExpression = this.configService.get<string>('balanceAlert.cron', '0 * * * *');
  }

  onModuleInit() {
    if (!this.enableBalanceAlert) {
      this.logger.log('Balance alert feature is disabled. Cron job will not be registered.');
      return;
    }

    // Register dynamic cron job
    const job = new CronJob(
      this.cronExpression,
      () => {
        this.checkBalancesAndSendAlerts();
      },
      null,
      true,
      'UTC',
    );

    this.schedulerRegistry.addCronJob(this.jobName, job);
    this.logger.log(
      `Balance alert cron job registered with schedule: ${this.cronExpression}`,
    );
  }

  /**
   * Check balances and send alerts
   */
  async checkBalancesAndSendAlerts() {
    if (!this.enableBalanceAlert) {
      this.logger.debug('Balance alert feature is disabled. Skipping check.');
      return;
    }

    this.logger.debug('Starting scheduled balance alert check...');
    try {
      await this.balanceAlertsService.checkAndSendAlerts();
      this.logger.debug('Scheduled balance alert check completed successfully');
    } catch (error) {
      this.logger.error('Scheduled balance alert check failed:', error);
    }
  }
}


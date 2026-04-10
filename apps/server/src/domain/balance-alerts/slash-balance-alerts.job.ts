import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { SlashBalanceAlertsService } from './slash-balance-alerts.service';

@Injectable()
export class SlashBalanceAlertsJob implements OnModuleInit {
  private readonly logger = new Logger(SlashBalanceAlertsJob.name);
  private readonly enabled: boolean;
  private readonly cron: string;

  constructor(
    private readonly slashBalanceAlertsService: SlashBalanceAlertsService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    this.enabled = this.configService.get<boolean>('slashBalanceAlert.enable', true);
    this.cron = this.configService.get<string>('slashBalanceAlert.cron', '*/30 * * * *');
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Slash balance alerts disabled');
      return;
    }

    this.logger.log(`Registering Slash balance alert job with cron: ${this.cron}`);
    const job = new CronJob(this.cron, () => {
      this.run();
    });
    this.schedulerRegistry.addCronJob('slashBalanceAlert', job);
    job.start();
    this.logger.log('Slash balance alert job registered and started');
  }

  async run(): Promise<void> {
    try {
      await this.slashBalanceAlertsService.checkAndAlert();
    } catch (error) {
      this.logger.error('Slash balance alert check failed:', error);
    }
  }
}

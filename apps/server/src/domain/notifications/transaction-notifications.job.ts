import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { TransactionNotificationsService } from './transaction-notifications.service';

@Injectable()
export class TransactionNotificationsJob {
  private readonly logger = new Logger(TransactionNotificationsJob.name);

  constructor(
    private readonly transactionNotificationsService: TransactionNotificationsService,
    private readonly configService: ConfigService,
  ) {
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkAndNotifyNewTransactions() {
    this.logger.debug('Starting transaction notifications check...');
    try {
      await this.transactionNotificationsService.checkAndNotifyNewTransactions();
      this.logger.debug('Transaction notifications check completed successfully');
    } catch (error) {
      this.logger.error('Transaction notifications check failed:', error);
    }
  }
}

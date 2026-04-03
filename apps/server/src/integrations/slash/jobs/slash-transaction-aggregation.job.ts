import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VirtualAccountRepository } from '../../../database/repositories/virtual-account.repository';
import { SlashApiService } from '../services/slash-api.service';

@Injectable()
export class SlashTransactionAggregationJob {
  private readonly logger = new Logger(SlashTransactionAggregationJob.name);
  private readonly enableScheduledSync: boolean;
  private isSyncing = false;

  private static readonly BATCH_SIZE = 5;

  constructor(
    private readonly configService: ConfigService,
    private readonly slashApiService: SlashApiService,
    private readonly virtualAccountRepository: VirtualAccountRepository,
  ) {
    this.enableScheduledSync = this.configService.get<boolean>(
      'slash.enableScheduledSync',
      true,
    );
    this.logger.log(
      `SlashTransactionAggregationJob initialized. Scheduled sync enabled: ${this.enableScheduledSync}`,
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async syncTransferNetChangeForAllVirtualAccounts(): Promise<void> {
    if (!this.enableScheduledSync) {
      return;
    }

    if (this.isSyncing) {
      this.logger.debug('Skipping transferNetChange sync - previous run still in progress');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();
    this.logger.log('Starting scheduled transferNetChange sync for virtual accounts...');

    try {
      const accounts = await this.virtualAccountRepository.findAll();
      if (accounts.length === 0) {
        this.logger.log('No virtual accounts found. Skipping transferNetChange sync.');
        return;
      }

      let processed = 0;
      for (let i = 0; i < accounts.length; i += SlashTransactionAggregationJob.BATCH_SIZE) {
        const batch = accounts.slice(i, i + SlashTransactionAggregationJob.BATCH_SIZE);
        await Promise.all(
          batch.map(async (account) => {
            try {
              const aggregation = await this.slashApiService.getTransactionAggregation({
                'filter:virtualAccountId': account.slashId,
                'filter:category': 'internal',
              });
              await this.virtualAccountRepository.updateTransferNetChange(
                account.slashId,
                aggregation.netChange,
              );
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              this.logger.warn(
                `Failed to sync transferNetChange for VA ${account.slashId}: ${message}`,
              );
            }
          }),
        );
        processed += batch.length;
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Scheduled transferNetChange sync completed: processed=${processed}, duration=${duration}ms`,
      );
    } finally {
      this.isSyncing = false;
    }
  }
}

import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailyPaymentSummariesService } from './daily-payment-summaries.service';
import { AccountsService } from '../accounts/accounts.service';
import { subDays } from 'date-fns';

@Injectable()
export class DailyPaymentSummariesJob {
  private readonly logger = new Logger(DailyPaymentSummariesJob.name);

  // Number of days to recalculate (including today)
  private static readonly LOOKBACK_DAYS = 2;

  constructor(
    private readonly dailyPaymentSummariesService: DailyPaymentSummariesService,
    @Inject(forwardRef(() => AccountsService))
    private readonly accountsService: AccountsService,
  ) {}

  /**
   * Cron job: recalculate daily_payment_summaries
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async recalculateRecentSummariesForAllAccounts(): Promise<void> {
    const now = new Date();
    const endDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0,
    ));
    const start = subDays(endDate, DailyPaymentSummariesJob.LOOKBACK_DAYS - 1);
    const startDate = new Date(Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
      0, 0, 0, 0,
    ));

    this.logger.log(
      `Recalculating daily payment summaries for all accounts from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    const accounts = await this.accountsService.findAll();
    if (accounts.length === 0) {
      this.logger.log('No virtual accounts found. Skipping daily payment summaries recalculation.');
      return;
    }

    for (const account of accounts) {
      try {
        await this.dailyPaymentSummariesService.recalculateSummariesForRange(
          account.slashId,
          startDate,
          endDate,
          account.currency,
          true,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to recalculate daily summaries for VA ${account.slashId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log('Finished recalculating daily payment summaries for all accounts.');
  }
}


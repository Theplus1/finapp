import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailyPaymentSummariesService } from './daily-payment-summaries.service';
import { AccountsService } from '../accounts/accounts.service';
import { subDays } from 'date-fns';

@Injectable()
export class DailyPaymentSummariesJob {
  private readonly logger = new Logger(DailyPaymentSummariesJob.name);

  // Fast cron: recalculate very recent days on a tight loop so the live dashboard
  // stays in sync with incoming transactions. Keep this window small so each run
  // completes well under the 30-second interval even with many virtual accounts.
  private static readonly FAST_LOOKBACK_DAYS = 2;

  // Slow cron: defense in depth. Re-sweep a much wider historical window so any
  // out-of-band writes (long-sync backfills, webhook delivery delays, manual
  // corrections) that land outside the fast window still propagate into daily
  // summaries automatically. Combined with the per-batch recalc inside the sync
  // services, this ensures no data silently drifts out of reports.
  private static readonly SLOW_LOOKBACK_DAYS = 60;

  private slowSweepRunning = false;

  constructor(
    private readonly dailyPaymentSummariesService: DailyPaymentSummariesService,
    @Inject(forwardRef(() => AccountsService))
    private readonly accountsService: AccountsService,
  ) {}

  /**
   * Fast cron: recalculate the last FAST_LOOKBACK_DAYS (including today).
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
    const start = subDays(endDate, DailyPaymentSummariesJob.FAST_LOOKBACK_DAYS - 1);
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

  /**
   * Slow cron: sweep the full SLOW_LOOKBACK_DAYS window once per hour as a safety
   * net against any late-arriving transactions that slipped past the fast cron and
   * the per-batch recalc hooks. This is idempotent: recalculating a date that is
   * already correct simply overwrites it with the same values.
   *
   * Guarded by `slowSweepRunning` so overlapping invocations are skipped rather
   * than queued — the sweep can take a while when the DB is large and we do not
   * want two instances hammering the database simultaneously.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async recalculateHistoricalSummariesForAllAccounts(): Promise<void> {
    if (this.slowSweepRunning) {
      this.logger.warn('Slow historical recalc already running; skipping this tick.');
      return;
    }
    this.slowSweepRunning = true;

    const startedAt = Date.now();
    try {
      const now = new Date();
      const endDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0,
      ));
      const start = subDays(endDate, DailyPaymentSummariesJob.SLOW_LOOKBACK_DAYS - 1);
      const startDate = new Date(Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate(),
        0, 0, 0, 0,
      ));

      this.logger.log(
        `[slow sweep] Recalculating ${DailyPaymentSummariesJob.SLOW_LOOKBACK_DAYS}-day window from ${startDate.toISOString()} to ${endDate.toISOString()}`,
      );

      const accounts = await this.accountsService.findAll();
      if (accounts.length === 0) {
        this.logger.log('[slow sweep] No virtual accounts found; skipping.');
        return;
      }

      let okCount = 0;
      let failCount = 0;
      for (const account of accounts) {
        try {
          await this.dailyPaymentSummariesService.recalculateSummariesForRange(
            account.slashId,
            startDate,
            endDate,
            account.currency,
            true,
          );
          okCount++;
        } catch (error) {
          failCount++;
          this.logger.warn(
            `[slow sweep] Failed to recalc VA ${account.slashId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      const durationMs = Date.now() - startedAt;
      this.logger.log(
        `[slow sweep] Done in ${durationMs}ms. ${okCount} accounts OK, ${failCount} failed.`,
      );
    } finally {
      this.slowSweepRunning = false;
    }
  }
}


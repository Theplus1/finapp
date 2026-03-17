import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DailyPaymentSummary,
  DailyPaymentSummaryDocument,
} from 'src/database/schemas/daily-payment-summary.schema';
import { TransactionsService } from '../transactions/transactions.service';
import { DepositHistoryRepository } from 'src/database/repositories/deposit-history.repository';

@Injectable()
export class DailyPaymentSummariesService {
  private readonly logger = new Logger(DailyPaymentSummariesService.name);

  constructor(
    @InjectModel(DailyPaymentSummary.name)
    private readonly dailyPaymentSummaryModel: Model<DailyPaymentSummaryDocument>,
    private readonly transactionsService: TransactionsService,
    private readonly depositHistoryRepository: DepositHistoryRepository,
  ) {}

  /**
   * Calculate and save daily payment summary for a specific date
   */
  async calculateAndSaveDailySummary(
    virtualAccountId: string,
    date: Date,
    currency: string,
    silent: boolean = false,
  ): Promise<DailyPaymentSummaryDocument> {
    const dayStart = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0, 0, 0, 0,
    ));
    const dayEnd = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23, 59, 59, 999,
    ));

    if (!silent) {
      this.logger.log(`Calculating daily summary for ${virtualAccountId} from ${dayStart.toISOString()} to ${dayEnd.toISOString()}`);
    }

    // Get all spend transactions for this day (PENDING + SETTLED, amount < 0)
    const spendTransactions = await this.transactionsService.findAllWithFilters({
      virtualAccountId,
      amountCents: { $lt: 0 },
      detailedStatus: { $in: ['pending', 'settled'] },
      startDate: dayStart.toISOString(),
      endDate: dayEnd.toISOString(),
    });

    // Get all refund transactions for this day
    const refundTransactions = await this.transactionsService.findAllWithFilters({
      virtualAccountId,
      detailedStatus: 'refund',
      startDate: dayStart.toISOString(),
      endDate: dayEnd.toISOString(),
    });

    // Calculate totals
    const totalDepositCents =
      await this.depositHistoryRepository.sumByVirtualAccountAndDate(
        virtualAccountId,
        dayStart,
      );
    let totalSpendNonUSCents = 0;
    let totalSpendUSCents = 0;
    let totalRefundCents = 0;

    // Spend: split by US / Non-US, use abs(amountCents)
    spendTransactions.forEach((transaction) => {
      const spendAmount = Math.abs(transaction.amountCents);
      if (transaction.merchantData?.location?.country === 'US') {
        totalSpendUSCents += spendAmount;
      } else {
        totalSpendNonUSCents += spendAmount;
      }
    });

    // Refund: all REFUND transactions, use abs(amountCents)
    refundTransactions.forEach((transaction) => {
      totalRefundCents += Math.abs(transaction.amountCents);
    });

    // Upsert the summary
    const summary = await this.dailyPaymentSummaryModel.findOneAndUpdate(
      {
        virtualAccountId,
        date: dayStart,
      },
      {
        virtualAccountId,
        date: dayStart,
        totalDepositCents,
        totalSpendNonUSCents,
        totalSpendUSCents,
        totalRefundCents,
        accountBalanceCents: 0, // Will be calculated separately
        currency,
        calculatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      },
    );

    if (!silent) {
      this.logger.log(
        `Daily summary saved: deposits=${totalDepositCents}, spendNonUS=${totalSpendNonUSCents}, spendUS=${totalSpendUSCents}`,
      );
    }

    return summary;
  }

  /**
   * Get daily summaries for a date range
   */
  async getDailySummaries(
    virtualAccountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyPaymentSummaryDocument[]> {
    const from = new Date(Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
      0, 0, 0, 0,
    ));
    const to = new Date(Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate(),
      0, 0, 0, 0,
    ));

    return this.dailyPaymentSummaryModel
      .find({
        virtualAccountId,
        date: {
          $gte: from,
          $lte: to,
        },
      })
      .sort({ date: 1 })
      .exec();
  }

  /**
   * Get or calculate daily summary for a specific date
   */
  async getOrCalculateDailySummary(
    virtualAccountId: string,
    date: Date,
    currency: string,
  ): Promise<DailyPaymentSummaryDocument> {
    const dayStart = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0, 0, 0, 0,
    ));

    const summary = await this.dailyPaymentSummaryModel.findOne({
      virtualAccountId,
      date: dayStart,
    });

    if (!summary) {
      return this.calculateAndSaveDailySummary(virtualAccountId, dayStart, currency);
    }

    return summary;
  }

  /**
   * Recalculate summaries for a date range
   */
  async recalculateSummariesForRange(
    virtualAccountId: string,
    startDate: Date,
    endDate: Date,
    currency: string = "USD",
    silent: boolean = false,
  ): Promise<void> {
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      await this.calculateAndSaveDailySummary(virtualAccountId, new Date(currentDate), currency, silent);
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  /**
   * Update totalDepositCents for a given virtual account and date.
   * If summary does not exist, it will be calculated first (spend/refund from transactions),
   * then deposit will be overridden.
   */
  async upsertDepositForDate(
    virtualAccountId: string,
    date: Date,
    depositCents: number,
    currency: string,
  ): Promise<DailyPaymentSummaryDocument> {
    const dayStart = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0, 0, 0, 0,
    ));

    // Ensure summary exists (spend/refund calculated)
    const summary = await this.getOrCalculateDailySummary(
      virtualAccountId,
      dayStart,
      currency,
    );

    summary.totalDepositCents = depositCents;
    summary.calculatedAt = new Date();

    await summary.save();

    this.logger.log(
      `Updated deposit for ${virtualAccountId} on ${dayStart.toISOString()}: depositCents=${depositCents}`,
    );

    return summary;
  }

  /**
   * Delete summaries for a virtual account
   */
  async deleteSummariesForAccount(virtualAccountId: string): Promise<void> {
    await this.dailyPaymentSummaryModel.deleteMany({ virtualAccountId });
  }
}

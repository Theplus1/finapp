import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { DailyPaymentSummariesService } from '../daily-payment-summaries/daily-payment-summaries.service';
import type { PaymentSummaryResponseDto } from '../../customer-api/dto/payment-summary.dto';
import type {
  PaymentSummaryAdminOverallResponseDto,
  PaymentSummaryAdminResponseDto,
} from '../../admin-api/dto/payment-summary-admin.dto';

@Injectable()
export class PaymentSummaryService {
  constructor(
    private readonly dailyPaymentSummariesService: DailyPaymentSummariesService,
  ) {}

  async getRangeSummary(
    virtualAccountId: string,
    fromDate: Date,
    toDate: Date,
    fromString: string,
    toString: string,
  ): Promise<PaymentSummaryResponseDto> {
    const summaries =
      await this.dailyPaymentSummariesService.getDailySummaries(
        virtualAccountId,
        fromDate,
        toDate,
      );

    const rows = summaries.map((s) => {
      const dateStr = format(s.date, 'yyyy-MM-dd');
      const spendUsCents = s.totalSpendUSCents ?? 0;
      const spendNonUsCents = s.totalSpendNonUSCents ?? 0;
      const spendCents = spendUsCents + spendNonUsCents;
      const refundCents = s.totalRefundCents ?? 0;

      return {
        date: dateStr,
        depositCents: s.totalDepositCents ?? 0,
        spendCents,
        spendUsCents,
        spendNonUsCents,
        refundCents,
      };
    });

    const currency = summaries[0]?.currency ?? 'USD';

    const totalDepositCents = rows.reduce(
      (acc, r) => acc + (r.depositCents ?? 0),
      0,
    );
    const totalSpendUsCents = rows.reduce(
      (acc, r) => acc + (r.spendUsCents ?? 0),
      0,
    );
    const totalSpendNonUsCents = rows.reduce(
      (acc, r) => acc + (r.spendNonUsCents ?? 0),
      0,
    );
    const totalSpendCents = totalSpendUsCents + totalSpendNonUsCents;
    const totalRefundCents = rows.reduce(
      (acc, r) => acc + (r.refundCents ?? 0),
      0,
    );

    const endingAccountBalanceCents =
      totalDepositCents - totalSpendCents + totalRefundCents;

    return {
      virtualAccountId,
      currency,
      timezone: 'local',
      range: {
        from: fromString,
        to: toString,
      },
      rows,
      summary: {
        totalDepositCents,
        totalSpendCents,
        totalSpendUsCents,
        totalSpendNonUsCents,
        totalRefundCents,
        endingAccountBalanceCents,
      },
    };
  }

  async getOverallSummary(virtualAccountId: string): Promise<{
    virtualAccountId: string;
    currency: string;
    timezone: string;
    summary: PaymentSummaryResponseDto['summary'];
  }> {
    const summaries =
      await this.dailyPaymentSummariesService.getDailySummaries(
        virtualAccountId,
        new Date(0),
        new Date(),
      );

    if (!summaries || summaries.length === 0) {
      return {
        virtualAccountId,
        currency: 'USD',
        timezone: 'local',
        summary: {
          totalDepositCents: 0,
          totalSpendCents: 0,
          totalSpendUsCents: 0,
          totalSpendNonUsCents: 0,
          totalRefundCents: 0,
          endingAccountBalanceCents: 0,
        },
      };
    }

    const currency = summaries[0]?.currency ?? 'USD';

    let totalDepositCents = 0;
    let totalSpendUsCents = 0;
    let totalSpendNonUsCents = 0;
    let totalRefundCents = 0;

    for (const s of summaries) {
      totalDepositCents += s.totalDepositCents ?? 0;
      totalSpendUsCents += s.totalSpendUSCents ?? 0;
      totalSpendNonUsCents += s.totalSpendNonUSCents ?? 0;
      totalRefundCents += s.totalRefundCents ?? 0;
    }

    const totalSpendCents = totalSpendUsCents + totalSpendNonUsCents;
    const endingAccountBalanceCents =
      totalDepositCents - totalSpendCents + totalRefundCents;

    return {
      virtualAccountId,
      currency,
      timezone: 'local',
      summary: {
        totalDepositCents,
        totalSpendCents,
        totalSpendUsCents,
        totalSpendNonUsCents,
        totalRefundCents,
        endingAccountBalanceCents,
      },
    };
  }

  async getRangeSummaryForAdmin(
    virtualAccountId: string,
    fromDate: Date,
    toDate: Date,
    fromString: string,
    toString: string,
  ): Promise<PaymentSummaryAdminResponseDto> {
    const summaries =
      await this.dailyPaymentSummariesService.getDailySummaries(
        virtualAccountId,
        fromDate,
        toDate,
      );

    const rows = summaries.map((s) => {
      const dateStr = format(s.date, 'yyyy-MM-dd');

      const spendUsCents = s.totalSpendUSCents ?? 0;
      const spendNonUsCents = s.totalSpendNonUSCents ?? 0;
      const spendCents = spendUsCents + spendNonUsCents;

      const spendUsCentsForAdmin = s.totalSpendUSCentsForAdmin ?? 0;
      const spendNonUsCentsForAdmin = s.totalSpendNonUSCentsForAdmin ?? 0;
      const spendCentsForAdmin =
        spendUsCentsForAdmin + spendNonUsCentsForAdmin;

      const refundCents = s.totalRefundCents ?? 0;

      return {
        date: dateStr,
        depositCents: s.totalDepositCents ?? 0,
        spendCents,
        spendUsCents,
        spendNonUsCents,
        spendCentsForAdmin,
        spendUsCentsForAdmin,
        spendNonUsCentsForAdmin,
        refundCents,
      };
    });

    const currency = summaries[0]?.currency ?? 'USD';

    const totalDepositCents = rows.reduce(
      (acc, r) => acc + (r.depositCents ?? 0),
      0,
    );
    const totalSpendUsCents = rows.reduce(
      (acc, r) => acc + (r.spendUsCents ?? 0),
      0,
    );
    const totalSpendNonUsCents = rows.reduce(
      (acc, r) => acc + (r.spendNonUsCents ?? 0),
      0,
    );
    const totalSpendCents = totalSpendUsCents + totalSpendNonUsCents;
    const totalSpendUsCentsForAdmin = rows.reduce(
      (acc, r) => acc + (r.spendUsCentsForAdmin ?? 0),
      0,
    );
    const totalSpendNonUsCentsForAdmin = rows.reduce(
      (acc, r) => acc + (r.spendNonUsCentsForAdmin ?? 0),
      0,
    );
    const totalSpendCentsForAdmin =
      totalSpendUsCentsForAdmin + totalSpendNonUsCentsForAdmin;
    const totalRefundCents = rows.reduce(
      (acc, r) => acc + (r.refundCents ?? 0),
      0,
    );

    const endingAccountBalanceCentsForAdmin =
      totalDepositCents - totalSpendCentsForAdmin + totalRefundCents;
    const endingAccountBalanceCents =
      totalDepositCents - totalSpendCents + totalRefundCents;

    return {
      virtualAccountId,
      currency,
      timezone: 'local',
      range: {
        from: fromString,
        to: toString,
      },
      rows,
      summary: {
        totalDepositCents,
        totalSpendCents,
        totalSpendUsCents,
        totalSpendNonUsCents,
        totalSpendCentsForAdmin,
        totalSpendUsCentsForAdmin,
        totalSpendNonUsCentsForAdmin,
        totalRefundCents,
        endingAccountBalanceCentsForAdmin,
        endingAccountBalanceCents,
      },
    };
  }

  async getOverallSummaryForAdmin(
    virtualAccountId: string,
  ): Promise<PaymentSummaryAdminOverallResponseDto> {
    const summaries =
      await this.dailyPaymentSummariesService.getDailySummaries(
        virtualAccountId,
        new Date(0),
        new Date(),
      );

    if (!summaries || summaries.length === 0) {
      return {
        virtualAccountId,
        currency: 'USD',
        timezone: 'local',
        summary: {
          totalDepositCents: 0,
          totalSpendCents: 0,
          totalSpendUsCents: 0,
          totalSpendNonUsCents: 0,
          totalSpendCentsForAdmin: 0,
          totalSpendUsCentsForAdmin: 0,
          totalSpendNonUsCentsForAdmin: 0,
          totalRefundCents: 0,
          endingAccountBalanceCentsForAdmin: 0,
          endingAccountBalanceCents: 0,
        },
      };
    }

    const currency = summaries[0]?.currency ?? 'USD';

    let totalDepositCents = 0;
    let totalSpendUsCents = 0;
    let totalSpendNonUsCents = 0;
    let totalSpendUsCentsForAdmin = 0;
    let totalSpendNonUsCentsForAdmin = 0;
    let totalRefundCents = 0;

    for (const s of summaries) {
      totalDepositCents += s.totalDepositCents ?? 0;
      totalSpendUsCents += s.totalSpendUSCents ?? 0;
      totalSpendNonUsCents += s.totalSpendNonUSCents ?? 0;
      totalSpendUsCentsForAdmin += s.totalSpendUSCentsForAdmin ?? 0;
      totalSpendNonUsCentsForAdmin += s.totalSpendNonUSCentsForAdmin ?? 0;
      totalRefundCents += s.totalRefundCents ?? 0;
    }

    const totalSpendCents = totalSpendUsCents + totalSpendNonUsCents;
    const totalSpendCentsForAdmin =
      totalSpendUsCentsForAdmin + totalSpendNonUsCentsForAdmin;

    const endingAccountBalanceCents =
      totalDepositCents - totalSpendCents + totalRefundCents;
    const endingAccountBalanceCentsForAdmin =
      totalDepositCents - totalSpendCentsForAdmin + totalRefundCents;

    return {
      virtualAccountId,
      currency,
      timezone: 'local',
      summary: {
        totalDepositCents,
        totalSpendCents,
        totalSpendUsCents,
        totalSpendNonUsCents,
        totalSpendCentsForAdmin,
        totalSpendUsCentsForAdmin,
        totalSpendNonUsCentsForAdmin,
        totalRefundCents,
        endingAccountBalanceCentsForAdmin,
        endingAccountBalanceCents,
      },
    };
  }
}


import {
  formatSheetDate,
  formatSheetDateISOUtc,
  normalizeDateToUTC,
} from '../../../integrations/google-sheets/utils/sheet.utils';

export interface DailySummary {
  date: Date;
  totalDepositCents: number;
  totalSpendNonUSCents: number;
  totalSpendUSCents: number;
}

export interface LocationDailySummary {
  date: Date;
  totalSpendNonUSCents: number;
  totalSpendUSCents: number;
}

export function calculatePaymentDailySummaries(
  transactions: any[],
  startDate: Date,
  daysInMonth: number,
): DailySummary[] {
  const dailySummariesMap = new Map<string, DailySummary>();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(startDate.getFullYear(), startDate.getMonth(), day);
    const dateStr = formatSheetDate(date);

    dailySummariesMap.set(dateStr, {
      date,
      totalDepositCents: 0,
      totalSpendNonUSCents: 0,
      totalSpendUSCents: 0,
    });
  }

  transactions.forEach((transaction) => {
    if (!transaction.date) return;
    
    const transactionDate = new Date(transaction.date);
    const dateStr = formatSheetDate(transactionDate);

    const summary = dailySummariesMap.get(dateStr);
    if (summary) {
      const spendAmount = Math.abs(transaction.amountCents);
      if (transaction.merchantData?.location?.country === 'US') {
        summary.totalSpendUSCents += spendAmount;
      } else {
        summary.totalSpendNonUSCents += spendAmount;
      }
    }
  });

  return Array.from(dailySummariesMap.values());
}

export function calculateLocationDailySummaries(
  transactions: any[],
  startDate: Date,
  daysInMonth: number,
): LocationDailySummary[] {
  const dailySummariesMap = new Map<string, LocationDailySummary>();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(startDate.getFullYear(), startDate.getMonth(), day);
    const dateStr = formatSheetDate(date);

    dailySummariesMap.set(dateStr, {
      date,
      totalSpendNonUSCents: 0,
      totalSpendUSCents: 0,
    });
  }

  transactions.forEach((transaction) => {
    if (!transaction.date) return;
    
    const transactionDate = new Date(transaction.date);
    const dateStr = formatSheetDate(transactionDate);

    const summary = dailySummariesMap.get(dateStr);
    if (summary) {
      const spendAmount = Math.abs(transaction.amountCents);
      if (transaction.merchantData?.location?.country === 'US') {
        summary.totalSpendUSCents += spendAmount;
      } else {
        summary.totalSpendNonUSCents += spendAmount;
      }
    }
  });

  return Array.from(dailySummariesMap.values());
}

/**
 * Calculate location daily summaries for a full date range (not limited to one month).
 * Ngày theo UTC (cùng chuẩn daily_payment_summaries / Payment sheet full sync).
 */
export function calculateLocationDailySummariesRange(
  transactions: any[],
  startDate: Date,
  endDate: Date,
): LocationDailySummary[] {
  const dailySummariesMap = new Map<string, LocationDailySummary>();

  const normalizedStartDate = normalizeDateToUTC(startDate);
  const normalizedEndDate = normalizeDateToUTC(endDate);

  let current = new Date(normalizedStartDate);
  while (current.getTime() <= normalizedEndDate.getTime()) {
    const dateStr = formatSheetDateISOUtc(current);
    dailySummariesMap.set(dateStr, {
      date: new Date(current),
      totalSpendNonUSCents: 0,
      totalSpendUSCents: 0,
    });

    current = new Date(
      Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth(),
        current.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      ),
    );
  }

  transactions.forEach((transaction) => {
    if (!transaction.date) return;

    const normalizedDate = normalizeDateToUTC(new Date(transaction.date));

    if (
      normalizedDate.getTime() < normalizedStartDate.getTime() ||
      normalizedDate.getTime() > normalizedEndDate.getTime()
    ) {
      return;
    }

    const dateStr = formatSheetDateISOUtc(normalizedDate);

    const summary = dailySummariesMap.get(dateStr);
    if (summary) {
      const spendAmount = Math.abs(transaction.amountCents);
      if (transaction.merchantData?.location?.country === 'US') {
        summary.totalSpendUSCents += spendAmount;
      } else {
        summary.totalSpendNonUSCents += spendAmount;
      }
    }
  });

  return Array.from(dailySummariesMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

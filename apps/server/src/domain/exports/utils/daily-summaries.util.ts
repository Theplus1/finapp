import { formatSheetDate } from '../../../integrations/google-sheets/utils/sheet.utils';

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
    const transactionDate = new Date(transaction.date || transaction.authorizedAt);
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
    const transactionDate = new Date(transaction.date || transaction.authorizedAt);
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

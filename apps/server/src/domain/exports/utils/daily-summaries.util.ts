import { formatSheetDate, formatSheetDateISO } from '../../../integrations/google-sheets/utils/sheet.utils';

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
 * Calculate location daily summaries for a full date range (not limited to one month)
 * Normalizes transaction dates to UTC midnight for accurate matching
 * Creates summaries for ALL dates in range (from startDate to endDate), matching Payment sheet behavior
 */
export function calculateLocationDailySummariesRange(
  transactions: any[],
  startDate: Date,
  endDate: Date,
): LocationDailySummary[] {
  const dailySummariesMap = new Map<string, LocationDailySummary>();

  // Normalize start and end dates to UTC midnight
  const normalizedStartDate = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
    0, 0, 0, 0
  ));
  const normalizedEndDate = new Date(Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
    0, 0, 0, 0
  ));

  // Generate all dates in range (same as Payment sheet)
  const current = new Date(normalizedStartDate);
  while (current.getTime() <= normalizedEndDate.getTime()) {
    const dateStr = formatSheetDateISO(current); // Use ISO format to match Payment sheet
    dailySummariesMap.set(dateStr, {
      date: new Date(current),
      totalSpendNonUSCents: 0,
      totalSpendUSCents: 0,
    });
    
    // Move to next day
    current.setUTCDate(current.getUTCDate() + 1);
    current.setUTCHours(0, 0, 0, 0);
  }

  // Process transactions
  transactions.forEach((transaction) => {
    if (!transaction.date) return;

    // Normalize transaction date to UTC midnight
    const transactionDate = new Date(transaction.date);
    const normalizedDate = new Date(Date.UTC(
      transactionDate.getUTCFullYear(),
      transactionDate.getUTCMonth(),
      transactionDate.getUTCDate(),
      0, 0, 0, 0
    ));
    
    // Only process transactions within the date range
    if (normalizedDate.getTime() < normalizedStartDate.getTime() || normalizedDate.getTime() > normalizedEndDate.getTime()) {
      return;
    }
    
    const dateStr = formatSheetDateISO(normalizedDate); // Use ISO format to match Payment sheet

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

import { format } from 'date-fns';

export const DATE_FORMAT = 'M/d/yyyy';

/**
 * Normalize date to UTC midnight
 */
export function normalizeDateToUTC(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));
}

/**
 * Generate array of dates for a month
 */
export function generateMonthDates(startDate: Date, daysInMonth: number): Date[] {
  const year = startDate.getFullYear();
  const month = startDate.getMonth();
  
  return Array.from({ length: daysInMonth }, (_, i) => 
    new Date(year, month, i + 1)
  );
}

/**
 * Format date string for sheet display
 */
export function formatSheetDate(date: Date): string {
  return format(date, DATE_FORMAT);
}

/**
 * Create summary map from daily summaries
 */
export function createSummaryMap<T extends { date: Date }>(summaries: T[]): Map<string, T> {
  return new Map(
    summaries.map((summary) => [format(summary.date, DATE_FORMAT), summary])
  );
}

/**
 * Calculate end date for data display (today or month end, whichever is earlier)
 */
export function getCalculationEndDate(today: Date, endDate: Date): Date {
  return today < endDate ? today : endDate;
}

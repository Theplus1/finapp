export const DATE_FORMAT = 'M/d/yyyy';
export const DATE_FORMAT_ISO = 'yyyy-MM-dd';

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
 * Normalize date to UTC+0 midnight (00:00:00.000Z)
 */
export function normalizeDateToLocalMidnight(date: Date): Date {
  return normalizeDateToUTC(date);
}

/**
 * Generate array of dates for a month
 */
export function generateMonthDates(startDate: Date, daysInMonth: number): Date[] {
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth();
  
  return Array.from({ length: daysInMonth }, (_, i) => 
    new Date(Date.UTC(year, month, i + 1))
  );
}

/**
 * Format date string for sheet display
 */
export function formatSheetDate(date: Date): string {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}

/**
 * Format date string in ISO format (yyyy-MM-dd)
 */
export function formatSheetDateISO(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Create summary map from daily summaries
 */
export function createSummaryMap<T extends { date: Date }>(summaries: T[]): Map<string, T> {
  return new Map(
    summaries.map((summary) => [formatSheetDate(summary.date), summary])
  );
}

/**
 * Calculate end date for data display (today or month end, whichever is earlier)
 */
export function getCalculationEndDate(today: Date, endDate: Date): Date {
  return today < endDate ? today : endDate;
}

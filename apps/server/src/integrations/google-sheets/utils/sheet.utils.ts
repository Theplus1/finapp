import { format } from 'date-fns';

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
 * Normalize date to local midnight (keep original timezone, set time to 00:00:00)
 */
export function normalizeDateToLocalMidnight(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
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
 * Format date string in ISO format (yyyy-MM-dd)
 */
export function formatSheetDateISO(date: Date): string {
  return format(date, DATE_FORMAT_ISO);
}

/** yyyy-MM-dd theo lịch UTC (khớp daily_payment_summaries / API web). */
export function formatSheetDateISOUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

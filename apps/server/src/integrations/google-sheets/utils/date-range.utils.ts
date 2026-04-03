import { normalizeDateToUTC } from './sheet.utils';

/**
 * Generate continuous date range from startDate to endDate (inclusive).
 * Mỗi ô là UTC midnight (cùng chuẩn daily_payment_summaries / payments API web).
 */
export function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];

  if (!startDate || !endDate) {
    return dates;
  }

  let current = normalizeDateToUTC(startDate);
  const last = normalizeDateToUTC(endDate);

  while (current.getTime() <= last.getTime()) {
    dates.push(new Date(current));
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

  return dates;
}





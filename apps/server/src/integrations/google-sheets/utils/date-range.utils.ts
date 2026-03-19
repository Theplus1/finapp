import { normalizeDateToLocalMidnight } from './sheet.utils';

/**
 * Generate continuous date range from startDate to endDate (inclusive)
 * All dates are normalized to UTC midnight (UTC+0)
 */
export function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];

  if (!startDate || !endDate) {
    return dates;
  }

  let current = normalizeDateToLocalMidnight(startDate);
  const last = normalizeDateToLocalMidnight(endDate);

  while (current.getTime() <= last.getTime()) {
    dates.push(new Date(current));
    // Move to next UTC day
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }

  return dates;
}





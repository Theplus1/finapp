import { normalizeDateToLocalMidnight } from './sheet.utils';

/**
 * Generate continuous date range from startDate to endDate (inclusive)
 * All dates are normalized to local midnight (preserving timezone from DB)
 * Used for full sync to keep dates as stored in database
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
    // Move to next day (local time)
    current = new Date(current);
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return dates;
}





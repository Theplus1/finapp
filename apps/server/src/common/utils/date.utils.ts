/**
 * Parse `YYYY-MM-DD` as a UTC date-only (00:00:00.000Z).
 * This makes daily summaries independent from local server timezone.
 */
export function parseYyyyMmDdAsUtcDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date('invalid');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}


/**
 * Parse `YYYY-MM-DD` as a LOCAL date (not UTC).
 * This matches the "local midnight" behavior used by Google Sheets sync logic.
 */
export function parseYyyyMmDdAsLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date('invalid');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day);
}


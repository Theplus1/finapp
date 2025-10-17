export type CsvColumn<T> = {
  key: keyof T | string;
  header: string;
  map?: (row: T) => unknown;
};

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const rawData = String(value);
  const needsQuotes = /[",\n\r]/.test(rawData) || rawData.startsWith(' ') || rawData.endsWith(' ');
  const escaped = rawData.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function toCsvFromObjects<T extends Record<string, any>>(
  items: T[],
  columns: Array<CsvColumn<T>>,
): string {
  const headers = columns.map((c) => c.header).join(',');
  const rows = items.map((row) => {
    const cells = columns.map((c) => {
      if (typeof c.map === 'function') return escapeCsv(c.map(row));
      const key = c.key as keyof T;
      return escapeCsv(row[key]);
    });
    return cells.join(',');
  });
  return [headers, ...rows].join('\n');
}

export function toCsvAuto<T extends Record<string, any>>(items: T[]): string {
  const keysSet = new Set<string>();
  for (const it of items) {
    Object.keys(it || {}).forEach((k) => keysSet.add(k));
  }
  const keys = Array.from(keysSet);
  const headers = keys.join(',');
  const rows = items.map((row) =>
    keys.map((k) => escapeCsv(row?.[k])).join(','),
  );
  return [headers, ...rows].join('\n');
}

export type FileNameOptions = {
  prefix?: string; // e.g. "transactions"
  suffix?: string; // e.g. "report"
  ext?: string;    // e.g. "csv" (without dot)
  includeTime?: boolean; // include HHmmss
  separator?: string; // default '_'
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatDateForName(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `${yyyy}${mm}${dd}`;
}

export function formatTimeForName(date: Date): string {
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${hh}${mi}${ss}`;
}

export function buildTimestampedName(date = new Date(), opts: FileNameOptions = {}): string {
  const sep = opts.separator ?? '_';
  const parts: string[] = [];

  if (opts.prefix) parts.push(opts.prefix);

  const datePart = formatDateForName(date);
  const timePart = opts.includeTime ? formatTimeForName(date) : undefined;
  const tsPart = String(date.getTime());

  parts.push(datePart);
  if (timePart) parts.push(timePart);
  parts.push(tsPart);
  if (opts.suffix) parts.push(opts.suffix);

  const base = parts.join(sep);
  return opts.ext ? `${base}.${opts.ext.replace(/^\./, '')}` : base;
}

export function formatDateDDMMYY(date: Date): string {
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

export function buildDmyName(
  prefix = '',
  date = new Date(),
  ext = 'csv',
): string {
  const dmy = formatDateDDMMYY(date);
  const cleanExt = ext.replace(/^\./, '');
  return `${prefix}_${dmy}.${cleanExt}`;
}

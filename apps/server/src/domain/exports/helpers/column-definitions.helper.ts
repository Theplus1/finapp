import { ExcelColumn } from 'src/shared/utils/excel.util';
import { centsToDollars } from 'src/shared/utils/formatCurrency.util';

/** Hiển thị thời điểm theo UTC (khớp daily summaries / sync sheet). */
function formatDate(date: Date | undefined): string {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
}

function formatGroupMonth(date: Date | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatGroupDay(date: Date | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatAmount(amountCents: number): string {
  return (Math.abs(amountCents) / 100).toFixed(2);
}

function formatActualAmount(amountCents: number, currencyCode: string): string {
  const amount = formatAmount(amountCents);
  return amountCents < 0 ? `-${currencyCode}${amount}` : `${currencyCode}${amount}`;
}

export function getTransactionColumns(): ExcelColumn<any>[] {
  return [
    { key: 'slashId', header: 'ID' },
    { key: 'date', header: 'Date', map: (t) => formatDate(t.date) },
    { key: 'authorizedAt', header: 'Authorized', map: (t) => formatDate(t.authorizedAt) },
    { key: 'merchant', header: 'Merchant', map: (t) => t.merchantData?.description },
    { key: 'amount', header: 'Amount', map: (t) => t.amountCents ? centsToDollars(t.amountCents) : '' },
    { key: 'card', header: 'Card', map: (t) => t.card ? `${t.card.name} ${t.card.last4}` : '' },
    { key: 'detailedStatus', header: 'Status', map: (t) => t.detailedStatus.toUpperCase() },
    { key: 'originalAmount', header: 'Original', map: (t) => t.originalCurrency ? formatAmount(t.originalCurrency.amountCents) : '' },
    { key: 'originalCurrency', header: 'Currency', map: (t) => t.originalCurrency?.code },
    { key: 'groupMonth', header: 'Group Month', map: (t) => formatGroupMonth(t.authorizedAt) },
    { key: 'groupDay', header: 'Group Day', map: (t) => formatGroupDay(t.authorizedAt) },
  ];
}

export function getReversedTransactionColumns(): ExcelColumn<any>[] {
  return [
    { key: 'slashId', header: 'ID' },
    { key: 'date', header: 'Date', map: (t) => formatDate(t.date) },
    { key: 'authorizedAt', header: 'Authorized', map: (t) => formatDate(t.authorizedAt) },
    { key: 'merchant', header: 'Merchant', map: (t) => t.merchantData?.description },
    { key: 'amount', header: 'Amount', map: (t) => t.amountCents ? centsToDollars(t.amountCents) : '' },
    { key: 'card', header: 'Card', map: (t) => t.card ? `${t.card.name} ${t.card.last4}` : '' },
    { key: 'detailedStatus', header: 'Status', map: (t) => t.detailedStatus.toUpperCase() },
    { key: 'originalAmount', header: 'Original', map: (t) => t.originalCurrency ? formatAmount(t.originalCurrency.amountCents) : '' },
    { key: 'originalCurrency', header: 'Currency', map: (t) => t.originalCurrency?.code },
  ];
}

export function getCardColumns(): ExcelColumn<any>[] {
  return [
    { key: 'name', header: 'Name' },
    { key: 'type', header: 'Type', map: () => 'Visa' },
    { key: 'pan', header: 'Card' },
    { key: 'expiryDate', header: 'Exp Date', map: () => '' },
    { key: 'cvv', header: 'CVV', map: () => '' },
    { key: 'status', header: 'Status', map: (c) => c.status.toUpperCase() },
    { key: 'slashId', header: 'Card ID' },
    { key: 'note', header: 'Note', map: () => '' },
  ];
}

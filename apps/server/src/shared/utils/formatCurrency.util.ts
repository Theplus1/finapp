export function formatCurrency(value: number, code: string = 'USD'): string {
  return (value / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

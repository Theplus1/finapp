import { ExcelColumn } from '../../../shared/utils/excel.util';

/**
 * Map transaction object to row array according to columns definition
 */
export function mapTransactionToRow(transaction: any, columns: ExcelColumn<any>[]): any[] {
  return columns.map((col) => {
    if (col.map) {
      return col.map(transaction);
    }
    
    // Handle nested keys (e.g., 'merchantData.name')
    if (typeof col.key === 'string') {
      const keys = col.key.split('.');
      let value = transaction;
      for (const key of keys) {
        value = value?.[key];
      }
      return value ?? '';
    }
    
    // Direct key access
    return transaction[col.key] ?? '';
  });
}

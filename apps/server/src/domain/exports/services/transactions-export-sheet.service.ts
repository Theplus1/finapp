import { Injectable } from '@nestjs/common';
import { SheetData } from '../../../integrations/google-sheets/services/google-sheets.service';
// Sheet names for export (not dependent on Google Sheets SheetName enum)
import { getTransactionColumns, getReversedTransactionColumns } from '../helpers/column-definitions.helper';
import { mapTransactionToRow } from '../../../integrations/google-sheets/utils/transaction-mapper.util';

@Injectable()
export class TransactionsExportSheetService {
  generateTransactionsSheet(transactions: any[]): SheetData {
    const columns = getTransactionColumns();
    const headers = columns.map((col) => col.header);
    const rows = transactions.map((transaction) => mapTransactionToRow(transaction, columns));

    return {
      name: 'Transactions History',
      headers,
      rows,
    };
  }

  generateHoldSheet(pendingTransactions: any[]): SheetData {
    const columns = getTransactionColumns();
    const headers = columns.map((col) => col.header);
    const rows = pendingTransactions.map((transaction) => mapTransactionToRow(transaction, columns));

    return {
      name: 'Hold',
      headers,
      rows,
    };
  }

  generateReversedSheet(transactions: any[]): SheetData {
    const columns = getReversedTransactionColumns();
    const headers = columns.map((col) => col.header);
    const rows = transactions.map((transaction) => mapTransactionToRow(transaction, columns));

    return {
      name: 'Reversed',
      headers,
      rows,
    };
  }
}

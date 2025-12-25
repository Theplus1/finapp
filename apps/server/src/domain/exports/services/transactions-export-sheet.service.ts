import { Injectable } from '@nestjs/common';
import { SheetData } from '../../../integrations/google-sheets/services/google-sheets.service';
import { SheetName } from '../../../integrations/google-sheets/constants/sheet-names.constant';
import { getTransactionColumns, getReversedTransactionColumns } from '../helpers/column-definitions.helper';
import { mapTransactionToRow } from '../../../integrations/google-sheets/utils/transaction-mapper.util';

@Injectable()
export class TransactionsExportSheetService {
  generateTransactionsSheet(transactions: any[]): SheetData {
    const columns = getTransactionColumns();
    const headers = columns.map((col) => col.header);
    const rows = transactions.map((transaction) => mapTransactionToRow(transaction, columns));

    return {
      name: SheetName.TRANSACTIONS_HISTORY,
      headers,
      rows,
    };
  }

  generateHoldSheet(pendingTransactions: any[]): SheetData {
    const columns = getTransactionColumns();
    const headers = columns.map((col) => col.header);
    const rows = pendingTransactions.map((transaction) => mapTransactionToRow(transaction, columns));

    return {
      name: SheetName.HOLD,
      headers,
      rows,
    };
  }

  generateReversedSheet(transactions: any[]): SheetData {
    const columns = getReversedTransactionColumns();
    const headers = columns.map((col) => col.header);
    const rows = transactions.map((transaction) => mapTransactionToRow(transaction, columns));

    return {
      name: SheetName.REVERSED,
      headers,
      rows,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { SheetData } from './google-sheets.service';
import { SheetName } from '../constants/sheet-names.constant';
import { getTransactionColumns } from '../../../domain/exports/helpers/column-definitions.helper';
import { mapTransactionToRow } from '../utils/transaction-mapper.util';

@Injectable()
export class RefundedSheetService {
  generateRefundedSheet(transactions: any[]): SheetData {
    const columns = getTransactionColumns();
    const headers = columns.map((col) => col.header);
    const rows = transactions.map((transaction) => mapTransactionToRow(transaction, columns));

    return {
      name: SheetName.REFUNDED,
      headers,
      rows,
    };
  }
}


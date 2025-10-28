import { Injectable } from '@nestjs/common';
import { TransactionsService } from '../../transactions/transactions.service';
import { AccountsService } from '../../accounts/accounts.service';
import { CardsService } from '../../cards/cards.service';
import { TransactionDetailedStatus } from 'src/integrations/slash/types';
import { toExcelFromSheets, toExcelFromObjects } from 'src/shared/utils/excel.util';
import { PaymentSheetBuilder } from './payment-sheet.builder';
import { getTransactionColumns, getReversedTransactionColumns, getCardColumns } from '../helpers/column-definitions.helper';

export interface ExportResult {
  buffer: Buffer;
  recordCount: number;
}

@Injectable()
export class ExportGeneratorsService {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly accountsService: AccountsService,
    private readonly cardsService: CardsService,
    private readonly paymentSheetBuilder: PaymentSheetBuilder,
  ) {}

  async generateTransactionsExport(filters: Record<string, any>): Promise<ExportResult> {
    const transactions = await this.transactionsService.findAllWithFilters(filters);
    const virtualAccount = await this.accountsService.findBySlashId(filters.virtualAccountId);

    const { settledTransactions, reversedTransactions } = this.partitionTransactions(transactions);

    const buffer = await toExcelFromSheets([
      {
        name: 'Payment',
        data: [virtualAccount],
        columns: this.paymentSheetBuilder.getColumns(),
        customBuilder: (sheet, data, columns) => this.paymentSheetBuilder.build(sheet, columns, virtualAccount),
      },
      {
        name: 'Transactions History',
        data: settledTransactions,
        columns: getTransactionColumns(),
      },
      {
        name: 'Reversed',
        data: reversedTransactions,
        columns: getReversedTransactionColumns(),
      },
    ]);

    return {
      buffer,
      recordCount: transactions.length,
    };
  }

  async generateCardsExport(filters: Record<string, any>): Promise<ExportResult> {
    const [cards, total] = await this.cardsService.findAllWithFilters({
      virtualAccountId: filters.virtualAccountId,
    });

    const buffer = await toExcelFromObjects(cards, getCardColumns(), 'Cards');

    return {
      buffer,
      recordCount: total,
    };
  }

  private partitionTransactions(transactions: any[]) {
    const settledTransactions = transactions.filter(
      t => t.detailedStatus !== TransactionDetailedStatus.REVERSED
    );
    const reversedTransactions = transactions.filter(
      t => t.detailedStatus === TransactionDetailedStatus.REVERSED
    );

    return { settledTransactions, reversedTransactions };
  }
}

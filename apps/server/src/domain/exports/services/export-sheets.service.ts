import { Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';
import { SheetData } from '../../../integrations/google-sheets/services/google-sheets.service';
import { PaymentExportSheetService } from './payment-export-sheet.service';
import { DepositExportSheetService } from './deposit-export-sheet.service';
import { LocationExportSheetService } from './location-export-sheet.service';
import { TransactionsExportSheetService } from './transactions-export-sheet.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { AccountsService } from '../../accounts/accounts.service';
import { TransactionDetailedStatus } from '../../../integrations/slash/types';

const MONTH_FORMAT = 'yyyy-MM';

interface DateRange {
  startDate: Date;
  endDate: Date;
  today: Date;
  daysInMonth: number;
}

@Injectable()
export class ExportSheetsService {
  private readonly logger = new Logger(ExportSheetsService.name);

  constructor(
    private readonly paymentExportSheetService: PaymentExportSheetService,
    private readonly depositExportSheetService: DepositExportSheetService,
    private readonly locationExportSheetService: LocationExportSheetService,
    private readonly transactionsExportSheetService: TransactionsExportSheetService,
    private readonly transactionsService: TransactionsService,
    private readonly accountsService: AccountsService,
  ) {}

  async generateAllSheets(filters: Record<string, any>): Promise<SheetData[]> {
    const virtualAccountId = filters.virtualAccountId;
    const month = filters.month || format(new Date(), MONTH_FORMAT);

    this.logger.log(`Generating export sheets for ${virtualAccountId}, month: ${month}`);

    const [year, monthNum] = month.split('-').map(Number);

    const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(year, monthNum - 1, daysInMonth, 23, 59, 59, 999));
    const today = new Date();

    const transactions = await this.transactionsService.findAllWithFilters({
      virtualAccountId,
      detailedStatus: {
        $in: [
          TransactionDetailedStatus.SETTLED,
          TransactionDetailedStatus.PENDING,
          TransactionDetailedStatus.REVERSED,
        ]
      },
      amountCents: { $lt: 0 },
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const virtualAccount = await this.accountsService.findBySlashId(virtualAccountId);

    const settledTransactions = transactions.filter(
      (t) => [TransactionDetailedStatus.SETTLED, TransactionDetailedStatus.PENDING].includes(t.detailedStatus),
    );
    const reversedTransactions = transactions.filter(
      (t) => t.detailedStatus === TransactionDetailedStatus.REVERSED,
    );
    const pendingTransactions = transactions.filter(
      (t) => t.detailedStatus === TransactionDetailedStatus.PENDING,
    );

    const dateRange = { startDate, endDate, today, daysInMonth };

    const sheets: SheetData[] = [
      this.paymentExportSheetService.generatePaymentSheet(virtualAccount, dateRange, transactions),
      this.depositExportSheetService.generateDepositSheet(startDate, daysInMonth),
      this.locationExportSheetService.generateLocationSheet(dateRange, transactions),
      this.transactionsExportSheetService.generateHoldSheet(pendingTransactions),
      this.transactionsExportSheetService.generateTransactionsSheet(settledTransactions),
      this.transactionsExportSheetService.generateReversedSheet(reversedTransactions),
    ];

    this.logger.log(`Generated ${sheets.length} sheets with ${transactions.length} total transactions`);

    return sheets;
  }
}

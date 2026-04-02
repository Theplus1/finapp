import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleSheetsService, SheetData } from './google-sheets.service';
import { GoogleSheetReportAllService } from './google-sheet-report-all.service';
import { LocationSheetService } from './location-sheet.service';
import { HoldSheetService } from './hold-sheet.service';
import { TransactionsHistorySheetService } from './transactions-history-sheet.service';
import { ReversedSheetService } from './reversed-sheet.service';
import { RefundedSheetService } from './refunded-sheet.service';
import { PaymentSheetService } from './payment-sheet.service';
import { DepositSheetService } from './deposit-sheet.service';
import { TransactionsService } from '../../../domain/transactions/transactions.service';
import { TransactionWithRelations } from '../../../domain/transactions/types/transaction.types';
import { AccountsService } from '../../../domain/accounts/accounts.service';
import { TransactionDetailedStatus } from '../../../integrations/slash/types';
import { getTransactionColumns } from '../../../domain/exports/helpers/column-definitions.helper';
import { generateDateRange } from '../utils/date-range.utils';
import { normalizeDateToUTC } from '../utils/sheet.utils';
import { VirtualAccountDocument } from 'src/database/schemas/virtual-account.schema';
import { DailyPaymentSummariesService } from '../../../domain/daily-payment-summaries/daily-payment-summaries.service';

/** Max rows loaded from DB for transaction-detail tabs (per VA). */
const GOOGLE_SHEETS_FULL_SYNC_DETAIL_LIMIT = 25_000;

/**
 * Helper function to delay execution
 */
const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Handles full data sync for Virtual Accounts
 */
@Injectable()
export class GoogleSheetsSyncFullService {
  private readonly logger = new Logger(GoogleSheetsSyncFullService.name);
  private readonly syncDelayBetweenAccounts: number;

  constructor(
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly googleSheetReportAllService: GoogleSheetReportAllService,
    private readonly locationSheetService: LocationSheetService,
    private readonly paymentSheetService: PaymentSheetService,
    private readonly depositSheetService: DepositSheetService,
    private readonly holdSheetService: HoldSheetService,
    private readonly transactionsHistorySheetService: TransactionsHistorySheetService,
    private readonly reversedSheetService: ReversedSheetService,
    private readonly refundedSheetService: RefundedSheetService,
    private readonly transactionsService: TransactionsService,
    private readonly accountsService: AccountsService,
    private readonly dailyPaymentSummariesService: DailyPaymentSummariesService,
    private readonly configService: ConfigService,
  ) {
    const delayStr = this.configService.get<string>(
      'googleSheets.syncDelayBetweenAccounts',
      '30000',
    );
    const parsedDelay = parseInt(delayStr, 10);
    this.syncDelayBetweenAccounts = isNaN(parsedDelay) || parsedDelay < 0 ? 30000 : parsedDelay;
  }

  /**
   * Sync full data for a virtual account
   */
  async syncFullDataVirtualAccountToSheets(
    virtualAccountId: string,
  ): Promise<void> {
    const startTime = Date.now();
    const now = new Date();

    this.logger.log(
      `Starting full data sync for VA ${virtualAccountId}...`,
    );

    try {
      const report = await this.googleSheetReportAllService.findByVirtualAccountId(virtualAccountId);
      
      if (!report) {
        throw new Error(
          `No Google Sheet report found for virtual account ${virtualAccountId}. ` +
          `Please create a report first using POST /google-sheets/reports-all`
        );
      }

      const exists = await this.googleSheetsService.spreadsheetExists(report.sheetId);
      if (!exists) {
        const errorMsg = `Spreadsheet ${report.sheetId} (${report.sheetName}) not found. Please check the sheet ID.`;
        this.logger.error(errorMsg);
        throw new Error(`Spreadsheet ${report.sheetId} not found`);
      }

      const dailySummaries =
        await this.dailyPaymentSummariesService.findAllByVirtualAccountSortedAsc(
          virtualAccountId,
        );

      if (dailySummaries.length === 0) {
        this.logger.warn(
          `No daily payment summaries for VA ${virtualAccountId}; skip full sync (run daily summary job first).`,
        );
        return;
      }

      const firstSummaryDate = normalizeDateToUTC(
        new Date(dailySummaries[0].date),
      );
      const rangeEnd = normalizeDateToUTC(now);

      this.logger.log(
        `Date range from daily summaries: ${firstSummaryDate.toISOString()} to ${rangeEnd.toISOString()} (${dailySummaries.length} summary rows)`,
      );

      const fullDateRange = {
        startDate: firstSummaryDate,
        endDate: rangeEnd,
        today: rangeEnd,
        days: generateDateRange(firstSummaryDate, rangeEnd).length,
      };

      const virtualAccount =
        await this.accountsService.findBySlashId(virtualAccountId);

      const detailPool =
        await this.transactionsService.findRecentForGoogleSheetsDetailPool(
          virtualAccountId,
          GOOGLE_SHEETS_FULL_SYNC_DETAIL_LIMIT,
        );

      detailPool.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateA - dateB;
      });

      const transactionsHistoryTransactions = detailPool.filter((t) =>
        [
          TransactionDetailedStatus.SETTLED,
          TransactionDetailedStatus.PENDING,
        ].includes(t.detailedStatus),
      );

      const holdTransactions = detailPool.filter(
        (t) => t.detailedStatus === TransactionDetailedStatus.PENDING,
      );

      const reversedTransactions = detailPool.filter(
        (t) => t.detailedStatus === TransactionDetailedStatus.REVERSED,
      );

      const refundedTransactionsSorted =
        await this.transactionsService.findRecentRefundsForGoogleSheets(
          virtualAccountId,
          GOOGLE_SHEETS_FULL_SYNC_DETAIL_LIMIT,
        );

      this.logger.log(
        `Detail pool (DB limit ${GOOGLE_SHEETS_FULL_SYNC_DETAIL_LIMIT}): ` +
          `history+hold source ${detailPool.length} rows; ` +
          `Transactions History ${transactionsHistoryTransactions.length}, ` +
          `Hold ${holdTransactions.length}, ` +
          `Reversed ${reversedTransactions.length}, ` +
          `Refund tab ${refundedTransactionsSorted.length}`,
      );

      if (refundedTransactionsSorted.length > 0) {
        this.logger.log(
          `Refund sample dates: ${refundedTransactionsSorted
            .slice(0, 5)
            .map((t) => t.date)
            .join(', ')}`,
        );
      } else {
        this.logger.warn(
          `No REFUND transactions in latest ${GOOGLE_SHEETS_FULL_SYNC_DETAIL_LIMIT} for VA ${virtualAccountId}`,
        );
      }

      const sheets = await this.generateFullDataSheets(
        virtualAccount,
        dailySummaries,
        fullDateRange,
        transactionsHistoryTransactions,
        holdTransactions,
        reversedTransactions,
        refundedTransactionsSorted,
      );

      // Clear and overwrite all sheets
      this.logger.log(`Writing data to Google Sheets (overwrite mode)...`);

      if (sheets.length > 0) {
        this.logger.log(`Updating ${sheets.length} sheets: ${sheets.map((s) => s.name).join(', ')}`);
        await this.googleSheetsService.updateSheets(report.sheetId, sheets);
      }
      
      await this.googleSheetReportAllService.createOrUpdate({
        sheetId: report.sheetId,
        virtualAccountId,
      });

      const transactionCount =
        detailPool.length + refundedTransactionsSorted.length;
      const duration = Date.now() - startTime;
      const sheetNameDisplay = report.sheetName || report.sheetId;
      this.logger.log(
        `Synced ${sheetNameDisplay} (${report.sheetId}) successfully (${transactionCount} transactions, ${duration}ms)`,
      );
    } catch (error) {
      this.logger.error(`Failed to sync full data for VA ${virtualAccountId}:`, error);
      
      const report = await this.googleSheetReportAllService.findByVirtualAccountId(virtualAccountId);
      if (report) {
        await this.googleSheetReportAllService.createOrUpdate({
          sheetId: report.sheetId,
          virtualAccountId,
        });
      }
      
      throw error;
    }
  }

  /**
   * Parse date from transaction row
   */
  private parseDateFromRow(row: any[]): Date | null {
    if (!row || row.length < 2 || !row[1]) {
      return null;
    }
    try {
      return new Date(row[1]);
    } catch {
      return null;
    }
  }

  /**
   * Generate full data sheets
   */
  private async generateFullDataSheets(
    virtualAccount: VirtualAccountDocument,
    dailySummaries: { date: Date; totalDepositCents: number; totalSpendNonUSCents: number; totalSpendUSCents: number }[],
    fullDateRange: { startDate: Date; endDate: Date; today: Date; days: number },
    transactionsHistoryTransactions: TransactionWithRelations[],
    holdTransactions: TransactionWithRelations[],
    reversedTransactions: TransactionWithRelations[],
    refundedTransactions: TransactionWithRelations[],
  ): Promise<SheetData[]> {
    const sheets: SheetData[] = [
      this.depositSheetService.generateDepositSheetFullRangeFromSummaries(
        fullDateRange.startDate,
        fullDateRange.endDate,
        dailySummaries,
      ),
      this.paymentSheetService.generatePaymentSheetFullRangeFromSummaries(
        virtualAccount,
        fullDateRange,
        dailySummaries,
      ),
      this.transactionsHistorySheetService.generateTransactionsHistorySheet(
        transactionsHistoryTransactions,
      ),
      this.holdSheetService.generateHoldSheet(holdTransactions),
      this.reversedSheetService.generateReversedSheet(reversedTransactions),
      this.refundedSheetService.generateRefundedSheet(refundedTransactions),
      this.locationSheetService.generateLocationSheetFullRangeFromSummaries(
        fullDateRange,
        dailySummaries,
      ),
    ];

    this.logger.log(
      `Generated sheets from ${dailySummaries.length} daily summaries; ` +
        `Transactions History (${transactionsHistoryTransactions.length}), Hold (${holdTransactions.length}), ` +
        `Reversed (${reversedTransactions.length}), Refund (${refundedTransactions.length})`,
    );

    return sheets;
  }

  /**
   * Update Transactions History sheet
   */
  private async updateTransactionsHistorySheet(
    spreadsheetId: string,
    sheetName: string,
    transactions: any[],
    startDate?: Date,
  ): Promise<void> {
    try {
      const transactionColumns = getTransactionColumns();
      const rows = transactions.map((tx) => {
        return transactionColumns.map((col) => {
          if (col.map) {
            return col.map(tx);
          }
          return tx[col.key] ?? '';
        });
      });

      if (!startDate) {
        this.logger.log(`No startDate provided: clearing and overwriting entire ${sheetName} sheet with ${rows.length} transactions`);
        
        await this.googleSheetsService.clearSheetRows(spreadsheetId, sheetName, 2);

        const headers = transactionColumns.map((col) => col.header);
        const values = [headers, ...rows];
        
        await this.googleSheetsService.updateSheetValues(
          spreadsheetId,
          `${sheetName}!A1`,
          values,
        );

        this.logger.log(`Overwritten entire ${sheetName} sheet with ${rows.length} transactions`);

        await this.googleSheetsService.sortSheetByDateAsc(spreadsheetId, sheetName);
      } else {
        this.logger.log(`startDate provided (${startDate.toISOString()}): finding and overwriting data from startDate to now`);

        this.logger.log(`Sorting sheet before update to ensure existing data is sorted correctly`);
        await this.googleSheetsService.sortSheetByDateAsc(spreadsheetId, sheetName);

        const existingData = await this.googleSheetsService.readSheetData(
          spreadsheetId,
          sheetName,
        );

        const filteredRows = rows.filter((row, index) => {
          const tx = transactions[index];
          const txDate = tx.date ? new Date(tx.date).getTime() : 0;
          return txDate >= startDate.getTime();
        });

        let startRowIndex = -1;
        const startDateTime = startDate.getTime();

        if (existingData.length > 1) {
          for (let i = 1; i < existingData.length; i++) {
            const row = existingData[i];
            if (row && row[1]) {
              const txDate = this.parseDateFromRow(row);
              if (txDate && txDate.getTime() >= startDateTime) {
                startRowIndex = i;
                break;
              }
            }
          }
        }

        if (startRowIndex === -1) {
          this.logger.log(`No existing rows found >= startDate, appending ${filteredRows.length} transactions to end`);
          const appendRange = `${sheetName}!A:Z`;
          await this.googleSheetsService.appendRows(spreadsheetId, appendRange, filteredRows);
        } else {
          const deleteStartRow = startRowIndex + 1;
          this.logger.log(`Found start row at ${deleteStartRow}, deleting from row ${deleteStartRow} to end, then appending ${filteredRows.length} transactions`);

          if (existingData.length > deleteStartRow) {
            await this.googleSheetsService.clearSheetRows(
              spreadsheetId,
              sheetName,
              deleteStartRow + 1,
            );
          }

          const appendRange = `${sheetName}!A:Z`;
          await this.googleSheetsService.appendRows(spreadsheetId, appendRange, filteredRows);
        }

        await this.googleSheetsService.sortSheetByDateAsc(spreadsheetId, sheetName);

        this.logger.log(`Updated ${sheetName} from startDate with ${filteredRows.length} transactions`);
      }
    } catch (error) {
      this.logger.error(`Error updating ${sheetName}:`, error);      
      throw error;
    }
  }

  /**
   * Sync full data for all virtual accounts that have Google Sheet reports
   */
  async syncFullDataAllVirtualAccounts(): Promise<void> {
    this.logger.log('Starting full data sync for all virtual accounts...');

    try {
      const reports = await this.googleSheetReportAllService.findAll();
      
      if (!reports || reports.length === 0) {
        this.logger.warn('No Google Sheet reports found. Please create reports first.');
        return;
      }

      this.logger.log(`Found ${reports.length} reports to sync`);

      let success = 0;
      let failed = 0;

      // Sync each virtual account sequentially
      for (let i = 0; i < reports.length; i++) {
        const report = reports[i];
        
        try {
          await this.syncFullDataVirtualAccountToSheets(report.virtualAccountId);
          success++;
          this.logger.log(
            `[${i + 1}/${reports.length}] Successfully synced VA ${report.virtualAccountId}`,
          );
        } catch (error) {
          failed++;
          this.logger.error(
            `[${i + 1}/${reports.length}] Failed to sync full data for VA ${report.virtualAccountId}:`,
            error,
          );
        }

        // Add delay between accounts
        if (i < reports.length - 1 && this.syncDelayBetweenAccounts > 0) {
          this.logger.debug(
            `Waiting ${this.syncDelayBetweenAccounts}ms before syncing next account...`,
          );
          await delay(this.syncDelayBetweenAccounts);
        }
      }

      this.logger.log(
        `Completed full data sync: ${success} succeeded, ${failed} failed out of ${reports.length} total`,
      );
    } catch (error) {
      this.logger.error('Failed to sync full data for all accounts:', error);
      throw error;
    }
  }
}


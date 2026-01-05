import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { format } from 'date-fns';
import { GoogleSheetsService, SheetData } from './google-sheets.service';
import { GoogleSheetReportService } from './google-sheet-report.service';
import { PaymentSheetService } from './payment-sheet.service';
import { DepositSheetService } from './deposit-sheet.service';
import { LocationSheetService } from './location-sheet.service';
import { HoldSheetService } from './hold-sheet.service';
import { TransactionsHistorySheetService } from './transactions-history-sheet.service';
import { ReversedSheetService } from './reversed-sheet.service';
import { SheetName } from '../constants/sheet-names.constant';
import { TransactionsService } from '../../../domain/transactions/transactions.service';
import { AccountsService } from '../../../domain/accounts/accounts.service';
import { DailyPaymentSummariesService } from '../../../domain/daily-payment-summaries/daily-payment-summaries.service';
import { TransactionDetailedStatus } from '../../../integrations/slash/types';

const MONTH_FORMAT = 'yyyy-MM';
const DATE_FORMAT = 'M/d/yyyy';

/**
 * Helper function to delay execution
 */
const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Normalize date to UTC
 */
function normalizeDateToUTC(date: Date): Date {
  const utcDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));
  return utcDate;
}

/**
 * Google Sheets Sync Service
 * Handles sync logic from database to Google Sheets
 */
@Injectable()
export class GoogleSheetsSyncService {
  private readonly logger = new Logger(GoogleSheetsSyncService.name);
  private readonly syncDelayBetweenAccounts: number;

  constructor(
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly googleSheetReportService: GoogleSheetReportService,
    private readonly paymentSheetService: PaymentSheetService,
    private readonly depositSheetService: DepositSheetService,
    private readonly locationSheetService: LocationSheetService,
    private readonly holdSheetService: HoldSheetService,
    private readonly transactionsHistorySheetService: TransactionsHistorySheetService,
    private readonly reversedSheetService: ReversedSheetService,
    private readonly transactionsService: TransactionsService,
    private readonly accountsService: AccountsService,
    private readonly dailyPaymentSummariesService: DailyPaymentSummariesService,
    private readonly configService: ConfigService,
  ) {
    // Parse syncDelayBetweenAccounts from config with safe fallback
    const delayStr = this.configService.get<string>(
      'googleSheets.syncDelayBetweenAccounts',
      '1000',
    );
    const parsedDelay = parseInt(delayStr, 10);
    this.syncDelayBetweenAccounts = isNaN(parsedDelay) || parsedDelay < 0 ? 1000 : parsedDelay;
  }

  /**
   * Sync a virtual account to Google Sheets (current month)
   */
  async syncVirtualAccountToSheets(virtualAccountId: string): Promise<void> {
    const startTime = Date.now();

    try {
      const virtualAccount = await this.accountsService.findBySlashId(virtualAccountId);

      if (!virtualAccount) {
        this.logger.warn(`Virtual account not found: ${virtualAccountId}`);
        return;
      }

      const currentMonth = format(new Date(), MONTH_FORMAT);
      const [yearStr, monthStr] = currentMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      this.logger.log(`Syncing ${virtualAccountId}_${currentMonth}...`);

      // Look up in GoogleSheetReport collection
      const report = await this.googleSheetReportService.findByVirtualAccountIdAndMonth(
        virtualAccountId,
        month,
        year,
      );

      if (!report) {
        this.logger.warn(
          `No Google Sheet report found for ${virtualAccountId} in ${currentMonth}. ` +
          `Please create a report first using POST /google-sheets/reports`,
        );
        return;
      }

      // Verify spreadsheet exists
      const exists = await this.googleSheetsService.spreadsheetExists(report.sheetId);
      if (!exists) {
        this.logger.error(
          `Spreadsheet ${report.sheetId} (${report.sheetName}) not found. ` +
          `Please check if the file exists or update the report.`,
        );
        throw new Error(`Spreadsheet ${report.sheetId} not found`);
      }

      // Get data for current month
      const sheets = await this.generateSheetsData(virtualAccountId, currentMonth, report.sheetId);

      // Update existing spreadsheet
      await this.googleSheetsService.updateSheets(report.sheetId, sheets);

      // Update report sync status
      report.lastSyncedAt = new Date();
      report.lastSyncStatus = 'success';
      report.lastSyncError = undefined;
      await report.save();

      const transactionCount = sheets.find((s) => s.name === SheetName.TRANSACTIONS_HISTORY)?.rows.length || 0;
      const duration = Date.now() - startTime;
      this.logger.log(
        `Synced ${report.sheetName} (${report.sheetId}) successfully (${transactionCount} transactions, ${duration}ms)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to sync virtual account ${virtualAccountId} (${duration}ms):`, error);

      // Update report sync status with error
      const currentMonth = format(new Date(), MONTH_FORMAT);
      const [yearStr, monthStr] = currentMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      const report = await this.googleSheetReportService.findByVirtualAccountIdAndMonth(
        virtualAccountId,
        month,
        year,
      );

      if (report) {
        report.lastSyncedAt = new Date();
        report.lastSyncStatus = 'failed';
        report.lastSyncError = error.message;
        await report.save();
      }

      throw error;
    }
  }

  /**
   * Sync all virtual accounts
   */
  async syncAllVirtualAccounts(): Promise<{ success: number; failed: number }> {
    const startTime = Date.now();
    this.logger.log('Starting sync all virtual accounts to Google Sheets...');

    const virtualAccounts = await this.accountsService.findAll();
    this.logger.log(`Found ${virtualAccounts.length} virtual accounts in database to sync`);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < virtualAccounts.length; i++) {
      const account = virtualAccounts[i];
      try {
        await this.syncVirtualAccountToSheets(account.slashId);
        success++;
        this.logger.debug(`Synced ${account.slashId} (${i + 1}/${virtualAccounts.length})`);

        if (i < virtualAccounts.length - 1 && this.syncDelayBetweenAccounts > 0) {
          await delay(this.syncDelayBetweenAccounts);
        }
      } catch (error) {
        failed++;
        this.logger.error(`Failed to sync ${account.slashId}:`, error);

        if (i < virtualAccounts.length - 1 && this.syncDelayBetweenAccounts > 0) {
          await delay(this.syncDelayBetweenAccounts);
        }
      }
    }

    const duration = Date.now() - startTime;
    this.logger.log(
      `Completed sync all virtual accounts: ${success} success, ${failed} failed (${duration}ms)`,
    );

    return { success, failed };
  }

  /**
   * Generate sheets data for a virtual account (current month)
   */
  private async generateSheetsData(virtualAccountId: string, month: string, spreadsheetId?: string): Promise<SheetData[]> {
    const [year, monthNum] = month.split('-').map(Number);

    // Create dates in UTC to avoid timezone conversion issues
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

    // Get virtual account info
    const virtualAccount = await this.accountsService.findBySlashId(virtualAccountId);

    // Partition transactions
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
      this.paymentSheetService.generatePaymentSheet(virtualAccount, dateRange, transactions),
      this.depositSheetService.generateDepositSheet(startDate, daysInMonth),
      this.locationSheetService.generateLocationSheet(virtualAccount, dateRange, transactions),
      this.holdSheetService.generateHoldSheet(pendingTransactions),
      this.transactionsHistorySheetService.generateTransactionsHistorySheet(settledTransactions),
      this.reversedSheetService.generateReversedSheet(reversedTransactions),
    ];

    return sheets;
  }

  /**
   * Get sync status for a virtual account
   */
  async getSyncStatus(virtualAccountId: string): Promise<any> {
    const currentMonth = format(new Date(), MONTH_FORMAT);
    const [yearStr, monthStr] = currentMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const report = await this.googleSheetReportService.findByVirtualAccountIdAndMonth(
      virtualAccountId,
      month,
      year,
    );

    return report ? {
      virtualAccountId: report.virtualAccountId,
      month: currentMonth,
      spreadsheetId: report.sheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${report.sheetId}`,
      lastSyncedAt: report.lastSyncedAt,
      lastSyncStatus: report.lastSyncStatus,
      lastSyncError: report.lastSyncError,
    } : null;
  }

  /**
   * Get all sync records
   */
  async getAllSyncRecords(): Promise<any[]> {
    const reports = await this.googleSheetReportService.findAll();
    return reports.map((report) => {
      const reportObj = report.toObject();
      const month = `${reportObj.year}-${String(reportObj.month).padStart(2, '0')}`;
      return {
        virtualAccountId: reportObj.virtualAccountId,
        month,
        spreadsheetId: reportObj.sheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${reportObj.sheetId}`,
        lastSyncedAt: reportObj.lastSyncedAt,
        lastSyncStatus: reportObj.lastSyncStatus,
        lastSyncError: reportObj.lastSyncError,
      };
    }).sort((a, b) => {
      if (!a.lastSyncedAt && !b.lastSyncedAt) return 0;
      if (!a.lastSyncedAt) return 1;
      if (!b.lastSyncedAt) return -1;
      return new Date(b.lastSyncedAt).getTime() - new Date(a.lastSyncedAt).getTime();
    });
  }
}


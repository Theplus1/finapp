import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { ExcelColumn } from 'src/shared/utils/excel.util';
import { VirtualAccountDocument } from 'src/database/schemas/virtual-account.schema';
import { DailyPaymentSummariesService } from '../../daily-payment-summaries/daily-payment-summaries.service';
import { formatCurrency } from 'src/shared/utils/formatCurrency.util';

interface MonthlyTotals {
  totalDepositCents: number;
  totalSpendNonUSCents: number;
  totalSpendUSCents: number;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
  daysInMonth: number;
  year: number;
  month: number;
}

@Injectable()
export class PaymentSheetBuilder {
  private static readonly HEADER_ROW = 1;
  private static readonly SUMMARY_ROW = 2;
  private static readonly DATA_START_ROW = 3;
  private static readonly DATE_FORMAT = 'M/d/yyyy';

  constructor(
    private readonly dailyPaymentSummariesService: DailyPaymentSummariesService,
  ) { }

  getColumns(): ExcelColumn<any>[] {
    return [
      { key: 'date', header: 'Date' },
      { key: 'totalDeposit', header: 'Tổng nạp' },
      { key: 'totalSpend', header: 'Tổng tiêu' },
      { key: 'totalSpendNonUS', header: 'Tổng tiêu non US' },
      { key: 'totalSpendUS', header: 'Tổng tiêu trong US' },
      { key: 'empty', header: '' },
      { key: 'accountBalance', header: 'Account Balance' },
    ];
  }

  async build(sheet: any, columns: ExcelColumn<any>[], virtualAccount: VirtualAccountDocument): Promise<void> {
    this.writeHeaders(sheet, columns);

    const dateRange = this.getCurrentMonthDateRange();
    const dailySummaries = await this.fetchDailySummaries(virtualAccount.slashId, dateRange);
    const summaryMap = this.createSummaryLookupMap(dailySummaries);
    const monthlyTotals = this.calculateMonthlyTotals(dailySummaries);

    this.writeSummaryRow(sheet, monthlyTotals, virtualAccount);
    this.writeDailyRows(sheet, dateRange, summaryMap, virtualAccount);
  }

  private writeHeaders(sheet: any, columns: ExcelColumn<any>[]): void {
    columns.forEach((column, colIndex) => {
      sheet.cell(PaymentSheetBuilder.HEADER_ROW, colIndex + 1).value(column.header);
    });
  }

  private getCurrentMonthDateRange(): DateRange {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return {
      startDate: new Date(year, month, 1),
      endDate: new Date(year, month, daysInMonth),
      daysInMonth,
      year,
      month,
    };
  }

  private async fetchDailySummaries(virtualAccountId: string, dateRange: DateRange) {
    return this.dailyPaymentSummariesService.getDailySummaries(
      virtualAccountId,
      dateRange.startDate,
      dateRange.endDate,
    );
  }

  private createSummaryLookupMap(dailySummaries: any[]): Map<string, any> {
    return new Map(
      dailySummaries.map(summary => [
        format(summary.date, PaymentSheetBuilder.DATE_FORMAT),
        summary,
      ])
    );
  }

  private calculateMonthlyTotals(dailySummaries: any[]): MonthlyTotals {
    return dailySummaries.reduce(
      (totals, summary) => ({
        totalDepositCents: totals.totalDepositCents + summary.totalDepositCents,
        totalSpendNonUSCents: totals.totalSpendNonUSCents + summary.totalSpendNonUSCents,
        totalSpendUSCents: totals.totalSpendUSCents + summary.totalSpendUSCents,
      }),
      { totalDepositCents: 0, totalSpendNonUSCents: 0, totalSpendUSCents: 0 }
    );
  }

  private writeSummaryRow(sheet: any, totals: MonthlyTotals, virtualAccount: VirtualAccountDocument): void {
    const row = PaymentSheetBuilder.SUMMARY_ROW;
    sheet.cell(row, 1).value('');
    sheet.cell(row, 2).value(formatCurrency(totals.totalDepositCents, virtualAccount.currency));
    sheet.cell(row, 3).value(formatCurrency(virtualAccount.spend.amountCents, virtualAccount.currency));
    sheet.cell(row, 4).value(formatCurrency(totals.totalSpendNonUSCents, virtualAccount.currency));
    sheet.cell(row, 5).value(formatCurrency(totals.totalSpendUSCents, virtualAccount.currency));
    sheet.cell(row, 6).value('');
    sheet.cell(row, 7).value(formatCurrency(virtualAccount.balance.amountCents, virtualAccount.currency));
  }

  private writeDailyRows(sheet: any, dateRange: DateRange, summaryMap: Map<string, any>, virtualAccount: VirtualAccountDocument): void {
    for (let day = 1; day <= dateRange.daysInMonth; day++) {
      const date = new Date(dateRange.year, dateRange.month, day);
      const dateStr = format(date, PaymentSheetBuilder.DATE_FORMAT);
      const rowIndex = PaymentSheetBuilder.DATA_START_ROW + day - 1;
      const summary = summaryMap.get(dateStr);

      this.writeDailyRow(sheet, rowIndex, dateStr, summary, virtualAccount);
    }
  }

  private writeDailyRow(sheet: any, rowIndex: number, dateStr: string, summary: any, virtualAccount: VirtualAccountDocument): void {
    sheet.cell(rowIndex, 1).value(dateStr);
    sheet.cell(rowIndex, 2).value(summary ? formatCurrency(summary.totalDepositCents, virtualAccount.currency) : '');
    sheet.cell(rowIndex, 3).value(summary ? formatCurrency(summary.totalSpendUSCents + summary.totalSpendNonUSCents, virtualAccount.currency) : '');
    sheet.cell(rowIndex, 4).value(summary ? formatCurrency(summary.totalSpendNonUSCents, virtualAccount.currency) : '');
    sheet.cell(rowIndex, 5).value(summary ? formatCurrency(summary.totalSpendUSCents, virtualAccount.currency) : '');
    sheet.cell(rowIndex, 6).value('');
    sheet.cell(rowIndex, 7).value('');
  }
}

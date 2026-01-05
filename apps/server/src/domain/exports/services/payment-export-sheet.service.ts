import { Injectable } from '@nestjs/common';
import { SheetData } from '../../../integrations/google-sheets/services/google-sheets.service';
import { SheetName } from '../../../integrations/google-sheets/constants/sheet-names.constant';
import { centsToDollars, formatCurrency } from '../../../shared/utils/formatCurrency.util';
import { VirtualAccountDocument } from '../../../database/schemas/virtual-account.schema';
import { createSummaryMap, formatSheetDate } from '../../../integrations/google-sheets/utils/sheet.utils';
import { DailySummarySheetBuilder, DailyRowBuilder, SummaryRowBuilder, formatCurrencyOrEmpty } from '../../../integrations/google-sheets/utils/sheet-builder.utils';
import { calculatePaymentDailySummaries, DailySummary } from '../utils/daily-summaries.util';

interface DateRange {
  startDate: Date;
  endDate: Date;
  today: Date;
  daysInMonth: number;
}

@Injectable()
export class PaymentExportSheetService {
  constructor() {}

  generatePaymentSheet(
    virtualAccount: VirtualAccountDocument,
    dateRange: DateRange,
    transactions: any[] = [],
  ): SheetData {
    const dailySummaries = calculatePaymentDailySummaries(transactions, dateRange.startDate, dateRange.daysInMonth);

    const totals = this.calculateTotals(dailySummaries);
    const summaryMap = createSummaryMap(dailySummaries);

    const dailyRowBuilder = new PaymentDailyRowBuilder(virtualAccount.currency);
    const summaryRowBuilder = new PaymentSummaryRowBuilder(totals, virtualAccount.currency, dateRange.daysInMonth);

    const builder = new DailySummarySheetBuilder(
      SheetName.PAYMENT,
      ['Date', 'Tổng nạp', 'Tổng tiêu', '', 'Account Balance'],
      dailyRowBuilder,
      summaryRowBuilder,
    );

    const sheetData = builder.build(dateRange.startDate, dateRange.daysInMonth, summaryMap, dateRange.today, dateRange.endDate);
    
    return {
      ...sheetData,
      columnStyles: {
        'B': '$#,##0.00',
        'C': '$#,##0.00',
        'E': '$#,##0.00',
      },
    };
  }

  private calculateTotals(summaries: DailySummary[]) {
    return summaries.reduce(
      (acc, summary) => ({
        totalDepositCents: acc.totalDepositCents + summary.totalDepositCents,
        totalSpendNonUSCents: acc.totalSpendNonUSCents + summary.totalSpendNonUSCents,
        totalSpendUSCents: acc.totalSpendUSCents + summary.totalSpendUSCents,
      }),
      { totalDepositCents: 0, totalSpendNonUSCents: 0, totalSpendUSCents: 0 },
    );
  }
}

class PaymentDailyRowBuilder implements DailyRowBuilder<DailySummary> {
  constructor(private readonly currency: string) {}

  buildRow(date: Date, summary: DailySummary | undefined, rowNumber: number): any[] {
    const dayTotalSpend = summary ? summary.totalSpendNonUSCents + summary.totalSpendUSCents : 0;
    return [
      formatSheetDate(date),
      { formula: `='${SheetName.DEPOSIT}'!B${rowNumber}` },
      centsToDollars(dayTotalSpend),
      '',
      '',
    ];
  }

  buildEmptyRow(date: Date, rowNumber: number): any[] {
    return [
      formatSheetDate(date),
      { formula: `='${SheetName.DEPOSIT}'!B${rowNumber}` },
      '',
      '',
      '',
    ];
  }
}

class PaymentSummaryRowBuilder implements SummaryRowBuilder {
  constructor(
    private readonly totals: { totalSpendNonUSCents: number; totalSpendUSCents: number },
    private readonly currency: string,
    private readonly daysInMonth: number,
  ) {}

  buildSummaryRow(daysInMonth: number): any[] {
    const totalSpend = this.totals.totalSpendNonUSCents + this.totals.totalSpendUSCents;
    return [
      '',
      { formula: `=SUM(B3:B${daysInMonth + 2})` },
      centsToDollars(totalSpend),
      '',
      { formula: `=B2-C2` },
    ];
  }
}

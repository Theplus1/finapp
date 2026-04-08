import { Injectable } from '@nestjs/common';
import { SheetData } from '../../../integrations/google-sheets/services/google-sheets.service';
// Location sheet name for export
import { centsToDollars } from '../../../shared/utils/formatCurrency.util';
import { VirtualAccountDocument } from '../../../database/schemas/virtual-account.schema';
import { createSummaryMap, formatSheetDate } from '../../../integrations/google-sheets/utils/sheet.utils';
import { DailySummarySheetBuilder, DailyRowBuilder, SummaryRowBuilder, formatCurrencyOrEmpty } from '../../../integrations/google-sheets/utils/sheet-builder.utils';
import { calculateLocationDailySummaries, LocationDailySummary } from '../utils/daily-summaries.util';

interface DateRange {
  startDate: Date;
  endDate: Date;
  today: Date;
  daysInMonth: number;
}

@Injectable()
export class LocationExportSheetService {
  constructor() {}

  generateLocationSheet(
    dateRange: DateRange,
    transactions: any[] = [],
  ): SheetData {
    const dailySummaries = calculateLocationDailySummaries(transactions, dateRange.startDate, dateRange.daysInMonth);

    const totals = this.calculateTotals(dailySummaries);
    const summaryMap = createSummaryMap(dailySummaries);

    const dailyRowBuilder = new LocationDailyRowBuilder();
    const summaryRowBuilder = new LocationSummaryRowBuilder(totals);

    const builder = new DailySummarySheetBuilder(
      'Location',
      ['Date', 'Tổng tiêu non US', 'Tổng tiêu trong US'],
      dailyRowBuilder,
      summaryRowBuilder,
    );

    const sheetData = builder.build(dateRange.startDate, dateRange.daysInMonth, summaryMap, dateRange.today, dateRange.endDate);
    
    return {
      ...sheetData,
      columnStyles: {
        'B': '$#,##0.00',
        'C': '$#,##0.00',
      },
    };
  }

  private calculateTotals(summaries: LocationDailySummary[]) {
    return summaries.reduce(
      (acc, summary) => ({
        totalSpendNonUSCents: acc.totalSpendNonUSCents + summary.totalSpendNonUSCents,
        totalSpendUSCents: acc.totalSpendUSCents + summary.totalSpendUSCents,
      }),
      { totalSpendNonUSCents: 0, totalSpendUSCents: 0 },
    );
  }
}

class LocationDailyRowBuilder implements DailyRowBuilder<LocationDailySummary> {
  buildRow(date: Date, summary: LocationDailySummary | undefined): any[] {
    return [
      formatSheetDate(date),
      summary?.totalSpendNonUSCents ? centsToDollars(summary.totalSpendNonUSCents) : 0,
      summary?.totalSpendUSCents ? centsToDollars(summary.totalSpendUSCents) : 0,
    ];
  }

  buildEmptyRow(date: Date): any[] {
    return [formatSheetDate(date), '', ''];
  }
}

class LocationSummaryRowBuilder implements SummaryRowBuilder {
  constructor(
    private readonly totals: { totalSpendNonUSCents: number; totalSpendUSCents: number },
  ) {}

  buildSummaryRow(): any[] {
    return [
      '',
      centsToDollars(this.totals.totalSpendNonUSCents),
      centsToDollars(this.totals.totalSpendUSCents),
    ];
  }
}

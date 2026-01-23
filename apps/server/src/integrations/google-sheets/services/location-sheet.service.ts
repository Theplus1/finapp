import { Injectable } from '@nestjs/common';
import { SheetData } from './google-sheets.service';
import { SheetName } from '../constants/sheet-names.constant';
import { formatCurrency, centsToDollars } from '../../../shared/utils/formatCurrency.util';
import { VirtualAccountDocument } from 'src/database/schemas/virtual-account.schema';
import { createSummaryMap, formatSheetDate, formatSheetDateISO } from '../utils/sheet.utils';
import { DailySummarySheetBuilder, DailyRowBuilder, SummaryRowBuilder, formatCurrencyOrEmpty } from '../utils/sheet-builder.utils';
import { calculateLocationDailySummaries, calculateLocationDailySummariesRange, LocationDailySummary } from '../../../domain/exports/utils/daily-summaries.util';
import { generateDateRange } from '../utils/date-range.utils';

interface DateRange {
  startDate: Date;
  endDate: Date;
  today: Date;
  daysInMonth: number;
}

@Injectable()
export class LocationSheetService {
  constructor() { }

  generateLocationSheet(
    virtualAccount: VirtualAccountDocument,
    dateRange: DateRange,
    transactions: any[] = [],
  ): SheetData {
    const dailySummaries = calculateLocationDailySummaries(transactions, dateRange.startDate, dateRange.daysInMonth);

    const totals = this.calculateTotals(dailySummaries);
    const summaryMap = createSummaryMap(dailySummaries);

    const dailyRowBuilder = new LocationDailyRowBuilder(virtualAccount.currency);
    const summaryRowBuilder = new LocationSummaryRowBuilder(totals, virtualAccount.currency);

    const builder = new DailySummarySheetBuilder(
      SheetName.LOCATION,
      ['Date', 'Tổng tiêu non US', 'Tổng tiêu trong US'],
      dailyRowBuilder,
      summaryRowBuilder,
    );

    return builder.build(dateRange.startDate, dateRange.daysInMonth, summaryMap, dateRange.today, dateRange.endDate);
  }

  /**
   * Generate Location sheet for full date range (for full data sync)
   */
  generateLocationSheetFullRange(
    virtualAccount: VirtualAccountDocument,
    dateRange: { startDate: Date; endDate: Date; today: Date; days: number },
    transactions: any[] = [],
  ): SheetData {
    const dailySummaries = calculateLocationDailySummariesRange(
      transactions,
      dateRange.startDate,
      dateRange.endDate,
    );

    const totals = this.calculateTotals(dailySummaries);
    
    // Create summary map
    const summaryMapISO = new Map<string, LocationDailySummary>();
    dailySummaries.forEach(summary => {
      const dateStr = formatSheetDateISO(summary.date);
      summaryMapISO.set(dateStr, summary);
    });

    // Generate date range
    const dates = generateDateRange(dateRange.startDate, dateRange.endDate);

    const rows: any[][] = [];
    
    // Row 2: Summary row
    // Write numbers instead of formatted strings so currency formatting can be applied
    rows.push([
      '',
      totals.totalSpendNonUSCents > 0 ? centsToDollars(totals.totalSpendNonUSCents) : '',
      totals.totalSpendUSCents > 0 ? centsToDollars(totals.totalSpendUSCents) : '',
    ]);
    
    // Daily rows
    dates.forEach((date: Date) => {
      const dateStr = formatSheetDateISO(date);
      const summary = summaryMapISO.get(dateStr);
      
      rows.push([
        formatSheetDateISO(date),
        summary?.totalSpendNonUSCents ? centsToDollars(summary.totalSpendNonUSCents) : '',
        summary?.totalSpendUSCents ? centsToDollars(summary.totalSpendUSCents) : '',
      ]);
    });
    
    return {
      name: SheetName.LOCATION,
      headers: ['Date', 'Tổng tiêu non US', 'Tổng tiêu trong US'],
      rows,
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
  constructor(private readonly currency: string) { }

  buildRow(date: Date, summary: LocationDailySummary | undefined): any[] {
    return [
      formatSheetDate(date),
      formatCurrencyOrEmpty(summary?.totalSpendNonUSCents, this.currency),
      formatCurrencyOrEmpty(summary?.totalSpendUSCents, this.currency),
    ];
  }

  buildEmptyRow(date: Date): any[] {
    return [formatSheetDate(date), '', ''];
  }
}

class LocationSummaryRowBuilder implements SummaryRowBuilder {
  constructor(
    private readonly totals: { totalSpendNonUSCents: number; totalSpendUSCents: number },
    private readonly currency: string,
  ) { }

  buildSummaryRow(): any[] {
    return [
      '',
      formatCurrency(this.totals.totalSpendNonUSCents, this.currency),
      formatCurrency(this.totals.totalSpendUSCents, this.currency),
    ];
  }
}

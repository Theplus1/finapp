import { Injectable } from '@nestjs/common';
import { SheetData } from './google-sheets.service';
import { SheetName } from '../constants/sheet-names.constant';
import { formatCurrency } from '../../../shared/utils/formatCurrency.util';
import { VirtualAccountDocument } from 'src/database/schemas/virtual-account.schema';
import { createSummaryMap, formatSheetDate } from '../utils/sheet.utils';
import { DailySummarySheetBuilder, DailyRowBuilder, SummaryRowBuilder, formatCurrencyOrEmpty } from '../utils/sheet-builder.utils';
import { calculateLocationDailySummaries, LocationDailySummary } from '../../../domain/exports/utils/daily-summaries.util';

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

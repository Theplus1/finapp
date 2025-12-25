import { Injectable } from '@nestjs/common';
import { SheetData } from './google-sheets.service';
import { SheetName } from '../constants/sheet-names.constant';
import { DailyPaymentSummariesService } from '../../../domain/daily-payment-summaries/daily-payment-summaries.service';
import { formatCurrency } from '../../../shared/utils/formatCurrency.util';
import { VirtualAccountDocument } from 'src/database/schemas/virtual-account.schema';
import { normalizeDateToUTC, createSummaryMap, formatSheetDate } from '../utils/sheet.utils';
import { DailySummarySheetBuilder, DailyRowBuilder, SummaryRowBuilder, formatCurrencyOrEmpty } from '../utils/sheet-builder.utils';

interface DailySummary {
  date: Date;
  totalSpendNonUSCents: number;
  totalSpendUSCents: number;
}

@Injectable()
export class LocationSheetService {
  constructor(private readonly dailyPaymentSummariesService: DailyPaymentSummariesService) { }

  async generateLocationSheet(
    virtualAccount: VirtualAccountDocument,
    startDate: Date,
    endDate: Date,
    today: Date = new Date(),
    daysInMonth: number,
  ): Promise<SheetData> {
    const normalizedStartDate = normalizeDateToUTC(startDate);
    const normalizedEndDate = normalizeDateToUTC(endDate);

    const dailySummaries = await this.dailyPaymentSummariesService.getDailySummaries(
      virtualAccount.slashId,
      normalizedStartDate,
      normalizedEndDate,
    );

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

    return builder.build(startDate, daysInMonth, summaryMap, today, endDate);
  }

  private calculateTotals(summaries: DailySummary[]) {
    return summaries.reduce(
      (acc, summary) => ({
        totalSpendNonUSCents: acc.totalSpendNonUSCents + summary.totalSpendNonUSCents,
        totalSpendUSCents: acc.totalSpendUSCents + summary.totalSpendUSCents,
      }),
      { totalSpendNonUSCents: 0, totalSpendUSCents: 0 },
    );
  }
}

class LocationDailyRowBuilder implements DailyRowBuilder<DailySummary> {
  constructor(private readonly currency: string) { }

  buildRow(date: Date, summary: DailySummary | undefined): any[] {
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

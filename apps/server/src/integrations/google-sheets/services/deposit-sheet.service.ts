import { Injectable } from '@nestjs/common';
import { SheetData } from './google-sheets.service';
import { SheetName } from '../constants/sheet-names.constant';
import { generateMonthDates, formatSheetDate, formatSheetDateISOUtc, normalizeDateToUTC } from '../utils/sheet.utils';
import { generateDateRange } from '../utils/date-range.utils';
import { centsToDollars } from '../../../shared/utils/formatCurrency.util';
import { DailyPaymentSummary } from 'src/database/schemas/daily-payment-summary.schema';

@Injectable()
export class DepositSheetService {
  generateDepositSheet(startDate: Date, daysInMonth: number): SheetData {
    const dates = generateMonthDates(startDate, daysInMonth);
    const dailyRows = dates.map(date => [formatSheetDate(date), '']);

    return {
      name: SheetName.DEPOSIT,
      headers: ['Date', 'Tổng nạp'],
      rows: dailyRows,
    };
  }

  /**
   * Generate Deposit sheet for full date range (for full data sync)
   */
  generateDepositSheetFullRange(startDate: Date, endDate: Date): SheetData {
    const dates = generateDateRange(startDate, endDate);
    const dailyRows = dates.map(date => [formatSheetDateISOUtc(date), '']);
    
    return {
      name: SheetName.DEPOSIT,
      headers: ['Date', 'Tổng nạp'],
      rows: dailyRows,
    };
  }

  /**
   * Deposit column B from daily payment summary totals (same calendar span as Payment / Location).
   */
  generateDepositSheetFullRangeFromSummaries(
    startDate: Date,
    endDate: Date,
    summaries: Pick<DailyPaymentSummary, 'date' | 'totalDepositCents'>[],
  ): SheetData {
    const byDay = new Map<string, number>();
    for (const s of summaries) {
      const key = formatSheetDateISOUtc(normalizeDateToUTC(new Date(s.date)));
      byDay.set(key, s.totalDepositCents ?? 0);
    }
    const dates = generateDateRange(startDate, endDate);
    const dailyRows = dates.map((date) => {
      const key = formatSheetDateISOUtc(date);
      const cents = byDay.get(key) ?? 0;
      return [
        formatSheetDateISOUtc(date),
        cents > 0 ? centsToDollars(cents) : '',
      ] as [string, number | string];
    });

    return {
      name: SheetName.DEPOSIT,
      headers: ['Date', 'Tổng nạp'],
      rows: dailyRows,
    };
  }
}

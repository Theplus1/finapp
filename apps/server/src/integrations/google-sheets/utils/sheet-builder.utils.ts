import { SheetData } from '../services/google-sheets.service';
import { formatCurrency } from '../../../shared/utils/formatCurrency.util';
import { generateMonthDates, formatSheetDate, getCalculationEndDate } from './sheet.utils';

export interface DailyRowBuilder<T> {
  /**
   * Build a row for a specific day
   */
  buildRow(date: Date, summary: T | undefined, rowNumber: number): any[];
  
  /**
   * Build an empty row for future dates
   */
  buildEmptyRow(date: Date, rowNumber: number): any[];
}

export interface SummaryRowBuilder {
  /**
   * Build the summary row
   */
  buildSummaryRow(daysInMonth: number): any[];
}

/**
 * Generic sheet builder for daily summary-based sheets
 */
export class DailySummarySheetBuilder<T extends { date: Date }> {
  constructor(
    private readonly sheetName: string,
    private readonly headers: string[],
    private readonly dailyRowBuilder: DailyRowBuilder<T>,
    private readonly summaryRowBuilder: SummaryRowBuilder,
  ) {}

  build(
    startDate: Date,
    daysInMonth: number,
    summaryMap: Map<string, T>,
    today: Date,
    endDate: Date,
  ): SheetData {
    const calculationEndDate = getCalculationEndDate(today, endDate);
    const dates = generateMonthDates(startDate, daysInMonth);
    
    const dailyRows = dates.map((date, index) => {
      const dateStr = formatSheetDate(date);
      const summary = summaryMap.get(dateStr);
      const rowNumber = index + 2; // +2 for header and summary row
      
      if (calculationEndDate.getDate() >= date.getDate()) {
        return this.dailyRowBuilder.buildRow(date, summary, rowNumber);
      } else {
        return this.dailyRowBuilder.buildEmptyRow(date, rowNumber);
      }
    });

    const summaryRow = this.summaryRowBuilder.buildSummaryRow(daysInMonth);

    return {
      name: this.sheetName,
      headers: this.headers,
      rows: [summaryRow, ...dailyRows],
    };
  }
}

/**
 * Helper to format currency or return empty string
 */
export function formatCurrencyOrEmpty(amountCents: number | undefined, currency: string): string {
  return formatCurrency(amountCents || 0, currency);
}

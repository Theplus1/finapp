import { Injectable } from '@nestjs/common';
import { SheetData } from './google-sheets.service';
import { SheetName } from '../constants/sheet-names.constant';
import { generateMonthDates, formatSheetDate, formatSheetDateISO } from '../utils/sheet.utils';
import { generateDateRange } from '../utils/date-range.utils';

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
    const dailyRows = dates.map(date => [formatSheetDateISO(date), '']);
    
    return {
      name: SheetName.DEPOSIT,
      headers: ['Date', 'Tổng nạp'],
      rows: dailyRows,
    };
  }
}

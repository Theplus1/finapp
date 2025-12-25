import { Injectable } from '@nestjs/common';
import { SheetData } from './google-sheets.service';
import { SheetName } from '../constants/sheet-names.constant';
import { generateMonthDates, formatSheetDate } from '../utils/sheet.utils';

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
}

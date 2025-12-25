import { Injectable } from '@nestjs/common';
import { SheetData } from '../../../integrations/google-sheets/services/google-sheets.service';
import { SheetName } from '../../../integrations/google-sheets/constants/sheet-names.constant';
import { generateMonthDates, formatSheetDate } from '../../../integrations/google-sheets/utils/sheet.utils';

@Injectable()
export class DepositExportSheetService {
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

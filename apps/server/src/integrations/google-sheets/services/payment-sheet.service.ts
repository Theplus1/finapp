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
    totalDepositCents: number;
    totalSpendNonUSCents: number;
    totalSpendUSCents: number;
}

@Injectable()
export class PaymentSheetService {
    constructor(private readonly dailyPaymentSummariesService: DailyPaymentSummariesService) { }

    async generatePaymentSheet(
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

        const dailyRowBuilder = new PaymentDailyRowBuilder(virtualAccount.currency);
        const summaryRowBuilder = new PaymentSummaryRowBuilder(totals, virtualAccount.currency, daysInMonth);

        const builder = new DailySummarySheetBuilder(
            SheetName.PAYMENT,
            ['Date', 'Tổng nạp', 'Tổng tiêu', '', 'Account Balance'],
            dailyRowBuilder,
            summaryRowBuilder,
        );

        return builder.build(startDate, daysInMonth, summaryMap, today, endDate);
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
            `='${SheetName.DEPOSIT}'!B${rowNumber}`,
            formatCurrencyOrEmpty(dayTotalSpend, this.currency),
            '',
            '',
        ];
    }

    buildEmptyRow(date: Date, rowNumber: number): any[] {
        return [
            formatSheetDate(date),
            `='${SheetName.DEPOSIT}'!B${rowNumber}`,
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

    buildSummaryRow(): any[] {
        const totalSpend = this.totals.totalSpendNonUSCents + this.totals.totalSpendUSCents;
        return [
            '',
            `=SUM(B3:B${this.daysInMonth + 2})`,
            formatCurrency(totalSpend, this.currency),
            '',
            `=B2-C2`,
        ];
    }
}

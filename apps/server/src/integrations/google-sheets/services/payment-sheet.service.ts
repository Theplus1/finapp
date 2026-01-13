import { Injectable } from '@nestjs/common';
import { SheetData } from './google-sheets.service';
import { SheetName } from '../constants/sheet-names.constant';
import { formatCurrency } from '../../../shared/utils/formatCurrency.util';
import { VirtualAccountDocument } from 'src/database/schemas/virtual-account.schema';
import { createSummaryMap, formatSheetDate, formatSheetDateISO } from '../utils/sheet.utils';
import { DailySummarySheetBuilder, DailyRowBuilder, SummaryRowBuilder, formatCurrencyOrEmpty } from '../utils/sheet-builder.utils';
import { calculatePaymentDailySummaries, DailySummary } from '../../../domain/exports/utils/daily-summaries.util';
import { generateDateRange } from '../utils/date-range.utils';

interface DateRange {
  startDate: Date;
  endDate: Date;
  today: Date;
  daysInMonth: number;
}

@Injectable()
export class PaymentSheetService {
    constructor() { }

    generatePaymentSheet(
        virtualAccount: VirtualAccountDocument,
        dateRange: DateRange,
        transactions: any[] = [],
    ): SheetData {
        const dailySummaries = calculatePaymentDailySummaries(transactions, dateRange.startDate, dateRange.daysInMonth);

        const totals = this.calculateTotals(dailySummaries);
        const summaryMap = createSummaryMap(dailySummaries);

        const dailyRowBuilder = new PaymentDailyRowBuilder(virtualAccount.currency);
        const summaryRowBuilder = new PaymentSummaryRowBuilder(totals, virtualAccount.currency, dateRange.daysInMonth);

        const builder = new DailySummarySheetBuilder(
            SheetName.PAYMENT,
            ['Date', 'Tổng nạp', 'Tổng tiêu', 'Tổng refund', 'Account Balance'],
            dailyRowBuilder,
            summaryRowBuilder,
        );

        return builder.build(dateRange.startDate, dateRange.daysInMonth, summaryMap, dateRange.today, dateRange.endDate);
    }

    /**
     * Generate Payment sheet for full date range (for full data sync)
     */
    generatePaymentSheetFullRange(
        virtualAccount: VirtualAccountDocument,
        dateRange: { startDate: Date; endDate: Date; today: Date; days: number },
        transactions: any[] = [],
    ): SheetData {
        const dates = generateDateRange(dateRange.startDate, dateRange.endDate);
        
        // Calculate daily summaries for spending
        const dailySummariesMap = new Map<string, DailySummary>();
        
        // Initialize all dates
        dates.forEach(date => {
            const dateStr = formatSheetDateISO(date);
            dailySummariesMap.set(dateStr, {
                date,
                totalDepositCents: 0,
                totalSpendNonUSCents: 0,
                totalSpendUSCents: 0,
            });
        });
        
        // Process transactions
        transactions.forEach((transaction) => {
            if (!transaction.date) return;
            
            const transactionDate = new Date(transaction.date);
            const normalizedDate = new Date(Date.UTC(
                transactionDate.getUTCFullYear(),
                transactionDate.getUTCMonth(),
                transactionDate.getUTCDate(),
                0, 0, 0, 0
            ));
            
            const dateStr = formatSheetDateISO(normalizedDate);
            const summary = dailySummariesMap.get(dateStr);
            
            if (summary) {
                const spendAmount = Math.abs(transaction.amountCents);
                if (transaction.merchantData?.location?.country === 'US') {
                    summary.totalSpendUSCents += spendAmount;
                } else {
                    summary.totalSpendNonUSCents += spendAmount;
                }
            }
        });
        
        const dailySummaries = Array.from(dailySummariesMap.values()).sort(
            (a, b) => a.date.getTime() - b.date.getTime()
        );
        
        const totals = this.calculateTotals(dailySummaries);
        
        // Build rows
        const rows: any[][] = [];
        
        // Row 2: Summary row
        const totalSpend = totals.totalSpendNonUSCents + totals.totalSpendUSCents;
        rows.push([
            '',
            `=SUM(B3:B)`,
            formatCurrency(totalSpend, virtualAccount.currency),
            `=SUM(ARRAYFORMULA(VALUE(SUBSTITUTE('${SheetName.REFUNDED}'!E2:E, "$", ""))))`,
            `=B2-C2+D2`,
        ]);
        
        // Create summary map
        const summaryMapISO = new Map<string, DailySummary>();
        dailySummaries.forEach(summary => {
            const dateStr = formatSheetDateISO(summary.date);
            summaryMapISO.set(dateStr, summary);
        });
        
        // Daily rows
        // Payment row 3 = Deposit row 2 (lệch 1 row do Payment có summary row ở row 2)
        dates.forEach((date, index) => {
            const dateStr = formatSheetDateISO(date);
            const summary = summaryMapISO.get(dateStr);
            const dayTotalSpend = summary ? summary.totalSpendNonUSCents + summary.totalSpendUSCents : 0;
            const depositRowNumber = index + 2;
            
            rows.push([
                formatSheetDateISO(date),
                `='${SheetName.DEPOSIT}'!B${depositRowNumber}`,
                formatCurrencyOrEmpty(dayTotalSpend, virtualAccount.currency),
                '',
                '',
            ]);
        });
        
        return {
            name: SheetName.PAYMENT,
            headers: ['Date', 'Tổng nạp', 'Tổng tiêu', 'Tổng refund', 'Account Balance'],
            rows,
        };
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

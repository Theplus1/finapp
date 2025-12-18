import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { GoogleSheetReport, GoogleSheetReportSchema } from '../../database/schemas/google-sheet-report.schema';
import { GoogleSheetsService } from './services/google-sheets.service';
import { GoogleSheetsSyncService } from './services/google-sheets-sync.service';
import { GoogleSheetReportService } from './services/google-sheet-report.service';
import { GoogleSheetReportRepository } from '../../database/repositories/google-sheet-report.repository';
import { GoogleSheetsSyncJob } from './jobs/google-sheets-sync.job';
import { GoogleSheetsSyncController } from './controllers/google-sheets-sync.controller';
import { GoogleSheetReportController } from './controllers/google-sheet-report.controller';
import { TransactionsModule } from '../../domain/transactions/transactions.module';
import { AccountsModule } from '../../domain/accounts/accounts.module';
import { DailyPaymentSummariesModule } from '../../domain/daily-payment-summaries/daily-payment-summaries.module';

/**
 * Google Sheets Integration Module
 * Handles integration with Google Sheets API:
 * - Sync data to Google Sheets
 * - Scheduled sync jobs
 * - Manual sync endpoints
 */
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: GoogleSheetReport.name, schema: GoogleSheetReportSchema },
    ]),
    TransactionsModule,
    AccountsModule,
    DailyPaymentSummariesModule,
  ],
  controllers: [GoogleSheetsSyncController, GoogleSheetReportController],
  providers: [
    GoogleSheetsService,
    GoogleSheetsSyncService,
    GoogleSheetReportService,
    GoogleSheetReportRepository,
    GoogleSheetsSyncJob,
  ],
  exports: [GoogleSheetsService, GoogleSheetsSyncService, GoogleSheetReportService],
})
export class GoogleSheetsModule {}


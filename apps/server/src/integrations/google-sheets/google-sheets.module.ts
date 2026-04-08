import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { GoogleSheetReport, GoogleSheetReportSchema } from '../../database/schemas/google-sheet-report.schema';
import { GoogleSheetsService } from './services/google-sheets.service';
import { GoogleSheetsSyncService } from './services/google-sheets-sync.service';
import { GoogleSheetReportService } from './services/google-sheet-report.service';
import { PaymentSheetService } from './services/payment-sheet.service';
import { DepositSheetService } from './services/deposit-sheet.service';
import { GoogleSheetReportRepository } from '../../database/repositories/google-sheet-report.repository';
import { GoogleSheetsSyncJob } from './jobs/google-sheets-sync.job';
import { GoogleSheetsSyncController } from './controllers/google-sheets-sync.controller';
import { GoogleSheetReportController } from './controllers/google-sheet-report.controller';
import { TransactionsModule } from '../../domain/transactions/transactions.module';
import { AccountsModule } from '../../domain/accounts/accounts.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: GoogleSheetReport.name, schema: GoogleSheetReportSchema },
    ]),
    TransactionsModule,
    AccountsModule,
  ],
  controllers: [
    GoogleSheetsSyncController,
    GoogleSheetReportController,
  ],
  providers: [
    GoogleSheetsService,
    GoogleSheetsSyncService,
    GoogleSheetReportService,
    PaymentSheetService,
    DepositSheetService,
    GoogleSheetReportRepository,
    GoogleSheetsSyncJob,
  ],
  exports: [
    GoogleSheetsService,
    GoogleSheetsSyncService,
    GoogleSheetReportService,
  ],
})
export class GoogleSheetsModule {}

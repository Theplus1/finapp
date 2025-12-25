import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ExportJob, ExportJobSchema } from 'src/database/schemas/export-job.schema';
import { ExportsService } from './exports.service';
import { ExportsProcessor } from './exports.processor';
import { ExportsController } from './exports.controller';
import { ExportsScheduler } from './exports.scheduler';
import { TransactionsModule } from '../transactions/transactions.module';
import { CardsModule } from '../cards/cards.module';
import { AccountsModule } from '../accounts/accounts.module';
import { DailyPaymentSummariesModule } from '../daily-payment-summaries/daily-payment-summaries.module';
import { ExportSheetsService } from './services/export-sheets.service';
import { PaymentExportSheetService } from './services/payment-export-sheet.service';
import { DepositExportSheetService } from './services/deposit-export-sheet.service';
import { LocationExportSheetService } from './services/location-export-sheet.service';
import { TransactionsExportSheetService } from './services/transactions-export-sheet.service';
import { CardsExportSheetService } from './services/cards-export-sheet.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExportJob.name, schema: ExportJobSchema },
    ]),
    BullModule.registerQueue({
      name: 'exports',
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'your-secret-key',
        signOptions: {
          expiresIn: '24h',
        },
      }),
      inject: [ConfigService],
    }),
    TransactionsModule,
    CardsModule,
    AccountsModule,
    DailyPaymentSummariesModule,
  ],
  controllers: [ExportsController],
  providers: [
    ExportsService,
    ExportsProcessor,
    ExportsScheduler,
    ExportSheetsService,
    PaymentExportSheetService,
    DepositExportSheetService,
    LocationExportSheetService,
    TransactionsExportSheetService,
    CardsExportSheetService,
  ],
  exports: [ExportsService],
})
export class ExportsModule {}

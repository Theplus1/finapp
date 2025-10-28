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
import { PaymentSheetBuilder } from './services/payment-sheet.builder';
import { ExportGeneratorsService } from './services/export-generators.service';

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
    PaymentSheetBuilder,
    ExportGeneratorsService,
  ],
  exports: [ExportsService],
})
export class ExportsModule {}

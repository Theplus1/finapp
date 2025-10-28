import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../../users/users.module';
import { BotService } from '../../bot/bot.service';
import { DailyPaymentSummariesModule } from '../../domain/daily-payment-summaries/daily-payment-summaries.module';

// Schemas
import { SyncLog, SyncLogSchema } from '../../database/schemas/sync-log.schema';

// Services
import { SlashApiService } from './services/slash-api.service';
import { SlashSyncService } from './services/slash-sync.service';

// Jobs
import { SlashSyncJob } from './jobs/slash-sync.job';

// Controllers
import { SlashWebhookController } from './controllers/slash-webhook.controller';
import { SlashSyncController } from './controllers/slash-sync.controller';

/**
 * Slash Integration Module
 * Handles all integrations with Slash API:
 * - API client for external calls
 * - Data synchronization
 * - Webhook handling
 * - Scheduled sync jobs
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    UsersModule,
    DailyPaymentSummariesModule,
    MongooseModule.forFeature([
      { name: SyncLog.name, schema: SyncLogSchema },
    ]),
  ],
  controllers: [
    SlashWebhookController,
    SlashSyncController,
  ],
  providers: [
    SlashApiService,
    SlashSyncService,
    SlashSyncJob,
    BotService,
  ],
  exports: [
    SlashApiService,
    SlashSyncService,
  ],
})
export class SlashIntegrationModule {}

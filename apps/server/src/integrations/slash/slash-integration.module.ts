import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../../users/users.module';
import { BotService } from '../../bot/bot.service';
import { DailyPaymentSummariesModule } from '../../domain/daily-payment-summaries/daily-payment-summaries.module';

// Schemas
import { SyncLog, SyncLogSchema } from '../../database/schemas/sync-log.schema';
import { SyncCheckpoint, SyncCheckpointSchema } from '../../database/schemas/sync-checkpoint.schema';

// Services
import { SlashApiService } from './services/slash-api.service';
import { SlashSyncService } from './services/slash-sync.service';
import { SlashLongSyncService } from './services/slash-long-sync.service';

// Jobs
import { SlashSyncJob } from './jobs/slash-sync.job';
import { SlashTransactionAggregationJob } from './jobs/slash-transaction-aggregation.job';

// Controllers
import { SlashWebhookController } from './controllers/slash-webhook.controller';
import { SlashSyncController } from './controllers/slash-sync.controller';
import { NotificationsModule } from 'src/domain/notifications/notifications.module';

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
    NotificationsModule,
    DailyPaymentSummariesModule,
    MongooseModule.forFeature([
      { name: SyncLog.name, schema: SyncLogSchema },
      { name: SyncCheckpoint.name, schema: SyncCheckpointSchema },
    ]),
  ],
  controllers: [
    SlashWebhookController,
    SlashSyncController,
  ],
  providers: [
    SlashApiService,
    SlashSyncService,
    SlashLongSyncService,
    SlashSyncJob,
    SlashTransactionAggregationJob,
    BotService,
  ],
  exports: [
    SlashApiService,
    SlashSyncService,
    SlashLongSyncService,
    BotService,
  ],
})
export class SlashIntegrationModule {}

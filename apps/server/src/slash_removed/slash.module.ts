import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SlashService } from './slash.service';
import { SlashWebhookController } from './slash-webhook.controller';
import { SlashSyncController } from './controllers/slash-sync.controller';
import { SlashSyncService } from './services/slash-sync.service';
import { SlashSyncJob } from './jobs/slash-sync.job';
import { BotService } from '../bot/bot.service';
import { UsersModule } from '../users/users.module';

// Schemas
import { Card, CardSchema } from './schemas/card.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { VirtualAccount, VirtualAccountSchema } from './schemas/virtual-account.schema';
import { SyncLog, SyncLogSchema } from './schemas/sync-log.schema';

// Repositories
import { CardRepository } from './repositories/card.repository';
import { TransactionRepository } from './repositories/transaction.repository';
import { VirtualAccountRepository } from './repositories/virtual-account.repository';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: Card.name, schema: CardSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: VirtualAccount.name, schema: VirtualAccountSchema },
      { name: SyncLog.name, schema: SyncLogSchema },
    ]),
  ],
  controllers: [SlashWebhookController, SlashSyncController],
  providers: [
    SlashService,
    SlashSyncService,
    SlashSyncJob,
    BotService,
    CardRepository,
    TransactionRepository,
    VirtualAccountRepository,
  ],
  exports: [
    SlashService,
    SlashSyncService,
    CardRepository,
    TransactionRepository,
    VirtualAccountRepository,
  ],
})
export class SlashModule {}

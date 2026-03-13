import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Schemas
import { Card, CardSchema } from './schemas/card.schema';
import { CardGroup, CardGroupSchema } from './schemas/card-group.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { VirtualAccount, VirtualAccountSchema } from './schemas/virtual-account.schema';
import { SyncLog, SyncLogSchema } from './schemas/sync-log.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { ConfirmCodeReveal, ConfirmCodeRevealSchema } from './schemas/confirm-code-reveal.schema';
import { DepositHistory, DepositHistorySchema } from './schemas/deposit-history.schema';

// Repositories
import { CardRepository } from './repositories/card.repository';
import { CardGroupRepository } from './repositories/card-group.repository';
import { TransactionRepository } from './repositories/transaction.repository';
import { VirtualAccountRepository } from './repositories/virtual-account.repository';
import { NotificationRepository } from './repositories/notification.repository';
import { ConfirmCodeRevealRepository } from './repositories/confirm-code-reveal.repository';
import { DepositHistoryRepository } from './repositories/deposit-history.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Card.name, schema: CardSchema },
      { name: CardGroup.name, schema: CardGroupSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: VirtualAccount.name, schema: VirtualAccountSchema },
      { name: SyncLog.name, schema: SyncLogSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: ConfirmCodeReveal.name, schema: ConfirmCodeRevealSchema },
      { name: DepositHistory.name, schema: DepositHistorySchema },
    ]),
  ],
  providers: [
    CardRepository,
    CardGroupRepository,
    TransactionRepository,
    VirtualAccountRepository,
    NotificationRepository,
    ConfirmCodeRevealRepository,
    DepositHistoryRepository,
  ],
  exports: [
    CardRepository,
    CardGroupRepository,
    TransactionRepository,
    VirtualAccountRepository,
    NotificationRepository,
    ConfirmCodeRevealRepository,
    DepositHistoryRepository,
  ],
})
export class DatabaseModule {}

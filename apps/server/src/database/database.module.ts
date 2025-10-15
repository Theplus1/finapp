import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

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
    MongooseModule.forFeature([
      { name: Card.name, schema: CardSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: VirtualAccount.name, schema: VirtualAccountSchema },
      { name: SyncLog.name, schema: SyncLogSchema },
    ]),
  ],
  providers: [
    CardRepository,
    TransactionRepository,
    VirtualAccountRepository,
  ],
  exports: [
    CardRepository,
    TransactionRepository,
    VirtualAccountRepository,
  ],
})
export class DatabaseModule {}

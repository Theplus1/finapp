import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [DatabaseModule],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}

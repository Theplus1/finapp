import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AccountsService } from './accounts.service';

@Module({
  imports: [DatabaseModule],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}

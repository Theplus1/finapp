import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../../users/users.module';
import { AccountsService } from './accounts.service';

@Module({
  imports: [DatabaseModule, UsersModule],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}

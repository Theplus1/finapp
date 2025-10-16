import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { CardGroupsService } from './card-groups.service';

@Module({
  imports: [DatabaseModule],
  providers: [CardGroupsService],
  exports: [CardGroupsService],
})
export class CardGroupsModule {}

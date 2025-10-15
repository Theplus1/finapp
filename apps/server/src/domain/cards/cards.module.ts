import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { CardsService } from './cards.service';

@Module({
  imports: [DatabaseModule],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}

import { Module } from '@nestjs/common';
import { CardsHandler } from './handlers/cards.handler';
import { UsersModule } from '../../users/users.module';
import { SlashModule } from '../../slash/slash.module';

@Module({
  imports: [UsersModule, SlashModule],
  providers: [CardsHandler],
  exports: [CardsHandler],
})
export class CardsModule {}

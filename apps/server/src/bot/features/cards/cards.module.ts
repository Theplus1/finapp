import { Module } from '@nestjs/common';
import { CardsHandler } from './handlers/cards.handler';
import { UsersModule } from 'src/users/users.module';
import { SlashIntegrationModule } from 'src/integrations/slash/slash-integration.module';
import { CardsModule as DomainCardsModule } from 'src/domain/cards/cards.module';
import { AccountsModule } from 'src/domain/accounts/accounts.module';
import { UserValidationGuard } from 'src/bot/guards/user-validation.guard';
import { ExportsModule } from 'src/domain/exports/exports.module';

@Module({
  imports: [
    UsersModule,
    SlashIntegrationModule,
    DomainCardsModule,
    AccountsModule,
    ExportsModule,
  ],
  providers: [
    CardsHandler,
    UserValidationGuard, // Provide guard with DI
  ],
  exports: [CardsHandler],
})
export class CardsModule {}

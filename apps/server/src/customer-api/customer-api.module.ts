import { Module } from '@nestjs/common';
import { AdminApiModule } from '../admin-api/admin-api.module';
import { AdminUsersModule } from '../domain/admin-users/admin-users.module';
import { CardsModule } from '../domain/cards/cards.module';
import { SlashIntegrationModule } from '../integrations/slash/slash-integration.module';
import { EmployeesController } from './controllers/employees.controller';
import { CustomerCardsController } from './controllers/cards.controller';

@Module({
  imports: [
    AdminApiModule,
    AdminUsersModule,
    CardsModule,
    SlashIntegrationModule,
  ],
  controllers: [EmployeesController, CustomerCardsController],
})
export class CustomerApiModule {}

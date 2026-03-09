import { Module } from '@nestjs/common';
import { AdminApiModule } from '../admin-api/admin-api.module';
import { AdminUsersModule } from '../domain/admin-users/admin-users.module';
import { EmployeesController } from './controllers/employees.controller';

@Module({
  imports: [AdminApiModule, AdminUsersModule],
  controllers: [EmployeesController],
})
export class CustomerApiModule {}

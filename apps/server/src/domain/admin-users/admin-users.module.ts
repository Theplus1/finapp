import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminUsersService } from './admin-users.service';
import { AdminUser, AdminUserSchema } from '../../database/schemas/admin-user.schema';
import { AdminUserRepository } from '../../database/repositories/admin-user.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminUser.name, schema: AdminUserSchema },
    ]),
  ],
  providers: [
    AdminUserRepository,
    AdminUsersService,
  ],
  exports: [
    AdminUsersService,
  ],
})
export class AdminUsersModule {}

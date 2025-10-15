import { Module, forwardRef } from '@nestjs/common';
import { AdminHandler } from './handlers/admin.handler';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../../users/users.module';
import { BotModule } from '../../bot/bot.module';

@Module({
  imports: [UsersModule, forwardRef(() => BotModule)],
  controllers: [AdminController],
  providers: [AdminHandler, AdminService],
  exports: [AdminHandler, AdminService],
})
export class AdminModule {}

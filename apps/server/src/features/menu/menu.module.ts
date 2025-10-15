import { Module, forwardRef } from '@nestjs/common';
import { MenuHandler } from './handlers/menu.handler';
import { UsersModule } from '../../users/users.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    UsersModule,
    OnboardingModule,
    forwardRef(() => AdminModule),
  ],
  providers: [MenuHandler],
  exports: [MenuHandler],
})
export class MenuModule {}

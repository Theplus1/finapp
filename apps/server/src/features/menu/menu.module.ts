import { Module } from '@nestjs/common';
import { MenuHandler } from './handlers/menu.handler';
import { UsersModule } from '../../users/users.module';
import { OnboardingModule } from '../onboarding/onboarding.module';

@Module({
  imports: [
    UsersModule,
    OnboardingModule,
  ],
  providers: [MenuHandler],
  exports: [MenuHandler],
})
export class MenuModule {}

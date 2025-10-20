import { Module } from '@nestjs/common';
import { MenuHandler } from './handlers/menu.handler';
import { UsersModule } from 'src/users/users.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { AccountsModule } from 'src/domain/accounts/accounts.module';

@Module({
  imports: [
    UsersModule,
    OnboardingModule,
    AccountsModule,
  ],
  providers: [
    MenuHandler,
  ],
  exports: [MenuHandler],
})
export class MenuModule {}

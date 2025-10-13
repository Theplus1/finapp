import { Module } from '@nestjs/common';
import { OnboardingHandler } from './handlers/onboarding.handler';
import { UsersModule } from '../../users/users.module';
import { SlashModule } from 'src/slash';

@Module({
  imports: [UsersModule, SlashModule],
  providers: [OnboardingHandler],
  exports: [OnboardingHandler],
})
export class OnboardingModule {}

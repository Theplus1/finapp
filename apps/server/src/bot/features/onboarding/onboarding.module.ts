import { Module } from '@nestjs/common';
import { OnboardingHandler } from './handlers/onboarding.handler';
import { UsersModule } from 'src/users/users.module';
import { SlashIntegrationModule } from 'src/integrations/slash/slash-integration.module';

@Module({
  imports: [UsersModule, SlashIntegrationModule],
  providers: [OnboardingHandler],
  exports: [OnboardingHandler],
})
export class OnboardingModule {}

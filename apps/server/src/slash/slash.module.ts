import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SlashService } from './slash.service';
import { SlashWebhookController } from './slash-webhook.controller';
import { BotService } from '../bot/bot.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ConfigModule, UsersModule],
  controllers: [SlashWebhookController],
  providers: [SlashService, BotService],
  exports: [SlashService],
})
export class SlashModule {}

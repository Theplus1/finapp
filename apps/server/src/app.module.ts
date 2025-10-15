import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegrafModule } from 'nestjs-telegraf';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { UsersModule } from './users/users.module';
import configuration from './common/config/configuration';
import { session } from 'telegraf';
import { SlashIntegrationModule } from './integrations/slash/slash-integration.module';
import { AdminApiModule } from './admin-api/admin-api.module';
import { DatabaseModule } from './database/database.module';
import { CardsModule } from './domain/cards/cards.module';
import { TransactionsModule } from './domain/transactions/transactions.module';
import { AccountsModule } from './domain/accounts/accounts.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Database
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Telegraf Bot
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mode = configService.get<string>('bot.mode');
        const token = configService.get<string>('bot.token');

        if (!token) {
          throw new Error('BOT_TOKEN is not defined in environment variables');
        }

        const config: any = {
          token,
          middlewares: [session()],
        };

        if (mode === 'webhook') {
          const webhookUrl = configService.get<string>('bot.webhookUrl');
          if (!webhookUrl) {
            throw new Error('WEBHOOK_URL is required when MODE=webhook');
          }
          config.launchOptions = {
            webhook: {
              domain: webhookUrl,
              hookPath: '/bot-webhook',
            },
          };
        }

        return config;
      },
      inject: [ConfigService],
    }),

    // Core Modules
    DatabaseModule,  // Data access layer
    
    // Domain Modules (Business Logic)
    CardsModule,
    TransactionsModule,
    AccountsModule,
    
    // Integration Modules
    SlashIntegrationModule,  // Slash API integration
    
    // Feature Modules
    UsersModule,
    BotModule,  // Telegram bot
    AdminApiModule,  // Admin dashboard API
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

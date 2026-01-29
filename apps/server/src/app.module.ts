import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegrafModule } from 'nestjs-telegraf';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { OpenTelemetryModule } from 'nestjs-otel';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { UsersModule } from './users/users.module';
import configuration from './common/config/configuration';
import { session } from 'telegraf';
import { SlashIntegrationModule } from './integrations/slash/slash-integration.module';
import { GoogleSheetsModule } from './integrations/google-sheets/google-sheets.module';
const rateLimit = require('telegraf-ratelimit');
import { Agent as HttpsAgent } from 'https';
import { AdminApiModule } from './admin-api/admin-api.module';
import { DatabaseModule } from './database/database.module';
import { CardsModule } from './domain/cards/cards.module';
import { TransactionsModule } from './domain/transactions/transactions.module';
import { AccountsModule } from './domain/accounts/accounts.module';
import { ExportsModule } from './domain/exports/exports.module';
import { BalanceAlertsModule } from './domain/balance-alerts/balance-alerts.module';
import { CardSpendingAlertsModule } from './domain/card-spending-alerts/card-spending-alerts.module';

@Module({
  imports: [
    // OpenTelemetry - uses tracing.ts SDK configuration
    OpenTelemetryModule.forRoot({
      metrics: {
        hostMetrics: true,
        apiMetrics: {
          enable: true,
        },
      },
    }),

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

    // Bull Queue (Redis)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
        },
      }),
      inject: [ConfigService],
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 5, // 5 requests per minute
    }]),

    // Telegraf Bot
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mode = configService.get<string>('bot.mode');
        const token = configService.get<string>('bot.token');

        if (!token) {
          throw new Error('BOT_TOKEN is not defined in environment variables');
        }

        // Configure rate limiting
        const rateLimitWindow = configService.get<number>('bot.rateLimit.window') || 60000;
        const rateLimitMax = configService.get<number>('bot.rateLimit.limit') || 10;
        
        const rateLimitConfig = {
          window: rateLimitWindow,
          limit: rateLimitMax,
          onLimitExceeded: async (ctx: any) => {
            const minutes = Math.floor(rateLimitWindow / 60000);
            const timeStr = minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : `${Math.floor(rateLimitWindow / 1000)} seconds`;
            
            await ctx.reply(
              `⚠️ *Rate limit exceeded*\n\nYou can send up to ${rateLimitMax} messages per ${timeStr}. Please wait a moment and try again.`,
              { parse_mode: 'Markdown' }
            );
          },
        };

        // Create custom HTTPS agent that forces IPv4 to fix DNS resolution issues
        const agent = new HttpsAgent({
          family: 4, // Force IPv4
          keepAlive: true,
        });

        const config: any = {
          token,
          middlewares: [session(), rateLimit(rateLimitConfig)],
          telegram: {
            agent,
          },
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
    ExportsModule,  // Export functionality
    BalanceAlertsModule,  // Balance alert functionality
    CardSpendingAlertsModule,  // Card spending alert functionality
    
    // Integration Modules
    SlashIntegrationModule,  // Slash API integration
    GoogleSheetsModule,  // Google Sheets integration
    
    // Feature Modules
    UsersModule,
    BotModule,  // Telegram bot
    AdminApiModule,  // Admin dashboard API
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

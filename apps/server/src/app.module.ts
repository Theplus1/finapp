import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegrafModule } from 'nestjs-telegraf';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import configuration from './common/config/configuration';
import { session } from 'telegraf';
import { SlashModule } from './slash';
import { AdminApiModule } from './admin-api/admin-api.module';

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

    // Feature Modules
    BotModule,
    UsersModule,
    NotificationsModule,
    SlashModule,
    AdminApiModule,  // Admin dashboard API
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

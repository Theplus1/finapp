import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { TransactionNotificationsService } from './transaction-notifications.service';
import { TransactionNotificationsJob } from './transaction-notifications.job';
import { DatabaseModule } from 'src/database/database.module';
import { UsersModule } from 'src/users/users.module';
import { BotModule } from 'src/bot/bot.module';
import { SlashIntegrationModule } from 'src/integrations/slash/slash-integration.module';
import { AdsTransactionsGateway } from './ads-transactions.gateway';
import { WebTransactionNotifier } from './web-transaction-notifier.service';
import { WebNotificationsService } from './web-notifications.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => BotModule),
    forwardRef(() => SlashIntegrationModule),
  ],
  providers: [
    NotificationsService,
    TransactionNotificationsService,
    TransactionNotificationsJob,
    AdsTransactionsGateway,
    WebTransactionNotifier,
    WebNotificationsService,
  ],
  exports: [
    NotificationsService,
    TransactionNotificationsService,
  ],
})
export class NotificationsModule {}

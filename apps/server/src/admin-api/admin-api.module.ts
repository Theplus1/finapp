import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SlashIntegrationModule } from '../integrations/slash/slash-integration.module';
import { UsersModule } from '../users/users.module';
import { CardsModule } from '../domain/cards/cards.module';
import { TransactionsModule } from '../domain/transactions/transactions.module';
import { AccountsModule } from '../domain/accounts/accounts.module';
import { AdminUsersModule } from '../domain/admin-users/admin-users.module';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { TransactionsController } from './controllers/transactions.controller';
import { CardsController } from './controllers/cards.controller';
import { AccountsController } from './controllers/accounts.controller';

// Services
import { AdminAuthService } from './services/admin-auth.service';

// Strategies
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

// Guards
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SuperAdminAuthGuard } from './guards/super-admin-auth.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'default-secret'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
    SlashIntegrationModule,  // Access to Slash API client
    UsersModule,  // Access to user repository
    CardsModule,  // Domain logic for cards
    TransactionsModule,  // Domain logic for transactions
    AccountsModule,  // Domain logic for accounts
    AdminUsersModule,  // Domain logic for admin users
  ],
  controllers: [
    AuthController,
    TransactionsController,
    CardsController,
    AccountsController,
  ],
  providers: [
    // Strategies
    LocalStrategy,
    JwtStrategy,
    // Guards
    LocalAuthGuard,
    JwtAuthGuard,
    SuperAdminAuthGuard,
    // Services
    AdminAuthService,
  ],
  exports: [
    AdminAuthService,
  ],
})
export class AdminApiModule {}

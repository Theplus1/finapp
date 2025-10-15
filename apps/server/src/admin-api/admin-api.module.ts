import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SlashModule } from '../slash/slash.module';
import { UsersModule } from '../users/users.module';

// Schemas
import { AdminUser, AdminUserSchema } from './schemas/admin-user.schema';

// Repositories
import { AdminUserRepository } from './repositories/admin-user.repository';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { TransactionsController } from './controllers/transactions.controller';
import { CardsController } from './controllers/cards.controller';
import { AccountsController } from './controllers/accounts.controller';

// Services
import { AdminAuthService } from './services/admin-auth.service';
import { TransactionsService } from './services/transactions.service';
import { CardsService } from './services/cards.service';
import { AccountsService } from './services/accounts.service';

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
    MongooseModule.forFeature([
      { name: AdminUser.name, schema: AdminUserSchema },
    ]),
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
    SlashModule,  // Access to Slash repositories and services
    UsersModule,  // Access to user repository
  ],
  controllers: [
    AuthController,
    TransactionsController,
    CardsController,
    AccountsController,
  ],
  providers: [
    // Repositories
    AdminUserRepository,
    // Strategies
    LocalStrategy,
    JwtStrategy,
    // Guards
    LocalAuthGuard,
    JwtAuthGuard,
    SuperAdminAuthGuard,
    // Services
    AdminAuthService,
    TransactionsService,
    CardsService,
    AccountsService,
  ],
  exports: [
    AdminAuthService,
    TransactionsService,
    CardsService,
    AccountsService,
  ],
})
export class AdminApiModule {}

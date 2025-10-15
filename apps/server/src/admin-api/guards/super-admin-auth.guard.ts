import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Super Admin Authentication Guard
 * Allows authentication via static token from environment variable
 * No login required - just use the SUPER_ADMIN_TOKEN
 */
@Injectable()
export class SuperAdminAuthGuard implements CanActivate {
  private readonly logger = new Logger(SuperAdminAuthGuard.name);
  private readonly superAdminToken: string;

  constructor(private readonly configService: ConfigService) {
    this.superAdminToken = this.configService.get<string>('SUPER_ADMIN_TOKEN', '');
    
    if (!this.superAdminToken) {
      this.logger.warn('SUPER_ADMIN_TOKEN not configured - super admin endpoints will be inaccessible!');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    // Extract token (support both "Bearer <token>" and direct token)
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    // Verify token matches super admin token
    if (token !== this.superAdminToken) {
      this.logger.warn(`Invalid super admin token attempt from ${request.ip}`);
      throw new UnauthorizedException('Invalid super admin token');
    }

    // Attach super admin info to request
    (request as any).user = {
      userId: 'super-admin',
      username: 'super-admin',
      role: 'super-admin',
    };

    this.logger.log('Super admin authenticated via static token');
    return true;
  }
}

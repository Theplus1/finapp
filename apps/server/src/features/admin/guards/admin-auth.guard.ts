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
 * Guard to protect admin API endpoints
 * Validates API key from Authorization header
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  private readonly logger = new Logger(AdminAuthGuard.name);
  private readonly adminApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.adminApiKey = this.configService.get<string>('ADMIN_API_KEY', '');
    
    if (!this.adminApiKey) {
      this.logger.warn('ADMIN_API_KEY not configured - admin API will be unsecured!');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!this.adminApiKey) {
      // If no API key is configured, allow access (development mode)
      this.logger.warn('Admin API accessed without API key validation');
      return true;
    }

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    // Support both "Bearer <token>" and direct token
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (token !== this.adminApiKey) {
      this.logger.warn(`Invalid admin API key attempt from ${request.ip}`);
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}

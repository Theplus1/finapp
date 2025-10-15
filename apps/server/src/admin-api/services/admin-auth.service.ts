import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AdminUsersService } from '../../domain/admin-users/admin-users.service';

export interface AdminLoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  username: string;
}

/**
 * Admin Authentication Service
 * Handles admin login and token generation using MongoDB
 */
@Injectable()
export class AdminAuthService implements OnModuleInit {
  private readonly logger = new Logger(AdminAuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly adminUsersService: AdminUsersService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET', 'default-secret');
    this.jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '24h');
  }

  /**
   * Initialize default admin user on module init
   */
  async onModuleInit() {
    await this.initializeDefaultAdmin();
  }

  /**
   * Initialize default admin user from environment variables
   */
  private async initializeDefaultAdmin() {
    const defaultUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const defaultPassword = this.configService.get<string>('ADMIN_PASSWORD', '');

    if (!defaultPassword) {
      this.logger.warn('ADMIN_PASSWORD not set - please configure admin credentials');
      return;
    }

    // Use domain service to initialize
    await this.adminUsersService.initializeDefaultAdmin(defaultUsername, defaultPassword);
  }

  /**
   * Validate user credentials (used by Passport LocalStrategy)
   */
  async validateUser(username: string, password: string): Promise<any> {
    // Use domain service to validate credentials
    const adminUser = await this.adminUsersService.validateCredentials(username, password);
    
    if (!adminUser) {
      return null;
    }

    // Return user without password
    return {
      id: (adminUser._id as any).toString(),
      username: adminUser.username,
      role: adminUser.role,
      email: adminUser.email,
      createdAt: adminUser.createdAt,
    };
  }

  /**
   * Generate JWT token for authenticated user
   */
  async login(user: any): Promise<AdminLoginResponse> {
    // Generate JWT token
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      type: 'admin',
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiresIn as any,
    });

    this.logger.log(`Admin logged in successfully: ${user.username}`);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiresIn(this.jwtExpiresIn),
      username: user.username,
    };
  }

  /**
   * Create a new admin user
   */
  async createAdmin(
    username: string, 
    password: string, 
    role: 'super-admin' | 'admin' = 'admin',
    email?: string,
  ) {
    return this.adminUsersService.createUser(username, password, role, email);
  }

  /**
   * Get admin user by username
   */
  async getAdminUser(username: string) {
    return this.adminUsersService.findByUsername(username);
  }

  /**
   * List all admin users
   */
  async listAdminUsers() {
    return this.adminUsersService.findAll();
  }

  /**
   * Update admin user password
   */
  async updatePassword(username: string, newPassword: string): Promise<void> {
    return this.adminUsersService.updatePassword(username, newPassword);
  }

  /**
   * Deactivate admin user
   */
  async deactivateUser(username: string): Promise<void> {
    return this.adminUsersService.deactivateUser(username);
  }

  /**
   * Parse expires in string to seconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 86400; // Default 24 hours

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 86400;
    }
  }
}

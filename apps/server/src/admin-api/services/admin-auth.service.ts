import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUserRepository } from '../repositories/admin-user.repository';
import { AdminUserDocument } from '../schemas/admin-user.schema';

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
    private readonly adminUserRepo: AdminUserRepository,
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

    // Check if admin user already exists
    const existingUser = await this.adminUserRepo.findByUsername(defaultUsername);
    if (existingUser) {
      this.logger.log(`Default admin user already exists: ${defaultUsername}`);
      return;
    }

    // Create default admin user
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    
    await this.adminUserRepo.create({
      username: defaultUsername,
      passwordHash,
      role: 'super-admin',
      isActive: true,
    });

    this.logger.log(`Default admin user created in database: ${defaultUsername}`);
  }

  /**
   * Validate user credentials (used by Passport LocalStrategy)
   */
  async validateUser(username: string, password: string): Promise<any> {
    // Find admin user in database
    const adminUser = await this.adminUserRepo.findByUsername(username);
    if (!adminUser) {
      this.logger.warn(`Login attempt with invalid username: ${username}`);
      return null;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, adminUser.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Login attempt with invalid password for user: ${username}`);
      return null;
    }

    // Update last login time
    await this.adminUserRepo.updateLastLogin(username);

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
  ): Promise<AdminUserDocument> {
    // Check if user already exists
    const exists = await this.adminUserRepo.exists(username);
    if (exists) {
      throw new Error('Admin user already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user in database
    const adminUser = await this.adminUserRepo.create({
      username,
      passwordHash,
      role,
      email,
      isActive: true,
    });

    this.logger.log(`New admin user created: ${username}`);

    return adminUser;
  }

  /**
   * Get admin user by username
   */
  async getAdminUser(username: string): Promise<AdminUserDocument | null> {
    return this.adminUserRepo.findByUsername(username);
  }

  /**
   * List all admin users (without password hashes)
   */
  async listAdminUsers(): Promise<AdminUserDocument[]> {
    return this.adminUserRepo.findAll();
  }

  /**
   * Update admin user password
   */
  async updatePassword(username: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.adminUserRepo.update(username, { passwordHash });
    this.logger.log(`Password updated for user: ${username}`);
  }

  /**
   * Deactivate admin user
   */
  async deactivateUser(username: string): Promise<void> {
    await this.adminUserRepo.softDelete(username);
    this.logger.log(`Admin user deactivated: ${username}`);
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

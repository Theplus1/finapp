import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminUserRepository } from '../../database/repositories/admin-user.repository';
import { AdminUserDocument, AdminUserRole } from '../../database/schemas/admin-user.schema';

/**
 * Admin Users Domain Service
 * Contains business logic for admin user management
 */
@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly adminUserRepository: AdminUserRepository,
  ) {}

  /**
   * Validate user credentials
   */
  async validateCredentials(username: string, password: string): Promise<AdminUserDocument | null> {
    // Find admin user in database
    const adminUser = await this.adminUserRepository.findByUsername(username);
    if (!adminUser) {
      this.logger.warn(`Login attempt with invalid username: ${username}`);
      return null;
    }

    if (!adminUser.isActive) {
      this.logger.warn(`Login attempt for inactive user: ${username}`);
      return null;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, adminUser.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Login attempt with invalid password for user: ${username}`);
      return null;
    }

    // Update last login time
    await this.adminUserRepository.updateLastLogin(username);

    return adminUser;
  }

  /**
   * Create a new admin user
   */
  async createUser(
    username: string, 
    password: string, 
    role: AdminUserRole = 'admin',
    email?: string,
    meta?: { virtualAccountId?: string; bossId?: string },
  ): Promise<AdminUserDocument> {
    // Check if user already exists
    const exists = await this.adminUserRepository.exists(username);
    if (exists) {
      throw new BadRequestException('Admin user already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user in database
    const adminUser = await this.adminUserRepository.create({
      username,
      passwordHash,
      role,
      email,
      virtualAccountId: meta?.virtualAccountId,
      bossId: meta?.bossId,
      isActive: true,
    });

    this.logger.log(`New admin user created: ${username}`);

    return adminUser;
  }

  /**
   * Get admin user by username
   */
  async findByUsername(username: string): Promise<AdminUserDocument | null> {
    return this.adminUserRepository.findByUsername(username);
  }

  /**
   * List all admin users
   */
  async findAll(): Promise<AdminUserDocument[]> {
    return this.adminUserRepository.findAll();
  }

  /**
   * Update admin user password
   */
  async updatePassword(username: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.adminUserRepository.update(username, { passwordHash });
    this.logger.log(`Password updated for user: ${username}`);
  }

  /**
   * Deactivate admin user
   */
  async deactivateUser(username: string): Promise<void> {
    await this.adminUserRepository.softDelete(username);
    this.logger.log(`Admin user deactivated: ${username}`);
  }

  /**
   * Initialize default admin user
   */
  async initializeDefaultAdmin(username: string, password: string): Promise<void> {
    // Check if admin user already exists
    const existingUser = await this.adminUserRepository.findByUsername(username);
    if (existingUser) {
      this.logger.log(`Default admin user already exists: ${username}`);
      return;
    }

    // Create default admin user
    await this.createUser(username, password, 'super-admin');
    this.logger.log(`Default admin user created in database: ${username}`);
  }

  /**
   * Check if user exists
   */
  async exists(username: string): Promise<boolean> {
    return this.adminUserRepository.exists(username);
  }
}

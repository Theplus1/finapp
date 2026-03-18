import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminUserRepository } from '../../database/repositories/admin-user.repository';
import {
  AdminUserDocument,
  AdminUserRole,
} from '../../database/schemas/admin-user.schema';

const EMPLOYEE_ROLES: AdminUserRole[] = ['ads', 'accountant'];
const CUSTOMER_LOGIN_ROLES: AdminUserRole[] = ['boss', 'ads', 'accountant'];

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

  private generateRandomPassword(length: number = 12): string {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const charsLength = chars.length;
    let password = '';
    for (let i = 0; i < length; i += 1) {
      const randomIndex = Math.floor(Math.random() * charsLength);
      password += chars.charAt(randomIndex);
    }
    return password;
  }

  /**
   * Validate user credentials.
   *
   * - Customer roles (boss/ads/accountant): allow login by username OR email.
   * - Admin roles (admin/super-admin): login by username only.
   */
  async validateCredentials(
    identifier: string,
    password: string,
  ): Promise<AdminUserDocument | null> {
    const trimmed = identifier.trim();
    const looksLikeEmail = trimmed.includes('@');

    let adminUser: AdminUserDocument | null;

    if (looksLikeEmail) {
      // Customer login by email
      adminUser = await this.adminUserRepository.findOne({
        email: trimmed,
        isActive: true,
      });

      if (!adminUser) {
        this.logger.warn(`Login attempt with invalid email: ${trimmed}`);
        return null;
      }

      if (!CUSTOMER_LOGIN_ROLES.includes(adminUser.role)) {
        this.logger.warn(
          `Login attempt by email for non-customer role: ${trimmed} (role=${adminUser.role})`,
        );
        return null;
      }
    } else {
      // Username login for all roles
      adminUser = await this.adminUserRepository.findByUsername(trimmed);
      if (!adminUser) {
        this.logger.warn(`Login attempt with invalid username: ${trimmed}`);
        return null;
      }

      // For customer roles, enforce login by email only
      if (CUSTOMER_LOGIN_ROLES.includes(adminUser.role)) {
        this.logger.warn(
          `Customer user attempted to login by username instead of email: ${trimmed} (role=${adminUser.role})`,
        );
        return null;
      }
    }

    if (!adminUser.isActive) {
      this.logger.warn(
        `Login attempt for inactive user: ${adminUser.username} (${trimmed})`,
      );
      return null;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      adminUser.passwordHash,
    );
    if (!isPasswordValid) {
      this.logger.warn(
        `Login attempt with invalid password for user: ${adminUser.username}`,
      );
      return null;
    }

    // Update last login time (tracked by username)
    await this.adminUserRepository.updateLastLogin(adminUser.username);

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
    // Check if username already exists
    const exists = await this.adminUserRepository.exists(username);
    if (exists) {
      throw new BadRequestException('Admin user already exists');
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmailUser = await this.adminUserRepository.findOne({
        email,
      });
      if (existingEmailUser) {
        throw new BadRequestException('Email is already in use');
      }
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
   * Find active boss by virtual account id
   */
  async findBossByVirtualAccountId(virtualAccountId: string): Promise<AdminUserDocument | null> {
    return this.adminUserRepository.findOne({
      role: 'boss',
      virtualAccountId,
      isActive: true,
    });
  }

  /**
   * Find all active bosses by virtual account ids
   */
  async findBossesByVirtualAccountIds(
    virtualAccountIds: string[],
  ): Promise<AdminUserDocument[]> {
    return this.adminUserRepository.findBossesByVirtualAccountIds(virtualAccountIds);
  }

  /**
   * Update admin user password
   */
  async updatePassword(username: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.adminUserRepository.update(username, { passwordHash });
    this.logger.log(`Password updated for user: ${username}`);
  }

  async resetBossPasswordRandom(username: string): Promise<{
    username: string;
    newPassword: string;
  }> {
    const boss = await this.adminUserRepository.findByUsername(username);
    if (!boss || boss.role !== 'boss') {
      throw new NotFoundException('Boss user not found');
    }
    const newPassword = this.generateRandomPassword();
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.adminUserRepository.update(username, { passwordHash });
    this.logger.log(`Random password reset for boss user: ${username}`);
    return { username, newPassword };
  }

  /**
   * Deactivate admin user
   */
  async deactivateUser(username: string): Promise<void> {
    const user = await this.adminUserRepository.findByUsername(username);

    if (!user) {
      this.logger.warn(`Attempt to deactivate non-existing user: ${username}`);
      return;
    }

    await this.adminUserRepository.softDelete(username);

    if (user.role === 'boss') {
      const bossId = String(user._id);
      await this.adminUserRepository.softDeleteEmployeesByBossId(bossId);
      this.logger.log(
        `Cascade deactivated employees for boss ${username} (bossId=${bossId})`,
      );
    }

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

  /**
   * Find boss by id (for customer-api: ensure boss exists and get virtualAccountId)
   */
  async findBossById(bossId: string): Promise<AdminUserDocument | null> {
    const user = await this.adminUserRepository.findById(bossId);
    return user?.role === 'boss' ? user : null;
  }

  /**
   * List employees (ads/accountant) of a boss. Boss only.
   */
  async findEmployeesByBossId(bossId: string): Promise<AdminUserDocument[]> {
    return this.adminUserRepository.findEmployeesByBossId(bossId);
  }

  async resetEmployeePasswordRandom(
    employeeId: string,
    bossId: string,
  ): Promise<{
    id: string;
    username: string;
    newPassword: string;
  }> {
    const employee = await this.adminUserRepository.findById(employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (employee.bossId !== bossId) {
      throw new ForbiddenException('Not allowed to reset this employee password');
    }
    if (!EMPLOYEE_ROLES.includes(employee.role)) {
      throw new BadRequestException('Target user is not an employee');
    }
    const newPassword = this.generateRandomPassword();
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await this.adminUserRepository.updateById(employeeId, {
      passwordHash,
    });
    if (!updated) {
      throw new NotFoundException('Employee not found');
    }
    this.logger.log(
      `Random password reset for employee ${employeeId} by boss ${bossId}`,
    );
    return {
      id: (updated._id as unknown as { toString(): string }).toString(),
      username: updated.username,
      newPassword,
    };
  }

  /**
   * Create employee (ads/accountant) under a boss. Boss only.
   */
  async createEmployee(
    bossId: string,
    username: string,
    password: string,
    role: 'ads' | 'accountant',
    email?: string,
  ): Promise<AdminUserDocument> {
    const boss = await this.findBossById(bossId);
    if (!boss) {
      throw new ForbiddenException('Boss account not found');
    }
    if (!boss.virtualAccountId) {
      throw new BadRequestException('Boss must be linked to a virtual account');
    }
    if (!EMPLOYEE_ROLES.includes(role)) {
      throw new BadRequestException('Role must be ads or accountant');
    }
    return this.createUser(username, password, role, email, {
      bossId,
      virtualAccountId: boss.virtualAccountId,
    });
  }

  /**
   * Update employee (password, email). Caller must be the boss of this employee.
   */
  async updateEmployee(
    employeeId: string,
    bossId: string,
    updates: { password?: string; email?: string },
  ): Promise<AdminUserDocument> {
    const employee = await this.adminUserRepository.findById(employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (employee.bossId !== bossId) {
      throw new ForbiddenException('Not allowed to update this employee');
    }
    const updateData: { passwordHash?: string; email?: string } = {};
    if (updates.password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(updates.password, 10);
    }
    if (updates.email !== undefined) {
      updateData.email = updates.email;
    }
    if (Object.keys(updateData).length === 0) {
      return employee;
    }
    const updated = await this.adminUserRepository.updateById(employeeId, updateData);
    if (!updated) {
      throw new NotFoundException('Employee not found');
    }
    this.logger.log(`Employee ${employeeId} updated by boss ${bossId}`);
    return updated;
  }

  /**
   * Soft-delete employee. Caller must be the boss of this employee.
   */
  async deleteEmployee(employeeId: string, bossId: string): Promise<void> {
    const employee = await this.adminUserRepository.findById(employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (employee.bossId !== bossId) {
      throw new ForbiddenException('Not allowed to delete this employee');
    }
    await this.adminUserRepository.softDeleteById(employeeId);
    this.logger.log(`Employee ${employeeId} deleted by boss ${bossId}`);
  }
}

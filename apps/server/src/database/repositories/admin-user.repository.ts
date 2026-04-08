import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminUser, AdminUserDocument } from '../schemas/admin-user.schema';

@Injectable()
export class AdminUserRepository {
  private readonly logger = new Logger(AdminUserRepository.name);

  constructor(
    @InjectModel(AdminUser.name)
    private adminUserModel: Model<AdminUserDocument>,
  ) {}

  /**
   * Create a new admin user
   */
  async create(userData: Partial<AdminUser>): Promise<AdminUserDocument> {
    const user = new this.adminUserModel(userData);
    return user.save();
  }

  /**
   * Find admin user by username
   */
  async findByUsername(username: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel
      .findOne({ username, isActive: true })
      .exec();
  }

  /**
   * Find admin user by ID
   */
  async findById(id: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel
      .findOne({ _id: id, isActive: true })
      .exec();
  }

  /**
   * Find admin user by ID (including inactive)
   */
  async findByIdAny(id: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findOne({ _id: id }).exec();
  }

  /**
   * Update admin user
   */
  async update(username: string, updateData: Partial<AdminUser>): Promise<AdminUserDocument | null> {
    return this.adminUserModel
      .findOneAndUpdate(
        { username, isActive: true },
        { $set: updateData },
        { new: true },
      )
      .exec();
  }

  /**
   * Update last login time
   */
  async updateLastLogin(username: string): Promise<void> {
    await this.adminUserModel
      .updateOne(
        { username, isActive: true },
        { $set: { lastLoginAt: new Date() } },
      )
      .exec();
  }

  /**
   * Check if username exists
   */
  async exists(username: string): Promise<boolean> {
    const count = await this.adminUserModel
      .countDocuments({ username })
      .exec();
    return count > 0;
  }

  /**
   * Generic findOne helper
   */
  async findOne(filter: Partial<AdminUser>): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findOne(filter).exec();
  }

  /**
   * List all admin users (without password hashes)
   */
  async findAll(): Promise<AdminUserDocument[]> {
    return this.adminUserModel
      .find({ isActive: true })
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Soft delete admin user
   */
  async softDelete(username: string): Promise<void> {
    await this.adminUserModel
      .updateOne(
        { username },
        { $set: { isActive: false } },
      )
      .exec();
  }

  /**
   * Count total admin users
   */
  async count(): Promise<number> {
    return this.adminUserModel
      .countDocuments({ isActive: true })
      .exec();
  }

  /**
   * Find all active bosses by virtual account ids
   */
  async findBossesByVirtualAccountIds(
    virtualAccountIds: string[],
  ): Promise<AdminUserDocument[]> {
    if (virtualAccountIds.length === 0) return [];
    return this.adminUserModel
      .find({
        role: 'boss',
        isActive: true,
        virtualAccountId: { $in: virtualAccountIds },
      })
      .exec();
  }

  /**
   * Find all employees (ads/accountant) by boss id (active + inactive)
   */
  async findEmployeesByBossId(bossId: string): Promise<AdminUserDocument[]> {
    return this.adminUserModel
      .find({
        bossId,
        role: { $in: ['ads', 'accountant', 'employee'] },
      })
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Update admin user by id
   */
  async updateById(
    id: string,
    updateData: Partial<AdminUser>,
  ): Promise<AdminUserDocument | null> {
    return this.adminUserModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .select('-passwordHash')
      .exec();
  }

  /**
   * Soft delete admin user by id
   */
  async softDeleteById(id: string): Promise<void> {
    await this.adminUserModel
      .updateOne({ _id: id }, { $set: { isActive: false } })
      .exec();
  }

  /**
   * Soft delete all employees (ads/accountant) of a boss by bossId
   */
  async softDeleteEmployeesByBossId(bossId: string): Promise<void> {
    await this.adminUserModel
      .updateMany(
        {
          bossId,
          role: { $in: ['ads', 'accountant'] },
        },
        { $set: { isActive: false } },
      )
      .exec();
  }

  async deleteById(id: string): Promise<void> {
    await this.adminUserModel.deleteOne({ _id: id }).exec();
  }
}

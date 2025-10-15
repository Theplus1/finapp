import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, AccessStatus } from './users.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findOrCreate(
    telegramId: number,
    userData: Partial<User>,
  ): Promise<UserDocument> {
    let user = await this.userModel.findOne({ telegramId });

    if (!user) {
      user = new this.userModel({
        telegramId,
        ...userData,
      });
      await user.save();
      this.logger.log(`New user created: ${telegramId}`);
    }

    return user;
  }

  async findByTelegramId(telegramId: number): Promise<UserDocument | null> {
    return this.userModel.findOne({ telegramId });
  }

  async updateSubscription(
    telegramId: number,
    isSubscribed: boolean,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findOneAndUpdate(
      { telegramId },
      { isSubscribed },
      { new: true },
    );

    this.logger.log(
      `User ${telegramId} subscription updated to: ${isSubscribed}`,
    );
    return user;
  }

  async getSubscribedUsers(): Promise<UserDocument[]> {
    return this.userModel.find({ isSubscribed: true });
  }

  async getAllUsers(): Promise<UserDocument[]> {
    return this.userModel.find();
  }

  async linkAccountNumber(
    telegramId: number,
    virtualAccountId: string,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findOneAndUpdate(
      { telegramId },
      { virtualAccountId },
      { new: true },
    );

    this.logger.log(
      `User ${telegramId} linked to account number: ${virtualAccountId}`,
    );
    return user;
  }

  async findByAccountNumber(virtualAccountId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ virtualAccountId });
  }

  // ==================== Access Control Methods ====================

  /**
   * Check if user has approved access
   */
  async hasApprovedAccess(telegramId: number): Promise<boolean> {
    const user = await this.findByTelegramId(telegramId);
    return user?.accessStatus === AccessStatus.APPROVED;
  }

  /**
   * Request access for a user (automatically set on registration)
   */
  async requestAccess(telegramId: number): Promise<UserDocument | null> {
    const user = await this.userModel.findOneAndUpdate(
      { telegramId },
      { 
        accessStatus: AccessStatus.PENDING,
        accessRequestedAt: new Date(),
      },
      { new: true },
    );

    this.logger.log(`User ${telegramId} requested access`);
    return user;
  }

  /**
   * Approve user access
   */
  async approveAccess(
    telegramId: number,
    approvedBy: number,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findOneAndUpdate(
      { telegramId },
      { 
        accessStatus: AccessStatus.APPROVED,
        accessApprovedAt: new Date(),
        accessApprovedBy: approvedBy,
        accessDeniedReason: undefined,
      },
      { new: true },
    );

    this.logger.log(`User ${telegramId} access approved by ${approvedBy}`);
    return user;
  }

  /**
   * Deny user access
   */
  async denyAccess(
    telegramId: number,
    reason: string,
    deniedBy: number,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findOneAndUpdate(
      { telegramId },
      { 
        accessStatus: AccessStatus.DENIED,
        accessDeniedReason: reason,
        accessApprovedBy: deniedBy,
      },
      { new: true },
    );

    this.logger.log(`User ${telegramId} access denied by ${deniedBy}: ${reason}`);
    return user;
  }

  /**
   * Revoke user access
   */
  async revokeAccess(
    telegramId: number,
    reason: string,
    revokedBy: number,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findOneAndUpdate(
      { telegramId },
      { 
        accessStatus: AccessStatus.REVOKED,
        accessDeniedReason: reason,
        accessApprovedBy: revokedBy,
      },
      { new: true },
    );

    this.logger.log(`User ${telegramId} access revoked by ${revokedBy}: ${reason}`);
    return user;
  }

  /**
   * Get all users with pending access requests
   */
  async getPendingAccessRequests(): Promise<UserDocument[]> {
    return this.userModel.find({ accessStatus: AccessStatus.PENDING });
  }

  /**
   * Get all approved users
   */
  async getApprovedUsers(): Promise<UserDocument[]> {
    return this.userModel.find({ accessStatus: AccessStatus.APPROVED });
  }
}

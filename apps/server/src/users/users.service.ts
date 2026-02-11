import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, AccessStatus, NotificationDestination } from './users.schema';

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
    chatId: string,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findOneAndUpdate(
      { telegramId },
      { notificationChatIds: { $addToSet: chatId } },
      { new: true },
    );

    this.logger.log(
      `User ${telegramId} subscription updated to: ${chatId}`,
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
      { upsert: true, new: true },
    );

    this.logger.log(
      `User ${telegramId} linked to virtual account: ${virtualAccountId}`,
    );
    return user;
  }

  async linkAccountNumbers(
    telegramIds: number[],
    virtualAccountId: string,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findOneAndUpdate(
      { virtualAccountId },
      { telegramIds },
      { upsert: true, new: true },
    );

    this.logger.log(
      `Users ${telegramIds} linked to virtual account: ${virtualAccountId}`,
    );
    return user;
  }

  async unlinkAccount(virtualAccountId: string): Promise<UserDocument | null> {
    const user = await this.userModel.findByIdAndUpdate(
      { virtualAccountId },
      { $unset: { virtualAccountId: '' } },
      { new: true },
    );

    this.logger.log(`User ${user?.telegramId} unlinked from virtual account`);
    return user;
  }

    async unlinkAllAccount(virtualAccountId: string): Promise<boolean> {
    const result = await this.userModel.updateMany(
      { virtualAccountId },
      { $unset: { virtualAccountId: '' } },
    );

    this.logger.log(`Unlinked ${result.modifiedCount} users from virtual account`);
    return result.acknowledged && result.modifiedCount > 0;
  }

  async findByVirtualAccountId(virtualAccountId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ virtualAccountId });
  }

  async findByAccountNumbers(virtualAccountIds: string[]): Promise<UserDocument[]> {
    return this.userModel.find({ 
      virtualAccountId: { $in: virtualAccountIds } 
    });
  }

  async hasLinkedAccount(telegramId: number): Promise<boolean> {
    const user = await this.findByTelegramId(telegramId);
    return !!user?.virtualAccountId;
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

  // ==================== Notification Destination Methods ====================

  /**
   * Get destinations for sending notifications.
   * Ưu tiên notificationDestinations nếu có, fallback notificationChatIds.
   */
  getDestinations(user: UserDocument): NotificationDestination[] {
    const dests = user.notificationDestinations;
    if (dests && dests.length > 0) {
      return dests.map((d) => ({ chatId: d.chatId, warningThreadId: d.warningThreadId }));
    }
    const chatIds = user.notificationChatIds || [];
    return chatIds.map((chatId) => ({ chatId }));
  }

  /**
   * Add a notification destination (chỉ chatId). User phải tồn tại; không tạo mới.
   */
  async addNotificationDestination(
    telegramId: number,
    chatId: number,
  ): Promise<UserDocument | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) return null;

    const dests = user.notificationDestinations || [];
    if (dests.some((d) => d.chatId === chatId)) {
      this.logger.log(`User ${telegramId} already has destination ${chatId}`);
      return user;
    }

    const updated = await this.userModel.findOneAndUpdate(
      { telegramId },
      {
        $push: { notificationDestinations: { chatId } },
        $addToSet: { notificationChatIds: chatId },
      },
      { new: true },
    );

    this.logger.log(`User ${telegramId} added notification destination: ${chatId}`);
    return updated;
  }

  /**
   * Set warning thread id for a destination (topic cho balance/card alert).
   */
  async setWarningThreadId(
    telegramId: number,
    chatId: number,
    threadId: number,
  ): Promise<UserDocument | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) return null;

    const dests = user.notificationDestinations || [];
    const hasChat = dests.some((d) => d.chatId === chatId);
    if (!hasChat) {
      await this.userModel.findOneAndUpdate(
        { telegramId },
        {
          $push: { notificationDestinations: { chatId, warningThreadId: threadId } },
          $addToSet: { notificationChatIds: chatId },
        },
        { new: true },
      );
    } else {
      await this.userModel.findOneAndUpdate(
        { telegramId, 'notificationDestinations.chatId': chatId },
        { $set: { 'notificationDestinations.$.warningThreadId': threadId } },
        { new: true },
      );
    }

    this.logger.log(`User ${telegramId} set warning thread ${threadId} for chat ${chatId}`);
    return this.findByTelegramId(telegramId);
  }

  /**
   * Remove a notification destination for a user
   */
  async removeNotificationDestination(
    telegramId: number,
    chatId: number,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findOneAndUpdate(
      { telegramId },
      {
        $pull: { notificationChatIds: chatId, notificationDestinations: { chatId } },
      },
      { new: true },
    );

    this.logger.log(`User ${telegramId} removed notification destination: ${chatId}`);
    return user;
  }

  /**
   * Get all notification destinations for a user (groups/channels only) - legacy, prefer getDestinations(user).
   */
  async getNotificationDestinations(telegramId: number): Promise<number[]> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) return [];
    const dests = this.getDestinations(user);
    return dests.map((d) => d.chatId);
  }
}

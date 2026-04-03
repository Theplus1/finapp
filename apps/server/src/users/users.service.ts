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

  /**
   * Find user by group chat ID (or legacy telegramId).
   * telegramIds are group chat IDs (ctx.chat.id), not personal account IDs.
   */
  async findByTelegramIdOrIds(telegramId: number): Promise<UserDocument | null> {
    return this.userModel.findOne({
      $or: [{ telegramId }, { telegramIds: telegramId }],
    });
  }

  async findAllByTelegramIdOrIds(telegramId: number): Promise<UserDocument[]> {
    return this.userModel.find({
      $or: [{ telegramId }, { telegramIds: telegramId }],
    });
  }

  async updateSubscription(
    telegramId: number,
    chatId: string,
  ): Promise<UserDocument | null> {
    const user = await this.findByTelegramIdOrIds(telegramId);
    if (!user) return null;
    const updated = await this.userModel.findByIdAndUpdate(
      user._id,
      { notificationChatIds: { $addToSet: Number(chatId) } },
      { new: true },
    );
    this.logger.log(
      `User (chat ${telegramId}) subscription updated to: ${chatId}`,
    );
    return updated;
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
    const user = await this.userModel.findOneAndUpdate(
      { virtualAccountId },
      { $unset: { virtualAccountId: '' } },
      { new: true },
    );

    this.logger.log(`User unlinked from virtual account ${virtualAccountId}`);
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
    const user = await this.findByTelegramIdOrIds(telegramId);
    return !!user?.virtualAccountId;
  }

  // ==================== Access Control Methods ====================

  /**
   * Check if user has approved access
   */
  async hasApprovedAccess(telegramId: number): Promise<boolean> {
    const user = await this.findByTelegramIdOrIds(telegramId);
    return user?.accessStatus === AccessStatus.APPROVED;
  }

  /**
   * Request access for a user (automatically set on registration)
   */
  async requestAccess(telegramId: number): Promise<UserDocument | null> {
    const user = await this.findByTelegramIdOrIds(telegramId);
    if (!user) return null;
    const updated = await this.userModel.findByIdAndUpdate(
      user._id,
      {
        accessStatus: AccessStatus.PENDING,
        accessRequestedAt: new Date(),
      },
      { new: true },
    );
    this.logger.log(`User (chat ${telegramId}) requested access`);
    return updated;
  }

  /**
   * Approve user access
   */
  async approveAccess(
    telegramId: number,
    approvedBy: number,
  ): Promise<UserDocument | null> {
    const user = await this.findByTelegramIdOrIds(telegramId);
    if (!user) return null;
    const updated = await this.userModel.findByIdAndUpdate(
      user._id,
      {
        accessStatus: AccessStatus.APPROVED,
        accessApprovedAt: new Date(),
        accessApprovedBy: approvedBy,
        accessDeniedReason: undefined,
      },
      { new: true },
    );
    this.logger.log(`User (chat ${telegramId}) access approved by ${approvedBy}`);
    return updated;
  }

  /**
   * Deny user access
   */
  async denyAccess(
    telegramId: number,
    reason: string,
    deniedBy: number,
  ): Promise<UserDocument | null> {
    const user = await this.findByTelegramIdOrIds(telegramId);
    if (!user) return null;
    const updated = await this.userModel.findByIdAndUpdate(
      user._id,
      {
        accessStatus: AccessStatus.DENIED,
        accessDeniedReason: reason,
        accessApprovedBy: deniedBy,
      },
      { new: true },
    );
    this.logger.log(`User (chat ${telegramId}) access denied by ${deniedBy}: ${reason}`);
    return updated;
  }

  /**
   * Revoke user access
   */
  async revokeAccess(
    telegramId: number,
    reason: string,
    revokedBy: number,
  ): Promise<UserDocument | null> {
    const user = await this.findByTelegramIdOrIds(telegramId);
    if (!user) return null;
    const updated = await this.userModel.findByIdAndUpdate(
      user._id,
      {
        accessStatus: AccessStatus.REVOKED,
        accessDeniedReason: reason,
        accessApprovedBy: revokedBy,
      },
      { new: true },
    );
    this.logger.log(`User (chat ${telegramId}) access revoked by ${revokedBy}: ${reason}`);
    return updated;
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
  ): Promise<UserDocument[]> {
    const users = await this.findAllByTelegramIdOrIds(telegramId);
    if (users.length === 0) return [];

    const updatedUsers: UserDocument[] = [];
    for (const user of users) {
      const dests = user.notificationDestinations || [];
      if (dests.some((d) => d.chatId === chatId)) {
        this.logger.log(`User (chat ${telegramId}) already has destination ${chatId}`);
        updatedUsers.push(user);
        continue;
      }

      const updated = await this.userModel.findByIdAndUpdate(
        user._id,
        {
          $push: { notificationDestinations: { chatId } },
          $addToSet: { notificationChatIds: chatId },
        },
        { new: true },
      );

      if (updated) {
        updatedUsers.push(updated);
      }
    }

    this.logger.log(
      `Users (chat ${telegramId}) added notification destination ${chatId}: ${updatedUsers.length} updated`,
    );
    return updatedUsers;
  }

  /**
   * Bulk add a notification destination (chỉ chatId) cho nhiều user.
   */
  async addNotificationDestinationBulk(
    telegramIds: number[],
    chatId: number,
  ): Promise<boolean> {
    if (!telegramIds?.length) return false;

    const result = await this.userModel.updateMany(
      {
        $or: [
          { telegramId: { $in: telegramIds } },
          { telegramIds: { $in: telegramIds } },
        ],
      },
      {
        $addToSet: {
          notificationDestinations: { chatId },
          notificationChatIds: chatId,
        },
      },
    );

    this.logger.log(
      `Users (chats ${telegramIds.join(',')}) bulk added notification destination: ${chatId}`,
    );
    return result.acknowledged === true;
  }

  /**
   * Set warning thread id for a destination (topic cho balance/card alert).
   */
  async setWarningThreadId(
    telegramId: number,
    chatId: number,
    threadId: number,
  ): Promise<UserDocument[]> {
    const users = await this.findAllByTelegramIdOrIds(telegramId);
    if (users.length === 0) return [];

    const updatedUsers: UserDocument[] = [];
    for (const user of users) {
      const dests = user.notificationDestinations || [];
      const hasChat = dests.some((d) => d.chatId === chatId);
      if (!hasChat) {
        const updated = await this.userModel.findByIdAndUpdate(
          user._id,
          {
            $push: { notificationDestinations: { chatId, warningThreadId: threadId } },
            $addToSet: { notificationChatIds: chatId },
          },
          { new: true },
        );
        if (updated) {
          updatedUsers.push(updated);
        }
      } else {
        const updated = await this.userModel.findOneAndUpdate(
          { _id: user._id, 'notificationDestinations.chatId': chatId },
          { $set: { 'notificationDestinations.$.warningThreadId': threadId } },
          { new: true },
        );
        if (updated) {
          updatedUsers.push(updated);
        }
      }
    }

    this.logger.log(
      `Users (chat ${telegramId}) set warning thread ${threadId} for chat ${chatId}: ${updatedUsers.length} updated`,
    );
    return updatedUsers;
  }

  /**
   * Remove a notification destination for a user
   */
  async removeNotificationDestination(
    telegramId: number,
    chatId: number,
  ): Promise<UserDocument | null> {
    const user = await this.findByTelegramIdOrIds(telegramId);
    if (!user) return null;

    const updated = await this.userModel.findByIdAndUpdate(
      user._id,
      {
        $pull: { notificationChatIds: chatId, notificationDestinations: { chatId } },
      },
      { new: true },
    );

    this.logger.log(`User (chat ${telegramId}) removed notification destination: ${chatId}`);
    return updated;
  }

  /**
   * Bulk remove a notification destination cho nhiều user.
   */
  async removeNotificationDestinationBulk(
    telegramIds: number[],
    chatId: number,
  ): Promise<boolean> {
    if (!telegramIds?.length) return false;

    const result = await this.userModel.updateMany(
      {
        $or: [
          { telegramId: { $in: telegramIds } },
          { telegramIds: { $in: telegramIds } },
        ],
      },
      {
        $pull: {
          notificationChatIds: chatId,
          notificationDestinations: { chatId },
        },
      },
    );

    this.logger.log(
      `Users (chats ${telegramIds.join(',')}) bulk removed notification destination: ${chatId}`,
    );
    return result.acknowledged === true;
  }

  /**
   * Get all notification destinations for a user (groups/channels only) - legacy, prefer getDestinations(user).
   */
  async getNotificationDestinations(telegramId: number): Promise<number[]> {
    const user = await this.findByTelegramIdOrIds(telegramId);
    if (!user) return [];
    const dests = this.getDestinations(user);
    return dests.map((d) => d.chatId);
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { BotService } from '../../bot/bot.service';
import { Messages } from '../../bot/constants/messages.constant';
import { Keyboards } from '../../bot/constants/keyboards.constant';
import { AccessStatus, UserDocument } from '../../users/users.schema';
import { UserStatsResponseDto, UserResponseDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly botService: BotService,
  ) {}

  /**
   * Get user statistics by access status
   */
  async getUserStats(): Promise<UserStatsResponseDto> {
    const allUsers = await this.usersService.getAllUsers();

    const stats = {
      totalUsers: allUsers.length,
      pending: 0,
      approved: 0,
      denied: 0,
      revoked: 0,
    };

    allUsers.forEach((user) => {
      switch (user.accessStatus) {
        case AccessStatus.PENDING:
          stats.pending++;
          break;
        case AccessStatus.APPROVED:
          stats.approved++;
          break;
        case AccessStatus.DENIED:
          stats.denied++;
          break;
        case AccessStatus.REVOKED:
          stats.revoked++;
          break;
      }
    });

    return stats;
  }

  /**
   * Get all users, optionally filtered by status
   */
  async getUsers(status?: AccessStatus): Promise<UserResponseDto[]> {
    let users: UserDocument[];

    if (status) {
      switch (status) {
        case AccessStatus.PENDING:
          users = await this.usersService.getPendingAccessRequests();
          break;
        case AccessStatus.APPROVED:
          users = await this.usersService.getApprovedUsers();
          break;
        default:
          users = await this.usersService.getAllUsers();
          users = users.filter((u) => u.accessStatus === status);
      }
    } else {
      users = await this.usersService.getAllUsers();
    }

    return users.map(this.mapUserToDto);
  }

  /**
   * Get pending users
   */
  async getPendingUsers(): Promise<UserResponseDto[]> {
    const users = await this.usersService.getPendingAccessRequests();
    return users.map(this.mapUserToDto);
  }

  /**
   * Get approved users
   */
  async getApprovedUsers(): Promise<UserResponseDto[]> {
    const users = await this.usersService.getApprovedUsers();
    return users.map(this.mapUserToDto);
  }

  /**
   * Get specific user by Telegram ID
   */
  async getUser(telegramId: number): Promise<UserResponseDto> {
    const user = await this.usersService.findByTelegramId(telegramId);
    
    if (!user) {
      throw new NotFoundException(`User with Telegram ID ${telegramId} not found`);
    }

    return this.mapUserToDto(user);
  }

  /**
   * Approve user access
   */
  async approveUser(telegramId: number): Promise<UserResponseDto> {
    const user = await this.usersService.approveAccess(telegramId, 0); // 0 = API admin

    if (!user) {
      throw new NotFoundException(`User with Telegram ID ${telegramId} not found`);
    }

    // Notify user about approval
    try {
      await this.botService.sendMessage(
        telegramId,
        Messages.yourAccessApproved,
        {
          parse_mode: 'Markdown',
          ...Keyboards.mainMenu(),
        },
      );
    } catch (error) {
      this.logger.error(`Failed to notify user ${telegramId} about approval`, error);
    }

    return this.mapUserToDto(user);
  }

  /**
   * Deny user access
   */
  async denyUser(telegramId: number, reason: string): Promise<UserResponseDto> {
    const user = await this.usersService.denyAccess(telegramId, reason, 0); // 0 = API admin

    if (!user) {
      throw new NotFoundException(`User with Telegram ID ${telegramId} not found`);
    }

    // Notify user about denial
    try {
      await this.botService.sendMessage(
        telegramId,
        Messages.yourAccessDenied(reason),
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      this.logger.error(`Failed to notify user ${telegramId} about denial`, error);
    }

    return this.mapUserToDto(user);
  }

  /**
   * Revoke user access
   */
  async revokeUser(telegramId: number, reason: string): Promise<UserResponseDto> {
    const user = await this.usersService.revokeAccess(telegramId, reason, 0); // 0 = API admin

    if (!user) {
      throw new NotFoundException(`User with Telegram ID ${telegramId} not found`);
    }

    // Notify user about revocation
    try {
      await this.botService.sendMessage(
        telegramId,
        Messages.yourAccessRevoked(reason),
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      this.logger.error(`Failed to notify user ${telegramId} about revocation`, error);
    }

    return this.mapUserToDto(user);
  }

  /**
   * Bulk approve multiple users
   */
  async bulkApproveUsers(
    telegramIds: number[],
  ): Promise<{ approved: number; failed: number }> {
    let approved = 0;
    let failed = 0;

    for (const telegramId of telegramIds) {
      try {
        await this.approveUser(telegramId);
        approved++;
      } catch (error) {
        this.logger.error(`Failed to approve user ${telegramId}`, error);
        failed++;
      }
    }

    this.logger.log(`Bulk approval complete: ${approved} approved, ${failed} failed`);
    return { approved, failed };
  }

  /**
   * Search users by username or name
   */
  async searchUsers(query: string): Promise<UserResponseDto[]> {
    const allUsers = await this.usersService.getAllUsers();
    const lowerQuery = query.toLowerCase();

    const filtered = allUsers.filter((user) => {
      const username = user.username?.toLowerCase() || '';
      const firstName = user.firstName?.toLowerCase() || '';
      const lastName = user.lastName?.toLowerCase() || '';
      const fullName = `${firstName} ${lastName}`.trim();

      return (
        username.includes(lowerQuery) ||
        firstName.includes(lowerQuery) ||
        lastName.includes(lowerQuery) ||
        fullName.includes(lowerQuery) ||
        user.telegramId.toString().includes(query)
      );
    });

    return filtered.map(this.mapUserToDto);
  }

  /**
   * Notify admins about new user registration (called by MenuHandler)
   */
  async notifyAdminsNewRequest(
    telegramId: number,
    username: string | undefined,
    firstName: string | undefined,
    lastName: string | undefined,
  ): Promise<void> {
    // This method is kept for backward compatibility with MenuHandler
    // In API-first approach, admins would check the API or receive webhooks
    this.logger.log(
      `New user registration: ${telegramId} (@${username || 'no-username'})`,
    );
    
    // Optional: You could implement webhook notifications here
    // or integrate with external notification systems (Slack, Discord, etc.)
  }

  /**
   * Map UserDocument to UserResponseDto
   */
  private mapUserToDto(user: UserDocument): UserResponseDto {
    return {
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      virtualAccountId: user.virtualAccountId,
      accessStatus: user.accessStatus,
      accessRequestedAt: user.accessRequestedAt,
      accessApprovedAt: user.accessApprovedAt,
      accessApprovedBy: user.accessApprovedBy,
      accessDeniedReason: user.accessDeniedReason,
      isSubscribed: user.isSubscribed,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { AdminService } from '../admin.service';

@Injectable()
export class AdminHandler {
  private readonly logger = new Logger(AdminHandler.name);

  constructor(private readonly adminService: AdminService) {}

  /**
   * Notify admins about new access request
   * This is called by MenuHandler when a new user registers
   */
  async notifyAdminsNewRequest(
    telegramId: number,
    username: string | undefined,
    firstName: string | undefined,
    lastName: string | undefined,
  ): Promise<void> {
    // Delegate to AdminService which handles the notification logic
    await this.adminService.notifyAdminsNewRequest(
      telegramId,
      username,
      firstName,
      lastName,
    );
  }
}

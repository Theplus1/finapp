import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountsService } from '../accounts/accounts.service';
import { UsersService } from '../../users/users.service';
import { BotService } from '../../bot/bot.service';
import { NotificationsService } from '../notifications/notifications.service';
import { VirtualAccountDocument } from '../../database/schemas/virtual-account.schema';
import { NotificationStatus, NotificationType } from '../../database/schemas/notification.schema';
import { Messages } from '../../bot/constants/messages.constant';

/**
 * Balance Alert Service
 * Handles checking virtual account balances and sending alerts when balance is low
 */
@Injectable()
export class BalanceAlertsService {
  private readonly logger = new Logger(BalanceAlertsService.name);
  private readonly thresholdCents: number;
  private readonly cooldownHours: number;

  constructor(
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
    private readonly botService: BotService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    const thresholdUsd = this.configService.get<number>('balanceAlert.thresholdUsd', 5000);
    this.thresholdCents = thresholdUsd * 100; // Convert USD to cents
    this.cooldownHours = this.configService.get<number>('balanceAlert.cooldownHours', 24);
  }

  /**
   * Check all virtual accounts and send alerts for low balances
   */
  async checkAndSendAlerts(): Promise<void> {
    this.logger.log('Starting balance alert check...');

    try {
      // Get all virtual accounts
      const virtualAccounts = await this.accountsService.findAll();

      // Filter accounts with balance < threshold
      const lowBalanceAccounts = virtualAccounts.filter((va) => {
        const balanceCents = this.getBalanceCents(va);
        return balanceCents > 0 && balanceCents < this.thresholdCents;
      });

      this.logger.log(
        `Found ${lowBalanceAccounts.length} virtual accounts with balance < ${this.thresholdCents / 100} USD`,
      );

      // Process each low balance account
      let sentCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const va of lowBalanceAccounts) {
        try {
          const sent = await this.processVirtualAccount(va);
          if (sent) {
            sentCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          errorCount++;
          this.logger.error(`Error processing VA ${va.slashId}:`, error);
        }
      }

      this.logger.log(
        `Balance alert check completed: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error('Error during balance alert check:', error);
      throw error;
    }
  }

  /**
   * Process a single virtual account and send alert if needed
   */
  private async processVirtualAccount(va: VirtualAccountDocument): Promise<boolean> {
    // Find user linked to this virtual account
    const user = await this.usersService.findByVirtualAccountId(va.slashId);

    if (!user || !user.telegramId) {
      this.logger.warn(
        `No user found for virtual account ${va.slashId} (${va.name}). Skipping alert.`,
      );
      return false;
    }

    // Check if user has notification destinations
    const destinations = user.notificationChatIds || [];
    if (destinations.length === 0) {
      this.logger.warn(
        `User ${user.telegramId} has no notification destinations for VA ${va.slashId}. Skipping alert.`,
      );
      return false;
    }

    // Check cooldown - has alert been sent recently?
    const alreadySent = await this.notificationsService.isBalanceAlertSent(
      user.id,
      va.slashId,
      this.cooldownHours,
    );

    if (alreadySent) {
      this.logger.debug(
        `Balance alert already sent for VA ${va.slashId} within cooldown period. Skipping.`,
      );
      return false;
    }

    // Send alert
    try {
      const thresholdUsd = this.thresholdCents / 100;
      const message = Messages.balanceAlert(va.name, thresholdUsd);
      await this.botService.sendMessageToMultiple(
        destinations,
        message.text,
        { parse_mode: message.parse_mode },
      );

      // Save notification record
      await this.notificationsService.createNotification({
        userId: user.id,
        type: NotificationType.BALANCE_ALERT,
        status: NotificationStatus.SENT,
        data: {
          virtualAccountId: va.slashId,
          virtualAccountName: va.name,
          balanceCents: this.getBalanceCents(va),
          thresholdCents: this.thresholdCents,
        },
      });

      this.logger.log(
        `Balance alert sent to user ${user.telegramId} for VA ${va.slashId} (${va.name})`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send balance alert for VA ${va.slashId} to user ${user.telegramId}:`,
        error,
      );

      // Save notification record with FAILED status
      try {
        await this.notificationsService.createNotification({
          userId: user.id,
          type: NotificationType.BALANCE_ALERT,
          status: NotificationStatus.FAILED,
          data: {
            virtualAccountId: va.slashId,
            virtualAccountName: va.name,
            balanceCents: this.getBalanceCents(va),
            thresholdCents: this.thresholdCents,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (notificationError) {
        this.logger.error('Failed to save notification record:', notificationError);
      }

      return false;
    }
  }

  /**
   * Get balance in cents from virtual account
   * Priority: balance.amountCents > balanceCents
   */
  private getBalanceCents(va: VirtualAccountDocument): number {
    if (va.balance?.amountCents !== undefined) {
      return va.balance.amountCents;
    }
    return va.balanceCents || 0;
  }
}



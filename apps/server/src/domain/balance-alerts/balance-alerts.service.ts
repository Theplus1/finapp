import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountsService } from '../accounts/accounts.service';
import { UsersService } from '../../users/users.service';
import { BotService } from '../../bot/bot.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SlashApiService } from '../../integrations/slash/services/slash-api.service';
import { VirtualAccountDocument } from '../../database/schemas/virtual-account.schema';
import { NotificationStatus, NotificationType } from '../../database/schemas/notification.schema';
import { Messages } from '../../bot/constants/messages.constant';

/**
 * Balance Alert Service
 * Checks virtual account balances via Slash API and sends alerts when balance is low.
 * No longer depends on Google Sheets.
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
    private readonly slashApiService: SlashApiService,
  ) {
    const thresholdUsd = this.configService.get<number>('balanceAlert.thresholdUsd', 5000);
    this.thresholdCents = thresholdUsd * 100;
    this.cooldownHours = this.configService.get<number>('balanceAlert.cooldownHours', 24);
  }

  /**
   * Check all virtual accounts and send alerts for low balances.
   * Reads balance from Slash API (real-time).
   */
  async checkAndSendAlerts(): Promise<void> {
    this.logger.log('Starting balance alert check (Slash API)...');

    try {
      const virtualAccounts = await this.accountsService.findAll();
      const vaMap = new Map<string, VirtualAccountDocument>();
      virtualAccounts.forEach((va) => {
        vaMap.set(va.slashId, va);
      });

      this.logger.log(`Loaded ${virtualAccounts.length} virtual accounts`);

      let sentCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const va of virtualAccounts) {
        try {
          const result = await this.processVirtualAccount(va, vaMap);
          if (result === 'sent') {
            sentCount++;
          } else if (result === 'skipped') {
            skippedCount++;
          } else if (result === 'error') {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Error processing VA ${va.slashId} (${va.name}):`,
            error instanceof Error ? error.message : String(error),
          );
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
   * Process a single virtual account: fetch balance from Slash, send alert if low.
   */
  private async processVirtualAccount(
    va: VirtualAccountDocument,
    _vaMap: Map<string, VirtualAccountDocument>,
  ): Promise<'sent' | 'skipped' | 'error'> {
    try {
      let balanceCents: number;
      try {
        const details = await this.slashApiService.getVirtualAccount(va.slashId);
        if (details?.balance?.amountCents == null) {
          this.logger.warn(`No balance in Slash response for VA ${va.slashId}. Skipping.`);
          return 'skipped';
        }
        balanceCents = Math.round(Number(details.balance.amountCents));
      } catch (apiError) {
        this.logger.warn(
          `Failed to get balance from Slash for VA ${va.slashId}: ${apiError instanceof Error ? apiError.message : String(apiError)}`,
        );
        return 'error';
      }

      if (balanceCents >= this.thresholdCents) {
        this.logger.log(
          `Balance ${balanceCents / 100} USD for VA ${va.slashId} is above threshold. Skipping.`,
        );
        return 'skipped';
      }

      const user = await this.usersService.findByVirtualAccountId(va.slashId);
      if (!user) {
        this.logger.log(`No user found for VA ${va.slashId} (${va.name}). Skipping.`);
        return 'skipped';
      }

      const userLabel = user.telegramId ?? user.telegramIds?.[0] ?? user.id;
      const destinations = this.usersService.getDestinations(user);
      if (destinations.length === 0) {
        this.logger.log(
          `User ${userLabel} has no notification destinations for VA ${va.slashId}. Skipping.`,
        );
        return 'skipped';
      }

      const alreadySent = await this.notificationsService.isBalanceAlertSent(
        user.id,
        va.slashId,
        this.cooldownHours,
      );
      if (alreadySent) {
        this.logger.log(
          `Balance alert already sent for VA ${va.slashId} within cooldown. Skipping.`,
        );
        return 'skipped';
      }

      const message = Messages.balanceAlert(va.name, balanceCents / 100);
      const results = await Promise.allSettled(
        destinations.map((dest) =>
          this.botService.sendMessage(dest.chatId, message.text, {
            parse_mode: message.parse_mode,
            ...(dest.warningThreadId != null &&
              dest.warningThreadId !== 1 && { message_thread_id: dest.warningThreadId }),
          }),
        ),
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failedCount = results.filter((r) => r.status === 'rejected').length;

      if (successCount === 0 && failedCount > 0) {
        this.logger.error(
          `Failed to send balance alert for VA ${va.slashId} to user ${userLabel}: all ${failedCount} destinations failed`,
        );
        await this.notificationsService.createNotification({
          userId: user.id,
          type: NotificationType.BALANCE_ALERT,
          status: NotificationStatus.FAILED,
          data: {
            virtualAccountId: va.slashId,
            virtualAccountName: va.name,
            balanceCents,
            thresholdCents: this.thresholdCents,
            error: `All ${failedCount} message destinations failed`,
          },
        });
        return 'error';
      }

      if (failedCount > 0) {
        this.logger.log(
          `Partial failure for VA ${va.slashId}: ${successCount} succeeded, ${failedCount} failed`,
        );
      }

      await this.notificationsService.createNotification({
        userId: user.id,
        type: NotificationType.BALANCE_ALERT,
        status: NotificationStatus.SENT,
        data: {
          virtualAccountId: va.slashId,
          virtualAccountName: va.name,
          balanceCents,
          thresholdCents: this.thresholdCents,
        },
      });

      this.logger.log(
        `Balance alert sent to user ${userLabel} for VA ${va.slashId} (${va.name}) - Balance: ${balanceCents / 100} USD`,
      );
      return 'sent';
    } catch (error) {
      this.logger.error(`Failed to process VA ${va.slashId}:`, error instanceof Error ? error.message : String(error));
      return 'error';
    }
  }
}

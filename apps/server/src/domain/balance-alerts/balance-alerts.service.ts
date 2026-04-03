import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountsService } from '../accounts/accounts.service';
import { UsersService } from '../../users/users.service';
import { BotService } from '../../bot/bot.service';
import { NotificationsService } from '../notifications/notifications.service';
import { VirtualAccountDocument } from '../../database/schemas/virtual-account.schema';
import { NotificationStatus, NotificationType } from '../../database/schemas/notification.schema';
import { Messages } from '../../bot/constants/messages.constant';
import { DailyPaymentSummariesService } from '../daily-payment-summaries/daily-payment-summaries.service';
import type { NotificationDestination } from '../../users/users.schema';

type BalanceDigestBatchEntry = {
  userId: string;
  vaSlashId: string;
  vaName: string;
  balanceCents: number;
};

/**
 * Balance Alert Service
 * Checks virtual account balances via daily_payment_summaries aggregate
 * and sends alerts when calculated balance is low.
 */
@Injectable()
export class BalanceAlertsService {
  private readonly logger = new Logger(BalanceAlertsService.name);
  private readonly cooldownHours: number;

  constructor(
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
    private readonly botService: BotService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly dailyPaymentSummariesService: DailyPaymentSummariesService,
  ) {
    this.cooldownHours = this.configService.get<number>('balanceAlert.cooldownHours', 24);
  }

  /**
   * Check all virtual accounts and send balance update notifications.
   * Reads balance from aggregated daily_payment_summaries data.
   */
  async checkAndSendAlerts(): Promise<void> {
    this.logger.log('Starting balance alert check (daily payment summaries aggregate)...');

    try {
      const virtualAccounts = await this.accountsService.findAll();
      const virtualAccountIds = virtualAccounts.map((va) => va.slashId);
      const summariesByVirtualAccountId =
        await this.dailyPaymentSummariesService.getOverallSummariesByVirtualAccountIds(
          virtualAccountIds,
        );

      this.logger.log(`Loaded ${virtualAccounts.length} virtual accounts`);

      const batches = new Map<
        string,
        { dest: NotificationDestination; entries: BalanceDigestBatchEntry[] }
      >();

      let skippedCount = 0;
      let collectErrorCount = 0;

      for (const va of virtualAccounts) {
        try {
          const balanceCents =
            summariesByVirtualAccountId.get(va.slashId)?.endingAccountBalanceCents ?? 0;
          const skipOrBucket = await this.collectVirtualAccountForDigest(
            va,
            balanceCents,
            batches,
          );
          if (skipOrBucket === 'skipped') {
            skippedCount++;
          }
        } catch (error) {
          collectErrorCount++;
          this.logger.error(
            `Error processing VA ${va.slashId} (${va.name}):`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      let sentCount = 0;
      let sendErrorCount = 0;

      for (const { dest, entries } of batches.values()) {
        if (entries.length === 0) {
          continue;
        }
        entries.sort((a, b) => a.vaName.localeCompare(b.vaName));
        const message = Messages.balanceAlertsDigest(
          entries.map((e) => ({
            vaName: e.vaName,
            balanceUsd: e.balanceCents / 100,
          })),
        );
        try {
          await this.botService.sendMessage(dest.chatId, message.text, {
            parse_mode: message.parse_mode,
            ...(dest.warningThreadId != null &&
              dest.warningThreadId !== 1 && { message_thread_id: dest.warningThreadId }),
          });
          for (const e of entries) {
            await this.notificationsService.createNotification({
              userId: e.userId,
              type: NotificationType.BALANCE_ALERT,
              status: NotificationStatus.SENT,
              data: {
                virtualAccountId: e.vaSlashId,
                virtualAccountName: e.vaName,
                balanceCents: e.balanceCents,
              },
            });
          }
          sentCount += entries.length;
          this.logger.log(
            `Balance digest sent to chat ${dest.chatId}: ${entries.length} virtual account(s)`,
          );
        } catch (error) {
          sendErrorCount += entries.length;
          const errMsg = error instanceof Error ? error.message : String(error);
          for (const e of entries) {
            await this.notificationsService.createNotification({
              userId: e.userId,
              type: NotificationType.BALANCE_ALERT,
              status: NotificationStatus.FAILED,
              data: {
                virtualAccountId: e.vaSlashId,
                virtualAccountName: e.vaName,
                balanceCents: e.balanceCents,
                error: errMsg,
              },
            });
          }
          this.logger.error(
            `Failed to send balance digest to chat ${dest.chatId}:`,
            errMsg,
          );
        }
      }

      const errorCount = collectErrorCount + sendErrorCount;
      this.logger.log(
        `Balance alert check completed: ${sentCount} VA notifications recorded, ${skippedCount} skipped, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error('Error during balance alert check:', error);
      throw error;
    }
  }

  /** Khóa gộp tin theo cùng chat + topic (khớp logic gửi Telegram). */
  private destinationBatchKey(dest: NotificationDestination): string {
    const threadPart =
      dest.warningThreadId != null && dest.warningThreadId !== 1
        ? String(dest.warningThreadId)
        : '';
    return `${dest.chatId}:${threadPart}`;
  }

  /**
   * Thu thập VA hợp lệ vào batch theo destination (một tin / destination có tiêu đề + nhiều dòng).
   */
  private async collectVirtualAccountForDigest(
    va: VirtualAccountDocument,
    balanceCents: number,
    batches: Map<
      string,
      { dest: NotificationDestination; entries: BalanceDigestBatchEntry[] }
    >,
  ): Promise<'skipped' | 'bucketed'> {
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

    const entry: BalanceDigestBatchEntry = {
      userId: user.id,
      vaSlashId: va.slashId,
      vaName: va.name,
      balanceCents,
    };

    for (const dest of destinations) {
      const key = this.destinationBatchKey(dest);
      let bucket = batches.get(key);
      if (!bucket) {
        bucket = { dest, entries: [] };
        batches.set(key, bucket);
      }
      if (bucket.entries.some((e) => e.vaSlashId === va.slashId)) {
        continue;
      }
      bucket.entries.push(entry);
    }

    return 'bucketed';
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { format, startOfDay, endOfDay } from 'date-fns';
import { AccountsService } from '../accounts/accounts.service';
import { UsersService } from '../../users/users.service';
import { BotService } from '../../bot/bot.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TransactionsService } from '../transactions/transactions.service';
import { VirtualAccountDocument } from '../../database/schemas/virtual-account.schema';
import { NotificationStatus, NotificationType } from '../../database/schemas/notification.schema';
import { Messages } from '../../bot/constants/messages.constant';
import type { TransactionWithRelations } from '../transactions/types/transaction.types';

/**
 * Card Spending Alert Service
 * Aggregates today's card spend from DB (Transactions) and sends alerts when any card exceeds threshold.
 * No longer depends on Google Sheets.
 */
@Injectable()
export class CardSpendingAlertsService {
  private readonly logger = new Logger(CardSpendingAlertsService.name);
  private readonly thresholdUsd: number;
  private readonly cooldownHours: number;

  constructor(
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
    private readonly botService: BotService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly transactionsService: TransactionsService,
  ) {
    this.thresholdUsd = this.configService.get<number>('cardSpendingAlert.thresholdUsd', 1000);
    this.cooldownHours = this.configService.get<number>('cardSpendingAlert.cooldownHours', 0);
  }

  /**
   * Check all virtual accounts and send alerts for high card spending today.
   * Data source: transactions in DB (spend = amountCents < 0, pending/settled).
   */
  async checkAndSendAlerts(): Promise<void> {
    this.logger.log('Starting card spending alert check (DB transactions)...');

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const dayStart = startOfDay(new Date());
      const dayEnd = endOfDay(new Date());

      this.logger.log(`Checking card spending for date: ${today}`);

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
          const result = await this.processVirtualAccount(va, vaMap, today, dayStart, dayEnd);
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
        `Card spending alert check completed: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error('Error during card spending alert check:', error);
      throw error;
    }
  }

  /**
   * Process a single VA: aggregate today's spend by card from DB, send alert if any card > threshold.
   */
  private async processVirtualAccount(
    va: VirtualAccountDocument,
    _vaMap: Map<string, VirtualAccountDocument>,
    today: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<'sent' | 'skipped' | 'error'> {
    try {
      const user = await this.usersService.findByVirtualAccountId(va.slashId);
      if (!user) {
        this.logger.log(`User not found for VA ${va.slashId}. Skipping.`);
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

      const alreadySent = await this.notificationsService.isCardSpendingAlertSent(
        user.id,
        va.slashId,
        today,
        this.cooldownHours,
      );
      if (alreadySent) {
        this.logger.log(
          `Card spending alert already sent for VA ${va.slashId} on ${today} within cooldown. Skipping.`,
        );
        return 'skipped';
      }

      const cardData = await this.getTodaySpendByCardFromDb(va.slashId, dayStart, dayEnd);
      if (!cardData || cardData.length === 0) {
        this.logger.log(`No card spend data for VA ${va.slashId} on ${today}. Skipping.`);
        return 'skipped';
      }

      const highSpendingCards = cardData.filter((card) => {
        const amountUsd = card.amount;
        return amountUsd !== null && amountUsd < -this.thresholdUsd;
      });

      if (highSpendingCards.length === 0) {
        this.logger.log(
          `No cards with spending > ${this.thresholdUsd} USD for VA ${va.slashId} on ${today}. Skipping.`,
        );
        return 'skipped';
      }

      const message = Messages.cardSpendingAlert(highSpendingCards, today, this.thresholdUsd);

      for (const dest of destinations) {
        const threadLabel =
          dest.warningThreadId != null && dest.warningThreadId !== 1
            ? `, threadId=${dest.warningThreadId}`
            : ' (General)';
        this.logger.log(`Sending card spending alert to chatId=${dest.chatId}${threadLabel}`);
      }

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
          `Failed to send card spending alert for VA ${va.slashId} to user ${userLabel}: all ${failedCount} destinations failed`,
        );
        await this.notificationsService.createNotification({
          userId: user.id,
          type: NotificationType.CARD_SPENDING_ALERT,
          status: NotificationStatus.FAILED,
          data: {
            virtualAccountId: va.slashId,
            virtualAccountName: va.name,
            date: today,
            cards: highSpendingCards,
            thresholdAmount: this.thresholdUsd,
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
        type: NotificationType.CARD_SPENDING_ALERT,
        status: NotificationStatus.SENT,
        data: {
          virtualAccountId: va.slashId,
          virtualAccountName: va.name,
          date: today,
          cards: highSpendingCards,
          thresholdAmount: this.thresholdUsd,
        },
      });

      this.logger.log(
        `Card spending alert sent to user ${userLabel} for VA ${va.slashId} (${va.name}) on ${today} - ${highSpendingCards.length} card(s) with spending > ${this.thresholdUsd} USD`,
      );
      return 'sent';
    } catch (error) {
      this.logger.error(
        `Error processing VA ${va.slashId}:`,
        error instanceof Error ? error.message : String(error),
      );
      return 'error';
    }
  }

  /**
   * Aggregate today's spend by card from transactions (amountCents < 0, pending/settled).
   * Returns array of { cardName, amount } with amount in USD (negative = spend).
   */
  private async getTodaySpendByCardFromDb(
    virtualAccountId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<Array<{ cardName: string; amount: number | null }>> {
    const transactions = await this.transactionsService.findAllWithFilters({
      virtualAccountId,
      startDate: dayStart.toISOString(),
      endDate: dayEnd.toISOString(),
      amountCents: { $lt: 0 },
      detailedStatus: { $in: ['pending', 'settled'] },
    });

    const byCard = new Map<string, { name: string; totalCents: number }>();

    for (const tx of transactions as TransactionWithRelations[]) {
      const cardId = tx.cardId ?? tx.card?.slashId ?? 'unknown';
      const name = tx.card?.name ?? tx.cardId ?? cardId;
      const spendCents = Math.abs(tx.amountCents ?? 0);
      const existing = byCard.get(cardId);
      if (existing) {
        existing.totalCents += spendCents;
      } else {
        byCard.set(cardId, { name, totalCents: spendCents });
      }
    }

    return Array.from(byCard.entries()).map(([, { name, totalCents }]) => ({
      cardName: name,
      amount: totalCents > 0 ? -(totalCents / 100) : null,
    }));
  }
}

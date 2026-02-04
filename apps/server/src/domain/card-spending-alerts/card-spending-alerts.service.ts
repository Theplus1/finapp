import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { format } from 'date-fns';
import { AccountsService } from '../accounts/accounts.service';
import { UsersService } from '../../users/users.service';
import { BotService } from '../../bot/bot.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GoogleSheetsService } from '../../integrations/google-sheets/services/google-sheets.service';
import { GoogleSheetReportAllService } from '../../integrations/google-sheets/services/google-sheet-report-all.service';
import { SheetName } from '../../integrations/google-sheets/constants/sheet-names.constant';
import { VirtualAccountDocument } from '../../database/schemas/virtual-account.schema';
import { NotificationStatus, NotificationType } from '../../database/schemas/notification.schema';
import { Messages } from '../../bot/constants/messages.constant';

/**
 * Card Spending Alert Service
 */
@Injectable()
export class CardSpendingAlertsService {
  private readonly logger = new Logger(CardSpendingAlertsService.name);
  private readonly thresholdAmount: number;
  private readonly cooldownHours: number;

  constructor(
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
    private readonly botService: BotService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly googleSheetReportAllService: GoogleSheetReportAllService,
  ) {
    const thresholdUsd = this.configService.get<number>('cardSpendingAlert.thresholdUsd', 1000);
    this.thresholdAmount = thresholdUsd;
    this.cooldownHours = this.configService.get<number>('cardSpendingAlert.cooldownHours', 0);
  }

  /**
   * Check all virtual accounts and send alerts for high card spending today
   * Reads data from Google Sheet Card sheet, column for today's date
   */
  async checkAndSendAlerts(): Promise<void> {
    this.logger.log('Starting card spending alert check from Google Sheets...');

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      this.logger.log(`Checking card spending for date: ${today}`);

      const sheetReports = await this.googleSheetReportAllService.findAll();

      this.logger.log(`Found ${sheetReports.length} Google Sheet reports to check`);

      const virtualAccounts = await this.accountsService.findAll();
      const vaMap = new Map<string, VirtualAccountDocument>();
      virtualAccounts.forEach((va) => {
        vaMap.set(va.slashId, va);
      });

      this.logger.log(`Loaded ${virtualAccounts.length} virtual accounts into memory`);

      let sentCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const report of sheetReports) {
        try {
          const result = await this.processSheetReport(report, vaMap, today);
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
            `Error processing sheet report for VA ${report.virtualAccountId} (sheetId: ${report.sheetId}):`,
            error,
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
   * Process a single Google Sheet report and send alert if any card has spending > threshold today
   */
  private async processSheetReport(
    report: any,
    vaMap: Map<string, VirtualAccountDocument>,
    today: string,
  ): Promise<'sent' | 'skipped' | 'error'> {
    try {
      const va = vaMap.get(report.virtualAccountId);
      if (!va) {
        this.logger.log(`Virtual account ${report.virtualAccountId} not found. Skipping.`);
        return 'skipped';
      }

      const user = await this.usersService.findByVirtualAccountId(report.virtualAccountId);
      if (!user || !user.telegramId) {
        this.logger.log(
          `User not found or no telegram ID for VA ${report.virtualAccountId}. Skipping.`,
        );
        return 'skipped';
      }

      const destinations = user.notificationChatIds;
      if (destinations.length === 0) {
        this.logger.log(
          `User ${user.telegramId} has no notification destinations for VA ${report.virtualAccountId}. Skipping alert.`,
        );
        return 'skipped';
      }

      const alreadySent = await this.notificationsService.isCardSpendingAlertSent(
        user.id,
        report.virtualAccountId,
        today,
        this.cooldownHours,
      );

      if (alreadySent) {
        this.logger.log(
          `Card spending alert already sent for VA ${report.virtualAccountId} on ${today} within cooldown period. Skipping.`,
        );
        return 'skipped';
      }

      const exists = await this.googleSheetsService.spreadsheetExists(report.sheetId);
      if (!exists) {
        this.logger.log(`Spreadsheet ${report.sheetId} does not exist. Skipping.`);
        return 'skipped';
      }

      const cardData = await this.readCardSheetData(report.sheetId, today);
      if (!cardData) {
        this.logger.log(`No data found in Card sheet for VA ${report.virtualAccountId} on ${today}. Skipping.`);
        return 'skipped';
      }

      // Filter cards with amount > threshold (value < -threshold since values are negative)
      const highSpendingCards = cardData.filter((card) => {
        const amount = card.amount;
        return amount !== null && amount < -this.thresholdAmount;
      });

      if (highSpendingCards.length === 0) {
        this.logger.log(
          `No cards with spending > ${this.thresholdAmount} found for VA ${report.virtualAccountId} on ${today}. Skipping.`,
        );
        return 'skipped';
      }

      const message = Messages.cardSpendingAlert(highSpendingCards, today, this.thresholdAmount);

      const results = await Promise.allSettled(
        destinations.map((chatId) =>
          this.botService.sendMessage(chatId, message.text, {
            parse_mode: message.parse_mode,
          }),
        ),
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failedCount = results.filter((r) => r.status === 'rejected').length;

      if (successCount === 0 && failedCount > 0) {
        this.logger.error(
          `Failed to send message for VA ${report.virtualAccountId} to user ${user.telegramId}: All ${failedCount} destinations failed`,
        );
        await this.notificationsService.createNotification({
          userId: user.id,
          type: NotificationType.CARD_SPENDING_ALERT,
          status: NotificationStatus.FAILED,
          data: {
            virtualAccountId: report.virtualAccountId,
            virtualAccountName: va.name,
            date: today,
            cards: highSpendingCards,
            thresholdAmount: this.thresholdAmount,
            sheetId: report.sheetId,
            error: `All ${failedCount} message destinations failed`,
          },
        });
        return 'error';
      } else if (failedCount > 0) {
        this.logger.log(
          `Partial failure: ${successCount} succeeded, ${failedCount} failed for VA ${report.virtualAccountId}`,
        );
      }

      const sendSuccess = true;

      if (sendSuccess) {
        await this.notificationsService.createNotification({
          userId: user.id,
          type: NotificationType.CARD_SPENDING_ALERT,
          status: NotificationStatus.SENT,
          data: {
            virtualAccountId: report.virtualAccountId,
            virtualAccountName: va.name,
            date: today,
            cards: highSpendingCards,
            thresholdAmount: this.thresholdAmount,
            sheetId: report.sheetId,
          },
        });

        this.logger.log(
          `Card spending alert sent to user ${user.telegramId} for VA ${report.virtualAccountId} (${va.name}) on ${today} - ${highSpendingCards.length} card(s) with spending > ${this.thresholdAmount}`,
        );
        return 'sent';
      }

      return 'error';
    } catch (error) {
      this.logger.error(
        `Error processing sheet report for VA ${report.virtualAccountId}:`,
        error,
      );
      return 'error';
    }
  }

  /**
   * Read Card sheet data and extract today's column
   */
  private async readCardSheetData(
    sheetId: string,
    today: string,
  ): Promise<Array<{ cardName: string; amount: number | null }> | null> {
    try {
      // Read first row to find today's column
      const headers = await this.googleSheetsService.readSheetData(sheetId, 'Card', '1:1');

      if (!headers || headers.length === 0 || !headers[0]) {
        this.logger.log(`No headers found in Card sheet for sheetId ${sheetId}`);
        return null;
      }

      // Find column index for today's date
      const headerRow = headers[0];
      let todayColumnIndex = -1;

      for (let i = 0; i < headerRow.length; i++) {
        const headerValue = headerRow[i];
        if (headerValue === today || headerValue === `'${today}`) {
          todayColumnIndex = i;
          break;
        }
      }

      if (todayColumnIndex === -1) {
        this.logger.log(`Today's date (${today}) not found in Card sheet headers for sheetId ${sheetId}`);
        return null;
      }

      // Read all data rows (from row 3 onwards, skip row 1 header and row 2 Total)
      // Read column A (card names) and today's column
      const data = await this.googleSheetsService.readSheetData(sheetId, 'Card', 'A3:Z');

      if (!data || data.length === 0) {
        this.logger.log(`No data found in Card sheet for sheetId ${sheetId}`);
        return null;
      }

      const cards: Array<{ cardName: string; amount: number | null }> = [];

      for (const row of data) {
        if (!row || row.length === 0) {
          continue;
        }

        const cardName = row[0] || '';
        const amountValue = row[todayColumnIndex];

        // Skip " Total" row or empty rows
        if (cardName.trim() === 'Total' || cardName.trim() === '' || !cardName) {
          continue;
        }

        let amount: number | null = null;

        if (amountValue === undefined || amountValue === null || amountValue === '') {
          amount = null;
        } else if (typeof amountValue === 'number') {
          amount = amountValue;
        } else if (typeof amountValue === 'string' && amountValue.trim() !== '') {
          const cleaned = amountValue.replace(/[$,\s]/g, '');
          const parsed = parseFloat(cleaned);
          if (!isNaN(parsed)) {
            amount = parsed;
          }
        }

        cards.push({ cardName, amount });
      }

      return cards;
    } catch (error) {
      this.logger.error(`Error reading Card sheet data from sheet ${sheetId}:`, error);
      return null;
    }
  }
}

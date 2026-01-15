import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly googleSheetReportAllService: GoogleSheetReportAllService,
  ) {
    const thresholdUsd = this.configService.get<number>('balanceAlert.thresholdUsd', 5000);
    this.thresholdCents = thresholdUsd * 100; // Convert USD to cents
    this.cooldownHours = this.configService.get<number>('balanceAlert.cooldownHours', 24);
  }

  /**
   * Check all virtual accounts and send alerts for low balances
   * Reads balance from Google Sheet Payment sheet, cell E2
   */
  async checkAndSendAlerts(): Promise<void> {
    this.logger.log('Starting balance alert check from Google Sheets...');

    try {
      // Get all Google Sheet Report All records
      const sheetReports = await this.googleSheetReportAllService.findAll();

      this.logger.log(`Found ${sheetReports.length} Google Sheet reports to check`);

      // Get all virtual accounts at once to avoid N+1 queries
      const virtualAccounts = await this.accountsService.findAll();
      const vaMap = new Map<string, VirtualAccountDocument>();
      virtualAccounts.forEach((va) => {
        vaMap.set(va.slashId, va);
      });

      this.logger.log(`Loaded ${virtualAccounts.length} virtual accounts into memory`);

      // Process each sheet report
      let sentCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const report of sheetReports) {
        try {
          const result = await this.processSheetReport(report, vaMap);
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
        `Balance alert check completed: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error('Error during balance alert check:', error);
      throw error;
    }
  }

  /**
   * Process a single Google Sheet report and send alert if balance is low
   * @returns 'sent' if alert was sent, 'skipped' if skipped, 'error' if error occurred
   */
  private async processSheetReport(
    report: any,
    vaMap: Map<string, VirtualAccountDocument>,
  ): Promise<'sent' | 'skipped' | 'error'> {
    try {
      // Read balance from Google Sheet Payment sheet, cell E2
      const balanceResult = await this.readBalanceFromSheet(report.sheetId);

      if (balanceResult === null) {
        this.logger.error(
          `Could not read balance from sheet ${report.sheetId} for VA ${report.virtualAccountId}. This is an error.`,
        );
        return 'error';
      }

      const balanceCents = Math.round(balanceResult * 100);

      // Check if balance is below threshold
      if (balanceCents >= this.thresholdCents || balanceCents <= 0) {
        this.logger.debug(
          `Balance ${balanceCents / 100} USD for VA ${report.virtualAccountId} is above threshold. Skipping.`,
        );
        return 'skipped';
      }

      const va = vaMap.get(report.virtualAccountId);
      if (!va) {
        this.logger.warn(
          `Virtual account ${report.virtualAccountId} not found in map. Skipping alert.`,
        );
        return 'skipped';
      }

      const user = await this.usersService.findByVirtualAccountId(report.virtualAccountId);

      if (!user || !user.telegramId) {
        this.logger.warn(
          `No user found for virtual account ${report.virtualAccountId} (${va.name}). Skipping alert.`,
        );
        return 'skipped';
      }

      // Check if user has notification destinations
      const destinations = user.notificationChatIds || [];
      if (destinations.length === 0) {
        this.logger.warn(
          `User ${user.telegramId} has no notification destinations for VA ${report.virtualAccountId}. Skipping alert.`,
        );
        return 'skipped';
      }

      // Check cooldown
      const alreadySent = await this.notificationsService.isBalanceAlertSent(
        user.id,
        report.virtualAccountId,
        this.cooldownHours,
      );

      if (alreadySent) {
        this.logger.debug(
          `Balance alert already sent for VA ${report.virtualAccountId} within cooldown period. Skipping.`,
        );
        return 'skipped';
      }

      const thresholdUsd = this.thresholdCents / 100;
      const message = Messages.balanceAlert(va.name, thresholdUsd);
      
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
          type: NotificationType.BALANCE_ALERT,
          status: NotificationStatus.FAILED,
          data: {
            virtualAccountId: report.virtualAccountId,
            virtualAccountName: va.name,
            balanceCents,
            thresholdCents: this.thresholdCents,
            sheetId: report.sheetId,
            error: `All ${failedCount} message destinations failed`,
          },
        });
        return 'error';
      } else if (failedCount > 0) {
        this.logger.warn(
          `Partial failure: ${successCount} succeeded, ${failedCount} failed for VA ${report.virtualAccountId}`,
        );
      }

      const sendSuccess = true;

      if (sendSuccess) {
        await this.notificationsService.createNotification({
          userId: user.id,
          type: NotificationType.BALANCE_ALERT,
          status: NotificationStatus.SENT,
          data: {
            virtualAccountId: report.virtualAccountId,
            virtualAccountName: va.name,
            balanceCents,
            thresholdCents: this.thresholdCents,
            sheetId: report.sheetId,
          },
        });

        this.logger.log(
          `Balance alert sent to user ${user.telegramId} for VA ${report.virtualAccountId} (${va.name}) - Balance: ${balanceCents / 100} USD`,
        );
        return 'sent';
      } else {
        await this.notificationsService.createNotification({
          userId: user.id,
          type: NotificationType.BALANCE_ALERT,
          status: NotificationStatus.FAILED,
          data: {
            virtualAccountId: report.virtualAccountId,
            virtualAccountName: va.name,
            balanceCents,
            thresholdCents: this.thresholdCents,
            sheetId: report.sheetId,
            error: 'Failed to send message',
          },
        });
        return 'error';
      }
    } catch (error) {
      this.logger.error(
        `Failed to process sheet report for VA ${report.virtualAccountId}:`,
        error,
      );

      try {
        const user = await this.usersService.findByVirtualAccountId(report.virtualAccountId);
        if (user) {
          await this.notificationsService.createNotification({
            userId: user.id,
            type: NotificationType.BALANCE_ALERT,
            status: NotificationStatus.FAILED,
            data: {
              virtualAccountId: report.virtualAccountId,
              balanceCents: 0,
              thresholdCents: this.thresholdCents,
              sheetId: report.sheetId,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      } catch (notificationError) {
        this.logger.error('Failed to save notification record:', notificationError);
      }

      return 'error';
    }
  }

  /**
   * Read balance from Google Sheet Payment sheet, cell E2
   * @param sheetId - Google Spreadsheet ID
   * @returns Balance in USD (number) or null if error
   */
  private async readBalanceFromSheet(sheetId: string): Promise<number | null> {
    try {
      // Read cell E2 from Payment sheet
      const range = 'E2';
      const data = await this.googleSheetsService.readSheetData(
        sheetId,
        SheetName.PAYMENT,
        range,
      );

      if (!data || data.length === 0 || !data[0] || data[0].length === 0) {
        this.logger.warn(`No data found in cell E2 of Payment sheet for sheetId ${sheetId}`);
        return null;
      }

      const cellValue = data[0][0];
      if (cellValue === undefined || cellValue === null || cellValue === '') {
        this.logger.warn(`Cell E2 is empty for sheetId ${sheetId}`);
        return null;
      }

      let balance: number;
      if (typeof cellValue === 'number') {
        balance = cellValue;
      } else if (typeof cellValue === 'string') {
        // Remove currency symbols and commas, then parse
        const cleaned = cellValue.replace(/[$,\s]/g, '');
        balance = parseFloat(cleaned);
        if (isNaN(balance)) {
          this.logger.warn(`Could not parse balance value "${cellValue}" from sheetId ${sheetId}`);
          return null;
        }
      } else {
        this.logger.warn(`Unexpected balance value type: ${typeof cellValue} for sheetId ${sheetId}`);
        return null;
      }

      return balance;
    } catch (error) {
      this.logger.error(`Error reading balance from sheet ${sheetId}:`, error);
      return null;
    }
  }
}



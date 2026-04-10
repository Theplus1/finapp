import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VirtualAccountRepository } from '../../database/repositories/virtual-account.repository';
import { SlashApiService } from '../../integrations/slash/services/slash-api.service';
import { BotService } from '../../bot/bot.service';

/**
 * Slash Balance Alerts Service
 *
 * Checks real-time balance from Slash API for VAs that have
 * `balanceAlertEnabled = true`, and sends Telegram alert if balance
 * drops below the threshold. Uses a cooldown to prevent spam.
 */
@Injectable()
export class SlashBalanceAlertsService {
  private readonly logger = new Logger(SlashBalanceAlertsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly virtualAccountRepository: VirtualAccountRepository,
    private readonly slashApiService: SlashApiService,
    private readonly botService: BotService,
  ) {}

  async checkAndAlert(): Promise<void> {
    const chatId = this.configService.get<number>('slashBalanceAlert.chatId', 0);
    const defaultThresholdUsd = this.configService.get<number>(
      'slashBalanceAlert.thresholdUsd',
      10000,
    );
    const cooldownMinutes = this.configService.get<number>(
      'slashBalanceAlert.cooldownMinutes',
      30,
    );

    if (!chatId) {
      this.logger.warn(
        'SLASH_BALANCE_ALERT_CHAT_ID not configured, skipping balance alert',
      );
      return;
    }

    // Find all VAs with alert enabled
    const enabledVAs = await this.virtualAccountRepository.find({
      filter: { balanceAlertEnabled: true, isDeleted: { $ne: true } },
    });

    if (enabledVAs.length === 0) {
      this.logger.log('No VAs have balance alert enabled, skipping');
      return;
    }

    this.logger.log(`Checking balance for ${enabledVAs.length} VAs`);

    const cooldownMs = cooldownMinutes * 60 * 1000;
    const now = Date.now();

    const belowThreshold: Array<{
      name: string;
      balanceCents: number;
      thresholdUsd: number;
    }> = [];
    const vasToUpdate: string[] = [];

    for (const va of enabledVAs) {
      try {
        // Get fresh balance from Slash API
        const res = await this.slashApiService.getVirtualAccount(va.slashId);
        const balanceCents = res?.balance?.amountCents ?? 0;

        // Use per-VA threshold, fallback to default
        const thresholdUsd = va.balanceAlertThresholdUsd ?? defaultThresholdUsd;
        const thresholdCents = thresholdUsd * 100;

        if (balanceCents >= thresholdCents) {
          continue; // Balance OK, no alert
        }

        // Check cooldown
        const lastAlertAt = va.lastBalanceAlertAt
          ? new Date(va.lastBalanceAlertAt).getTime()
          : 0;
        if (lastAlertAt && now - lastAlertAt < cooldownMs) {
          this.logger.log(
            `VA ${va.name} alert skipped (cooldown): balance=$${(balanceCents / 100).toFixed(2)}`,
          );
          continue;
        }

        belowThreshold.push({ name: va.name, balanceCents, thresholdUsd });
        vasToUpdate.push(va.slashId);
      } catch (error) {
        this.logger.error(
          `Failed to get balance for VA ${va.slashId} (${va.name}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    if (belowThreshold.length === 0) {
      this.logger.log('All enabled VAs have sufficient balance');
      return;
    }

    // Build message: "VA : Balance (< threshold)" per line
    const lines = belowThreshold
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        (v) =>
          `${this.escapeMarkdown(v.name)} : $${(v.balanceCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} _(ngưỡng: $${v.thresholdUsd.toLocaleString('en-US')})_`,
      );
    const header = `⚠️ *Số dư Slash thấp*`;
    const message = `${header}\n\n${lines.join('\n')}`;

    try {
      await this.botService.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      this.logger.log(
        `Balance alert sent to chat ${chatId}: ${belowThreshold.length} VA(s)`,
      );

      // Update lastBalanceAlertAt for each alerted VA
      const alertTime = new Date();
      for (const slashId of vasToUpdate) {
        await this.virtualAccountRepository.upsert(slashId, {
          lastBalanceAlertAt: alertTime,
        } as any);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send balance alert to chat ${chatId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }
}

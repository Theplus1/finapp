import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SlashApiService } from 'src/integrations/slash/services/slash-api.service';
import { CardsService } from 'src/domain/cards/cards.service';
import { Messages } from 'src/bot/constants/messages.constant';
import { Keyboards } from 'src/bot/constants/keyboards.constant';
import { CardDto, CardStatus } from 'src/integrations/slash/dto/card.dto';
import { HtmlUtil } from 'src/shared/utils/html.util';
import { BotContext } from 'src/bot/interfaces/bot-context.interface';
import { ExportType } from 'src/database/schemas/export-job.schema';
import { ExportsService } from 'src/domain/exports/exports.service';
import { User } from '@telegraf/types';
import { SessionSteps } from 'src/bot/constants/session-steps.constant';

@Injectable()
export class CardsHandler {

  private readonly logger = new Logger(CardsHandler.name);

  constructor(
    private readonly slashApiService: SlashApiService,
    private readonly cardsService: CardsService,
    private readonly exportsService: ExportsService,
    private readonly configService: ConfigService,
  ) { }

  async handleCardMenu(ctx: BotContext) {
    try {
      await ctx.sendChatAction('typing');
      await ctx.reply(Messages.cardsMenu, {
        parse_mode: 'Markdown',
        ...Keyboards.cardsMenu(),
      });
    } catch (error) {
      await ctx.reply('❌ Error fetching cards. Please try again later.');
    }
  }

  async handleCardLock(ctx: BotContext, cardId: string) {
    const userData = ctx.userData!;

    try {
      const card = await this.verifyCardOwnership(ctx, cardId, userData.virtualAccountId!);
      if (!card) return;

      // Check if card is already paused
      if (card.status === CardStatus.PAUSED) {
        await ctx.reply('Card is already locked');
        return;
      }

      // Update card status to paused (locked)
      await this.slashApiService.updateCard(cardId, { status: CardStatus.PAUSED });

      await ctx.reply('Card locked successfully');
      await ctx.reply(
        `🔒 <b>Card Locked</b>\n\n` +
        `Card <b>${HtmlUtil.escape(card.name)}</b> (••••${card.last4}) has been locked.\n\n` +
        `The card cannot be used for transactions until unlocked.\n` +
        `Người thực hiện: ${HtmlUtil.escape(ctx.from!.username || String(ctx.from!.id))}`,
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      this.logger.error(`Error locking card ${cardId}:`, error);
      await ctx.reply(`❌ Error locking card ${cardId}. Please try again later.`);
    }
  }

  async handleCardUnlock(ctx: BotContext, cardId: string) {
    const userData = ctx.userData!;

    try {
      const card = await this.verifyCardOwnership(ctx, cardId, userData.virtualAccountId!);
      if (!card) return;

      // Check if card is already active
      if (card.status === CardStatus.ACTIVE) {
        await ctx.reply('Card is already active');
        return;
      }

      // Check if card is closed (cannot be unlocked)
      if (card.status === CardStatus.CLOSED) {
        await ctx.reply('Cannot unlock a closed card');
        return;
      }

      // Update card status to active (unlocked)
      await this.slashApiService.updateCard(cardId, { status: CardStatus.ACTIVE });

      await ctx.reply('Card unlocked successfully');
      await ctx.reply(
        `✅ <b>Card Unlocked</b>\n\n` +
        `Card <b>${HtmlUtil.escape(card.name)}</b> (••••${card.last4}) has been unlocked.\n\n` +
        `The card can now be used for transactions.\n` +
        `Người thực hiện: ${HtmlUtil.escape(ctx.from!.username || String(ctx.from!.id))}`,
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      this.logger.error(`Error unlocking card ${cardId}:`, error);
      await ctx.reply('Error unlocking card');
      await ctx.reply('❌ Error unlocking card. Please try again later.');
    }
  }

  async handleSetDailyLimitCardIdInput(ctx: BotContext, rawCardId: string) {
    const userData = ctx.userData;
    if (!userData?.virtualAccountId) {
      await ctx.reply(Messages.accountNotLinked);
      ctx.session = undefined;
      return;
    }

    const cardId = rawCardId.trim();

    try {
      const card = await this.verifyCardOwnership(ctx, cardId, userData.virtualAccountId);
      if (!card) {
        // verifyCardOwnership đã gửi message lỗi phù hợp
        ctx.session = undefined;
        return;
      }

    ctx.session = {
      step: SessionSteps.AWAITING_SET_LIMIT_PRESET,
      data: {
        cardId: card.id,
        cardName: card.name,
        last4: card.last4,
      },
    };

      await ctx.reply(Messages.cardLimitPresetPrompt(card.name, card.last4), {
        parse_mode: 'Markdown',
        ...Keyboards.limitPresetSelect(),
      });
    } catch (error) {
      this.logger.error(`Error preparing limit for card ${cardId}:`, error);
      ctx.session = undefined;
      await ctx.reply(Messages.errorFetchingCards);
    }
  }

  /** Gọi khi user bấm chọn loại limit (Daily / Weekly / ...). Chuyển sang bước nhập số tiền. */
  async handleLimitPresetSelected(
    ctx: BotContext,
    preset: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'collective',
  ) {
    if (!ctx.session?.data) {
      ctx.session = undefined;
      await ctx.reply(Messages.errorGeneric);
      return;
    }

    const data = ctx.session.data as {
      cardId?: string;
      cardName?: string;
      last4?: string;
    };
    if (!data.cardId || !data.cardName || !data.last4) {
      ctx.session = undefined;
      await ctx.reply(Messages.errorGeneric);
      return;
    }

    ctx.session = {
      step: SessionSteps.AWAITING_SET_LIMIT_AMOUNT,
      data: {
        ...data,
        preset,
      },
    };

    const presetLabel =
      Messages.limitPresetLabels[preset] ?? preset;
    await ctx.reply(
      Messages.cardDailyLimitAmountPrompt(
        data.cardName,
        data.last4,
        presetLabel,
      ),
      {
        parse_mode: 'Markdown',
        reply_markup: { force_reply: true, selective: true },
      },
    );
  }

  async handleSetDailyLimitAmountInput(ctx: BotContext, rawAmount: string) {
    if (!ctx.session?.data) {
      ctx.session = undefined;
      await ctx.reply(Messages.errorGeneric);
      return;
    }

    const { cardId, cardName, last4, preset } = ctx.session.data as {
      cardId?: string;
      cardName?: string;
      last4?: string;
      preset?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'collective';
    };

    if (!cardId || !cardName || !last4) {
      this.logger.warn('Session data for limit is incomplete');
      ctx.session = undefined;
      await ctx.reply(Messages.errorGeneric);
      return;
    }

    const interval = preset ?? 'daily';

    const trimmed = rawAmount.trim();
    const parsed = Number(trimmed.replace(/,/g, ''));

    if (!Number.isFinite(parsed) || parsed <= 0) {
      await ctx.reply(Messages.cardDailyLimitInvalidAmount, {
        parse_mode: 'Markdown',
        reply_markup: { force_reply: true, selective: true },
      });
      return;
    }

    const amount = parsed;
    const amountCents = Math.round(amount * 100);

    try {
      const spendingConstraint = {
        spendingRule: {
          utilizationLimit: {
            limitAmount: { amountCents },
            preset: interval,
          },
        },
      };
      this.logger.log(
        `[Bot] Setting limit: cardId=${cardId}, amount=${amount} USD, interval=${interval}, amountCents=${amountCents}`,
      );
      await this.slashApiService.updateCardSpendingConstraint(cardId, spendingConstraint);

      ctx.session = undefined;

      const presetLabel = Messages.limitPresetLabels[interval] ?? interval;
      await ctx.reply(
        Messages.cardLimitSuccess(cardName, last4, amount, presetLabel),
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      const err = error as Error & { getResponse?: () => unknown; getStatus?: () => number; response?: { status?: number; data?: unknown } };
      const status = typeof err.getStatus === 'function' ? err.getStatus() : err.response?.status;
      const body = typeof err.getResponse === 'function' ? err.getResponse() : err.response?.data;
      this.logger.error(
        `[Bot] Error setting limit: cardId=${cardId}, amount=${amount}, interval=${interval}, message=${err.message}, status=${status}, response=${JSON.stringify(body ?? null)}`,
      );
      this.logger.debug(err.stack);
      ctx.session = undefined;
      await ctx.reply(Messages.errorGeneric);
    }
  }

  async handleUnsetDailyLimitCardIdInput(ctx: BotContext, rawCardId: string) {
    const userData = ctx.userData;
    if (!userData?.virtualAccountId) {
      await ctx.reply(Messages.accountNotLinked);
      ctx.session = undefined;
      return;
    }

    const cardId = rawCardId.trim();

    try {
      const card = await this.verifyCardOwnership(
        ctx,
        cardId,
        userData.virtualAccountId,
      );
      if (!card) {
        ctx.session = undefined;
        return;
      }

      // Nếu card không có spendingConstraint tại local, vẫn cứ gọi unset nhưng báo info rõ ràng cho user.
      const hasConstraint = !!card.spendingConstraint;

      this.logger.log(`[Bot] Unsetting limit: cardId=${card.id}`);
      await this.slashApiService.updateCardSpendingConstraint(card.id, null);

      ctx.session = undefined;

      if (hasConstraint) {
        await ctx.reply(
          Messages.cardDailyLimitUnsetSuccess(card.name, card.last4),
          { parse_mode: 'Markdown' },
        );
      } else {
        await ctx.reply(
          Messages.cardDailyLimitUnsetNoConstraint(card.name, card.last4),
          { parse_mode: 'Markdown' },
        );
      }
    } catch (error) {
      const err = error as Error & { getResponse?: () => unknown; getStatus?: () => number; response?: { status?: number; data?: unknown } };
      const status = typeof err.getStatus === 'function' ? err.getStatus() : err.response?.status;
      const body = typeof err.getResponse === 'function' ? err.getResponse() : err.response?.data;
      this.logger.error(
        `[Bot] Error unsetting limit: cardId=${cardId}, message=${err.message}, status=${status}, response=${JSON.stringify(body ?? null)}`,
      );
      this.logger.debug(err.stack);
      ctx.session = undefined;
      await ctx.reply(Messages.errorGeneric);
    }
  }

  async handleSetRecurringOnlyModifierCardIdInput(ctx: BotContext, rawCardId: string) {
    const userData = ctx.userData;
    if (!userData?.virtualAccountId) {
      await ctx.reply(Messages.accountNotLinked);
      ctx.session = undefined;
      return;
    }

    const cardId = rawCardId.trim();

    try {
      const card = await this.verifyCardOwnership(
        ctx,
        cardId,
        userData.virtualAccountId,
      );
      if (!card) {
        ctx.session = undefined;
        return;
      }

      const modifiers = await this.slashApiService.getCardModifiers(card.id);
      const existing = modifiers.find(
        (modifier) => modifier.name === 'only_allow_recurring_payments',
      );

      if (existing?.value === true) {
        ctx.session = undefined;
        await ctx.reply(
          Messages.cardModifierAlreadyEnabled(card.name, card.last4),
          { parse_mode: 'Markdown' },
        );
        return;
      }

      await this.slashApiService.setCardModifier(card.id, {
        name: 'only_allow_recurring_payments',
        value: true,
      });

      ctx.session = undefined;
      await ctx.reply(
        Messages.cardModifierSetRecurringOnlySuccess(card.name, card.last4),
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      this.logger.error(
        `[Bot] Error setting recurring-only modifier for card ${cardId}:`,
        error,
      );
      ctx.session = undefined;
      await ctx.reply(Messages.errorGeneric);
    }
  }

  async handleUnsetRecurringOnlyModifierCardIdInput(ctx: BotContext, rawCardId: string) {
    const userData = ctx.userData;
    if (!userData?.virtualAccountId) {
      await ctx.reply(Messages.accountNotLinked);
      ctx.session = undefined;
      return;
    }

    const cardId = rawCardId.trim();

    try {
      const card = await this.verifyCardOwnership(
        ctx,
        cardId,
        userData.virtualAccountId,
      );
      if (!card) {
        ctx.session = undefined;
        return;
      }

      const modifiers = await this.slashApiService.getCardModifiers(card.id);
      const existing = modifiers.find(
        (modifier) => modifier.name === 'only_allow_recurring_payments',
      );

      if (!existing || existing.value === false) {
        ctx.session = undefined;
        await ctx.reply(
          Messages.cardModifierAlreadyDisabled(card.name, card.last4),
          { parse_mode: 'Markdown' },
        );
        return;
      }

      await this.slashApiService.setCardModifier(card.id, {
        name: 'only_allow_recurring_payments',
        value: false,
      });

      ctx.session = undefined;
      await ctx.reply(
        Messages.cardModifierUnsetRecurringOnlySuccess(card.name, card.last4),
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      this.logger.error(
        `[Bot] Error unsetting recurring-only modifier for card ${cardId}:`,
        error,
      );
      ctx.session = undefined;
      await ctx.reply(Messages.errorGeneric);
    }
  }

  async exportCardsList(ctx: BotContext) {
    try {
      await ctx.reply(
        '⏳ *Generating your export...*\n\n' +
        'This may take a moment. You\'ll receive a download link when it\'s ready.',
        { parse_mode: 'Markdown' },
      );

      // Create async export job
      const exportJob = await this.exportsService.createExport(
        ctx.from!.id,
        ctx.chat!.id,
        {
          type: ExportType.CARDS,
          filters: {
            virtualAccountId: ctx.userData!.virtualAccountId,
          },
        },
      );

      this.logger.log(`Export job ${exportJob.id} created for user ${ctx.from!.id}`);
    } catch (err) {
      this.logger.error('Failed to create export job', err as any);
      await ctx.reply(Messages.errorFetchingTransactions);
    }
  }

  async handleCardDetail(ctx: BotContext, cardId: string) {
    try {
      this.logger.log(`Fetching card details for card ${cardId}`);
      const card = await this.slashApiService.getCardDecrypted(cardId, true, true);

      // Verify the card belongs to the user's virtual account
      if (card.virtualAccountId !== ctx.userData!.virtualAccountId) {
        this.logger.warn(`Card ${cardId} does not belong to user ${ctx.userData!.virtualAccountId}`);
        await ctx.reply(Messages.cardNotFound);
        // Clear session after error response
        ctx.session = undefined;
        return;
      }

      const cardDetail = this.formatCardDetail(card, ctx.from!);
      const sentMessage = await ctx.reply(cardDetail, {
        parse_mode: 'HTML',
        ...Keyboards.cardDetail(cardId, card.status === CardStatus.ACTIVE),
      });

      // Clear session after successful response
      ctx.session = undefined;
      this.logger.log(`Card details sent successfully for card ${cardId}`);
    } catch (error) {
      this.logger.error(`Error fetching card details for card ${cardId}:`, error);
      
      // Clear session on error to prevent stuck state
      ctx.session = undefined;
      
      // Provide more specific error message
      if (error.response?.status === 404) {
        await ctx.reply(Messages.cardNotFound);
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        await ctx.reply('❌ Request timed out. Please try again later.');
      } else {
        await ctx.reply(Messages.errorFetchingCards);
      }
    }
  }
  private formatCardDetail(card: CardDto, userInfo: User): string {
    let message = `💳 <b>Lấy thông tin mã CVV thẻ</b>\n\n`;
    message += `Thẻ ${HtmlUtil.escape(card.name)} (••••${HtmlUtil.escape(card.last4)})\n`;
    message += `Exp Date: ${card.expiryMonth}-${card.expiryYear}\n`;
    if (card.cvv) {
      message += `CVV: <tg-spoiler>${HtmlUtil.escape(card.cvv)}</tg-spoiler>\n`;
    }
    message += `Người thực hiện: ${ HtmlUtil.escape(userInfo.username || String(userInfo.id))}\n`;
    return message;
  }

  private getStatusEmoji(status: CardStatus): string {
    switch (status) {
      case CardStatus.ACTIVE:
        return '✅';
      case CardStatus.PAUSED:
        return '⏸️';
      case CardStatus.INACTIVE:
        return '⏹️';
      case CardStatus.CLOSED:
        return '❌';
      default:
        return '❓';
    }
  }

  private async verifyCardOwnership(
    ctx: BotContext,
    cardId: string,
    virtualAccountId: string,
  ): Promise<CardDto | null> {
    const card = await this.slashApiService.getCard(cardId, false, false);

    if (card.virtualAccountId !== virtualAccountId) {
      await ctx.reply(Messages.cardNotFound);
      return null;
    }

    return card;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SlashApiService } from 'src/integrations/slash/services/slash-api.service';
import { CardsService } from 'src/domain/cards/cards.service';
import { Messages } from 'src/bot/constants/messages.constant';
import { Keyboards } from 'src/bot/constants/keyboards.constant';
import { CardDto, CardStatus } from 'src/integrations/slash/dto/card.dto';
import { MarkdownUtil } from 'src/shared/utils/markdown.util';
import { HtmlUtil } from 'src/shared/utils/html.util';
import { BotContext } from 'src/bot/interfaces/bot-context.interface';
import { ExportType } from 'src/database/schemas/export-job.schema';
import { ExportsService } from 'src/domain/exports/exports.service';
import { User } from '@telegraf/types';

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
    let message = `💳 *Lấy thông tin mã CVV thẻ*\n\n`;
    message += `Thẻ ${MarkdownUtil.escapse(card.name)} \\(•${card.last4}\\)\n`;
    message += `Exp Date: ${card.expiryMonth}\\-${card.expiryYear}\n`;
     if (card.cvv) {
      message += `CVV: ||${MarkdownUtil.escapse(card.cvv)}||\n`;
    }
    message += `Người thực hiện: ${MarkdownUtil.escapse(userInfo.username || String(userInfo.id))}\n`;

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

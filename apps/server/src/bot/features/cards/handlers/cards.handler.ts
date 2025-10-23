import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SlashApiService } from 'src/integrations/slash/services/slash-api.service';
import { CardsService } from 'src/domain/cards/cards.service';
import { Messages } from 'src/bot/constants/messages.constant';
import { Keyboards } from 'src/bot/constants/keyboards.constant';
import { CardDto, CardStatus } from 'src/integrations/slash/dto/card.dto';
import { MarkdownUtil } from 'src/shared/utils/markdown.util';
import { BotContext } from 'src/bot/interfaces/bot-context.interface';
import { ExportType } from 'src/database/schemas/export-job.schema';
import { ExportsService } from 'src/domain/exports/exports.service';

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
        await ctx.answerCbQuery('Card is already locked');
        return;
      }

      // Update card status to paused (locked)
      await this.slashApiService.updateCard(cardId, { status: CardStatus.PAUSED });

      await ctx.answerCbQuery('Card locked successfully');
      await ctx.reply(
        `🔒 *Card Locked*\n\n` +
        `Card *${card.name}* (••••${card.last4}) has been locked.\n\n` +
        `The card cannot be used for transactions until unlocked.`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      this.logger.error(`Error locking card ${cardId}:`, error);
      await ctx.answerCbQuery('Error locking card');
      await ctx.reply('❌ Error locking card. Please try again later.');
    }
  }

  async handleCardUnlock(ctx: BotContext, cardId: string) {
    const userData = ctx.userData!;

    try {
      const card = await this.verifyCardOwnership(ctx, cardId, userData.virtualAccountId!);
      if (!card) return;

      // Check if card is already active
      if (card.status === CardStatus.ACTIVE) {
        await ctx.answerCbQuery('Card is already unlocked');
        return;
      }

      // Check if card is closed (cannot be unlocked)
      if (card.status === CardStatus.CLOSED) {
        await ctx.answerCbQuery('Cannot unlock a closed card');
        return;
      }

      // Update card status to active (unlocked)
      await this.slashApiService.updateCard(cardId, { status: CardStatus.ACTIVE });

      await ctx.answerCbQuery('Card unlocked successfully');
      await ctx.reply(
        `✅ *Card Unlocked*\n\n` +
        `Card *${card.name}* (••••${card.last4}) has been unlocked.\n\n` +
        `The card can now be used for transactions.`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      this.logger.error(`Error unlocking card ${cardId}:`, error);
      await ctx.answerCbQuery('Error unlocking card');
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
      const card = await this.slashApiService.getCard(cardId, false, true);

      // Verify the card belongs to the user's virtual account
      if (card.virtualAccountId !== ctx.userData!.virtualAccountId) {
        await ctx.reply(Messages.cardNotFound);
        return;
      }

      const cardDetailTimeout = this.configService.get<number>('cardDetailTimeout', 60000);
      const cardDetail = this.formatCardDetail(card, cardDetailTimeout);
      const sentMessage = await ctx.reply(cardDetail, {
        parse_mode: 'MarkdownV2',
        ...Keyboards.cardDetail(cardId, card.status === CardStatus.ACTIVE),
      });

      setTimeout(async () => {
        try {
          await ctx.deleteMessage(sentMessage.message_id);
          this.logger.debug(`Auto-deleted card detail message for card ${cardId}`);
        } catch (error) {
          // Message might already be deleted by user or bot lacks permission
          this.logger.debug(`Could not auto-delete message for card ${cardId}:`, error);
        }
      }, cardDetailTimeout);
    } catch (error) {
      this.logger.error(`Error fetching card details for card ${cardId}:`, error);
      await ctx.reply(Messages.errorFetchingCards);
    }
  }
  private formatCardDetail(card: CardDto, detailTimeout: number): string {
    const statusEmoji = this.getStatusEmoji(card.status);
    const cardType = card.isPhysical ? '💳 Physical Card' : '🌐 Virtual Card';
    const singleUse = card.isSingleUse ? ' (Single Use)' : '';

    let message = `💳 *Card Details*\n\n`;
    message += `*${MarkdownUtil.escapse(card.name)}*\n`;
    message += `${cardType}${singleUse}\n\n`;

    message += `📋 *Information*\n`;
    message += `Card Number: •••• ${card.last4}\n`;
    if (card.cvv) {
      message += `CVV: ||${MarkdownUtil.escapse(card.cvv)}||\n`;
    }
    message += `Expiry: ${card.expiryMonth}\\-${card.expiryYear}\n`;
    message += `Status: ${statusEmoji} ${MarkdownUtil.escapse(card.status)}\n`;

    if (card.spendingConstraint) {
      message += `\n💰 *Spending Limits*\n`;

      // The API returns a complex nested structure for spending constraints
      message += `Spending limits configured\n`;
    }

    const createdDate = new Date(card.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    message += `\n📅 Created: ${MarkdownUtil.escapse(createdDate)}`;
    message += `\n\n *Card detail will be removed after ${detailTimeout / 60000} min for security*`;
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

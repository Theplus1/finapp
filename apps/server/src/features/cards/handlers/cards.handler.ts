import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../../users/users.service';
import { SlashService } from '../../../slash/slash.service';
import { Messages } from '../../../bot/constants/messages.constant';
import { Keyboards } from '../../../bot/constants/keyboards.constant';
import { CardDto } from '../../../slash/dto/card.dto';
import { MarkdownUtil } from 'src/shared/utils/markdown.util';
import { BotContext } from '../../../bot/interfaces/bot-context.interface';
import { ValidateUser } from '../../../shared/decorators/validate-user.decorator';

@Injectable()
export class CardsHandler {
  private readonly logger = new Logger(CardsHandler.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly slashService: SlashService,
    private readonly configService: ConfigService,
  ) {}

  @ValidateUser({ requireAccount: true })
  async handleListCards(ctx: BotContext, cursor?: string) {
    const userData = ctx.userData!;

    try {
      const response = await this.slashService.listCards({
        filter: {
          virtualAccountId: userData.virtualAccountId,
        },
        cursor: cursor,
      });

      if (!response.items || response.items.length === 0) {
        if (cursor) {
          await ctx.answerCbQuery('No more cards found');
        } else {
          await ctx.reply(Messages.noCardsFound);
        }
        return;
      }

      const cardsList = this.formatCardsList(response.items, response.metadata.count, cursor, response.metadata.nextCursor);
      
      if (response.metadata.nextCursor) {
        if (!ctx.session) {
          ctx.session = { data: {} };
        }
        if (!ctx.session.data) {
          ctx.session.data = {};
        }
        ctx.session.data.nextCursor = response.metadata.nextCursor;
      }
      
      if (cursor && ctx.callbackQuery && 'message' in ctx.callbackQuery) {
        try {
          await ctx.editMessageText(cardsList, {
            parse_mode: 'Markdown',
            ...Keyboards.cardsList(response.items, cursor, response.metadata.nextCursor),
          });
          await ctx.answerCbQuery();
        } catch (editError) {
          await ctx.answerCbQuery();
        }
      } else {
        await ctx.reply(cardsList, {
          parse_mode: 'Markdown',
          ...Keyboards.cardsList(response.items, cursor, response.metadata.nextCursor),
        });
      }
    } catch (error) {
      this.logger.error(`Error fetching cards for user ${ctx.from?.id}:`, error);
      if (cursor) {
        try {
          await ctx.answerCbQuery('Error loading cards');
        } catch (e) {
        }
      } else {
        await ctx.reply(Messages.errorFetchingCards);
      }
    }
  }
  
  private formatCardsList(cards: CardDto[], count: number, currentCursor?: string, nextCursor?: string): string {
    let message = `💳 *Your Cards (${count})*\n\n`;

    cards.forEach((card, index) => {
      const statusEmoji = this.getStatusEmoji(card.status);
      message += `${index + 1}. *${card.name}* \n`;
      message += `   •••• ${card.last4} | Exp: ${card.expiryMonth}/${card.expiryYear}\n`;
      message += `   Status: ${statusEmoji} ${card.status}\n\n`;
    });

    message += `\n_`;
    if (currentCursor) {
      const pageId = currentCursor.substring(0, 8);
      message += `📄 Page (${pageId})`;
    } else {
      message += `📄 Page 1`;
    }
    if (nextCursor) {
      message += ` • More available ➡️`;
    }
    message += `_`;

    return message;
  }

  @ValidateUser({ requireAccount: true, answerCallback: true })
  async handleCardDetail(ctx: BotContext, cardId: string) {
    const userData = ctx.userData!;

    try {
      const card = await this.slashService.getCard(cardId, false, true);
      
      // Verify the card belongs to the user's virtual account
      if (card.virtualAccountId !== userData.virtualAccountId) {
        await ctx.reply(Messages.cardNotFound);
        return;
      }

      const cardDetailTimeout = this.configService.get<number>('cardDetailTimeout', 60000);
      const cardDetail = this.formatCardDetail(card, cardDetailTimeout);
      const sentMessage = await ctx.reply(cardDetail, {
        parse_mode: 'MarkdownV2',
        ...Keyboards.cardDetail(cardId),
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
    if(card.cvv){
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
    message += `\n\n *Card detail will be removed after ${detailTimeout/60000} min for security*`;
    
    return message;
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'active':
        return '✅';
      case 'paused':
        return '⏸️';
      case 'inactive':
        return '⏹️';
      case 'closed':
        return '🔒';
      default:
        return '❓';
    }
  }
}

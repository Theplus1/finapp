import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { Messages } from 'src/bot/constants/messages.constant';
import { BotContext } from 'src/bot/interfaces/bot-context.interface';

@Injectable()
export class NotificationsHandler {
  private readonly logger = new Logger(NotificationsHandler.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Handle /connect command - Link current chat as notification destination
   */
  async handleConnectCommand(ctx: BotContext) {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;

    if (!chatId || !userId) {
      await ctx.reply(Messages.errorGeneric);
      return;
    }

    // Check if this is a private chat
    if (ctx.chat?.type === 'private') {
      await ctx.reply(Messages.connectPrivateChatError);
      return;
    }

    // For groups and channels, verify user is admin
    try {
      const chatMember = await ctx.telegram.getChatMember(chatId, userId);
      const isAdmin = ['creator', 'administrator'].includes(chatMember.status);

      if (!isAdmin) {
        await ctx.reply(Messages.connectNotAdminError);
        return;
      }

      // Add this chat as notification destination
      await this.usersService.addNotificationDestination(userId, chatId);

      const chatTitle = ctx.chat.title || 'this chat';
      await ctx.reply(Messages.connectSuccess(chatTitle));
      
      this.logger.log(`User ${userId} connected chat ${chatId} (${chatTitle})`);
    } catch (error) {
      this.logger.error(`Error connecting chat ${chatId} for user ${userId}:`, error);
      await ctx.reply(Messages.errorGeneric);
    }
  }

  /**
   * Handle /disconnect command - Unlink current chat from notifications
   */
  async handleDisconnectCommand(ctx: BotContext) {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;

    if (!chatId || !userId) {
      await ctx.reply(Messages.errorGeneric);
      return;
    }

    // Check if this is a private chat
    if (ctx.chat?.type === 'private') {
      await ctx.reply(Messages.disconnectPrivateChatError);
      return;
    }

    try {
      // Remove this chat from notification destinations
      await this.usersService.removeNotificationDestination(userId, chatId);

      const chatTitle = ctx.chat.title || 'this chat';
      await ctx.reply(Messages.disconnectSuccess(chatTitle));
      
      this.logger.log(`User ${userId} disconnected chat ${chatId} (${chatTitle})`);
    } catch (error) {
      this.logger.error(`Error disconnecting chat ${chatId} for user ${userId}:`, error);
      await ctx.reply(Messages.errorGeneric);
    }
  }

  /**
   * Handle /destinations command - List all connected notification destinations
   */
  async handleDestinationsCommand(ctx: BotContext) {
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.reply(Messages.errorGeneric);
      return;
    }

    try {
      const user = await this.usersService.findByTelegramId(userId);
      
      if (!user) {
        await ctx.reply(Messages.userNotFound);
        return;
      }

      const destinations = user.notificationChatIds || [];

      if (destinations.length === 0) {
        await ctx.reply(Messages.noDestinations);
        return;
      }

      // Fetch chat details for each destination
      const chatDetails = await Promise.allSettled(
        destinations.map(async (chatId) => {
          try {
            const chat = await ctx.telegram.getChat(chatId);
            return {
              id: chatId,
              title: chat.type === 'private' ? 'Private Chat' : (chat as any).title || 'Unknown',
              type: chat.type,
            };
          } catch (error) {
            return {
              id: chatId,
              title: 'Unknown (Bot may have been removed)',
              type: 'unknown',
            };
          }
        })
      );

      const validChats = chatDetails
        .filter((result) => result.status === 'fulfilled')
        .map((result) => (result as PromiseFulfilledResult<any>).value);

      await ctx.reply(Messages.destinationsList(validChats), {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      this.logger.error(`Error listing destinations for user ${userId}:`, error);
      await ctx.reply(Messages.errorGeneric);
    }
  }
}

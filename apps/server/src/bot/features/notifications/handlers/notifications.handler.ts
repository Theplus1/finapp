import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { Messages } from 'src/bot/constants/messages.constant';
import { BotContext } from 'src/bot/interfaces/bot-context.interface';
import { SessionSteps } from 'src/bot/constants/session-steps.constant';

@Injectable()
export class NotificationsHandler {
  private readonly logger = new Logger(NotificationsHandler.name);

  constructor(private readonly usersService: UsersService) {}

  private async isChatAdmin(
    telegram: BotContext['telegram'],
    chatId: number,
    userId: number,
  ): Promise<boolean> {
    try {
      const member = await telegram.getChatMember(chatId, userId);
      const status = (member as { status?: string }).status;
      if (status === 'creator' || status === 'administrator') return true;
      const admins = await telegram.getChatAdministrators(chatId);
      return admins.some(
        (a) => (a as { user: { id: number } }).user?.id === userId,
      );
    } catch (e) {
      this.logger.warn(`isChatAdmin failed chat=${chatId} user=${userId}`, e);
      return false;
    }
  }

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

    const user = await this.usersService.findByTelegramId(userId);
    if (!user) {
      await ctx.reply(Messages.connectUserNotFound());
      return;
    }

    try {
      const isAdmin = await this.isChatAdmin(ctx.telegram, chatId, userId);
      if (!isAdmin) {
        await ctx.reply(Messages.connectNotAdminError);
        return;
      }

      // Add this chat as notification destination
      await this.usersService.addNotificationDestination(userId, chatId);
      await ctx.reply(Messages.connectSuccess(ctx.chat.title || 'this chat'));
    } catch (error) {
      this.logger.error(`addNotificationDestination failed user=${userId} chat=${chatId}`, error);
      await ctx.reply(Messages.errorGeneric);
    }
  }

  async handleTopicalertCommand(ctx: BotContext) {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;

    if (!chatId || !userId) {
      await ctx.reply(Messages.errorGeneric);
      return;
    }

    if (ctx.chat?.type === 'private') {
      await ctx.reply(Messages.connectPrivateChatError);
      return;
    }

    const isForum = (ctx.chat as { is_forum?: boolean })?.is_forum === true;
    if (!isForum) {
      await ctx.reply(Messages.topicalertNotForum);
      return;
    }

    const user = await this.usersService.findByTelegramId(userId);
    if (!user) {
      await ctx.reply(Messages.connectUserNotFound());
      return;
    }

    const replyToMessage = ctx.message && 'reply_to_message' in ctx.message
      ? (ctx.message as { reply_to_message?: Record<string, unknown> }).reply_to_message
      : null;

    let threadId: number | undefined;
    if (replyToMessage) {
      if ('message_thread_id' in replyToMessage && replyToMessage.message_thread_id != null) {
        threadId = replyToMessage.message_thread_id as number;
      }
      if (threadId == null && ctx.message && 'message_thread_id' in ctx.message) {
        threadId = (ctx.message as { message_thread_id?: number }).message_thread_id;
      }
    } else if (ctx.message && 'message_thread_id' in ctx.message) {
      threadId = (ctx.message as { message_thread_id?: number }).message_thread_id;
    }

    if (!threadId) {
      ctx.session = { 
        step: SessionSteps.AWAITING_TOPICALERT_REPLY, 
        data: { chatId, userId } 
      };
      await ctx.reply(Messages.topicalertThreadIdPrompt(), {
        parse_mode: 'Markdown',
        reply_markup: { force_reply: true, selective: true },
      });
      return;
    }

    try {
      const isAdmin = await this.isChatAdmin(ctx.telegram, chatId, userId);
      if (!isAdmin) {
        await ctx.reply(Messages.connectNotAdminError);
        return;
      }

      await this.usersService.setWarningThreadId(userId, chatId, threadId);
      await ctx.reply(Messages.topicalertSuccess(threadId));
      this.logger.log(`User ${userId} set warning thread ${threadId} for chat ${chatId}`);
    } catch (error) {
      this.logger.error(`setWarningThreadId failed user=${userId} chat=${chatId}`, error);
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
      await ctx.reply(Messages.disconnectSuccess(ctx.chat.title || 'this chat'));
    } catch (error) {
      this.logger.error(`removeNotificationDestination failed user=${userId} chat=${chatId}`, error);
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

      const destinations = this.usersService.getDestinations(user);
      if (destinations.length === 0) {
        await ctx.reply(Messages.noDestinations);
        return;
      }

      // Fetch chat details for each destination
      const chatDetails = await Promise.allSettled(
        destinations.map(async (dest) => {
          const chatId = dest.chatId;
          try {
            const chat = await ctx.telegram.getChat(chatId);
            return {
              id: chatId,
              title: chat.type === 'private' ? 'Private Chat' : (chat as { title?: string }).title || 'Unknown',
              type: chat.type,
              warningThreadId: dest.warningThreadId,
            };
          } catch (error) {
            return {
              id: chatId,
              title: 'Unknown (Bot may have been removed)',
              type: 'unknown',
              warningThreadId: dest.warningThreadId,
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
      this.logger.error(`listDestinations failed user=${userId}`, error);
      await ctx.reply(Messages.errorGeneric);
    }
  }

  async handleTopicalertThreadIdInput(ctx: BotContext, threadIdText: string) {
    const sessionData = ctx.session?.data;
    let chatId = sessionData?.chatId as number | undefined;
    let userId = sessionData?.userId as number | undefined;
    if (!chatId) chatId = ctx.chat?.id;
    if (!userId) userId = ctx.from?.id;

    if (!chatId || !userId) {
      await ctx.reply(Messages.errorGeneric);
      ctx.session = undefined;
      return;
    }

    const threadId = parseInt(threadIdText.trim(), 10);
    if (isNaN(threadId) || threadId <= 0) {
      await ctx.reply(Messages.topicalertInvalidThreadId, {
        reply_markup: { force_reply: true, selective: true },
      });
      return;
    }

    try {
      const user = await this.usersService.findByTelegramId(userId);
      if (!user) {
        await ctx.reply(Messages.connectUserNotFound());
        ctx.session = undefined;
        return;
      }
      const isAdmin = await this.isChatAdmin(ctx.telegram, chatId, userId);
      if (!isAdmin) {
        await ctx.reply(Messages.connectNotAdminError);
        ctx.session = undefined;
        return;
      }
      await this.usersService.setWarningThreadId(userId, chatId, threadId);
      await ctx.reply(Messages.topicalertSuccess(threadId));
      ctx.session = undefined;
    } catch (error) {
      this.logger.error(`setWarningThreadId failed user=${userId} chat=${chatId}`, error);
      await ctx.reply(Messages.errorGeneric);
      ctx.session = undefined;
    }
  }
}

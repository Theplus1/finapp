import { Injectable, Logger } from '@nestjs/common';
import { BotContext } from '../interfaces/bot-context.interface';
import { UsersService } from '../../users/users.service';
import { AccountsService } from '../../domain/accounts/accounts.service';
import { Messages } from '../constants/messages.constant';

/**
 * Telegraf middleware to validate and attach user data to context
 * This runs before every handler and validates user exists
 */
@Injectable()
export class UserValidationMiddleware {
  private readonly logger = new Logger(UserValidationMiddleware.name);

  constructor(
    private readonly accountsService: AccountsService,
  ) {}

  /**
   * Middleware function that validates user and attaches to context
   */
  middleware() {
    return async (ctx: BotContext, next: () => Promise<void>) => {
      const telegramUser = ctx.from;
      
      // Skip validation for /start and /help commands
      if (ctx.message && 'text' in ctx.message) {
        const text = ctx.message.text;
        if (text?.startsWith('/start') || text?.startsWith('/help')) {
          return next();
        }
      }

      if (!telegramUser) {
        this.logger.warn('No telegram user in context');
        await ctx.reply(Messages.accessDenied());
        return; // Block execution
      }

      // Fetch and attach virtual account
      const virtualAccount = await this.accountsService.findByTelegramId(telegramUser.id);
      
      if (!virtualAccount) {
        this.logger.warn(`User not found: ${telegramUser.id}`);
        
        // Answer callback query if it exists
        if (ctx.callbackQuery) {
          await ctx.answerCbQuery('Please use /start first');
        }
        
        await ctx.reply(Messages.userNotFound);
        return; // Block execution
      }

      ctx.virtualAccount = virtualAccount;

      return next();
    };
  }
}

import { Injectable } from '@nestjs/common';
import { BotContext } from '../interfaces/bot-context.interface';
import { UsersService } from '../../users/users.service';
import { Messages } from '../constants/messages.constant';

/**
 * Telegraf middleware to validate and attach user data to context
 * This runs before every handler and attaches userData to ctx
 */
@Injectable()
export class UserValidationMiddleware {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Middleware function that validates user and attaches to context
   */
  middleware() {
    return async (ctx: BotContext, next: () => Promise<void>) => {
      const telegramUser = ctx.from;
      
      // Skip validation for /start command (user registration)
      if (ctx.message && 'text' in ctx.message && ctx.message.text === '/start') {
        return next();
      }

      if (!telegramUser) {
        return next();
      }

      // Fetch and attach user data
      const userData = await this.usersService.findByTelegramId(telegramUser.id);
      if (userData) {
        ctx.userData = userData;
      }

      return next();
    };
  }
}

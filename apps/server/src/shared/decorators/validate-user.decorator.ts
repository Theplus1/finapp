import { BotContext } from '../../bot/interfaces/bot-context.interface';
import { Messages } from '../../bot/constants/messages.constant';
import { UsersService } from '../../users/users.service';
import { UserDocument } from '../../users/users.schema';

export interface ValidateUserOptions {
  /**
   * Require virtual account to be linked
   */
  requireAccount?: boolean;
  
  /**
   * Answer callback query on validation failure (for button actions)
   */
  answerCallback?: boolean;
}

/**
 * Decorator to validate user exists and optionally has linked account
 * Automatically handles error responses
 * 
 * @example
 * ```typescript
 * @ValidateUser()
 * async handleSomething(ctx: BotContext, userData: UserDocument) {
 *   // userData is guaranteed to exist
 * }
 * 
 * @ValidateUser({ requireAccount: true, answerCallback: true })
 * async handleCardAction(ctx: BotContext, userData: UserDocument) {
 *   // userData exists and has virtualAccountId
 * }
 * ```
 */
export function ValidateUser(options: ValidateUserOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const ctx = args[0] as BotContext;
      
      // Validate Telegram user exists
      const telegramUser = ctx.from;
      if (!telegramUser) {
        return;
      }

      // Get UsersService from class instance
      const usersService: UsersService = (this as any).usersService;
      if (!usersService) {
        throw new Error(
          `@ValidateUser decorator requires 'usersService' property in ${target.constructor.name}`,
        );
      }

      // Fetch user from database
      const userData = await usersService.findByTelegramId(telegramUser.id);
      if (!userData) {
        if (options.answerCallback && ctx.callbackQuery) {
          await ctx.answerCbQuery('Please use /start first');
        }
        await ctx.reply(Messages.mustStartBot);
        return;
      }

      // Validate virtual account if required
      if (options.requireAccount && !userData.virtualAccountId) {
        if (options.answerCallback && ctx.callbackQuery) {
          await ctx.answerCbQuery('Account not linked');
        }
        await ctx.reply(Messages.accountNotLinked);
        return;
      }

      // Attach userData to context for easy access
      (ctx as any).userData = userData;

      // Call original method with original arguments
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

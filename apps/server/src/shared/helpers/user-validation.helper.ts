import { BotContext } from '../../bot/interfaces/bot-context.interface';
import { Messages } from '../../bot/constants/messages.constant';
import { UsersService } from '../../users/users.service';
import { UserDocument } from '../../users/users.schema';

export interface UserValidationResult {
  isValid: boolean;
  user?: UserDocument;
}

/**
 * Validates and retrieves user data from Telegram context
 * Automatically sends error messages if validation fails
 */
export class UserValidationHelper {
  /**
   * Validates user exists in context and database
   * @param ctx - Telegram bot context
   * @param usersService - Users service instance
   * @param answerCallback - Whether to answer callback query on error (for button actions)
   * @returns User document if valid, null otherwise
   */
  static async validateAndGetUser(
    ctx: BotContext,
    usersService: UsersService,
    answerCallback = false,
  ): Promise<UserDocument | null> {
    const telegramUser = ctx.from;
    if (!telegramUser) return null;

    const chatId = ctx.chat?.id ?? telegramUser.id;
    const userData = await usersService.findByTelegramIdOrIds(Math.abs(chatId));
    if (!userData) {
      if (answerCallback && ctx.callbackQuery) {
        await ctx.answerCbQuery('Please use /start first');
      }
      await ctx.reply(Messages.mustStartBot);
      return null;
    }

    return userData;
  }

  /**
   * Validates user has linked virtual account
   * @param ctx - Telegram bot context
   * @param userData - User document
   * @param answerCallback - Whether to answer callback query on error
   * @returns True if account is linked, false otherwise
   */
  static async validateVirtualAccount(
    ctx: BotContext,
    userData: UserDocument,
    answerCallback = false,
  ): Promise<boolean> {
    if (!userData.virtualAccountId) {
      if (answerCallback && ctx.callbackQuery) {
        await ctx.answerCbQuery('Account not linked');
      }
      await ctx.reply(Messages.accountNotLinked);
      return false;
    }
    return true;
  }

  /**
   * Combined validation: user exists and has virtual account
   * @param ctx - Telegram bot context
   * @param usersService - Users service instance
   * @param answerCallback - Whether to answer callback query on error
   * @returns User document if all validations pass, null otherwise
   */
  static async validateUserWithAccount(
    ctx: BotContext,
    usersService: UsersService,
    answerCallback = false,
  ): Promise<UserDocument | null> {
    const userData = await this.validateAndGetUser(ctx, usersService, answerCallback);
    if (!userData) return null;

    const hasAccount = await this.validateVirtualAccount(ctx, userData, answerCallback);
    if (!hasAccount) return null;

    return userData;
  }
}

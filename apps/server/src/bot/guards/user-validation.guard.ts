import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountsService } from '../../domain/accounts/accounts.service';
import { BotContext } from '../interfaces/bot-context.interface';
import { Messages } from '../constants/messages.constant';

export const VALIDATE_USER_KEY = 'validateUser';

export interface ValidateUserOptions {
  requireAccount?: boolean;
  answerCallback?: boolean;
}

/**
 * Guard to validate user exists and optionally has linked account
 * Uses proper dependency injection
 */
@Injectable()
export class UserValidationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accountsService: AccountsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get decorator options
    const options = this.reflector.get<ValidateUserOptions>(
      VALIDATE_USER_KEY,
      context.getHandler(),
    );

    if (!options) {
      return true; // No validation required
    }

    // Get bot context
    const ctx = context.getArgByIndex(0) as BotContext;
    
    // Get telegram user
    const telegramUser = ctx.from;
    if (!telegramUser) {
      if (options.answerCallback && ctx.callbackQuery) {
        await ctx.answerCbQuery('User information not available');
      }
      await ctx.reply(Messages.accessDenied());
      return false;
    }

    // Find user by telegram ID
    const userData = await this.accountsService.findByTelegramId(telegramUser.id);
    
    if (!userData) {
      if (options.answerCallback && ctx.callbackQuery) {
        await ctx.answerCbQuery('Please use /start first');
      }
      await ctx.reply(Messages.accessDenied());
      return false;
    }

    // Validate linked account if required
    if (options.requireAccount && !userData.linkedTelegramId) {
      if (options.answerCallback && ctx.callbackQuery) {
        await ctx.answerCbQuery('Account not linked');
      }
      await ctx.reply(Messages.accessDenied());
      return false;
    }

    // Attach user data to context
    ctx.virtualAccount = userData;

    return true;
  }
}

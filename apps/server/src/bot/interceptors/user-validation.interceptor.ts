import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { UsersService } from '../../users/users.service';
import { AccountsService } from '../../domain/accounts/accounts.service';
import { BotContext } from '../interfaces/bot-context.interface';
import { Messages } from '../constants/messages.constant';
import { VALIDATE_USER_KEY, ValidateUserOptions } from '../guards/user-validation.guard';

/**
 * Interceptor to validate user before method execution
 * Alternative to Guard if guards don't work with your bot framework
 */
@Injectable()
export class UserValidationInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // Get decorator options
    const options = this.reflector.get<ValidateUserOptions>(
      VALIDATE_USER_KEY,
      context.getHandler(),
    );

    if (!options) {
      return next.handle(); // No validation required
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
      throw new Error('User information not available');
    }

    // Find user by telegram ID
    const user = await this.usersService.findByTelegramId(telegramUser.id);
    
    if (!user || !user.virtualAccountId) {
      if (options.answerCallback && ctx.callbackQuery) {
        await ctx.answerCbQuery('Please use /start first');
      }
      await ctx.reply(Messages.accessDenied(`User with Telegram ID ${telegramUser.id} not found.`));
      throw new Error('User not found');
    }

    // Attach user data to context
    ctx.userData = user;

    return next.handle();
  }
}

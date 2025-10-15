import { SetMetadata } from '@nestjs/common';
import { VALIDATE_USER_KEY, ValidateUserOptions } from '../guards/user-validation.guard';

/**
 * Decorator to validate user and optionally require linked account
 * Works with UserValidationGuard
 * 
 * @example
 * @ValidateUser({ requireAccount: true, answerCallback: true })
 * async handleCardLock(ctx: BotContext, cardId: string) {
 *   const userData = ctx.userData!; // Available after validation
 *   // ...
 * }
 */
export const ValidateUser = (options: ValidateUserOptions = {}) =>
  SetMetadata(VALIDATE_USER_KEY, options);

import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BotContext } from '../../bot/interfaces/bot-context.interface';
import { UsersService } from '../../users/users.service';
import { AccessStatus } from '../../users/users.schema';
import { Messages } from '../../bot/constants/messages.constant';

/**
 * Decorator to mark handlers that require approved access
 */
export const RequireApprovedAccess = () => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('requireApprovedAccess', true, descriptor.value);
    return descriptor;
  };
};

/**
 * Decorator to mark handlers that bypass access control (e.g., /start, /help)
 */
export const PublicAccess = () => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('publicAccess', true, descriptor.value);
    return descriptor;
  };
};

/**
 * Guard that checks if user has approved access to use bot features
 */
@Injectable()
export class AccessControlGuard implements CanActivate {
  private readonly logger = new Logger(AccessControlGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    
    // Check if handler is marked as public (no access control needed)
    const isPublic = Reflect.getMetadata('publicAccess', handler);
    if (isPublic) {
      return true;
    }

    const ctx: BotContext = context.getArgByIndex(0);
    const telegramUser = ctx.from;

    if (!telegramUser) {
      this.logger.warn('No telegram user found in context');
      return false;
    }

    // Find user in database
    const user = await this.usersService.findByTelegramId(telegramUser.id);

    if (!user) {
      // User not registered yet - allow /start command to proceed
      const isStartCommand = this.isStartCommand(context);
      if (isStartCommand) {
        return true;
      }
      
      await ctx.reply(Messages.mustStartBot);
      return false;
    }

    // Check access status
    switch (user.accessStatus) {
      case AccessStatus.APPROVED:
        return true;

      case AccessStatus.PENDING:
        await ctx.reply(Messages.accessPending);
        return false;

      case AccessStatus.DENIED:
        await ctx.reply(Messages.accessDenied(user.accessDeniedReason));
        return false;

      case AccessStatus.REVOKED:
        await ctx.reply(Messages.accessRevoked(user.accessDeniedReason));
        return false;

      default:
        this.logger.warn(`Unknown access status: ${user.accessStatus}`);
        return false;
    }
  }

  private isStartCommand(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const handlerName = handler.name;
    return handlerName === 'start' || handlerName === 'handleStart';
  }
}

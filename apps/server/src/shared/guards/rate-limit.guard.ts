import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requests = new Map<number, number[]>();
  private readonly limit = 10; // requests per minute
  private readonly window = 60000; // 1 minute

  canActivate(context: ExecutionContext): boolean {
    const ctx = context.getArgByIndex(0);
    const userId = ctx.from?.id;
    
    if (!userId) return false;

    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Remove old requests outside the window
    const recentRequests = userRequests.filter(time => now - time < this.window);
    
    if (recentRequests.length >= this.limit) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(userId, recentRequests);
    
    return true;
  }
}

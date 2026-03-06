import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminAuthService } from '../services/admin-auth.service';
import type { AuthenticatedUser } from '../services/admin-auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private adminAuthService: AdminAuthService) {
    super();
  }

  async validate(username: string, password: string): Promise<AuthenticatedUser> {
    const user = await this.adminAuthService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}

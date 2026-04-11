import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AdminUserRole } from '../../database/schemas/admin-user.schema';
import type { AuthAudienceType } from '../../common/constants/auth.constants';

interface JwtPayload {
  sub: string;
  username: string;
  role: AdminUserRole;
  type?: AuthAudienceType;
  virtualAccountId?: string;
  virtualAccountIds?: string[];
  bossId?: string;
  permissions?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      type: payload.type,
      virtualAccountId: payload.virtualAccountId,
      virtualAccountIds: payload.virtualAccountIds ?? [],
      bossId: payload.bossId,
      permissions: payload.permissions ?? [],
    };
  }
}

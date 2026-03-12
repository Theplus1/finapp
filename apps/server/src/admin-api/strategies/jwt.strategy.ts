import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AdminUserRole } from '../../database/schemas/admin-user.schema';

interface JwtPayload {
  sub: string;
  username: string;
  role: AdminUserRole;
  type?: 'admin' | 'customer';
  virtualAccountId?: string;
  bossId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'default-secret'),
    });
  }

  async validate(payload: JwtPayload) {
    // This payload comes from the JWT token
    // Return value will be attached to request.user
    return { 
      userId: payload.sub, 
      username: payload.username,
      role: payload.role,
      type: payload.type,
      virtualAccountId: payload.virtualAccountId,
      bossId: payload.bossId,
    };
  }
}

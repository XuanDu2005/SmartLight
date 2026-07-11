/**
 * JWT access-token strategy.
 *
 * Validates the bearer token on incoming requests. Attaches a `UserPrincipal`
 * to `req.user` (with permissions hydrated from DB) for downstream guards
 * and controllers.
 *
 * Stateless w.r.t. revocation: a compromised token stays valid until `exp`.
 * Sensitive state-changes are also gated by re-checking `RefreshToken` rows
 * (logout-all, password change, etc.).
 */
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/service';
import {
  TokenService,
  AccessTokenClaims,
} from '../../../platform/security/token.service';
import type { UserPrincipal } from '../../users/interfaces/user-principal.interface';
import { AUTH_CONSTANTS } from '../../../platform/security/auth.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
    private readonly tokens: TokenService,
  ) {
    const secret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const opts: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
      issuer: AUTH_CONSTANTS.JWT_ISSUER,
      audience: undefined, // accept both web + admin
    };
    super(opts);
  }

  async validate(payload: AccessTokenClaims): Promise<UserPrincipal> {
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Not an access token');
    }

    const isAdmin = payload.audience === 'smartlight.admin';

    if (isAdmin) {
      const admin = await this.users.findAdminById(payload.sub);
      if (!admin) throw new UnauthorizedException('Admin no longer exists');
      const { roles, permissions } = await this.users.resolveAdminPrincipal(
        admin.id,
      );
      return {
        id: admin.id,
        email: admin.email,
        roles,
        permissions,
        audience: payload.audience,
        tokenType: 'access',
        sessionId: payload.sessionId,
      };
    }

    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User no longer exists');

    const { roles, permissions } = await this.users.resolveUserPrincipal(
      user.id,
    );
    return {
      id: user.id,
      email: user.email,
      roles,
      permissions,
      audience: payload.audience,
      tokenType: 'access',
      sessionId: payload.sessionId,
    };
  }
}

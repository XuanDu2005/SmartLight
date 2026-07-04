/**
 * Refresh-token strategy.
 *
 * Validates the refresh JWT. Used by `POST /v1/auth/refresh` to mint a new
 * token pair. Rotation + revocation is enforced by the service: this
 * strategy only confirms signature + exp + audience.
 */
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { TokenService, RefreshTokenClaims } from '../../../platform/security/token.service';
import { AUTH_CONSTANTS } from '../../../platform/security/auth.constants';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    config: ConfigService,
    private readonly tokens: TokenService,
  ) {
    const secret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const opts: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: { body?: { refreshToken?: string } } & { cookies?: Record<string, string> }) =>
          req?.body?.refreshToken ?? req?.cookies?.['sl_refresh'] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
      issuer: AUTH_CONSTANTS.JWT_ISSUER,
      audience: undefined,
      passReqToCallback: false,
    };
    super(opts);
  }

  async validate(payload: RefreshTokenClaims): Promise<RefreshTokenClaims> {
    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Not a refresh token');
    }
    return payload;
  }
}
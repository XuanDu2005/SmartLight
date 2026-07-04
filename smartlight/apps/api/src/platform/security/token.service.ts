/**
 * JWT issuer/verifier service.
 *
 * Wraps `@nestjs/jwt` with our conventions:
 *   - HS256 in V1 (algorithm pinned)
 *   - issuer `smartlight.api`, audience `smartlight.web` or `smartlight.admin`
 *   - claims: sub, email, roles, aud, iat, exp, iss
 *
 * Stateless verification: the service never persists the token. The principal
 * is fully described by the JWT payload + a re-fetched roles/permissions
 * snapshot from the DB (refreshed at login time).
 */
import { Injectable } from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  TokenExpiredException,
  TokenInvalidException,
} from './auth.exceptions';
import { AUTH_CONSTANTS } from './auth.constants';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  tokenType: 'access';
  audience: 'smartlight.web' | 'smartlight.admin';
  sessionId?: string;
  iat?: number;
  exp?: number;
  iss?: string;
}

export interface RefreshTokenClaims {
  sub: string;
  email: string;
  tokenType: 'refresh';
  audience: 'smartlight.web' | 'smartlight.admin';
  sessionId: string;
  tokenHash?: string; // not in the JWT \u2014 only here for completeness in tests
  iat?: number;
  exp?: number;
  iss?: string;
}

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly accessTtlSec: number;
  private readonly refreshSecret: string;
  private readonly refreshTtlSec: number;
  private readonly rememberMeTtlSec: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.accessTtlSec = this.config.get<number>('JWT_ACCESS_TTL_SEC', 900);
    this.refreshTtlSec = this.config.get<number>('JWT_REFRESH_TTL_SEC', 604800);
    this.rememberMeTtlSec = this.config.get<number>(
      'JWT_REMEMBER_ME_TTL_SEC',
      2592000,
    );
  }

  signAccess(payload: Omit<AccessTokenClaims, 'iat' | 'exp' | 'iss'>): {
    token: string;
    expiresIn: number;
  } {
    const token = this.jwt.sign(payload, {
      secret: this.accessSecret,
      algorithm: 'HS256',
      issuer: AUTH_CONSTANTS.JWT_ISSUER,
      audience: payload.audience,
      expiresIn: this.accessTtlSec,
    });
    return { token, expiresIn: this.accessTtlSec };
  }

  signRefresh(payload: Omit<RefreshTokenClaims, 'iat' | 'exp' | 'iss'>, rememberMe = false): {
    token: string;
    expiresIn: number;
  } {
    const ttl = rememberMe ? this.rememberMeTtlSec : this.refreshTtlSec;
    const token = this.jwt.sign(payload, {
      secret: this.refreshSecret,
      algorithm: 'HS256',
      issuer: AUTH_CONSTANTS.JWT_ISSUER,
      audience: payload.audience,
      expiresIn: ttl,
    });
    return { token, expiresIn: ttl };
  }

  verifyAccess(token: string): AccessTokenClaims {
    try {
      return this.jwt.verify<AccessTokenClaims>(token, {
        secret: this.accessSecret,
        algorithms: ['HS256'],
        issuer: AUTH_CONSTANTS.JWT_ISSUER,
      });
    } catch (err) {
      if (err instanceof TokenExpiredError) throw new TokenExpiredException();
      throw new TokenInvalidException();
    }
  }

  verifyRefresh(token: string): RefreshTokenClaims {
    try {
      return this.jwt.verify<RefreshTokenClaims>(token, {
        secret: this.refreshSecret,
        algorithms: ['HS256'],
        issuer: AUTH_CONSTANTS.JWT_ISSUER,
      });
    } catch (err) {
      if (err instanceof TokenExpiredError) throw new TokenExpiredException();
      throw new TokenInvalidException();
    }
  }

  /** TTL getter for use in TokenPairResponseDto. */
  get accessTtl(): number {
    return this.accessTtlSec;
  }
}
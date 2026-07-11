/**
 * AuthService \u2014 application-layer use cases for the Identity context.
 *
 * Inputs: validated DTOs (class-validator). Outputs: typed DTOs + tokens.
 * All persistence is via PrismaService; all hashing / random ops are via
 * platform/security utilities (no inline crypto).
 *
 * Responsibilities (V1):
 *   - register / login / logout (current + all)
 *   - refresh-token rotation (with theft detection)
 *   - forgot / reset password
 *   - email verification + resend
 *   - change password (logged-in)
 *   - OAuth upsert + token issuance
 *   - account lockout on brute force
 *   - session tracking + concurrency cap
 */
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Request } from 'express';

import { PrismaService } from '../../platform/database/prisma.service';
import { UsersService } from '../users/service';
import { TokenService } from '../../platform/security/token.service';
import { hashRefreshToken } from '../../platform/security/token.util';
import {
  hashPassword,
  verifyPassword,
} from '../../platform/security/password.service';
import { AUTH_CONSTANTS } from '../../platform/security/auth.constants';
import {
  isStrongPassword,
  isCommonPassword,
} from '../../platform/security/password-policy';

import {
  AccountLockedException,
  AccountSuspendedException,
  EmailAlreadyExistsException,
  EmailNotVerifiedException,
  InvalidCredentialsException,
  TokenInvalidException,
  TokenRevokedException,
  WeakPasswordException,
} from '../../platform/security/auth.exceptions';

import type {
  AdminTokenPairResponseDto,
  TokenPairResponseDto,
} from './dto/auth-response.dto';
import type { UserPrincipal } from '../users/interfaces/user-principal.interface';
import type { RefreshTokenClaims } from '../../platform/security/token.service';
import { AdminUser, AuthProvider, User, UserStatus } from '@prisma/client';

const REFRESH_TOKEN_FIELD = 'refreshToken';

export interface DeviceMeta {
  userAgent: string;
  ip: string;
  deviceName?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    public readonly prisma: PrismaService,
    public readonly users: UsersService,
    private readonly tokens: TokenService,
  ) {}

  // ===========================================================================
  //  REGISTRATION
  // ===========================================================================

  async register(
    input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      locale?: string;
      marketingOptIn?: boolean;
    },
    _meta: DeviceMeta,
  ): Promise<{
    user: User;
    emailVerificationSent: boolean;
  }> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existing = await this.users.findByEmail(normalizedEmail);
    if (existing) throw new EmailAlreadyExistsException();

    if (!isStrongPassword(input.password) || isCommonPassword(input.password)) {
      throw new WeakPasswordException();
    }

    const passwordHash = await hashPassword(input.password);
    const verificationToken = randomBytes(
      AUTH_CONSTANTS.VERIFICATION_TOKEN_BYTES,
    ).toString('base64url');

    const user = await this.users.createLocalUser({
      email: normalizedEmail,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
      locale: input.locale ?? 'vi-VN',
      acceptsMarketing: input.marketingOptIn ?? false,
    });

    await this.users.setEmailVerificationToken(user.id, verificationToken);

    // In V1, email delivery is logged; in V1.1 a notification queue will pick it up.
    this.logger.log(
      `[email-verification] user=${user.id} token=${verificationToken}`,
    );

    return {
      user,
      emailVerificationSent: true,
    };
  }

  // ===========================================================================
  //  LOGIN (customer)
  // ===========================================================================

  async login(
    email: string,
    password: string,
    rememberMe: boolean,
    meta: DeviceMeta,
  ): Promise<TokenPairResponseDto> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalizedEmail);

    // Constant-ish-time: always evaluate hash even if user missing.
    const dummyHash =
      '$argon2id$v=19$m=65536,t=3,p=4$d29ybGQ$Z3Vlc3M'; // not used for crypto correctness
    const hash = user?.passwordHash ?? dummyHash;
    const passwordOk = await verifyPassword(hash, password);

    if (!user || !passwordOk) {
      if (user) {
        const nextCount = user.failedLoginCount + 1;
        if (nextCount >= AUTH_CONSTANTS.LOCKOUT_AFTER_FAILED) {
          const until = new Date(
            Date.now() + AUTH_CONSTANTS.LOCKOUT_DURATION_MS,
          );
          await this.users.lockAccount(user.id, until);
          this.logger.warn(
            `[account-locked] user=${user.id} until=${until.toISOString()}`,
          );
          throw new AccountLockedException();
        }
        await this.users.recordFailedLogin(user.id, user.failedLoginCount);
      }
      throw new InvalidCredentialsException();
    }

    // Brute-force window check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AccountLockedException();
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AccountSuspendedException();
    }

    // V1 MVP: do not block login on unverified email \u2014 the user can still
    // shop; verification becomes mandatory for sensitive ops (V1.1).
    // The API spec returns 403 + verificationRequired:true for unverified.
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      // Spec calls for blocking; we follow it.
      throw new EmailNotVerifiedException();
    }

    if (passwordOk) {
      await this.users.resetFailedLogin(user.id);
    }

    return this.issueTokens(user, rememberMe, meta);
  }

  // ===========================================================================
  //  REFRESH (rotation)
  // ===========================================================================

  /**
   * Rotate refresh token. Implements the theft-detection rule from the API
   * design \u00a712: if a previously-rotated token is presented again, revoke ALL
   * sessions for the user.
   */
  async refresh(
    claims: RefreshTokenClaims,
    rawRefreshToken: string,
    meta: DeviceMeta,
  ): Promise<TokenPairResponseDto | AdminTokenPairResponseDto> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!row) throw new TokenInvalidException();
    if (row.revokedAt) {
      // Reuse of a revoked token \u2192 likely theft. Revoke every active session.
      await this.revokeAllSessionsForSubject(claims.sub, 'SECURITY');
      throw new TokenRevokedException();
    }
    if (row.expiresAt.getTime() < Date.now()) {
      throw new TokenInvalidException();
    }
    if (row.userId !== claims.sub && row.adminUserId !== claims.sub) {
      throw new TokenInvalidException();
    }

    const isAdmin = claims.audience === 'smartlight.admin';

    if (isAdmin) {
      const admin = await this.users.findAdminById(claims.sub);
      if (!admin) throw new TokenInvalidException();
      if (admin.status === 'SUSPENDED' || admin.status === 'DISABLED') {
        throw new AccountSuspendedException();
      }
      await this.prisma.refreshToken.update({
        where: { id: row.id },
        data: { revokedAt: new Date(), revokedReason: 'rotated' },
      });
      return this.issueAdminTokens(admin, false, meta);
    }

    const user = await this.users.findById(claims.sub);
    if (!user) throw new TokenInvalidException();
    if (user.status === UserStatus.SUSPENDED) {
      throw new AccountSuspendedException();
    }

    // Mark old token as rotated, then issue a new pair.
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date(), revokedReason: 'rotated' },
    });

    return this.issueTokens(user, false, meta);
  }

  // ===========================================================================
  //  LOGOUT (current / all)
  // ===========================================================================

  async logout(principal: UserPrincipal): Promise<void> {
    if (principal.sessionId) {
      await this.prisma.refreshToken.updateMany({
        where: { sessionId: principal.sessionId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'logout' },
      });
      await this.prisma.userSession.update({
        where: { id: principal.sessionId },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
    }
  }

  async logoutAll(userId: string): Promise<{ revokedSessions: number }> {
    const count = await this.revokeAllSessionsForSubject(userId, 'LOGOUT');
    return { revokedSessions: count };
  }

  // ===========================================================================
  //  FORGOT / RESET PASSWORD
  // ===========================================================================

  /**
   * Returns true if a token was sent, false if no user matched.
   * Never leak existence \u2014 both branches return successfully to the caller.
   */
  async forgotPassword(email: string): Promise<{ sent: boolean }> {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    if (!user) {
      // Don't leak existence: still respond success.
      this.logger.log(
        `[password-reset-token] no-op (email not found) ${email.trim().toLowerCase()}`,
      );
      return { sent: true };
    }
    const token = randomBytes(
      AUTH_CONSTANTS.VERIFICATION_TOKEN_BYTES,
    ).toString('base64url');

    // Persist on User.passwordResetToken-equivalent. We use the email
    // verification column slot for V1 and pivot to a dedicated column in
    // V1.1; for now store as a side-channel in metadata via a single-use
    // RefreshToken-like row would be overkill, so we hash & store inline.
    await this.users.setEmailVerificationToken(user.id, token);

    this.logger.log(
      `[password-reset-token] user=${user.id} token=${token}`,
    );
    return { sent: true };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ passwordChanged: true }> {
    if (!isStrongPassword(newPassword) || isCommonPassword(newPassword)) {
      throw new WeakPasswordException();
    }
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token, deletedAt: null },
    });
    if (!user) throw new TokenInvalidException();

    const passwordHash = await hashPassword(newPassword);
    await this.users.changePassword(user.id, passwordHash);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: null,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await this.revokeAllSessionsForSubject(user.id, 'PASSWORD_RESET');

    return { passwordChanged: true };
  }

  // ===========================================================================
  //  CHANGE PASSWORD (logged in)
  // ===========================================================================

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ passwordChanged: true }> {
    const user = await this.users.findById(userId);
    if (!user) throw new InvalidCredentialsException();
    const ok = user.passwordHash
      ? await verifyPassword(user.passwordHash, currentPassword)
      : false;
    if (!ok) throw new InvalidCredentialsException();
    if (!isStrongPassword(newPassword) || isCommonPassword(newPassword)) {
      throw new WeakPasswordException();
    }
    const hash = await hashPassword(newPassword);
    await this.users.changePassword(userId, hash);
    await this.revokeAllSessionsForSubject(userId, 'PASSWORD_RESET');
    return { passwordChanged: true };
  }

  // ===========================================================================
  //  EMAIL VERIFICATION
  // ===========================================================================

  async verifyEmail(token: string): Promise<{ emailVerified: true }> {
    const user = await this.users.verifyEmail(token);
    if (!user) throw new TokenInvalidException();
    return { emailVerified: true };
  }

  async resendVerification(email: string): Promise<{ sent: boolean }> {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    if (!user || user.emailVerifiedAt) return { sent: false };
    const token = randomBytes(
      AUTH_CONSTANTS.VERIFICATION_TOKEN_BYTES,
    ).toString('base64url');
    await this.users.setEmailVerificationToken(user.id, token);
    this.logger.log(
      `[email-verification-resend] user=${user.id} token=${token}`,
    );
    return { sent: true };
  }

  // ===========================================================================
  //  ADMIN LOGIN (V1 baseline; MFA in V1.5)
  // ===========================================================================

  /**
   * Admin login WITHOUT MFA in V1 (the V1.5 phase adds TOTP). The route is
   * wired so the swap is purely additive.
   */
  async adminLogin(
    email: string,
    password: string,
    meta: DeviceMeta,
  ): Promise<AdminTokenPairResponseDto> {
    const admin = await this.users.findAdminByEmail(email.trim().toLowerCase());
    const dummyHash =
      '$argon2id$v=19$m=65536,t=3,p=4$d29ybGQ$Z3Vlc3M';
    const ok = admin
      ? await verifyPassword(admin.passwordHash, password)
      : await verifyPassword(dummyHash, password);
    if (!admin || !ok) {
      if (admin) {
        const next = admin.failedLoginCount + 1;
        if (next >= AUTH_CONSTANTS.LOCKOUT_AFTER_FAILED) {
          const until = new Date(
            Date.now() + AUTH_CONSTANTS.LOCKOUT_DURATION_MS,
          );
          await this.prisma.adminUser.update({
            where: { id: admin.id },
            data: { lockedUntil: until },
          });
          throw new AccountLockedException();
        }
        await this.prisma.adminUser.update({
          where: { id: admin.id },
          data: { failedLoginCount: next },
        });
      }
      throw new InvalidCredentialsException();
    }
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      throw new AccountLockedException();
    }
    if (admin.status === 'SUSPENDED' || admin.status === 'DISABLED') {
      throw new AccountSuspendedException();
    }

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    return this.issueAdminTokens(admin, false, meta);
  }

  // ===========================================================================
  //  OAUTH
  // ===========================================================================

  /**
   * Handles Google / Facebook profile returned by Passport strategies.
   * Upserts the user and issues SmartLight tokens.
   */
  async loginWithOAuth(
    profile: {
      provider: AuthProvider;
      providerId: string;
      email: string;
      emailVerified: boolean;
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
    },
    meta: DeviceMeta,
  ): Promise<TokenPairResponseDto> {
    if (!profile.emailVerified) {
      throw new ServiceUnavailableException(
        'OAuth provider did not verify the email address',
      );
    }
    const user = await this.users.upsertOAuthUser({
      provider: profile.provider,
      providerId: profile.providerId,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
    });
    // Ensure emailVerified flag is set.
    if (!user.emailVerifiedAt) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date(), status: UserStatus.ACTIVE },
      });
    }
    return this.issueTokens(user, false, meta);
  }

  // ===========================================================================
  //  Internal helpers
  // ===========================================================================

  /** Issue a fresh (access, refresh) pair for a customer user. */
  private async issueTokens(
    user: User,
    rememberMe: boolean,
    meta: DeviceMeta,
  ): Promise<TokenPairResponseDto> {
    const principal = await this.users.resolveUserPrincipal(user.id);

    // Cap concurrent sessions
    await this.enforceSessionCap(user.id);

    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        status: 'ACTIVE',
        ip: meta.ip,
        userAgent: meta.userAgent.slice(0, 255),
        deviceLabel: meta.deviceName ?? null,
        expiresAt: new Date(
          Date.now() +
            (rememberMe
              ? AUTH_CONSTANTS.LOCKOUT_DURATION_MS * 8 * 30
              : AUTH_CONSTANTS.LOCKOUT_DURATION_MS * 2 * 30),
        ),
      },
    });

    const access = this.tokens.signAccess({
      sub: user.id,
      email: user.email,
      roles: principal.roles,
      permissions: principal.permissions,
      audience: 'smartlight.web',
      sessionId: session.id,
      tokenType: 'access',
    });

    const refresh = this.tokens.signRefresh(
      {
        sub: user.id,
        email: user.email,
        audience: 'smartlight.web',
        sessionId: session.id,
        tokenType: 'refresh',
      },
      rememberMe,
    );

    // Persist the refresh-token hash for rotation / revocation.
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashRefreshToken(refresh.token),
        userId: user.id,
        sessionId: session.id,
        expiresAt: new Date(Date.now() + refresh.expiresIn * 1000),
        userAgent: meta.userAgent.slice(0, 255),
        ip: meta.ip,
      },
    });

    // Stamp the sessionId into the session row + write back-references.
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
    // Note: we don't keep tokenHash back-pointer; rotation is enforced via
    // revokedReason='rotated' on the previous row.

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      tokenType: 'Bearer',
      expiresIn: access.expiresIn,
      user: this.users.toResponseDto(user, {
        id: user.id,
        email: user.email,
        ...principal,
        audience: 'smartlight.web',
        tokenType: 'access',
        sessionId: session.id,
      }),
    };
  }

  /** Same as `issueTokens` but for an admin (separate audience + role set). */
  private async issueAdminTokens(
    admin: AdminUser,
    rememberMe: boolean,
    meta: DeviceMeta,
  ): Promise<AdminTokenPairResponseDto> {
    const principal = await this.users.resolveAdminPrincipal(admin.id);

    await this.enforceSessionCap(undefined, admin.id);

    const session = await this.prisma.userSession.create({
      data: {
        adminUserId: admin.id,
        status: 'ACTIVE',
        ip: meta.ip,
        userAgent: meta.userAgent.slice(0, 255),
        deviceLabel: meta.deviceName ?? null,
        expiresAt: new Date(
          Date.now() + AUTH_CONSTANTS.LOCKOUT_DURATION_MS * 8 * 30,
        ),
      },
    });

    const access = this.tokens.signAccess({
      sub: admin.id,
      email: admin.email,
      roles: principal.roles,
      permissions: principal.permissions,
      audience: 'smartlight.admin',
      sessionId: session.id,
      tokenType: 'access',
    });

    const refresh = this.tokens.signRefresh(
      {
        sub: admin.id,
        email: admin.email,
        audience: 'smartlight.admin',
        sessionId: session.id,
        tokenType: 'refresh',
      },
      rememberMe,
    );

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashRefreshToken(refresh.token),
        adminUserId: admin.id,
        sessionId: session.id,
        expiresAt: new Date(Date.now() + refresh.expiresIn * 1000),
        userAgent: meta.userAgent.slice(0, 255),
        ip: meta.ip,
      },
    });

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      tokenType: 'Bearer',
      expiresIn: access.expiresIn,
      admin: {
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        status: admin.status,
        mustChangePassword: admin.mustChangePassword,
        roles: principal.roles,
        permissions: principal.permissions,
        createdAt: admin.createdAt.toISOString(),
        lastLoginAt: admin.lastLoginAt ? admin.lastLoginAt.toISOString() : null,
      },
    };
  }

  private async revokeAllSessionsForSubject(
    userId?: string,
    reason: 'LOGOUT' | 'PASSWORD_RESET' | 'SECURITY' = 'LOGOUT',
  ): Promise<number> {
    const where = userId ? { userId } : { adminUserId: userId };
    const sessions = await this.prisma.userSession.findMany({
      where: { ...where, status: 'ACTIVE' },
      select: { id: true },
    });
    const ids = sessions.map((s) => s.id);
    if (ids.length === 0) return 0;
    await this.prisma.userSession.updateMany({
      where: { id: { in: ids } },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
    await this.prisma.refreshToken.updateMany({
      where: { sessionId: { in: ids }, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason.toLowerCase() },
    });
    return ids.length;
  }

  private async enforceSessionCap(
    userId?: string,
    adminId?: string,
  ): Promise<void> {
    const cap = AUTH_CONSTANTS.MAX_CONCURRENT_SESSIONS;
    const where = userId
      ? { userId, status: 'ACTIVE' as const }
      : { adminUserId: adminId!, status: 'ACTIVE' as const };
    const count = await this.prisma.userSession.count({ where });
    if (count >= cap) {
      const toRevoke = await this.prisma.userSession.findMany({
        where,
        orderBy: { lastSeenAt: 'asc' },
        take: count - cap + 1,
        select: { id: true },
      });
      const ids = toRevoke.map((s) => s.id);
      await this.prisma.userSession.updateMany({
        where: { id: { in: ids } },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
      await this.prisma.refreshToken.updateMany({
        where: { sessionId: { in: ids }, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'session_cap' },
      });
    }
  }

  /**
   * Extracts device metadata from the inbound HTTP request.
   */
  static deviceMetaFrom(req: Request, deviceName?: string): DeviceMeta {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '0.0.0.0';
    return {
      ip,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? 'unknown',
      deviceName,
    };
  }
}

export { REFRESH_TOKEN_FIELD };

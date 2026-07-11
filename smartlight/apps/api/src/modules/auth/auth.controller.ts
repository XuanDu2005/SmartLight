/**
 * Auth controller \u2014 REST endpoints for customer & admin authentication,
 * OAuth, and session management.
 *
 * Routes follow docs/04-api-design/AUTHENTICATION_API.md.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  AdminLoginDto,
  AdminVerifyMfaDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  RevokeSessionParamDto,
  VerifyEmailDto,
  isSupportedProvider,
} from './dto/auth-request.dto';
import {
  CurrentUserResponseDto,
  EmailVerifiedResponseDto,
  ListSessionsResponseDto,
  LogoutAllResponseDto,
  PasswordResetResponseDto,
  RegisterResponseDto,
  TokenPairResponseDto,
} from './dto/auth-response.dto';
import type { AdminTokenPairResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { UserPrincipal } from '../users/interfaces/user-principal.interface';
import type { RefreshTokenClaims } from '../../platform/security/token.service';
import { AUTH_CONSTANTS } from '../../platform/security/auth.constants';
import { generateRefreshToken } from '../../platform/security/token.util';
import { SWAGGER_BEARER_AUTH } from '../../config/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ===========================================================================
  //  Customer auth
  // ===========================================================================

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new customer account',
    description:
      'Creates a new customer user with a local credentials (email + password) account. ' +
      'A verification email is dispatched (logged in dev) and the account is ' +
      'in PENDING_VERIFICATION state until /auth/verify-email is called.',
  })
  @ApiResponse({ status: 201, description: 'Account created' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 422, description: 'Validation error (weak password, etc.)' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<RegisterResponseDto> {
    const meta = AuthService.deviceMetaFrom(req);
    const { user } = await this.auth.register(dto, meta);
    const projection = await this.auth.users.findById(user.id);
    return {
      user: this.auth.users.toResponseDto(projection!),
      emailVerificationSent: true,
      autoLogin: false,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Customer login',
    description:
      'Authenticates a customer by email + password. Issues a fresh access + refresh token pair ' +
      'and sets the refresh token as an HTTP-only cookie. Triggers account lockout after 5 failed ' +
      'attempts within 30 minutes.',
  })
  @ApiResponse({ status: 200, description: 'Token pair issued' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 423, description: 'Account locked' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenPairResponseDto> {
    const meta = AuthService.deviceMetaFrom(req, dto.deviceName);
    const result = await this.auth.login(
      dto.email,
      dto.password,
      Boolean(dto.rememberMe),
      meta,
    );
    this.setAuthCookies(res, result.refreshToken, result.accessToken);
    return result;
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate refresh token',
    description:
      'Exchanges a valid refresh token (cookie or body) for a new access+refresh pair. ' +
      'Implements theft detection: reuse of a previously-rotated token revokes ALL sessions ' +
      'for the subject.',
  })
  @ApiCookieAuth('smartlight.rt')
  @ApiResponse({ status: 200, description: 'Token pair issued' })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired' })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenPairResponseDto | AdminTokenPairResponseDto> {
    const raw =
      dto.refreshToken ??
      (req.cookies?.[AUTH_CONSTANTS.REFRESH_COOKIE_NAME] as string | undefined);
    if (!raw) {
      throw new UnauthorizedException('Refresh token missing');
    }
    const claims = req.user as unknown as RefreshTokenClaims;
    const meta = AuthService.deviceMetaFrom(req, dto.deviceName);
    const result = await this.auth.refresh(claims, raw, meta);
    this.setAuthCookies(res, result.refreshToken, result.accessToken);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiOperation({ summary: 'Logout the current session' })
  @ApiResponse({ status: 204, description: 'Session revoked' })
  async logout(
    @CurrentUser() user: UserPrincipal,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(user);
    this.clearAuthCookies(res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiOperation({ summary: 'Revoke every active session for the current user' })
  @ApiResponse({ status: 200, description: 'Sessions revoked' })
  async logoutAll(
    @CurrentUser() user: UserPrincipal,
  ): Promise<LogoutAllResponseDto> {
    return this.auth.logoutAll(user.id);
  }

  // ===========================================================================
  //  Password recovery
  // ===========================================================================

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a password-reset email',
    description:
      'Always returns success to avoid leaking account existence. In dev the reset ' +
      'token is logged to the application console.',
  })
  @ApiResponse({ status: 200, description: 'Reset email dispatched (if account exists)' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ sent: boolean }> {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with a valid reset token' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<PasswordResetResponseDto> {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiOperation({ summary: 'Change the password of the authenticated user' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<PasswordResetResponseDto> {
    return this.auth.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  // ===========================================================================
  //  Email verification
  // ===========================================================================

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify an email via the token sent at registration' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
  ): Promise<EmailVerifiedResponseDto> {
    return this.auth.verifyEmail(dto.token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-dispatch the verification email' })
  @ApiResponse({ status: 200, description: 'Verification email dispatched (if eligible)' })
  async resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<{ sent: boolean }> {
    return this.auth.resendVerification(dto.email);
  }

  // ===========================================================================
  //  Current user + session listing
  // ===========================================================================

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiOperation({
    summary: 'Get the currently authenticated user (or admin)',
    description:
      'Returns the User principal for customer tokens and the AdminUser ' +
      'principal for admin tokens. Audience is detected from the JWT.',
  })
  @ApiResponse({ status: 200, description: 'Current user payload' })
  async me(
    @CurrentUser() user: UserPrincipal,
  ): Promise<CurrentUserResponseDto | { admin: unknown }> {
    if (user.audience === 'smartlight.admin') {
      const admin = await this.auth.users.findAdminById(user.id);
      if (!admin) throw new UnauthorizedException('Admin no longer exists');
      const principal = await this.auth.users.resolveAdminPrincipal(
        admin.id,
      );
      return {
        admin: {
          id: admin.id,
          email: admin.email,
          displayName: admin.displayName,
          status: admin.status,
          mustChangePassword: admin.mustChangePassword,
          roles: principal.roles,
          permissions: principal.permissions,
          createdAt: admin.createdAt.toISOString(),
          lastLoginAt: admin.lastLoginAt
            ? admin.lastLoginAt.toISOString()
            : null,
        },
      };
    }
    const u = await this.auth.users.findById(user.id);
    if (!u) throw new UnauthorizedException('User no longer exists');
    return { user: this.auth.users.toResponseDto(u, user) };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiOperation({ summary: 'List active sessions for the current user' })
  @ApiResponse({ status: 200, description: 'Active sessions' })
  async listSessions(@Req() req: Request): Promise<ListSessionsResponseDto> {
    const user = req.user as UserPrincipal;
    const rows = await this.auth.prisma.userSession.findMany({
      where: {
        OR: [{ userId: user.id }, { adminUserId: user.id }],
        status: 'ACTIVE',
      },
      orderBy: { lastSeenAt: 'desc' },
    });
    return {
      data: rows.map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        ipAddress: s.ip,
        lastActiveAt: s.lastSeenAt.toISOString(),
        createdAt: s.issuedAt.toISOString(),
        isCurrent: s.id === user.sessionId,
      })),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiOperation({ summary: 'Revoke a single session (cannot revoke the current one)' })
  @ApiResponse({ status: 204, description: 'Session revoked' })
  @ApiResponse({ status: 400, description: 'Cannot revoke the current session' })
  async revokeSession(
    @Param() params: RevokeSessionParamDto,
    @CurrentUser() user: UserPrincipal,
  ): Promise<void> {
    if (params.id === user.sessionId) {
      throw new BadRequestException({
        code: 'CANNOT_REVOKE_CURRENT_SESSION',
        message: 'Use /v1/auth/logout to revoke the current session.',
      });
    }
    await this.auth.prisma.userSession.update({
      where: { id: params.id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
    await this.auth.prisma.refreshToken.updateMany({
      where: { sessionId: params.id, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'session_revoked' },
    });
  }

  // ===========================================================================
  //  Admin
  // ===========================================================================

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login (no MFA in V1)' })
  @ApiResponse({ status: 200, description: 'Admin token pair issued' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async adminLogin(
    @Body() dto: AdminLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AdminTokenPairResponseDto> {
    const meta = AuthService.deviceMetaFrom(req, dto.deviceName);
    const result = await this.auth.adminLogin(
      dto.email,
      dto.password,
      meta,
    );
    this.setAuthCookies(res, result.refreshToken, result.accessToken);
    return result;
  }

  @Public()
  @Post('admin/mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify admin MFA (reserved — not yet implemented in V1)' })
  async adminVerifyMfa(
    @Body() _dto: AdminVerifyMfaDto,
  ): Promise<{ status: 'mfa_not_implemented' }> {
    // V1.5 will implement TOTP. In V1 admin MFA is not yet required.
    return { status: 'mfa_not_implemented' };
  }

  // ===========================================================================
  //  OAuth
  // ===========================================================================

  /**
   * Initiates the provider flow. Passport redirects automatically.
   * The optional `?state=` and `?redirectUri=` query params are stored in a
   * short-lived cookie and consumed by the callback.
   */
  @Public()
  @Get('oauth/:provider/authorize')
  @ApiOperation({ summary: 'Start an OAuth flow (Google / Facebook)' })
  async oauthAuthorize(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!isSupportedProvider(provider)) {
      res.status(404).json({
        error: {
          code: 'UNSUPPORTED_PROVIDER',
          message: `Unsupported OAuth provider: ${provider}`,
          traceId: 'oauth-' + Date.now(),
          timestamp: new Date().toISOString(),
          path: req.url,
        },
      });
      return;
    }
    const state = generateRefreshToken(); // reuse: 32 random bytes
    res.cookie('sl_oauth_state', state, {
      httpOnly: true,
      secure: this.isProd(),
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      path: '/v1/auth/oauth',
    });
    const target =
      provider === 'google'
        ? `/v1/auth/oauth/google`
        : `/v1/auth/oauth/facebook`;
    res.redirect(302, target);
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('oauth/google')
  @ApiOperation({ summary: 'Google OAuth entry point (Passport-managed redirect)' })
  google(): void {
    // Passport handles the redirect.
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('oauth/google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects to FRONTEND_BASE_URL/oauth/callback' })
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const profile = req.user as unknown as {
      provider: 'google';
      providerId: string;
      email: string;
      emailVerified: boolean;
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
    };
    const meta = AuthService.deviceMetaFrom(req);
    const result = await this.auth.loginWithOAuth(
      { ...profile, provider: 'GOOGLE' as const },
      meta,
    );
    this.redirectWithTokens(res, result);
  }

  @Public()
  @UseGuards(FacebookAuthGuard)
  @Get('oauth/facebook')
  @ApiOperation({ summary: 'Facebook OAuth entry point (Passport-managed redirect)' })
  facebook(): void {
    // Passport handles the redirect.
  }

  @Public()
  @UseGuards(FacebookAuthGuard)
  @Get('oauth/facebook/callback')
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects to FRONTEND_BASE_URL/oauth/callback' })
  async facebookCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const profile = req.user as unknown as {
      provider: 'facebook';
      providerId: string;
      email: string;
      emailVerified: boolean;
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
    };
    const meta = AuthService.deviceMetaFrom(req);
    const result = await this.auth.loginWithOAuth(
      { ...profile, provider: 'FACEBOOK' as const },
      meta,
    );
    this.redirectWithTokens(res, result);
  }

  // ===========================================================================
  //  Helpers
  // ===========================================================================

  private setAuthCookies(res: Response, refresh: string, access: string): void {
    const prod = this.isProd();
    res.cookie(AUTH_CONSTANTS.REFRESH_COOKIE_NAME, refresh, {
      httpOnly: true,
      secure: prod,
      sameSite: 'lax',
      path: '/v1/auth',
      maxAge: AUTH_CONSTANTS.PASSWORD_RESET_TTL_MS * 24 * 7, // 7 days default
    });
    res.cookie(AUTH_CONSTANTS.ACCESS_COOKIE_NAME, access, {
      httpOnly: true,
      secure: prod,
      sameSite: 'lax',
      path: '/',
      maxAge: AUTH_CONSTANTS.PASSWORD_RESET_TTL_MS * 0.25, // ~15 min
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie(AUTH_CONSTANTS.REFRESH_COOKIE_NAME, { path: '/v1/auth' });
    res.clearCookie(AUTH_CONSTANTS.ACCESS_COOKIE_NAME, { path: '/' });
  }

  private isProd(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private redirectWithTokens(res: Response, pair: TokenPairResponseDto): void {
    const base = this.config.get<string>('FRONTEND_BASE_URL') ?? '';
    const url = new URL('/oauth/callback', base);
    url.searchParams.set('access_token', pair.accessToken);
    url.searchParams.set('refresh_token', pair.refreshToken);
    url.searchParams.set('expires_in', String(pair.expiresIn));
    res.redirect(302, url.toString());
  }
}


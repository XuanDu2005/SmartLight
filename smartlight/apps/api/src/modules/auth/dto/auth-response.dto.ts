/**
 * Response DTOs returned by the auth controller.
 *
 * Mirrors the shape defined in docs/04-api-design/AUTHENTICATION_API.md
 * section 6.
 */
import type { UserResponseDto } from '../../users/dto/user-response.dto';

export interface AdminUserResponseDto {
  id: string;
  email: string;
  displayName: string;
  status: string;
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminTokenPairResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  admin: AdminUserResponseDto;
}

export interface TokenPairResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: UserResponseDto;
}

export interface CurrentUserResponseDto {
  user: UserResponseDto;
}

export interface LogoutAllResponseDto {
  revokedSessions: number;
}

export interface RegisterResponseDto {
  user: UserResponseDto;
  emailVerificationSent: boolean;
  autoLogin: false;
}

export interface PasswordResetResponseDto {
  passwordChanged: true;
}

export interface EmailVerifiedResponseDto {
  emailVerified: true;
}

export interface VerifyResetTokenResponseDto {
  sent: boolean;
}

export interface AdminMfaRequiredResponseDto {
  mfaRequired: true;
  mfaToken: string;
}

export interface SessionDto {
  id: string;
  userAgent: string;
  ipAddress: string;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface ListSessionsResponseDto {
  data: SessionDto[];
}
/**
 * Request DTOs \u2014 validated by class-validator before reaching the service.
 * Spec source: docs/04-api-design/AUTHENTICATION_API.md
 */
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/** Capped max-length decorator helper. */
function MaxLength128(): PropertyDecorator {
  return MaxLength(128);
}

export class RegisterDto {
  @IsEmail({}, { message: 'INVALID_EMAIL' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'WEAK_PASSWORD' })
  @MaxLength128()
  password!: string;

  @IsString()
  @Length(1, 100)
  firstName!: string;

  @IsString()
  @Length(1, 100)
  lastName!: string;

  @IsOptional()
  @Matches(/^\+?\d{8,15}$/, { message: 'INVALID_PHONE' })
  phone?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsBoolean()
  acceptTerms!: boolean;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
}

export class LoginDto {
  @IsEmail({}, { message: 'INVALID_EMAIL' })
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  deviceName?: string;
}

export class RefreshDto {
  /** Only used by mobile clients; web clients rely on the HTTP-only cookie. */
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  deviceName?: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'INVALID_EMAIL' })
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(10)
  token!: string;

  @IsString()
  @MinLength(8, { message: 'WEAK_PASSWORD' })
  @MaxLength128()
  newPassword!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'WEAK_PASSWORD' })
  @MaxLength128()
  newPassword!: string;
}

export class VerifyEmailDto {
  @IsString()
  @MinLength(10)
  token!: string;
}

export class ResendVerificationDto {
  @IsEmail({}, { message: 'INVALID_EMAIL' })
  email!: string;
}

// ---- Admin ----

export class AdminLoginDto {
  @IsEmail({}, { message: 'INVALID_EMAIL' })
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(6, 8)
  mfaCode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  deviceName?: string;
}

export class AdminVerifyMfaDto {
  @IsString()
  @MinLength(10)
  mfaToken!: string;

  @ValidateIf((o) => !o.recoveryCode)
  @IsString()
  @Length(6, 8)
  code?: string;

  @ValidateIf((o) => !o.code)
  @IsString()
  @Length(8, 32)
  recoveryCode?: string;
}

// ---- OAuth callback query (handled separately, but typed here) ----

export class OAuthCallbackQueryDto {
  @IsString()
  code!: string;

  @IsString()
  state!: string;
}

// --------------------------------------------------------------------------
//  Helpers
// --------------------------------------------------------------------------

export class LogoutDto {
  /** Optional: when supplied, revoke only this session (otherwise current). */
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class RevokeSessionParamDto {
  @IsString()
  @Length(1, 64)
  id!: string;
}

export const SUPPORTED_LOCALES = ['vi-VN', 'en-US'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'vi-VN';

export function normalizeLocale(input?: string): SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(input ?? '')
    ? (input as SupportedLocale)
    : DEFAULT_LOCALE;
}

export const SUPPORTED_PROVIDERS = ['google', 'facebook'] as const;
export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];
export function isSupportedProvider(p: string): p is SupportedProvider {
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(p);
}

export const SUPPORTED_AUDIENCES = ['smartlight.web', 'smartlight.admin'] as const;
export type SupportedAudience = (typeof SUPPORTED_AUDIENCES)[number];
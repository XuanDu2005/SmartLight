/**
 * Environment variable validation (class-validator).
 *
 * Runs an early, fail-fast check on the process environment. The API
 * refuses to bootstrap if any REQUIRED variable is missing. Optional
 * variables (payment gateways, etc.) are checked but never fail boot.
 *
 * This module is a defensive belt-and-braces check on top of the
 * Zod-based config package (`@smartlight/config`) which already
 * performs its own validation at the typed-env-loader level. Running
 * a class-validator pass here is explicitly requested by the Phase 17.5
 * stabilisation brief.
 *
 * Mapping vs. existing env:
 *   The Phase 17.5 brief calls for a single `JWT_SECRET` variable. The
 *   current TokenService uses `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
 *   (two distinct HS256 keys for access vs. refresh). To stay backward
 *   compatible we accept ANY of the three as the "JWT secret" presence
 *   signal, and additionally validate the two granular ones when
 *   `JWT_SECRET` is not set.
 */
import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnvironment {
  DEVELOPMENT = 'development',
  PREVIEW = 'preview',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

export class ApiEnvironment {
  // ----- Runtime -----

  @IsEnum(NodeEnvironment, {
    message: 'NODE_ENV must be one of: development, preview, staging, production, test',
  })
  @IsOptional()
  NODE_ENV: NodeEnvironment = NodeEnvironment.DEVELOPMENT;

  // ----- Database (REQUIRED) -----

  @IsString({ message: 'DATABASE_URL must be a non-empty string' })
  @IsNotEmpty({ message: 'DATABASE_URL is required' })
  DATABASE_URL!: string;

  // ----- JWT signing key (REQUIRED) -----

  /**
   * Phase 17.5 brief uses the single name `JWT_SECRET`. The codebase
   * ships with the split `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`.
   * We accept EITHER shape: if `JWT_SECRET` is set, it is treated as
   * the access secret (the split pair takes precedence when present).
   * At least ONE of {JWT_SECRET, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET}
   * must be present.
   */
  @IsString()
  @IsOptional()
  @MinLength(16, { message: 'JWT_SECRET must be at least 16 characters' })
  JWT_SECRET?: string;

  @IsString()
  @IsOptional()
  @MinLength(16, { message: 'JWT_ACCESS_SECRET must be at least 16 characters' })
  JWT_ACCESS_SECRET?: string;

  @IsString()
  @IsOptional()
  @MinLength(16, { message: 'JWT_REFRESH_SECRET must be at least 16 characters' })
  JWT_REFRESH_SECRET?: string;

  // ----- Redis (REQUIRED) -----

  @IsString({ message: 'REDIS_URL must be a non-empty string' })
  @IsNotEmpty({ message: 'REDIS_URL is required' })
  REDIS_URL!: string;

  // ----- API (optional but useful) -----

  @IsInt({ message: 'API_PORT must be an integer' })
  @IsOptional()
  API_PORT?: number;

  @IsString({ message: 'API_BASE_URL must be a non-empty string' })
  @Matches(/^(https?:\/\/)[^\s]+$/i, {
    message: 'API_BASE_URL must be a valid http(s) URL',
  })
  @IsOptional()
  API_BASE_URL?: string;

  @IsString()
  @IsOptional()
  API_CORS_ORIGINS?: string;

  // ----- JWT TTLs (optional) -----

  @IsInt()
  @IsOptional()
  JWT_ACCESS_TTL_SEC?: number;

  @IsInt()
  @IsOptional()
  JWT_REFRESH_TTL_SEC?: number;

  @IsInt()
  @IsOptional()
  JWT_REMEMBER_ME_TTL_SEC?: number;

  // ----- OAuth (optional) -----

  @IsString()
  @IsOptional()
  GOOGLE_OAUTH_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  GOOGLE_OAUTH_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  FACEBOOK_OAUTH_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  FACEBOOK_OAUTH_CLIENT_SECRET?: string;

  // ----- Payment gateways (optional) -----

  @IsString()
  @IsOptional()
  MOMO_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  MOMO_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  MOMO_PARTNER_CODE?: string;

  @IsString()
  @IsOptional()
  VNPAY_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  VNPAY_HASH_SECRET?: string;

  @IsString()
  @IsOptional()
  VNPAY_TMN_CODE?: string;

  @IsString()
  @IsOptional()
  PAYPAL_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  PAYPAL_CLIENT_SECRET?: string;

  // ----- Email (optional) -----

  @IsString()
  @IsOptional()
  RESEND_API_KEY?: string;

  // ----- Storage (optional) -----

  @IsString()
  @IsOptional()
  CLOUDINARY_CLOUD_NAME?: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_KEY?: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_SECRET?: string;

  // ----- Demo seed -----

  @IsString()
  @IsOptional()
  SUPER_ADMIN_EMAIL?: string;

  @IsString()
  @IsOptional()
  SUPER_ADMIN_PASSWORD?: string;

  // ----- Feature flags -----

  @IsBoolean()
  @IsOptional()
  DEMO_SEED_ENABLED?: boolean;
}

export interface EnvironmentValidationResult {
  ok: boolean;
  errors: string[];
  missing: string[];
  warnings: string[];
  env: ApiEnvironment;
}

/**
 * Run the class-validator pass on `process.env`.
 *
 * @param source Optional override; defaults to process.env
 * @returns Validation result with a typed `env` instance when ok
 */
export function validateEnv(source: NodeJS.ProcessEnv = process.env): EnvironmentValidationResult {
  // Filter to known keys to avoid noise from unrelated process vars.
  const allowed = new Set<string>([
    'NODE_ENV',
    'DATABASE_URL',
    'DIRECT_URL',
    'JWT_SECRET',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'REDIS_URL',
    'API_PORT',
    'API_BASE_URL',
    'API_CORS_ORIGINS',
    'JWT_ACCESS_TTL_SEC',
    'JWT_REFRESH_TTL_SEC',
    'JWT_REMEMBER_ME_TTL_SEC',
    'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_SECRET',
    'GOOGLE_OAUTH_CALLBACK_URL',
    'FACEBOOK_OAUTH_CLIENT_ID',
    'FACEBOOK_OAUTH_CLIENT_SECRET',
    'FACEBOOK_OAUTH_CALLBACK_URL',
    'FRONTEND_BASE_URL',
    'ADMIN_BASE_URL',
    'MOMO_SECRET_KEY',
    'MOMO_ACCESS_KEY',
    'MOMO_PARTNER_CODE',
    'VNPAY_SECRET_KEY',
    'VNPAY_HASH_SECRET',
    'VNPAY_TMN_CODE',
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'SUPER_ADMIN_EMAIL',
    'SUPER_ADMIN_PASSWORD',
    'DEMO_SEED_ENABLED',
    'THROTTLE_TTL_SEC',
    'THROTTLE_LIMIT',
    'STORAGE_PROVIDER',
  ]);
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(source)) {
    if (!allowed.has(k)) continue;
    if (v === undefined) continue;
    filtered[k] = String(v);
  }

  const inst = plainToInstance(ApiEnvironment, filtered, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(inst, {
    skipMissingProperties: false,
    whitelist: false,
    forbidUnknownValues: false,
  });

  const messages = errors
    .map((e) => formatError(e))
    .filter((m): m is string => Boolean(m));

  // Cross-field: at least one JWT secret must be present.
  if (!inst.JWT_SECRET && !inst.JWT_ACCESS_SECRET && !inst.JWT_REFRESH_SECRET) {
    messages.push(
      'At least one of JWT_SECRET, JWT_ACCESS_SECRET, or JWT_REFRESH_SECRET is required',
    );
  }

  const missing = collectMissing(inst);

  // Soft warnings: recommended-but-not-required values.
  const warnings: string[] = [];
  if (!inst.API_BASE_URL) {
    warnings.push('API_BASE_URL is not set — defaulting to http://localhost:4000');
  }
  if (!inst.API_CORS_ORIGINS) {
    warnings.push(
      'API_CORS_ORIGINS is not set — defaulting to http://localhost:5173,http://localhost:5174',
    );
  }
  if (inst.NODE_ENV === NodeEnvironment.PRODUCTION) {
    if (!inst.RESEND_API_KEY) {
      warnings.push(
        'RESEND_API_KEY is not set — transactional emails will be logged but never sent in production',
      );
    }
    if (!inst.JWT_ACCESS_SECRET || !inst.JWT_REFRESH_SECRET) {
      warnings.push(
        'Production is using the single JWT_SECRET — recommended to use the split JWT_ACCESS_SECRET / JWT_REFRESH_SECRET pair',
      );
    }
  }

  return {
    ok: messages.length === 0,
    errors: messages,
    missing,
    warnings,
    env: inst,
  };
}

function collectMissing(env: ApiEnvironment): string[] {
  const missing: string[] = [];
  if (!env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!env.REDIS_URL) missing.push('REDIS_URL');
  if (!env.JWT_SECRET && !env.JWT_ACCESS_SECRET && !env.JWT_REFRESH_SECRET) {
    missing.push('JWT_SECRET (or JWT_ACCESS_SECRET + JWT_REFRESH_SECRET)');
  }
  return missing;
}

function formatError(e: import('class-validator').ValidationError): string | null {
  if (!e.constraints) return null;
  const msgs = Object.values(e.constraints);
  if (msgs.length === 0) return null;
  return `${e.property}: ${msgs.join('; ')}`;
}

/**
 * Convenience helper: validate and throw on failure.
 * Use this in `main.ts` BEFORE `NestFactory.create()` to fail fast.
 */
export function assertValidEnv(source?: NodeJS.ProcessEnv): ApiEnvironment {
  const result = validateEnv(source);
  for (const w of result.warnings) {
    // eslint-disable-next-line no-console
    console.warn(`[env-validation] WARN: ${w}`);
  }
  if (!result.ok) {
    const banner = [
      '',
      '============================================================',
      ' SmartLight API — environment validation FAILED',
      '============================================================',
      ' Missing required variables:',
      ...result.missing.map((m) => `   - ${m}`),
      '',
      ' Validation errors:',
      ...result.errors.map((m) => `   - ${m}`),
      '============================================================',
      '',
    ].join('\n');
    // eslint-disable-next-line no-console
    console.error(banner);
    throw new Error(
      `Environment validation failed (${result.errors.length} error(s), ${result.missing.length} missing). ` +
        'See logs above for details.',
    );
  }
  return result.env;
}

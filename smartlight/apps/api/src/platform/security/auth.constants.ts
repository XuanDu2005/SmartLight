/**
 * Centralised auth constants.
 *
 * Used by both the auth and user modules. Keeping them in `platform/security`
 * ensures they are referenced consistently across guards, services, and DTOs.
 */

export const AUTH_CONSTANTS = Object.freeze({
  /** JWT issuer (must match validate() in JwtStrategy). */
  JWT_ISSUER: 'smartlight.api',
  /** JWT audience. */
  JWT_AUDIENCE: 'smartlight.web',

  /** Refresh-token cookie name (web clients only). */
  REFRESH_COOKIE_NAME: 'sl_refresh',
  /** Access-token cookie name (web clients only). */
  ACCESS_COOKIE_NAME: 'sl_access',

  /** Header carrying the current session id. */
  SESSION_HEADER: 'x-session-id',

  /** Maximum number of concurrent active sessions per user. */
  MAX_CONCURRENT_SESSIONS: 10,

  /** Account lockout thresholds (per docs/06_SECURITY_ARCHITECTURE.md \u00a73.6). */
  LOCKOUT_AFTER_FAILED: 5,
  LOCKOUT_WINDOW_MS: 15 * 60 * 1000,
  LOCKOUT_DURATION_MS: 30 * 60 * 1000,

  /** Password reset & email verification token TTL (ms). */
  PASSWORD_RESET_TTL_MS: 60 * 60 * 1000,
  EMAIL_VERIFY_TTL_MS: 24 * 60 * 60 * 1000,

  /** Verification token length. */
  VERIFICATION_TOKEN_BYTES: 32,

  /** CSRF cookie / header names. */
  CSRF_COOKIE_NAME: 'sl_csrf',
  CSRF_HEADER: 'x-csrf-token',
} as const);
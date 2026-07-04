/**
 * Secure random string + SHA-256 hash helpers used by the refresh-token service.
 *
 * Refresh tokens are opaque random strings (NOT JWTs) so they can be
 * instantly revoked server-side by deleting their hash from the DB.
 *
 * Per docs/05-software-architecture/06_SECURITY_ARCHITECTURE.md \u00a73.3.
 */
import { randomBytes, createHash } from 'node:crypto';

export const REFRESH_TOKEN_BYTES = 32; // 256-bit

/** Opaque, base64url-encoded refresh token (returned to client). */
export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

/** SHA-256 hex digest \u2014 stored in DB. Never reverse the hash. */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time string compare to prevent timing attacks on hash lookup. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
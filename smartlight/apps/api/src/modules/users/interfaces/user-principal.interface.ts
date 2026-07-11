/**
 * Authenticated principal type.
 *
 * Attached to the request by JwtAuthGuard / JwtRefreshGuard / OAuth guards.
 * Service code uses `@CurrentUser()` to access it.
 *
 * Compatible with the future microservice cut: the principal is shaped the
 * same way across HTTP, RPC, and message queues.
 */
export interface UserPrincipal {
  /** Subject \u2014 user id (cuid in V1; UUID v7 in V2). */
  id: string;
  email: string;
  /** Resolved role codes (e.g. ["customer"], ["super_admin"]). */
  roles: string[];
  /** Resolved permission codes for fast guard checks. */
  permissions: string[];
  /** Active session id (when applicable). */
  sessionId?: string;
  /** Issuer audience \u2014 distinguishes customer vs admin tokens. */
  audience: 'smartlight.web' | 'smartlight.admin';
  /** Token type \u2014 access vs refresh. */
  tokenType: 'access' | 'refresh';
}

/** Minimal request-extension shape used by guards & decorators. */
export interface AuthenticatedRequest extends Express.Request {
  user: UserPrincipal;
}

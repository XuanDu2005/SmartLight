# Security Hardening — Phase 20

This document describes the security controls in place for the SmartLight API.

## 1. Transport Security

| Control | Where | Notes |
|---|---|---|
| HTTPS only (production) | nginx reverse proxy | TLS 1.2 + 1.3, modern ciphers |
| HSTS preload | nginx + Helmet | 2-year `max-age`, `includeSubDomains`, `preload` |
| HTTP → HTTPS redirect | nginx | 301 with `Cache-Control: no-store` |

The API itself is **not** exposed to the public internet — only nginx is.

## 2. Authentication

- JWT access tokens (15 min) + refresh tokens (7 d, HttpOnly + Secure cookie)
- Argon2id password hashing
- OAuth (Google, Facebook) — PKCE flow for SPAs
- Refresh-token rotation on each `/auth/refresh`
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — minimum 64 random bytes each, rotated per environment

## 3. Authorization

- `@Roles()` + `RolesGuard` for role-based access control
- `@Permissions()` + `PermissionsGuard` for fine-grained ABAC
- `@Public()` decorator for unauthenticated endpoints
- Guard order: throttle → JWT → roles → permissions

## 4. Input Validation

- `class-validator` on every DTO (`ValidationPipe` global, with `whitelist: true` and `forbidNonWhitelisted: true`)
- Body size limit: 10 MB at the nginx gateway + 100 KB JSON default at the app
- File uploads (when added) — separate Multer config with explicit MIME / size limits

## 5. Rate Limiting

Two layers:

1. **Nginx layer** (per-IP, very fast): `web_rl` 50 r/s, `api_rl` 30 r/s, `auth_rl` 5 r/s.
2. **NestJS Throttler** (per-user + per-IP, slower): configurable via `THROTTLE_LIMIT` / `THROTTLE_TTL_SEC`.

Auth endpoints have a tighter limit (5 r/s) to defend against credential stuffing.

## 6. Headers

| Header | Value | Set by |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | nginx |
| `X-Frame-Options` | `DENY` (admin) / `SAMEORIGIN` (web) | nginx |
| `X-Content-Type-Options` | `nosniff` | nginx + Helmet |
| `X-XSS-Protection` | `1; mode=block` | nginx + Helmet |
| `Referrer-Policy` | `no-referrer` (admin) / `strict-origin-when-cross-origin` (web) | nginx + Helmet |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | nginx + Helmet |
| `Content-Security-Policy` | Per-app | nginx |
| `X-Powered-By` | (removed) | Helmet `hidePoweredBy: true` |
| `Cross-Origin-Resource-Policy` | `cross-origin` | Helmet |

## 7. CORS

`API_CORS_ORIGINS` is a comma-separated allowlist of allowed origins. Requests
with disallowed origins are rejected before any handler runs. `credentials: true`
enables cookie / Authorization transport. Preflight cache: 600s.

## 8. Cookies

- `HttpOnly` (no JS access) — required for refresh tokens
- `Secure` (HTTPS-only) in production
- `SameSite=Lax` by default, `Strict` for sensitive flows
- `Path=/auth/refresh` scope limitation

## 9. Logging Redaction

Pino is configured to redact 23 paths covering passwords, tokens, secrets,
cookies, and authorization headers. See `platform/logger/logger.config.ts`.

## 10. Database

- All queries use parameterized inputs (Prisma) — no raw SQL string concat
- Read replicas for read-heavy endpoints (V1.1)
- Connection pool tuned per service tier

## 11. CSRF (Recommendations)

The current API uses bearer-token access (Authorization header) + refresh
cookies. Since the access token is not auto-attached by the browser, classic
CSRF is mitigated. **However**, the refresh-cookie is auto-attached.

**Recommended CSRF protections:**

1. **SameSite=Strict** on the refresh cookie (most browser-supported mitigation).
2. **Origin / Referer check** on state-changing endpoints — reject if the
   `Origin` header is not in the allowlist. Add this to a new middleware.
3. **Double-submit token** for the most sensitive flows (password change,
   payment confirmation) — client reads a CSRF token from a non-HttpOnly
   cookie and echoes it in `X-CSRF-Token`. The server compares.
4. **Reauth** for destructive actions — short-lived `X-Reauth-Token` issued
   by `/auth/reauth` after password re-entry.

The `X-CSRF-Token` and `X-Reauth-Token` headers are already allowlisted in
CORS — only the verification logic needs to be added in V1.1.

## 12. Compression

`compression` middleware is applied globally with a 1 KB threshold. Responses
smaller than 1 KB are not compressed (CPU cost > saved bytes). Already-encoded
bodies are not double-compressed.

## 13. Secure-by-default Headers via Helmet

```ts
helmet({
  contentSecurityPolicy: false,      // JSON-only API; CSP at the frontends
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hidePoweredBy: true,
  noSniff: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  hsts: isProd ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false,
});
```

## 14. Future Work (V1.1+)

- Web Application Firewall (Cloudflare / ModSecurity)
- WAF-managed bot detection
- Penetration test before GA
- SOC 2 / ISO 27001 controls for enterprise customers
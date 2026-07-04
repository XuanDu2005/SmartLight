# 06 — Security Architecture

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document describes the **end-to-end security architecture** for SmartLight. It covers authentication, secrets management, transport security, hardening headers, input validation, output sanitization, and the threats the system mitigates.

> Authorization (RBAC) is described in `07_AUTHORIZATION_ARCHITECTURE.md`.

---

## 2. Security Principles

1. **Defense in depth** — multiple layers; no single point of failure.
2. **Least privilege** — every component / user gets only what it needs.
3. **Secure by default** — opt-in to insecurity, never opt-out.
4. **Zero trust** — every request is authenticated and authorized.
5. **PDPD / GDPR aligned** — privacy by design.
6. **Audit everything** — sensitive actions logged.
7. **Fail closed** — on error, deny access.

---

## 3. Authentication

### 3.1 Strategy

| Concern | Mechanism |
|---|---|
| Customer | Email + Password (Argon2id) + JWT Access + Refresh |
| Admin | Email + Password + MFA (TOTP) + JWT Access + Refresh |
| Service-to-service | API Key (V1.5+); mTLS (V2 K8s) |
| Webhook | HMAC signature per provider |
| OAuth (V1.5) | Google, Facebook |

### 3.2 JWT Access Token

| Field | Value |
|---|---|
| Algorithm | HS256 (V1) / RS256 (V2 with JWKS) |
| Issuer | `smartlight.api` |
| Audience | `smartlight.web` (and `smartlight.admin`, `smartlight.mobile`) |
| TTL | 15 minutes |
| Claims | `sub` (userId), `email`, `roles`, `iat`, `exp`, `iss`, `aud` |
| Storage (server) | None (stateless) |
| Storage (client) | Memory or sessionStorage (NOT localStorage) |

### 3.3 Refresh Token

| Field | Value |
|---|---|
| Format | Opaque random string (32 bytes base64url) |
| Storage (server) | SHA-256 hash in DB |
| TTL | 7 days (default); 30 days with "remember me" |
| Rotation | Yes — old token revoked on refresh |
| Theft detection | Reuse of rotated token → revoke all sessions |
| Cookie | HTTP-only, Secure, SameSite=Lax |

### 3.4 Password Hashing

| Setting | Value |
|---|---|
| Algorithm | Argon2id |
| Memory cost | 64 MB |
| Time cost | 3 iterations |
| Parallelism | 4 |
| Salt length | 16 bytes (random) |
| Hash length | 32 bytes |

### 3.5 MFA (Admin only in V1)

| Factor | TOTP (RFC 6238) |
|---|---|
| Issuer | SmartLight |
| QR | Generated on setup |
| Recovery codes | 10 single-use codes; stored hashed |
| Required | Yes for all admin roles |
| Enrollment grace | 24 hours on first login |

### 3.6 Account Lockout

| Trigger | Action |
|---|---|
| 5 failed logins in 15 min | Lock 30 min |
| 10 failed logins in 1 hour | Lock 24 hours |
| 25+ failed (auto-detected) | Lock + alert |

### 3.7 Session Management

| Feature | Implementation |
|---|---|
| Active session list | Visible at `/auth/sessions` |
| Revoke individual | `DELETE /auth/sessions/{id}` |
| Revoke all | `POST /auth/logout-all` |
| Concurrent limit | 10 sessions per user |
| Idle timeout | 7 days (refresh expiry) |

---

## 4. Authorization

See `07_AUTHORIZATION_ARCHITECTURE.md` for full RBAC model.

| Layer | Mechanism |
|---|---|
| Endpoint-level | `@Roles()` decorator + RolesGuard |
| Resource-level | Application service checks `userId === owner.id` |
| Field-level | Sensitive fields excluded from response DTOs |
| Admin | Permission codes checked by `PermissionGuard` |

---

## 5. Transport Security

### 5.1 TLS Everywhere

| Channel | Requirement |
|---|---|
| Client → API | TLS 1.2+ required (no HTTP fallback) |
| API → PostgreSQL | TLS required (Neon default) |
| API → Redis | TLS required (Upstash default) |
| API → Cloudinary | HTTPS only |
| API → Payment providers | TLS 1.2+ (provider default) |

### 5.2 HSTS

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 6. Security Headers

Applied globally via Helmet:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; ...
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

> Admin portal has stricter CSP than storefront.

---

## 7. CORS

| Origin | Allowed |
|---|---|
| `https://smartlight.vn` | Yes |
| `https://admin.smartlight.vn` | Yes |
| `https://staging.smartlight.vn` | Yes |
| `http://localhost:3000` (dev) | Yes |
| Wildcard | **No** (V1) |

```
Access-Control-Allow-Origin: <specific>
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, Accept, Accept-Language, Idempotency-Key, X-Request-ID, X-Client, X-Client-Version
Access-Control-Expose-Headers: X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Location, Idempotency-Replay
Access-Control-Max-Age: 86400
```

---

## 8. Input Validation

### 8.1 Strategy

| Layer | Validation |
|---|---|
| **DTO** | class-validator decorators; rejected at pipe |
| **Domain** | Aggregate invariants checked inside methods |
| **Database** | CHECK constraints; FK enforcement |
| **External** | Adapter-level sanity checks |

### 8.2 Validation Examples

```
@IsEmail()
@MaxLength(255)
email: string;

@IsString()
@MinLength(8)
@MaxLength(128)
password: string;

@IsInt()
@Min(1)
@Max(99)
quantity: number;

@IsEnum(VietnameseProvince)
province: string;
```

### 8.3 Vietnamese-Specific Validation

- Phone: `+84` format
- Postal code: 5–6 digits
- Province/District/Ward: validated against reference data
- ID number (when used): 9 or 12 digits
- Tax code (business): 10 or 13 digits

---

## 9. Output Sanitization

| Concern | Mechanism |
|---|---|
| XSS in JSON | React's default escaping + content-type enforcement |
| XSS in HTML emails | Server-side sanitization (DOMPurify or sanitize-html) |
| SQL injection | Prisma parameterized queries only (no `$queryRawUnsafe`) |
| NoSQL injection | Prisma typed queries; no string concatenation |
| LDAP injection | N/A (no LDAP) |
| Sensitive data in logs | Pino redact list |
| Sensitive data in error responses | Generic messages + `traceId` |

---

## 10. CSRF Protection

### 10.1 Strategy

For cookie-based auth (refresh token), CSRF token required for state-changing requests:

| Header | Value |
|---|---|
| `X-CSRF-Token` | Token issued by `/auth/csrf` |

### 10.2 When Required

- Any POST/PUT/PATCH/DELETE that relies on cookie-based auth
- Not required for bearer-token-only flows

### 10.3 Token Generation

- Generated on `GET /auth/csrf`
- Stored in session
- HMAC-signed with session secret

---

## 11. SQL Injection Prevention

| Rule | Implementation |
|---|---|
| Use Prisma typed queries | Always |
| No raw SQL with string interpolation | Banned by ESLint |
| If raw SQL needed | `$queryRaw` with tagged template literals only |
| Input validation upstream | class-validator |
| Database user privilege | Least privilege (no superuser) |

---

## 12. XSS Protection

| Layer | Defense |
|---|---|
| React | Default JSX escaping; `dangerouslySetInnerHTML` banned by lint |
| Email | Sanitize HTML; only allow whitelisted tags |
| Admin WYSIWYG | Sanitize HTML on save |
| API responses | No HTML, only JSON |
| URLs | Allow-list for redirect targets |

---

## 13. Rate Limiting

See `docs/04-api-design/RATE_LIMITING.md`. Implementation:

| Concern | Mechanism |
|---|---|
| In-process (V1) | NestJS ThrottlerGuard |
| Distributed (V1.5) | Upstash Ratelimit (Redis-backed) |
| Identifier | IP (anon) + userId (auth) |

---

## 14. Secret Management

### 14.1 Categories

| Category | Examples | Storage |
|---|---|---|
| **Application secrets** | JWT signing key, password salt | Env var → encrypted secret |
| **Database credentials** | PostgreSQL DSN | Neon secret store |
| **Third-party API keys** | Cloudinary, payment HMAC, email | Env var per env |
| **Encryption keys** | At-rest encryption | Managed key store |

### 14.2 Environment Separation

| Env | Source | Access |
|---|---|---|
| **Local** | `.env.local` (gitignored) | Developer only |
| **Preview** | GitHub Actions secrets | Devs + CI |
| **Staging** | Railway/Render env | Devs + QA |
| **Production** | Cloud secret manager (Neon, Vercel, Railway) | Restricted |

### 14.3 Secret Rotation

| Secret | Rotation |
|---|---|
| JWT signing key | Quarterly (V2 with JWKS) |
| Database password | Annually |
| Third-party API keys | On personnel change |
| Encryption keys | Annually |
| Webhook secrets | On demand |

### 14.4 Secret Hygiene

- Never commit `.env` to git
- Never log secrets
- Never include secrets in error responses
- Use Vercel/Railway/Neon secret management
- Restrict secret read access via IAM

---

## 15. Threat Model Summary

| Threat | Mitigation |
|---|---|
| **Brute force login** | Rate limit + lockout |
| **Credential stuffing** | Rate limit + breach detection (V1.5) |
| **Session hijacking** | HTTP-only cookies + Secure + SameSite |
| **JWT theft** | Short TTL + refresh rotation |
| **CSRF** | CSRF token + SameSite cookies |
| **XSS** | Output escaping + CSP |
| **SQL injection** | Prisma typed queries |
| **IDOR** | Resource ownership checks |
| **Privilege escalation** | RBAC + permission checks |
| **Webhook spoofing** | HMAC signature verification |
| **DDoS** | CDN (Vercel + Cloudflare) + rate limit |
| **API scraping** | Auth-based limits + CAPTCHA (V1.5) |
| **Man-in-the-middle** | TLS + HSTS |
| **Insider threat** | Audit logs + least privilege |
| **Data exfiltration** | Rate limits + DLP patterns (V1.5) |

---

## 16. Compliance

### 16.1 PDPD (Vietnam)

| Requirement | Implementation |
|---|---|
| Consent | Cookie consent API |
| Right to access | `/users/me/export` |
| Right to delete | `/users/me` DELETE with 30-day grace |
| Right to rectify | `PATCH /users/me` |
| Data minimization | DTOs limit fields |
| Audit trail | Audit log module |

### 16.2 Future Standards

| Standard | Status |
|---|---|
| PCI DSS | Not directly applicable (no card data stored) |
| GDPR | Compatible (right to delete, export) |
| ISO 27001 | Future goal |

---

## 17. Security Testing

| Test | Frequency |
|---|---|
| Unit tests for validators | CI |
| E2E auth tests | CI |
| Penetration test | Annually (V1.5+) |
| Dependency scan | Weekly (Snyk) |
| Secret scan | Every commit (git-secrets) |
| SAST | Every PR (CodeQL) |

---

## 18. Incident Response

### 18.1 Detection

- Pino structured logs → log aggregation
- Audit module alerts on suspicious patterns
- Admin login anomaly alerts

### 18.2 Response

1. Detect → alert
2. Triage (on-call)
3. Contain (revoke tokens, disable accounts)
4. Investigate (audit logs)
5. Notify (PDPD requires within 72h for breaches)
6. Recover
7. Post-mortem

---

## 19. Coverage Validation

| Check | Status |
|---|---|
| Authentication (JWT, refresh, password) | ✓ |
| Authorization covered (link to doc) | ✓ |
| Transport security (TLS, HSTS) | ✓ |
| Security headers documented | ✓ |
| CORS configured | ✓ |
| Input validation strategy | ✓ |
| Output sanitization | ✓ |
| CSRF protection | ✓ |
| SQL injection prevention | ✓ |
| XSS protection | ✓ |
| Rate limiting referenced | ✓ |
| Secret management | ✓ |
| Threat model | ✓ |
| PDPD compliance | ✓ |
| Incident response | ✓ |

---

## 20. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial security architecture: AuthN, headers, secrets, threat model |

---

**End of 06_SECURITY_ARCHITECTURE.md**
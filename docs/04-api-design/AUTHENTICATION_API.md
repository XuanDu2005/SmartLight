# AUTHENTICATION_API.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document details the **Authentication & Identity API endpoints** for SmartLight, including customer registration, login, token refresh, password reset, email verification, OAuth, MFA, and admin login.

---

## 2. Authentication Architecture

| Aspect | Choice |
| --- | --- |
| Token Strategy | JWT access + opaque refresh |
| Access Token TTL | 15 minutes |
| Refresh Token TTL | 7 days (default); 30 days (remember me) |
| Password Hash | Argon2id (server-side only) |
| MFA | TOTP (RFC 6238); mandatory for admin; optional V1.5+ for customer |
| OAuth (V1.5) | Google, Facebook |
| Cookie Strategy | HTTP-only Secure SameSite=Lax for refresh |

---

## 3. Customer Authentication

### 3.1 EP-AUTH-001 — Register

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/auth/register` |
| **Purpose** | Create a new customer account |
| **Authentication** | None |
| **Authorization** | Public |
| **Idempotency** | Required (`Idempotency-Key`) |
| **Audit** | `user.registered` |
| **Related Use Case** | UC-ID-001 |
| **Related Entity** | user |

**Request Body:**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `email` | string | Yes | RFC 5322; lowercase; unique |
| `password` | string | Yes | Min 8, max 128; complexity rules |
| `firstName` | string | Yes | Max 100 |
| `lastName` | string | Yes | Max 100 |
| `phone` | string | No | +84 format |
| `locale` | string | No | Defaults to `vi-VN` |
| `acceptTerms` | boolean | Yes | Must be `true` |
| `marketingOptIn` | boolean | No | Default false |

**Response `201 Created`:**

```
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "...",
      "firstName": "...",
      "lastName": "...",
      "phone": "...",
      "status": "pending_verification",
      "createdAt": "..."
    },
    "emailVerificationSent": true,
    "autoLogin": false
  }
}
```

**Status Codes:**

| Code | Meaning |
| --- | --- |
| `201` | Created |
| `400` | Invalid JSON |
| `409` | Email already exists |
| `422` | Validation failed |
| `429` | Too many registration attempts |

**Business Rules:**
- BR-ID-001: Email unique
- BR-ID-002: Password hashed with Argon2id
- BR-ID-005: Refresh tokens hashed
- BR-COMP-001: Cookie consent implied via terms

**Validation Rules:**
- Password ≥ 8 chars
- Email regex
- Phone if provided matches +84 format
- firstName, lastName non-empty
- Locale in supported list

**Errors:**
- `EMAIL_ALREADY_EXISTS` (409)
- `WEAK_PASSWORD` (422)
- `INVALID_EMAIL` (422)

---

### 3.2 EP-AUTH-002 — Login (Customer)

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/auth/login` |
| **Purpose** | Customer email/password login |
| **Authentication** | None |
| **Authorization** | Public |
| **Idempotency** | Recommended |
| **Audit** | `user.login_success` or `user.login_failed` |
| **Related Use Case** | UC-ID-002 |
| **Related Entity** | user, refresh_token |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `email` | string | Yes |
| `password` | string | Yes |
| `rememberMe` | boolean | No |
| `deviceName` | string | No |

**Response `200 OK`:**

```
{
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "opaque-string",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "email": "...",
      "firstName": "...",
      "lastName": "...",
      "roles": ["customer"],
      "status": "active"
    }
  }
}
```

**Status Codes:** `200`, `400`, `401`, `422`, `429`

**Business Rules:**
- BR-ID-013: Account lockout after 5 failed attempts
- BR-SEC-004: Backoff on multiple failures

**Errors:**
- `INVALID_CREDENTIALS` (401)
- `ACCOUNT_LOCKED` (423)
- `EMAIL_NOT_VERIFIED` (403 with `verificationRequired: true`)
- `ACCOUNT_SUSPENDED` (403)

---

### 3.3 EP-AUTH-003 — Refresh Token

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/auth/refresh` |
| **Purpose** | Exchange refresh token for new access token |
| **Authentication** | Refresh token in body or HTTP-only cookie |
| **Audit** | `user.token_refreshed` |

**Request Body (cookie-based):**

```
{
  "deviceName": "string"
}
```

**Response `200 OK`:** Same as login response.

**Rotation Strategy:** Old refresh token revoked; new one issued (BR-ID-005).

**Errors:**
- `REFRESH_TOKEN_REVOKED` (401)
- `REFRESH_TOKEN_EXPIRED` (401)

---

### 3.4 EP-AUTH-004 — Logout (Current Session)

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/auth/logout` |
| **Authentication** | Yes |
| **Audit** | `user.logout` |

**Response:** `204 No Content`

**Side Effects:** Revokes current refresh token; clears session cookies.

---

### 3.5 EP-AUTH-005 — Logout All Sessions

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/auth/logout-all` |
| **Authentication** | Yes |
| **Audit** | `user.logout_all` |

**Response `200 OK`:** `{ "data": { "revokedSessions": 3 } }`

---

### 3.6 EP-AUTH-006 — Forgot Password

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/auth/forgot-password` |
| **Authentication** | None |
| **Rate Limit** | 5/hour per IP |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `email` | string | Yes |

**Response `200 OK`:** `{ "data": { "message": "Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại." } }`

> Note: Always returns 200; never leaks email existence.

**Business Rule:** BR-ID-007: Token expires in 1 hour.

---

### 3.7 EP-AUTH-007 — Reset Password

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/auth/reset-password` |
| **Idempotency** | Required |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `token` | string | Yes (from email link) |
| `newPassword` | string | Yes |

**Response `200 OK`:** `{ "data": { "passwordChanged": true } }`

**Audit:** `user.password_reset`
**Errors:** `INVALID_TOKEN`, `EXPIRED_TOKEN`, `WEAK_PASSWORD`

---

### 3.8 EP-AUTH-008 — Verify Email

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/auth/verify-email` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `token` | string | Yes |

**Response `200 OK`:** `{ "data": { "emailVerified": true } }`

**Audit:** `user.email_verified`

---

### 3.9 EP-AUTH-009 — Resend Verification Email

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/auth/resend-verification` |
| **Rate Limit** | 3/hour per email |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `email` | string | Yes |

**Response `200 OK`:** `{ "data": { "sent": true } }`

---

### 3.10 EP-AUTH-010 — Change Password (Logged In)

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/auth/change-password` |
| **Authentication** | Yes |
| **Audit** | `user.password_changed` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `currentPassword` | string | Yes |
| `newPassword` | string | Yes |

**Response `200 OK`:** `{ "data": { "passwordChanged": true } }`

> Side effects: All other sessions revoked.

---

### 3.11 EP-AUTH-011 — Current User Info

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/auth/me` |
| **Authentication** | Yes |

**Response `200 OK`:** `{ "data": { "user": { "id": "uuid", "email": "...", "roles": [...] } } }`

---

### 3.12 EP-AUTH-012 — List Sessions

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/auth/sessions` |
| **Authentication** | Yes |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "userAgent": "...",
      "ipAddress": "...",
      "lastActiveAt": "...",
      "createdAt": "...",
      "isCurrent": true
    }
  ]
}
```

---

### 3.13 EP-AUTH-013 — Revoke Session

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/auth/sessions/{sessionId}` |
| **Authentication** | Yes |
| **Audit** | `user.session_revoked` |

**Response:** `204 No Content`

**Errors:** `CANNOT_REVOKE_CURRENT_SESSION` (use logout)

---

## 4. Admin Authentication

### 4.1 EP-AUTH-021 — Admin Login

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/auth/admin/login` |
| **Authentication** | None |
| **Audit** | `admin_user.login_attempt` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `email` | string | Yes |
| `password` | string | Yes |
| `mfaCode` | string | Conditional |
| `deviceName` | string | No |

**Response `200 OK`:** Like customer login + admin user object.

**When MFA required:** Response is `200 OK` with `mfaRequired: true` and `mfaToken` (short-lived, 5 min); client calls `/auth/admin/mfa/verify` with this token.

**Business Rule:** BR-MFA-001: Admin MFA mandatory after first login.

**Errors:**
- `INVALID_CREDENTIALS` (401)
- `MFA_REQUIRED` (200 with metadata)
- `MFA_INVALID` (401)
- `ACCOUNT_LOCKED` (423)

---

### 4.2 EP-AUTH-022 — Admin Refresh Token

Same as customer refresh; uses admin-specific refresh token record.

---

### 4.3 EP-AUTH-023 — Admin Logout

Same as customer logout but invalidates admin refresh tokens.

---

### 4.4 EP-AUTH-024 — Begin Admin MFA Setup

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/auth/admin/mfa/setup` |
| **Authentication** | Yes (admin, password re-verified) |
| **Purpose** | Initialize TOTP for an admin |

**Request Headers:** `X-Reauth-Token: <recent-password-reauth-jwt>`

**Response `200 OK`:**

```
{
  "data": {
    "secret": "base32-encoded",        // shown only here, not stored
    "qrCodeUrl": "otpauth://totp/...",
    "recoveryCodes": ["code1", "code2", ...],   // shown ONCE
    "manualEntryKey": "base32-string"
  }
}
```

> The `secret` field is returned only once for QR/manual entry. After verify, only `recoveryCodes` are returned (regeneratable).

**Audit:** `admin_user.mfa_setup_started`

---

### 4.5 EP-AUTH-025 — Verify Admin MFA

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/auth/admin/mfa/verify` |
| **Authentication** | Conditional (mfaToken from login) |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `mfaToken` | string | Yes |
| `code` | string | Yes (6-digit TOTP) |
| `recoveryCode` | string | Alternative (one-time) |

**Response `200 OK`:** Like login response.

**Errors:**
- `MFA_INVALID` (401)
- `MFA_TOKEN_EXPIRED` (401)
- `BACKUP_CODE_USED` (200 with `recoveryCodeRemaining: N`)

---

### 4.6 EP-AUTH-026 — Disable MFA

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/auth/admin/mfa/disable` |
| **Authentication** | Yes (admin) |
| **Authorization** | SuperAdmin only |
| **Audit** | `admin_user.mfa_disabled` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `password` | string | Yes |
| `reason` | string | Yes |

---

### 4.7 EP-AUTH-027 — Get/Regenerate Recovery Codes

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/auth/admin/mfa/recovery-codes` |
| **Authentication** | Yes (admin) |
| **Audit** | `admin_user.recovery_codes_regenerated` |

> Returns new codes; old ones invalidated.

---

## 5. OAuth (V1.5+)

### 5.1 EP-AUTH-031 — OAuth Authorize

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/auth/oauth/{provider}/authorize` |
| **Path Params** | `provider` (google | facebook) |

**Query Parameters:**

| Name | Required | Description |
| --- | --- | --- |
| `redirectUri` | Yes | Client redirect after callback |
| `state` | Yes | CSRF token |

**Response:** `302` to provider's authorize URL.

---

### 5.2 EP-AUTH-032 — OAuth Callback

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/auth/oauth/{provider}/callback` |

**Query Parameters:**

| Name | Description |
| --- | --- |
| `code` | Auth code from provider |
| `state` | CSRF token (verified) |

**Response:** `302` to client app with auth tokens.

**Audit:** `user.oauth_login` / `user.oauth_register`

---

## 6. Token Format

### 6.1 Access Token (JWT)

**Header:**
```
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "roles": ["customer"],
  "iat": 1720000000,
  "exp": 1720000900,
  "iss": "smartlight.api",
  "aud": "smartlight.web"
}
```

### 6.2 Refresh Token

Opaque random string (32 bytes, base64url). Stored as SHA-256 hash.

> Refresh tokens are NOT JWT — they are random strings to allow instant revocation.

---

## 7. Cookie Strategy

For web clients, refresh token is set as HTTP-only Secure cookie:

```
Set-Cookie: refreshToken=<token>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000
```

For mobile clients, refresh token is returned in body.

---

## 8. CSRF Protection

For cookie-based auth, CSRF token is required for state-changing operations:

- `POST /v1/auth/logout`
- `POST /v1/users/me/...` (cookie session)

Header: `X-CSRF-Token: <csrf-token>` (obtained from `/auth/csrf` endpoint).

CSRF token validated against session.

---

## 9. Account Lockout Policy

| Trigger | Action |
| --- | --- |
| 5 failed login attempts in 15 min | Lock for 30 min |
| 10 failed attempts in 1 hour | Lock for 24 hours |
| Brute-force detection | Lock + notify admin |

**Audit:** `user.account_locked` / `admin_user.account_locked`

---

## 10. Password Rules

| Rule | Value |
| --- | --- |
| Min length | 8 |
| Max length | 128 |
| Composition | At least 3 of 4: lower, upper, digit, symbol |
| Common password list | Blocked (HIBP-inspired) |
| Reset token | Single-use; 1-hour expiry |

---

## 11. Email Verification Flow

```
1. User registers → email sent with token (24h)
2. User clicks link → /auth/verify-email?token=...
3. Token validated → user.status = 'active'
4. Subsequent logins allowed (BR-ID-003)
```

---

## 12. Refresh Token Rotation

```
Login:
  Issue refresh token R1
Refresh:
  Receive R1
  Validate R1 (not revoked, not expired)
  Issue R2
  Revoke R1
Logout:
  Revoke current refresh token
```

This allows:
- Detection of token theft (re-use of R1 after R2 issued)
- Automatic revocation

---

## 13. Cross-Reference to Source Docs

| Source | Reference |
| --- | --- |
| `BR-ID-001..005` | Identity BRs |
| `BR-ID-013` | Account lockout |
| `BR-MFA-001` | Admin MFA mandatory |
| `BR-MFA-003` | Recovery codes |
| `BR-SEC-001..012` | Security rules |
| `UC-ID-001..006` | Identity use cases |
| `WF-CUST-01` | Registration workflow |
| `SF-ID-001..013` | Identity features |
| `AC-ID-001..005` | Identity acceptance criteria |

---

## 14. Coverage Validation

| Check | Status |
| --- | --- |
| Customer registration covered | ✓ |
| Customer login covered | ✓ |
| Customer logout covered | ✓ |
| Token refresh covered | ✓ |
| Password reset covered | ✓ |
| Email verification covered | ✓ |
| Admin login covered | ✓ |
| Admin MFA setup covered | ✓ |
| Admin MFA verification covered | ✓ |
| MFA recovery codes covered | ✓ |
| OAuth flow covered (V1.5) | ✓ |
| Session management covered | ✓ |
| Token rotation strategy covered | ✓ |
| Account lockout documented | ✓ |
| Password rules documented | ✓ |

---

## 15. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial authentication API: 22 endpoints (customer, admin, MFA, OAuth) |

---

**End of Document — AUTHENTICATION_API.md**
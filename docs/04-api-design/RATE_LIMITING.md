# RATE_LIMITING.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document defines the **rate limiting strategy** for SmartLight APIs, including limits per endpoint family, headers, and handling of 429 responses.

---

## 2. Rate Limiting Strategy

| Aspect | Decision |
| --- | --- |
| Algorithm | Token bucket (sliding window) |
| Implementation | Redis-backed |
| Identifier | By IP (anonymous) + User ID (authenticated) + API key (admin) |
| Granularity | Per endpoint family |
| Response | `429 Too Many Requests` |

---

## 3. Rate Limit Tiers

### 3.1 Public Endpoints

| Endpoint Family | Limit | Window | Identifier |
| --- | --- | --- | --- |
| Catalog browse | 100 | 1 min | IP |
| Catalog search | 60 | 1 min | IP |
| Categories/Brands | 200 | 1 min | IP |
| Reviews (public) | 100 | 1 min | IP |
| Promotions (public) | 100 | 1 min | IP |
| Shipping (calculate) | 30 | 1 min | IP |
| Tracking (public) | 30 | 1 hour | IP |
| Cookie consent | 10 | 1 min | IP |

### 3.2 Authentication Endpoints

| Endpoint | Limit | Window | Identifier |
| --- | --- | --- | --- |
| Register | 10 | 1 hour | IP |
| Login | 10 | 1 min | IP |
| Forgot password | 5 | 1 hour | Email |
| Reset password | 10 | 1 hour | IP |
| Refresh token | 30 | 1 min | User |
| Email verification | 3 | 1 hour | Email |
| Resend verification | 3 | 1 hour | Email |
| Change password | 10 | 1 hour | User |

### 3.3 Customer Endpoints (Authenticated)

| Endpoint Family | Limit | Window | Identifier |
| --- | --- | --- | --- |
| User profile | 60 | 1 min | User |
| Addresses | 30 | 1 min | User |
| Cart | 60 | 1 min | Session/User |
| Checkout | 30 | 1 min | User |
| Order (read) | 60 | 1 min | User |
| Order (cancel) | 10 | 1 hour | User |
| Review (submit) | 10 | 1 day | User |
| Payment | 30 | 1 min | User |
| Refund request | 5 | 1 day | User |

### 3.4 Admin Endpoints

| Endpoint Family | Limit | Window | Identifier |
| --- | --- | --- | --- |
| Admin (general) | 600 | 1 min | Admin |
| Admin (write) | 300 | 1 min | Admin |
| Admin (export) | 10 | 1 hour | Admin |
| Admin (bulk ops) | 30 | 1 min | Admin |
| Admin (RBAC) | 60 | 1 min | Admin |

### 3.5 Webhook Endpoints

| Endpoint | Limit | Window | Identifier |
| --- | --- | --- | --- |
| Payment webhooks | 1000 | 1 min | Provider IP |
| Shipping webhooks | 1000 | 1 min | Provider IP |

### 3.6 Media Endpoints

| Endpoint | Limit | Window | Identifier |
| --- | --- | --- | --- |
| Upload | 50 | 1 hour | User |
| Multi upload | 10 | 1 hour | User |
| Signed URL request | 50 | 1 hour | User |

---

## 4. Headers

### 4.1 Always Present (on Rate-Limited Endpoints)

| Header | Description |
| --- | --- |
| `X-RateLimit-Limit` | Max requests in current window |
| `X-RateLimit-Remaining` | Remaining requests |
| `X-RateLimit-Reset` | Unix timestamp when window resets |

### 4.2 On 429 Response

| Header | Description |
| --- | --- |
| `X-RateLimit-Limit` | (same) |
| `X-RateLimit-Remaining` | 0 |
| `X-RateLimit-Reset` | (same) |
| `Retry-After` | Seconds until next allowed request |

### 4.3 Example Headers

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1720000900
```

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1720000900
Retry-After: 45

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Quá nhiều yêu cầu. Vui lòng thử lại sau 45 giây.",
    "retryAfter": 45
  }
}
```

---

## 5. Identification Strategy

### 5.1 Anonymous Requests

- Identifier: Client IP address (`X-Forwarded-For` if behind proxy)
- Cached rate-limit per IP

### 5.2 Authenticated Requests

- Identifier: User ID (overrides IP)
- Allows higher limits for legitimate users

### 5.3 API Key (Admin)

- Identifier: API key
- Per-key limits

### 5.4 Trusted IPs (Whitelist)

Admin can configure trusted IPs (e.g., internal services) → bypass rate limit.

---

## 6. Implementation

### 6.1 Algorithm

```
Token bucket:
  - capacity: X tokens
  - refill rate: X tokens per window
  - cost per request: 1 token
  - on 0 tokens: 429
```

### 6.2 Storage

- Redis: `smartlight:ratelimit:{identifier}:{window}` → counter
- TTL = window duration

### 6.3 Headers Computation

After successful request:
- `X-RateLimit-Remaining = tokensRemaining`
- `X-RateLimit-Reset = currentTime + secondsUntilRefill`

### 6.4 Burst Handling

- Some limits allow burst (e.g., 100 req/min → first 30 instant, then 70 over remaining time)
- Use leaky bucket variant for smoother throttling

---

## 7. Different Limits for Different Clients

### 7.1 VIP Customers (V1.5+)

- Higher limits
- Configured per-user or per-segment

### 7.2 Internal Services

- Whitelisted IPs
- Or internal auth (service token)

### 7.3 Bots / Crawlers

- Detected via User-Agent
- Stricter limits (10/min)
- Block obvious bad bots

---

## 8. Rate Limit Configuration

### 8.1 Per-Endpoint Override

Some endpoints override global limits via system config:

```
GET /v1/admin/config/rate-limits
→ Returns current limits per endpoint family
```

### 8.2 Hot-Spot Identification

Telemetry tracks rate-limit hits per endpoint. Admin dashboard shows:

- Top rate-limited IPs
- Top rate-limited endpoints
- Average throttling ratio

---

## 9. Response Behavior

| Status | When |
| --- | --- |
| `200/201/...` | Within limit |
| `429 Too Many Requests` | Limit exceeded |

For `429`, client should:
1. Read `Retry-After`
2. Wait before retrying
3. Implement exponential backoff on retry

---

## 10. Idempotency Interaction

Idempotent requests (e.g., checkout place-order with same key) still consume rate-limit tokens.

> V1.1+: idempotent replays may be exempt (configurable).

---

## 11. Distributed Rate Limiting

For multi-region (V2+):
- Each region has own Redis cluster
- Cross-region limits via shared counter (eventually consistent)
- Tolerate small over-counts

> V1: single region, single Redis.

---

## 12. Anti-Abuse

| Concern | Mitigation |
| --- | --- |
| Account enumeration | Generic error messages |
| Brute-force login | Throttling + lockout |
| API scraping | Higher limits for authenticated |
| DDoS | Cloudflare in front (V1.1+) |
| Coordinate attacks | IP reputation |

---

## 13. Cross-References

| Field | Reference |
| --- | --- |
| Use Cases | UC-SEC-001..005 |
| Business Rules | BR-SEC-005..010 |
| Features | SF-SEC-001..005 |

---

## 14. Coverage Validation

| Check | Status |
| --- | --- |
| All endpoint families have limits | ✓ |
| Identifier strategy defined | ✓ |
| Headers documented | ✓ |
| 429 response format documented | ✓ |
| Implementation approach specified | ✓ |
| Multi-tier limits covered | ✓ |
| Anti-abuse strategy covered | ✓ |

---

## 15. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial rate limiting spec: per-family limits, headers, 429 response, implementation |

---

**End of Document — RATE_LIMITING.md**
# API_OVERVIEW.md — SmartLight API Specification

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document provides a **high-level overview** of the SmartLight API Specification. It defines the scope, audience, principles, modules, and conventions used across the entire API surface.

---

## 2. Scope

The SmartLight API is a **RESTful JSON API** that exposes all business capabilities of the SmartLight e-commerce platform over HTTP. It is consumed by:

- **Storefront** (React + TypeScript web app)
- **Admin Portal** (React + TypeScript web app)
- **Mobile App** (future)
- **Third-party integrations** (payment webhooks, shipping webhooks)
- **Internal services** (background jobs, AI services in V1.5+)

---

## 3. Design Principles

| Principle | Application |
| --- | --- |
| **RESTful** | Resource-oriented URLs; verbs via HTTP methods |
| **Stateless** | Each request carries full context (JWT) |
| **Versioned** | URI-based versioning (`/v1/...`) |
| **Consistent** | Predictable URL structure, error format, response shape |
| **Secure** | HTTPS-only; JWT auth; RBAC authorization; rate-limited |
| **Scalable** | Cursor pagination for large datasets; cache-friendly |
| **Backward Compatible** | New fields may be added; existing fields never removed without deprecation |
| **Microservice Ready** | URLs map to bounded contexts; easy to split in V2 |
| **Startup Friendly** | No over-engineering; MVP-first; future features clearly separated |

---

## 4. API Style and Format

| Aspect | Choice |
| --- | --- |
| Style | REST with JSON bodies |
| Authentication | JWT Bearer (Authorization header) |
| Content-Type | `application/json; charset=utf-8` |
| Encoding | UTF-8 |
| Date/Time | ISO 8601 UTC (`2026-07-03T15:30:00Z`) |
| Money | Integer (VND xu; 1 VND = 100 xu) |
| Locale | `vi-VN` default |
| Currency | `VND` (single currency for V1) |
| IDs | UUID v7 (string) |

---

## 5. Base URL

```
Production:   https://api.smartlight.vn/v1
Staging:      https://api.staging.smartlight.vn/v1
Preview:      https://api.preview-<branch>.smartlight.vn/v1
Local:        http://localhost:3000/v1
```

The `/v1` prefix is the **API version**. See `API_VERSIONING.md` for strategy.

---

## 6. Modules Exposed

The API is organized into **bounded contexts** that align with the 18 modules from System Analysis:

| Context | API Path Prefix | Auth Required | Description |
| --- | --- | --- | --- |
| Health | `/health` | No | Liveness / readiness |
| Authentication | `/auth` | Mixed | Login, register, refresh |
| User | `/users` | Yes (customer/admin) | Customer profile |
| Address | `/addresses` | Yes | Address book |
| Catalog | `/catalog` | Mixed | Brands, categories, products |
| Inventory | `/inventory` | Yes (admin) | Stock management |
| Cart | `/cart` | Optional | Shopping cart |
| Checkout | `/checkout` | Yes (or guest) | Checkout session |
| Order | `/orders` | Yes | Customer orders |
| Payment | `/payments` | Mixed | Payment processing |
| Shipping | `/shipping` | Mixed | Rates, tracking |
| Promotion | `/promotions` | Mixed | Promotions, vouchers |
| Review | `/reviews` | Mixed | Product reviews |
| Notification | `/notifications` | Yes (admin) | Email templates, logs |
| Media | `/media` | Mixed | Upload, retrieve |
| Support | `/support` | Mixed | Support tickets |
| Admin | `/admin` | Yes (admin) | Admin operations |
| Audit | `/admin/audit` | Yes (admin) | Audit logs |
| Webhooks | `/webhooks` | Signature | Payment, shipping callbacks |

---

## 7. Response Envelope

All responses use a consistent envelope:

**Success response:**
```json
{
  "data": <T>,
  "meta": { ... optional ... }
}
```

**List response (paginated):**
```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 245,
      "totalPages": 13,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**Error response:** See `ERROR_RESPONSE_STANDARD.md`.

---

## 8. Authentication

### 8.1 Bearer Token

All customer/admin endpoints require:

```
Authorization: Bearer <access_token>
```

### 8.2 Access Token

- Short-lived (15 min default)
- JWT with user claims (id, email, role)
- Cannot be revoked directly (relies on expiry or refresh-token revocation)

### 8.3 Refresh Token

- Long-lived (7 days; 30 days with "remember me")
- Opaque random string
- Stored as SHA-256 hash in DB
- Used at `/auth/refresh`

### 8.4 Guest Browsing

- `/catalog/products` and `/catalog/categories` are publicly accessible without auth
- `/cart` may use guest session via cookie
- `/checkout` allows guest checkout with email

### 8.5 Admin Authentication

- Same token mechanism
- Admin MFA mandatory (MFA-aware endpoints under `/auth/admin/...`)

---

## 9. Authorization Model

### 9.1 Role-Based Access Control (RBAC)

| Role | Access |
| --- | --- |
| `Guest` | Public catalog, guest cart |
| `Customer` | Own data only |
| `SupportAgent` | Read orders, refund (with limits), manage tickets |
| `CatalogManager` | Products, brands, categories, media |
| `InventoryManager` | Inventory, stock adjustments |
| `OrderManager` | Orders, shipments, returns |
| `FinanceManager` | Payments, refunds, reconciliation |
| `MarketingManager` | Promotions, vouchers, email templates |
| `Admin` | All except audit-read-only restricted |
| `SuperAdmin` | Full access |

### 9.2 Resource-Level Permissions

Authorization enforced at the controller level using guards. Resource ownership (e.g., user can only see own orders) is enforced at the service layer.

---

## 10. Idempotency

For **state-changing requests** (POST, PUT, PATCH, DELETE that mutate state), clients **should** provide an idempotency key:

```
Idempotency-Key: <UUID v7>
```

The server caches the response for 24 hours and returns the cached result for repeats. See `IDEMPOTENCY.md` for details.

Required for:
- Checkout creation
- Order placement
- Payment creation
- Refund request
- Inventory adjustment

---

## 11. Versioning

All endpoints live under `/v1`. See `API_VERSIONING.md` for the policy on introducing `/v2`.

---

## 12. Rate Limiting

Per-client, per-endpoint. See `RATE_LIMITING.md`.

| Endpoint Family | Limit |
| --- | --- |
| Public catalog | 100/min per IP |
| Auth (login/register) | 10/min per IP |
| Auth (refresh) | 30/min per user |
| Cart | 60/min per session |
| Checkout/Order | 10/min per user |
| Admin | 600/min per admin |

---

## 13. Pagination

Two styles used:
- **Offset pagination** (`page`, `limit`) — admin lists, small datasets
- **Cursor pagination** (`cursor`, `limit`) — infinite scroll, large datasets

See `PAGINATION_STANDARD.md`.

---

## 14. Filtering / Sorting / Search

Standard query parameters documented in `FILTER_SORT_SEARCH.md`. Common operators:

| Operator | Example |
| --- | --- |
| `eq` (default) | `?status=eq:active` |
| `in` | `?status=in:active,pending` |
| `gte` / `lte` | `?createdAt=gte:2026-07-01` |
| `like` | `?name=like:đèn` |
| `between` | `?price=between:100000,500000` |

---

## 15. Error Format

Uniform error response. See `ERROR_RESPONSE_STANDARD.md`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "code": "INVALID_FORMAT", "message": "Invalid email" }
    ],
    "traceId": "..."
  }
}
```

---

## 16. Caching

| Endpoint | Cache |
| --- | --- |
| `GET /catalog/products` | 60s + Redis invalidation on update |
| `GET /catalog/products/{id}` | 300s |
| `GET /catalog/categories` | 3600s |
| `GET /catalog/brands` | 3600s |
| `GET /orders/{id}` | No cache (sensitive) |
| `GET /payments/{id}` | No cache |

`Cache-Control: public, max-age=N` headers emitted where applicable.

---

## 17. Internationalization

V1 supports Vietnamese only. Future: `Accept-Language` header for `vi-VN`, `en-US`.

---

## 18. API Quality Bar

Every endpoint must:
- Use REST conventions
- Validate all input
- Return consistent response envelope
- Use standard error codes
- Document in OpenAPI format
- Be traceable to a Use Case
- Have traceability from Business Requirement

---

## 19. Document Map

| Document | Purpose |
| --- | --- |
| `API_OVERVIEW.md` | This document |
| `REST_CONVENTIONS.md` | REST URL / method conventions |
| `ENDPOINT_CATALOG.md` | Master list of all endpoints |
| `REQUEST_RESPONSE_SPEC.md` | Body / parameter structure conventions |
| `AUTHENTICATION_API.md` | Login, register, refresh |
| `USER_API.md` | Customer profile, addresses |
| `CATALOG_API.md` | Products, brands, categories |
| `INVENTORY_API.md` | Stock management |
| `CART_API.md` | Cart operations |
| `CHECKOUT_API.md` | Multi-step checkout |
| `ORDER_API.md` | Order lifecycle |
| `PAYMENT_API.md` | Payment, refund, webhook |
| `SHIPPING_API.md` | Rates, tracking |
| `PROMOTION_API.md` | Promotions, vouchers |
| `REVIEW_API.md` | Reviews and ratings |
| `NOTIFICATION_API.md` | Email templates, logs |
| `MEDIA_API.md` | Upload, retrieve |
| `ADMIN_API.md` | Admin operations |
| `ERROR_RESPONSE_STANDARD.md` | Error format |
| `PAGINATION_STANDARD.md` | Pagination |
| `FILTER_SORT_SEARCH.md` | Query conventions |
| `WEBHOOK_SPECIFICATION.md` | Inbound webhooks |
| `API_VERSIONING.md` | Versioning strategy |
| `RATE_LIMITING.md` | Rate limits |
| `IDEMPOTENCY.md` | Idempotency |
| `OPENAPI_PREPARATION.md` | OpenAPI mapping |
| `API_TRACEABILITY.md` | End-to-end traceability |
| `API_REVIEW_CHECKLIST.md` | Final checklist |

---

## 20. Coverage Validation

| Check | Status |
| --- | --- |
| Modules from System Analysis covered | ✓ (18 modules) |
| RESTful style documented | ✓ |
| Authentication covered | ✓ |
| Authorization described | ✓ |
| Rate limiting referenced | ✓ |
| Pagination referenced | ✓ |
| Idempotency referenced | ✓ |
| Error format referenced | ✓ |
| Versioning referenced | ✓ |
| OpenAPI preparation referenced | ✓ |
| Traceability referenced | ✓ |

---

## 21. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial API overview: 28 documents planned; 18 modules; REST principles |

---

**End of Document — API_OVERVIEW.md**
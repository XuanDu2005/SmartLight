# REST_CONVENTIONS.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document defines the **REST API conventions** for SmartLight. It covers URL structure, HTTP methods, naming, status codes, headers, and content negotiation. All endpoints in the SmartLight API **must** follow these conventions.

---

## 2. REST Style

| Aspect | Decision |
| --- | --- |
| Style | REST (Resource-Oriented) |
| Data Format | JSON |
| Versioning | URL prefix (`/v1/...`) |
| Hypermedia | **NOT** used in V1 (no HATEOAS) |
| Stateless | Yes |
| Cache | `Cache-Control` headers + Redis |

---

## 3. URL Structure

### 3.1 Format

```
/v{version}/{resource-collection}/{id}/{sub-resource}/{sub-id}
```

Examples:

```
GET    /v1/catalog/products                     list products
GET    /v1/catalog/products/{productId}        single product
GET    /v1/catalog/products/{productId}/variants  variants of a product
GET    /v1/catalog/products/{productId}/reviews  reviews of a product
POST   /v1/orders                              create order
POST   /v1/orders/{orderId}/cancel             cancel an order
GET    /v1/orders/{orderId}/status-history     order status history
```

### 3.2 Version

Always `/v1` prefix. See `API_VERSIONING.md` for deprecation policy.

### 3.3 Resource Collection Names

| Rule | Example |
| --- | --- |
| Plural, lowercase, hyphenated | `products`, `order-items`, `cart-items` |
| Match entity name + pluralization | product → products |
| Use kebab-case for multi-word | `payment-methods`, `tax-rates`, `static-pages` |
| No trailing slashes | `/products` not `/products/` |
| Avoid deep nesting (>3 levels) | Prefer flat paths with filter |

### 3.4 Nested Resources

Used **only** when the child is meaningless without the parent.

Examples:

```
GET /v1/orders/{orderId}/items                   list order items
GET /v1/carts/{cartId}/items                     list cart items
GET /v1/products/{productId}/variants            list variants
```

**Avoid:**
```
❌ /v1/users/{userId}/orders/{orderId}/items/{itemId}/...
```

If relationships are complex, prefer:
- Flat resource with `parentId` filter
- Or separate endpoint per concern

### 3.5 Actions on Resources

Use **HTTP methods**, not verbs:

| Action | Method |
| --- | --- |
| Create | `POST /resource` |
| List | `GET /resource` |
| Get one | `GET /resource/{id}` |
| Replace | `PUT /resource/{id}` (full replacement) |
| Update | `PATCH /resource/{id}` (partial) |
| Delete | `DELETE /resource/{id}` |
| Bulk operations | `POST /resource/bulk` (collection-level) |

**Special action endpoints** (when state transition is non-CRUD):

```
POST /v1/orders/{orderId}/cancel                 cancellation action
POST /v1/orders/{orderId}/confirm                confirm action
POST /v1/checkout/{sessionId}/apply-voucher     voucher application
POST /v1/payments/{paymentId}/capture            capture action
POST /v1/payments/{paymentId}/refund             refund action
POST /v1/auth/login                              login action
POST /v1/auth/logout                             logout action
POST /v1/auth/refresh                            refresh action
```

### 3.6 RPC-Style Endpoints

**Forbidden.** Examples of what NOT to do:

```
❌ POST /v1/getProductById
❌ POST /v1/calculateShipping
❌ GET  /v1/createOrder
✅ POST /v1/orders
✅ GET  /v1/orders/{id}
```

---

## 4. HTTP Methods

### 4.1 Method Semantics

| Method | Semantics | Idempotent | Safe | Body |
| --- | --- | --- | --- | --- |
| `GET` | Read | Yes | Yes | No |
| `POST` | Create or trigger action | **No** | No | Optional |
| `PUT` | Full replace | Yes | No | Required |
| `PATCH` | Partial update | **No** | No | Required |
| `DELETE` | Remove | Yes | No | No |

### 4.2 Idempotency

- `PUT` and `DELETE` are naturally idempotent.
- `POST` and `PATCH` should support **idempotency keys** for non-idempotent operations (see `IDEMPOTENCY.md`).
- `GET` is naturally idempotent and safe.

### 4.3 HEAD and OPTIONS

| Method | Usage |
| --- | --- |
| `HEAD` | Resource existence; metadata only |
| `OPTIONS` | CORS preflight + supported methods |

---

## 5. HTTP Status Codes

### 5.1 Success Codes

| Code | Name | Meaning | When to Use |
| --- | --- | --- | --- |
| `200` | OK | Success | GET, PUT, PATCH |
| `201` | Created | Resource created | POST that creates |
| `202` | Accepted | Async processing | POST that triggers async job |
| `204` | No Content | Success, no body | DELETE |

### 5.2 Client Error Codes

| Code | Name | Meaning | When to Use |
| --- | --- | --- | --- |
| `400` | Bad Request | Malformed request | Syntax errors |
| `401` | Unauthorized | Authentication required | Missing/invalid JWT |
| `403` | Forbidden | Insufficient permissions | RBAC denies |
| `404` | Not Found | Resource does not exist | Invalid ID |
| `409` | Conflict | Resource conflict | Duplicate, version mismatch |
| `422` | Unprocessable Entity | Validation failed | Semantic validation |
| `429` | Too Many Requests | Rate limit exceeded | Rate-limited |

### 5.3 Server Error Codes

| Code | Name | Meaning |
| --- | --- | --- |
| `500` | Internal Server Error | Unhandled exception |
| `502` | Bad Gateway | Upstream failure |
| `503` | Service Unavailable | Planned or unplanned outage |
| `504` | Gateway Timeout | Upstream timeout |

### 5.4 Special Codes

| Code | Name | Usage |
| --- | --- | --- |
| `410` | Gone | Resource retired (deprecated endpoint) |
| `451` | Unavailable for Legal Reasons | PDPD / compliance block |

---

## 6. Headers

### 6.1 Request Headers

| Header | Required | Description |
| --- | --- | --- |
| `Authorization` | Conditional | `Bearer <token>` (required for authenticated endpoints) |
| `Content-Type` | Yes (with body) | `application/json; charset=utf-8` |
| `Accept` | No | Defaults to `application/json` |
| `Accept-Language` | No | Defaults to `vi-VN` |
| `Idempotency-Key` | Conditional | UUID v7; required for non-idempotent operations |
| `X-Request-ID` | Recommended | UUID v7 for tracing |
| `X-Client` | Recommended | App identifier (`web`, `ios`, `android`) |
| `X-Client-Version` | Recommended | Client app version |
| `User-Agent` | Yes | Standard HTTP |
| `Origin` | Auto | For CORS |

### 6.2 Response Headers

| Header | Description |
| --- | --- |
| `Content-Type` | Always `application/json; charset=utf-8` |
| `X-Request-ID` | Echo of incoming or generated |
| `X-RateLimit-Limit` | Limit in current window |
| `X-RateLimit-Remaining` | Remaining requests |
| `X-RateLimit-Reset` | Window reset timestamp |
| `Cache-Control` | `public` / `private` / `no-cache` / `max-age=N` |
| `ETag` | Resource version (optional) |
| `Location` | For 201 responses — URL of created resource |
| `Vary` | e.g., `Accept-Language` |
| `Strict-Transport-Security` | `max-age=31536000` (1 year) |

### 6.3 Error Response Headers

`WWW-Authenticate: Bearer error="invalid_token"` for 401.

---

## 7. Content Negotiation

### 7.1 Supported Types

| Type | Supported |
| --- | --- |
| `application/json` | Yes (only format in V1) |
| `application/xml` | No |
| `application/x-www-form-urlencoded` | No (except OAuth callbacks) |
| `multipart/form-data` | Yes (file uploads; see `MEDIA_API.md`) |

### 7.2 Charset

Always UTF-8.

---

## 8. Path Parameters

| Rule | Example |
| --- | --- |
| Use plural nouns | `/products/{productId}` |
| IDs are strings (UUID) | `b3e1...` |
| ID parameter names match resource | `/orders/{orderId}/items/{itemId}` |
| Names in camelCase in code, snake_case in URLs? No — URLs use `{entityId}` placeholder names |

```
GET /v1/catalog/products/{productId}
                ^^^^^^^^^^^^^^^^ singular entity name + "Id"
```

---

## 9. Query Parameters

### 9.1 Pagination

```
?page=1&limit=20                # offset pagination
?cursor=<token>&limit=20         # cursor pagination
```

### 9.2 Sorting

```
?sort=createdAt&order=desc
?sort=name,createdAt&order=asc,desc
```

### 9.3 Filtering

Operators documented in `FILTER_SORT_SEARCH.md`:

```
?status=eq:active
?price=gte:100000&price=lte:500000
?name=like:đèn
```

### 9.4 Field Selection (Sparse Fieldsets)

```
?fields=id,name,price,images
```

### 9.5 Include Related

```
?include=variants,images
```

### 9.6 Search

```
?q=đèn+led
```

---

## 10. Request Body

### 10.1 Conventions

| Rule | Example |
| --- | --- |
| JSON only | `{ "name": "value" }` |
| camelCase keys | `firstName`, `createdAt` |
| ISO 8601 dates | `"2026-07-03T15:00:00Z"` |
| Money in xu (integer) | `20000000` = 200,000 VND |
| Boolean as true/false | `true`, not `"true"` |
| Null where missing | `"phone": null` if not provided |

### 10.2 Empty Bodies

`POST` without body — allowed only for actions like `/auth/logout`.

### 10.3 Bulk Operations

```
POST /v1/catalog/products/bulk-delete
{
  "ids": ["id1", "id2", "id3"]
}
```

---

## 11. Response Body

### 11.1 Single Resource

```json
{
  "data": {
    "id": "...",
    "name": "..."
  }
}
```

### 11.2 List (Paginated)

```json
{
  "data": [ ... ],
  "meta": {
    "pagination": { ... }
  }
}
```

### 11.3 Action Result

```json
{
  "data": {
    "result": "ok",
    "reference": "..."
  }
}
```

### 11.4 No Body

For `204 No Content` — empty body for DELETE.

---

## 12. Error Responses

Always follow `ERROR_RESPONSE_STANDARD.md`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [...],
    "traceId": "..."
  }
}
```

---

## 13. CORS

| Origin | Allowed |
| --- | --- |
| `https://smartlight.vn` | Yes |
| `https://admin.smartlight.vn` | Yes |
| `https://staging.smartlight.vn` | Yes |
| `https://preview-*.smartlight.vn` | Yes |
| `http://localhost:3000` (dev) | Yes |
| `*` (wildcard) | No (V1: never; V1.5: configurable per env) |

Allowed methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
Allowed headers: `Authorization, Content-Type, Accept, Accept-Language, Idempotency-Key, X-Request-ID, X-Client, X-Client-Version`
Exposed headers: `X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Location`
Credentials: `true` (allows cookies for refresh tokens)

---

## 14. Security Headers (Required)

| Header | Value |
| --- | --- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | Per route (admin portal has stricter) |
| `Permissions-Policy` | Disable unused features |

---

## 15. Localization

### 15.1 Accept-Language

```
Accept-Language: vi-VN       # Vietnamese
Accept-Language: en-US       # English (future V1.5)
```

### 15.2 Response Localization

Body fields that contain user-facing strings are returned in the requested language. Defaults: `vi-VN`.

---

## 16. Idempotency-Key Header

Required for non-idempotent POST/PATCH operations. See `IDEMPOTENCY.md`.

---

## 17. X-Request-ID

A UUID v7 trace identifier. Echoed in response. Used for log correlation.

---

## 18. URL Length

| Limit | Value |
| --- | --- |
| URL max | 2048 characters |
| Query string max | 1024 characters |

---

## 19. Compression

- `Accept-Encoding: gzip, br, deflate`
- Response compressed when payload > 1 KB

---

## 20. HTTP Versions

- HTTP/1.1 — required minimum
- HTTP/2 — supported (push NOT used)
- HTTP/3 — V1.5+ (preview)

---

## 21. Date Format

All dates use ISO 8601 UTC:

```
"createdAt": "2026-07-03T15:30:00Z"
```

---

## 22. Casing Policy

| Layer | Convention | Example |
| --- | --- | --- |
| URLs | lowercase, kebab-case | `/v1/order-items` |
| Query params | camelCase | `?createdAt=gte:...` |
| Path placeholders | camelCase | `{orderId}` |
| Request body fields | camelCase | `"firstName"` |
| Response body fields | camelCase | `"createdAt"` |
| JSON headers values | case-sensitive lowercase enum | `"content-type": "application/json"` |

---

## 23. Resource Naming Examples

| Resource | URL |
| --- | --- |
| Products | `/v1/catalog/products` |
| Product variants | `/v1/catalog/products/{productId}/variants` |
| Categories | `/v1/catalog/categories` |
| Brands | `/v1/catalog/brands` |
| Users | `/v1/users` (single user details at `/v1/users/me`) |
| Addresses | `/v1/users/me/addresses` |
| Carts | `/v1/cart` |
| Cart items | `/v1/cart/items` |
| Orders | `/v1/orders` |
| Order items | `/v1/orders/{orderId}/items` |
| Order status history | `/v1/orders/{orderId}/status-history` |
| Payments | `/v1/payments` |
| Refunds | `/v1/payments/{paymentId}/refunds` |
| Promotions | `/v1/promotions` |
| Vouchers | `/v1/vouchers` |
| Reviews | `/v1/reviews` |
| Notifications | `/v1/notifications` |
| Media | `/v1/media` |
| Support tickets | `/v1/support/tickets` |
| Audit logs | `/v1/admin/audit` |

---

## 24. Coverage Validation

| Check | Status |
| --- | --- |
| RESTful style defined | ✓ |
| HTTP methods documented | ✓ |
| Status codes mapped | ✓ |
| Headers documented | ✓ |
| URL conventions defined | ✓ |
| Path/query parameters pattern defined | ✓ |
| Request body conventions defined | ✓ |
| Response envelope defined | ✓ |
| Error format referenced | ✓ |
| CORS documented | ✓ |
| Security headers documented | ✓ |
| Versioning covered | ✓ |

---

## 25. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial REST conventions: URLs, methods, status codes, headers, naming |

---

**End of Document — REST_CONVENTIONS.md**
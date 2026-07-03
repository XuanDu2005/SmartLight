# API_VERSIONING.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document defines the **API versioning strategy** for SmartLight, including how versions are introduced, deprecation practices, and migration support.

---

## 2. Versioning Strategy

| Aspect | Decision |
| --- | --- |
| Strategy | URI Path Versioning |
| Format | `/v{major}/...` |
| Default | `/v1/...` |
| Compatibility within version | Additive (backward compatible) |
| Breaking changes | New version (`/v2/...`) |
| Deprecation period | 6 months minimum |

### 2.1 Why URI Versioning?

| Reason | Benefit |
| --- | --- |
| Simple for clients | URL-based routing |
| Easy to debug | Browser/dev tools show version |
| Cache-friendly | Each version can be cached separately |
| Common practice | Widely understood |

---

## 3. Version in URL

All endpoints live under `/v{version}/`:

```
https://api.smartlight.vn/v1/catalog/products
https://api.smartlight.vn/v1/orders
https://api.smartlight.vn/v2/catalog/products   (future)
```

The `version` is integer; sub-versions handled via headers or OpenAPI.

---

## 4. Backward Compatibility

### 4.1 Allowed Within Same Version (No Bump)

- Adding new endpoints
- Adding optional request fields
- Adding response fields
- Adding new enum values
- Adding new HTTP methods to existing resources
- New error codes
- New query parameters (with defaults)

### 4.2 Forbidden Within Same Version (Requires Bump)

- Removing endpoints
- Removing request fields
- Removing response fields
- Changing field types (int → string)
- Renaming fields
- Changing status codes
- Changing URL structure
- Changing auth mechanism
- Changing error format
- Removing optional values from enum

---

## 5. Deprecation Policy

### 5.1 Lifecycle

```
Active → Deprecated → Removed
```

| Stage | Duration | Behavior |
| --- | --- | --- |
| Active | Indefinite | Default |
| Deprecated | 6 months | Warning headers, documented migration |
| Removed | — | Returns `410 Gone` |

### 5.2 Deprecation Headers

When endpoint deprecated:

```
Sunset: Wed, 01 Jan 2027 00:00:00 GMT
Deprecation: true
Link: </v2/catalog/products>; rel="successor-version"
X-Deprecation-Notice: <human-readable message>
```

### 5.3 Deprecation Documentation

Each deprecated endpoint documented with:
- Sunset date
- Migration guide
- Successor endpoint
- Example migration code

### 5.4 Multiple Versions

When `/v2` introduced:
- `/v1` runs concurrently for 6+ months
- Both versions supported, bug-fixed
- No new features in `/v1` (only bug/security fixes)
- Migration tools provided (SDKs updated)

---

## 6. Version Negotiation

### 6.1 Default

If no version in URL → fallback to latest stable (`v1` in V1 phase).

### 6.2 Custom Header (Optional)

Some clients prefer headers:

```
Accept: application/vnd.smartlight.v1+json
```

But URI takes precedence.

---

## 7. Client SDK Compatibility

| SDK | Versioning |
| --- | --- |
| Web SDK | Aligned with API version |
| Mobile SDK | Aligned |
| Server SDK | Aligned |

Each SDK released at same time as API version.

---

## 8. Version Migration Example

### 8.1 Hypothetical: V1 → V2 Change

**V1:**
```
GET /v1/orders/{id}
→ { "orderNumber": "20260703-0001", ... }
```

**V2:**
```
GET /v2/orders/{id}
→ { "id": "uuid", "code": "ORD-20260703-0001", ... }
```

Field renamed (`orderNumber` → `code`); breaking change.

### 8.2 Migration Steps

1. `/v2` released with new schema
2. `/v1` marked deprecated
3. Deprecation headers added to `/v1`
4. 6-month sunset period
5. `/v1` returns `410 Gone` after sunset
6. Old SDKs still work for V1 (until SDK sunset)

---

## 9. Internal API Versioning

For internal-only endpoints (admin, webhooks):
- Same versioning scheme as public API.
- May have own deprecation timeline (faster).

---

## 10. OpenAPI Versioning

Each API version has its own OpenAPI spec:

```
/v1/openapi.json   → V1 spec
/v2/openapi.json   → V2 spec (future)
```

Clients can generate SDKs per version.

---

## 11. Database Schema Versioning

> API versions and DB schemas are not 1:1. Multiple API versions may run against same DB.

DB migrations are forward-only (see `docs/03-database-design/MIGRATION_STRATEGY.md`).

---

## 12. Microservice Readiness

In V2 (microservices), each service owns its API version:

```
api.users.smartlight.vn/v1/...
api.orders.smartlight.vn/v1/...
api.payments.smartlight.vn/v1/...
```

> V1 (modular monolith): single API gateway routes by URL prefix.

---

## 13. Version Logging

All requests log `X-Request-ID` and `apiVersion`:

```json
{
  "requestId": "uuid",
  "apiVersion": "1.0",
  "path": "/v1/orders",
  "method": "POST"
}
```

---

## 14. Sunset Process

### 14.1 Checklist for Removing a Version

- [ ] All clients confirmed migrated (telemetry)
- [ ] No traffic to version for 30+ days
- [ ] Sunset date passed
- [ ] Documentation updated
- [ ] SDK support removed

### 14.2 Removal

- Return `410 Gone` for any `/v{n}/...` request
- Body: `{"error":{"code":"API_VERSION_GONE","message":"..."}}`

---

## 15. Coverage Validation

| Check | Status |
| --- | --- |
| Versioning strategy chosen | ✓ |
| Compatibility rules documented | ✓ |
| Deprecation policy defined | ✓ |
| Multiple-version coexistence | ✓ |
| OpenAPI versioning | ✓ |
| Microservice future-ready | ✓ |
| Sunset process documented | ✓ |

---

## 16. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial versioning spec: URI versioning, compatibility rules, deprecation, sunset |

---

**End of Document — API_VERSIONING.md**
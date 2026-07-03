# PAGINATION_STANDARD.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document defines the **pagination strategies** for SmartLight APIs: offset-based pagination for admin/small datasets and cursor-based pagination for large/infinite-scroll datasets.

---

## 2. Two Pagination Styles

| Style | Use Case | Endpoints |
| --- | --- | --- |
| **Offset** | Admin lists, fixed-size pages, total count needed | Admin endpoints, where total count useful |
| **Cursor** | Infinite scroll, large datasets, real-time | Customer-facing lists (orders, products, notifications) |

---

## 3. Offset Pagination

### 3.1 Query Parameters

| Parameter | Type | Default | Max | Description |
| --- | --- | --- | --- | --- |
| `page` | int | 1 | 1000 | 1-indexed page number |
| `limit` | int | 20 | 100 | Items per page |

### 3.2 Example Request

```
GET /v1/admin/orders?page=3&limit=20&status=shipped&sort=-createdAt
```

### 3.3 Response Meta

```json
{
  "data": [ ... ],
  "meta": {
    "pagination": {
      "page": 3,
      "limit": 20,
      "totalItems": 245,
      "totalPages": 13,
      "hasNext": true,
      "hasPrev": true,
      "nextPage": 4,
      "prevPage": 2
    }
  }
}
```

### 3.4 Field Definitions

| Field | Type | Description |
| --- | --- | --- |
| `page` | int | Current page (1-indexed) |
| `limit` | int | Items per page (echoed) |
| `totalItems` | int | Total matching items |
| `totalPages` | int | Total pages (computed) |
| `hasNext` | boolean | More pages available |
| `hasPrev` | boolean | Earlier pages available |
| `nextPage` | int | Next page number (null if no next) |
| `prevPage` | int | Previous page number (null if no prev) |

### 3.5 Use Cases

- Admin list endpoints (orders, products, customers, etc.)
- Audit log search
- Reports/exports
- Pagination where total count is valuable for UI (e.g., "Showing 1-20 of 245")

---

## 4. Cursor Pagination

### 4.1 Query Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `cursor` | string (opaque) | — | Token from previous response; null for first page |
| `limit` | int | 20 | Items per page (max 100) |

### 4.2 Example Request

```
GET /v1/orders?cursor=eyJpZCI6IjAxOTJjYTNl...&limit=20
```

### 4.3 Response Meta

```json
{
  "data": [ ... ],
  "meta": {
    "pagination": {
      "limit": 20,
      "hasNext": true,
      "nextCursor": "eyJpZCI6IjAxOTJjYTNl...",
      "prevCursor": "eyJpZCI6IjAxOTJjYWVk..."
    }
  }
}
```

### 4.4 Cursor Token

**Format:** Base64URL-encoded JSON.

```json
{
  "id": "0192ca3e-...",
  "createdAt": "2026-07-03T15:30:00Z",
  "filter": { "status": "shipped" }
}
```

> **Security:** Cursor tokens may contain filter info; clients should not parse or modify them.

### 4.5 Use Cases

- Customer order history (potentially thousands)
- Notification feed
- Product search (infinite scroll)
- Activity log (real-time)

---

## 5. Per-Endpoint Pagination Choice

| Endpoint | Style | Reason |
| --- | --- | --- |
| `GET /v1/orders` | Cursor | Customer may have many orders |
| `GET /v1/admin/orders` | Offset | Admin needs total count |
| `GET /v1/admin/audit/logs` | Offset | Audit needs total count |
| `GET /v1/admin/inventory` | Offset | Inventory manageable size |
| `GET /v1/catalog/products` | Offset | Browse pages |
| `GET /v1/notifications/inbox` | Cursor | Many notifications |
| `GET /v1/users/me/addresses` | Offset | Small list (max ~10) |
| `GET /v1/admin/reviews` | Offset | Moderation queue |
| `GET /v1/admin/payments` | Offset | Reconciliation |

---

## 6. Limits

| Endpoint Family | Default | Max |
| --- | --- | --- |
| Catalog (public) | 20 | 100 |
| Catalog (admin) | 50 | 200 |
| Orders (customer) | 10 | 50 |
| Orders (admin) | 20 | 100 |
| Users (admin) | 50 | 200 |
| Audit logs | 50 | 200 |
| Inventory | 50 | 200 |
| Static | 100 | 500 |

---

## 7. Sort Interaction

| Style | How Sort Works |
| --- | --- |
| Offset | `?sort=createdAt&order=desc` (default `-createdAt`) |
| Cursor | Implied by cursor token; client passes `?sort=...&order=...` once at first call |

---

## 8. Filter Interaction

| Style | How Filter Works |
| --- | --- |
| Offset | Standard query params (see `FILTER_SORT_SEARCH.md`) |
| Cursor | Filter snapshot in cursor; subsequent requests inherit filter |

---

## 9. Page Out-of-Range

| Status | Trigger |
| --- | --- |
| `200 OK` with empty `data[]` | Page > total pages |
| `400 BAD_REQUEST` | `page < 1` or `limit < 1` |
| `400 BAD_REQUEST` | `limit > max` |
| `400 BAD_REQUEST` | Invalid cursor |

---

## 10. Implementation Notes

| Concern | Decision |
| --- | --- |
| Indexes | Index columns used in cursor (id, createdAt) |
| Stability | Cursor tokens include filter snapshot for consistency |
| Performance | Use `keyset pagination` (where `id > X`) for cursor |
| Caching | First page may be cached; subsequent pages not |

---

## 11. Edge Cases

### 11.1 Empty Result

```
HTTP/1.1 200 OK
{
  "data": [],
  "meta": {
    "pagination": {
      "page": 1, "limit": 20, "totalItems": 0, "totalPages": 0,
      "hasNext": false, "hasPrev": false
    }
  }
}
```

> Empty list returns `200` (not `404`). `404` is reserved for missing resource.

### 11.2 Invalid Page

`400 BAD_REQUEST` with `INVALID_PAGE` or `INVALID_LIMIT`.

### 11.3 Invalid Cursor

`400 BAD_REQUEST` with `INVALID_CURSOR`.

### 11.4 Cursor Reuse with Different Filter

`409 Conflict` with `CURSOR_FILTER_MISMATCH`. Client should reset cursor.

---

## 12. Sample Responses

### 12.1 Offset — Page 1 of 13

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

### 12.2 Offset — Last Page

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 13,
      "limit": 20,
      "totalItems": 245,
      "totalPages": 13,
      "hasNext": false,
      "hasPrev": true
    }
  }
}
```

### 12.3 Cursor — Initial

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "limit": 20,
      "hasNext": true,
      "nextCursor": "eyJpZCI6IjAxOTJjYTNl...",
      "prevCursor": null
    }
  }
}
```

### 12.4 Cursor — Last Page

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "limit": 20,
      "hasNext": false,
      "nextCursor": null,
      "prevCursor": "eyJpZCI6IjAxOTJjYWVk..."
    }
  }
}
```

---

## 13. Coverage Validation

| Check | Status |
| --- | --- |
| Two styles documented | ✓ |
| Default and max limits per family | ✓ |
| Per-endpoint choice documented | ✓ |
| Empty result behavior | ✓ |
| Error cases covered | ✓ |
| Sort/filter interaction documented | ✓ |
| Implementation notes | ✓ |

---

## 14. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial pagination standard: offset + cursor patterns, per-endpoint choice |

---

**End of Document — PAGINATION_STANDARD.md**
# FILTER_SORT_SEARCH.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document defines the **filtering, sorting, and search conventions** for SmartLight APIs. Establishes operator syntax, common parameters, and conventions for product/admin search.

---

## 2. Filter Operator Convention

All filter query parameters use the format:

```
?field=operator:value
```

If operator is omitted, default is `eq`.

| Operator | Meaning | Example |
| --- | --- | --- |
| `eq` | Equal to (default) | `?status=active` or `?status=eq:active` |
| `neq` | Not equal | `?status=neq:cancelled` |
| `gt` | Greater than | `?price=gt:100000` |
| `gte` | Greater than or equal | `?price=gte:100000` |
| `lt` | Less than | `?price=lt:500000` |
| `lte` | Less than or equal | `?price=lte:500000` |
| `in` | In list (comma-separated) | `?status=in:active,pending` |
| `nin` | Not in list | `?status=nin:cancelled` |
| `like` | Contains substring (case-insensitive) | `?name=like:đèn` |
| `ilike` | PostgreSQL ILIKE | `?name=ilike:LED` |
| `between` | Range (comma-separated) | `?price=between:100000,500000` |
| `isnull` | Null check (`true`/`false`) | `?deletedAt=isnull:true` |
| `notnull` | Null check | `?deletedAt=notnull:true` |

### 2.1 Example

```
GET /v1/admin/orders?
  status=in:pending,confirmed
  &total=gte:10000000
  &total=lte:500000000
  &createdAt=between:2026-07-01,2026-07-31
  &customerEmail=like:@example.com
  &sort=-createdAt
  &page=1
  &limit=20
```

---

## 3. Common Filter Parameters

### 3.1 Status Filters

| Parameter | Values |
| --- | --- |
| `status` | Enum value (e.g., `active`, `pending`, `shipped`) |
| `status=in:a,b,c` | Multiple |

### 3.2 Date Filters

| Parameter | Format | Example |
| --- | --- | --- |
| `createdAt` | ISO 8601 | `?createdAt=gte:2026-07-01T00:00:00Z` |
| `updatedAt` | ISO 8601 | `?updatedAt=between:...,...` |
| `publishedAt` | ISO 8601 | |
| `deletedAt` | ISO 8601 | `?deletedAt=isnull:true` |

### 3.3 Date Range Shortcuts

| Parameter | Description |
| --- | --- |
| `from` | `createdAt >= from` |
| `to` | `createdAt <= to` |

These are aliases; clients can use either explicit operators or shortcuts.

### 3.4 Money Filters

Money values are in **xu (integer)**:

```
?total=gte:10000000       # 100,000 VND
?total=lte:5000000000     # 50,000,000 VND
```

### 3.5 Quantity Filters

```
?quantity=gte:1
?stockOnHand=between:1,100
```

---

## 4. Sort Conventions

### 4.1 Single Field

| Pattern | Meaning | Example |
| --- | --- | --- |
| `sort=field` | Ascending | `?sort=name` |
| `sort=-field` | Descending | `?sort=-createdAt` |
| `sort=field&order=desc` | Explicit | `?sort=name&order=desc` |

### 4.2 Multi-Field Sort

```
?sort=name,-createdAt
```

Or comma-separated:

```
?sort=name,createdAt&order=asc,desc
```

### 4.3 Default Sort

Per-endpoint; documented in each module. Common defaults:

| Endpoint Family | Default |
| --- | --- |
| Products (public) | `-createdAt` (newest first) |
| Orders (customer) | `-createdAt` |
| Orders (admin) | `-createdAt` |
| Reviews | `-helpfulVotes` |
| Promotions | `-startDate` |
| Audit | `-createdAt` |

### 4.4 Restricted Sort Fields

Per-endpoint, only specific fields are allowed. Invalid fields return `400 INVALID_SORT_FIELD`.

---

## 5. Search

### 5.1 Simple Search (`q`)

```
GET /v1/catalog/products?q=đèn+led+philips
```

Behaves as `name ILIKE '%q%'` plus description search.

### 5.2 Searchable Fields

| Endpoint | Searchable Fields |
| --- | --- |
| Products | `name`, `description`, `sku` |
| Categories | `name` |
| Brands | `name`, `description` |
| Orders (admin) | `orderNumber`, `customerEmail`, `trackingNumber` |
| Users (admin) | `email`, `displayName`, `phone` |
| Reviews | `content`, `title` |

### 5.3 Advanced Search (V1.5+)

For complex search (multi-field, fuzzy, full-text), use POST:

```
POST /v1/catalog/products/search
{
  "filter": {
    "and": [
      { "field": "categoryId", "op": "eq", "value": "..." },
      {
        "or": [
          { "field": "price", "op": "gte", "value": 100000 },
          { "field": "inStock", "op": "eq", "value": true }
        ]
      }
    ]
  },
  "sort": [{ "field": "createdAt", "order": "desc" }],
  "page": 1,
  "limit": 20
}
```

### 5.4 AI Search (V1.5+)

```
GET /v1/ai/search?q=đèn+tiết+kiệm+điện+cho+phòng+khách
```

---

## 6. Filter Combinations

### 6.1 AND (Implicit)

All top-level filters are AND-combined:

```
?status=active&price=gte:100000
```

Means `status = active AND price >= 100000`.

### 6.2 OR Within a Field

Use `in`:

```
?status=in:active,pending
```

### 6.3 NOT

Use `neq` or `nin`:

```
?status=neq:cancelled
?status=nin:cancelled,deleted
```

---

## 7. Sparse Fieldsets

Clients can request only specific fields to reduce payload:

```
GET /v1/catalog/products/123?fields=id,name,price,images
```

- Multiple values comma-separated.
- If field invalid → `400 INVALID_FIELD`.
- Public API: any non-sensitive field allowed.
- Admin: full fields available.

---

## 8. Includes (Related Resources)

```
GET /v1/orders/{id}?include=items,payment,shipment
```

- Multiple values comma-separated.
- If relationship invalid → `400 INVALID_INCLUDE`.

### 8.1 Common Includes

| Resource | Available Includes |
| --- | --- |
| Product | `variants`, `images`, `attributes`, `brand`, `category`, `reviews` |
| Order | `items`, `addresses`, `payment`, `shipment`, `statusHistory`, `returns` |
| User | `addresses`, `defaultAddress`, `roles` |

---

## 9. Implementation Examples

### 9.1 Admin Order Search

```
GET /v1/admin/orders?
  status=in:pending,confirmed
  &customerEmail=like:@gmail.com
  &minTotal=10000000
  &maxTotal=500000000
  &createdAt=gte:2026-07-01
  &createdAt=lte:2026-07-31
  &sort=-total
  &page=1
  &limit=20
```

### 9.2 Product Search (Public)

```
GET /v1/catalog/products?
  categoryId=uuid
  &brandId=uuid
  &minPrice=100000
  &maxPrice=500000
  &inStock=true
  &q=đèn+led
  &attribute.color=Warm+White
  &sort=priceAsc
  &limit=20
```

### 9.3 Admin Inventory Low-Stock Filter

```
GET /v1/admin/inventory/low-stock?
  threshold=10
  &categoryId=uuid
  &sort=-daysOfStockRemaining
  &limit=50
```

---

## 10. Special Filters

### 10.1 Has / Has Not Relationship

```
?hasReturns=true
?hasReviews=false
```

### 10.2 Active / Inactive

```
?isActive=true
?isDeleted=false
```

### 10.3 Boolean (Multiple)

```
?status=in:active,pending
?currency=eq:VND
```

---

## 11. URL Encoding

Special characters in values must be URL-encoded:

| Character | Encoded |
| --- | --- |
| `+` | `%2B` |
| `&` | `%26` |
| `=` | `%3D` |
| `,` | `%2C` |
| `:` | `%3A` |
| Space | `%20` or `+` |

> Spaces: prefer `%20` for clarity; `+` accepted as space.

Example:

```
GET /v1/catalog/products?q=den%20led%20am%20tran
```

---

## 12. Response Filter Echo

For client convenience, the response includes applied filters in `meta.filters`:

```json
{
  "data": [...],
  "meta": {
    "pagination": { ... },
    "filters": {
      "appliedFilters": {
        "status": ["active", "pending"],
        "price": { "min": 100000, "max": 500000 },
        "inStock": true
      }
    },
    "sort": [{ "field": "price", "order": "asc" }]
  }
}
```

---

## 13. Coverage Validation

| Check | Status |
| --- | --- |
| Filter operator convention documented | ✓ |
| Common filter parameters covered | ✓ |
| Sort conventions documented | ✓ |
| Search conventions documented | ✓ |
| Filter combinations (AND, OR, NOT) documented | ✓ |
| Sparse fieldsets supported | ✓ |
| Includes supported | ✓ |
| URL encoding rules | ✓ |
| Implementation examples | ✓ |

---

## 14. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial filter/sort/search spec: operators, sort, search, fieldsets, includes |

---

**End of Document — FILTER_SORT_SEARCH.md**
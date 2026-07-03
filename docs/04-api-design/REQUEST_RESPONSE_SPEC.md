# REQUEST_RESPONSE_SPEC.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document defines the **standard structure** for request and response bodies used across all SmartLight API endpoints. All endpoints **must** follow these structures unless explicitly noted in the module-specific docs.

---

## 2. General Conventions

| Aspect | Rule |
| --- | --- |
| Encoding | UTF-8 |
| Format | JSON (`application/json; charset=utf-8`) |
| Field naming | camelCase |
| Date format | ISO 8601 UTC (`"2026-07-03T15:30:00Z"`) |
| Money | Integer (VND xu) |
| Boolean | `true` / `false` (not string) |
| Null | Explicit `null` for missing values |
| Empty collections | `[]` (not `null`) |
| Optional fields | May be omitted only if documented |

---

## 3. Request Body Structure

### 3.1 Common Envelope

Most POST/PUT/PATCH requests accept a single JSON object:

```
{
  "field1": "value",
  "field2": 12345,
  "nested": {
    "key": "value"
  },
  "list": [
    { "item": 1 },
    { "item": 2 }
  ]
}
```

No top-level `data` wrapper in requests (only in responses).

### 3.2 Common Request Fields

| Field | Type | Description |
| --- | --- | --- |
| `idempotencyKey` | string (UUID) | Optional client-supplied idempotency key |
| `metadata` | object | Free-form; supplier-validated; stored on entity |

### 3.3 Required vs Optional

- **Required fields** documented explicitly. Missing → `422`.
- **Optional fields**: omitted when no value (do not send `null` unless required).
- **PATCH semantics**: omitted fields are NOT changed; `null` means explicitly clear.

---

## 4. Response Body Structure

### 4.1 Single Resource Response

```
200 OK
{
  "data": {
    "id": "uuid",
    "name": "...",
    ...fields
  }
}
```

### 4.2 List Response

```
200 OK
{
  "data": [
    { "id": "uuid", ... },
    { "id": "uuid", ... }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 245,
      "totalPages": 13,
      "hasNext": true,
      "hasPrev": false
    },
    "sort": { "field": "createdAt", "order": "desc" },
    "filters": { ... }
  }
}
```

### 4.3 Empty List

`200 OK` with empty array (not 404):

```
200 OK
{
  "data": [],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 0,
      "totalPages": 0,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### 4.4 Created Response

```
201 Created
Location: /v1/orders/<orderId>
{
  "data": {
    "id": "uuid",
    ...fields
  }
}
```

### 4.5 No Content Response

```
204 No Content
```

### 4.6 Action Result Response

For non-CRUD actions:

```
200 OK
{
  "data": {
    "result": "ok",
    "reference": "...",
    "message": "..."
  }
}
```

Example: After `/v1/auth/login`:

```
200 OK
{
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": { ... }
  }
}
```

---

## 5. Resource Representation Conventions

### 5.1 Identifier

```
"id": "0192ca3e-c5d8-7e1f-a012-3456789abcde"
```

Always string UUID. Never integer.

### 5.2 Timestamps

```
"createdAt": "2026-07-03T15:30:00Z"
"updatedAt": "2026-07-03T15:30:00Z"
"deletedAt": null
```

- All timestamps UTC.
- `deletedAt` always present on soft-deletable entities (null if not deleted).

### 5.3 Money (Always Integer xu)

```
"price": 20000000                  // 200,000 VND
"subtotal": 195000000               // 1,950,000 VND
"taxAmount": 19500000               // 195,000 VND (10% VAT)
"total": 214500000                  // 2,145,000 VND
"currency": "VND"                   // Always included
```

> **Money Convention:** 1 VND = 100 xu. All API money values are in xu (integer).

### 5.4 Money Range

| Field | Min | Max (VND) | Max (xu) |
| --- | --- | --- | --- |
| Price per item | 0 | 999,999,999,999 | 99,999,999,999,900 |
| Order total | 0 | 9,999,999,999,999 | 999,999,999,999,900 |

> Use `BigInt` or `Number` if within JavaScript safe integer; else string.

### 5.5 Boolean Flags

```
"isActive": true
"isPrimary": false
"isPublished": true
"enabled": false
```

Use positive `is*` form. Defaults documented per field.

### 5.6 Enum Strings

Enum values are lowercase strings:

```
"status": "active"
"status": "in_progress"
"paymentMethod": "vnpay"
"providerCode": "vnpay"
"carrierCode": "ghn"
```

### 5.7 References

References to other resources use ID strings:

```
"userId": "uuid"
"orderId": "uuid"
"variantId": "uuid"
```

When including the related resource inline (e.g., expand):

```
"order": {
  "id": "uuid",
  "orderNumber": "...",
  ...
}
```

### 5.8 Pagination Meta

```
"meta": {
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 245,
    "totalPages": 13,
    "hasNext": true,
    "hasPrev": false,
    "nextCursor": null,
    "prevCursor": null
  }
}
```

### 5.9 Response Meta Standard

```
"meta": {
  "requestId": "uuid",
  "apiVersion": "1.0.0",
  "serverTime": "2026-07-03T15:30:00Z",
  "pagination": { ... },
  "sort": { ... },
  "filters": { ... }
}
```

---

## 6. Resource Field Conventions

### 6.1 Customer-Facing Fields

| Pattern | Example |
| --- | --- |
| PascalCase ID names in URLs but camelCase in body | URL: `/users/{userId}` Body: `"userId": "..."` |
| Boolean as `is*` | `"isPrimary"` |
| Timestamps as `*At` suffix | `"createdAt"`, `"publishedAt"`, `"deletedAt"` |
| Counts as `*Count` | `"usageCount"`, `"viewCount"` |
| Money amounts include `currency` | `"price"`, `"currency"` |
| Status as `status` | `"status"` |
| Type enums as `*Type` | `"paymentMethodType"` |

### 6.2 Avoid These Patterns

| Avoid | Use |
| --- | --- |
| `user_id` (snake_case) | `userId` |
| `UserId` (PascalCase in body) | `userId` |
| `priceInVnd` | `price` + `currency` |
| `totalAmountInXu` | `total` |
| `is_active` | `isActive` |

---

## 7. Common Field Types

### 7.1 IDs

| Type | Format | Example |
| --- | --- | --- |
| `id` | UUID v7 | `"0192ca3e-c5d8-7e1f-a012-3456789abcde"` |
| `orderNumber` | YYYYMMDD-NNNN | `"20260703-0001"` |
| `rmaNumber` | RMA-NNNN | `"RMA-0001"` |
| `ticketNumber` | T-NNNN | `"T-0001"` |
| `sku` | Alphanumeric + dash | `"LT-LED-A19-WW"` |
| `code` | Alphanumeric | `"SUMMER10"` |

### 7.2 Contact Fields

| Type | Format | Example |
| --- | --- | --- |
| `email` | RFC 5322 lowercase | `"user@example.com"` |
| `phone` | +84 format | `"+84912345678"` |
| `url` | URL | `"https://cdn.smartlight.vn/..."` |

### 7.3 Address Fields

```
{
  "province": "Thành phố Hồ Chí Minh",
  "district": "Quận 1",
  "ward": "Phường Bến Nghé",
  "street": "123 Nguyễn Huệ",
  "fullName": "Nguyễn Văn A",
  "phone": "+84912345678",
  "country": "VN"
}
```

### 7.4 Vietnamese Locale

Vietnamese diacritics allowed in:
- `name`
- `description`
- `street`
- `ward`, `district`, `province`
- Email template content

NOT allowed in:
- `email` (lowercase ASCII)
- `sku` (uppercase ASCII)
- `slug` (lowercase ASCII + dash)
- `orderNumber` (digits)

---

## 8. Filters / Sorting / Pagination in Body

GET requests may use query strings. Some advanced filters (complex `or`/`and`) are sent in body as POST:

```
POST /v1/catalog/products/search
{
  "filter": {
    "and": [
      { "field": "categoryId", "op": "eq", "value": "..." },
      {
        "or": [
          { "field": "price", "op": "gte", "value": 100000 },
          { "field": "price", "op": "lte", "value": 500000 }
        ]
      }
    ]
  },
  "sort": [{ "field": "createdAt", "order": "desc" }],
  "page": 1,
  "limit": 20
}
```

Default GET uses simple query parameters (see `FILTER_SORT_SEARCH.md`).

---

## 9. Common Headers in Request/Response

### 9.1 Common Request Headers

| Header | Required | Description |
| --- | --- | --- |
| `Authorization` | Conditional | `Bearer <access_token>` |
| `Content-Type` | For body | `application/json; charset=utf-8` |
| `Accept-Language` | No | Default `vi-VN` |
| `Idempotency-Key` | For POST | UUID v7 |
| `X-Request-ID` | Recommended | UUID v7 for tracing |
| `X-Client` | Recommended | App identifier |
| `X-Client-Version` | Recommended | App version |

### 9.2 Common Response Headers

| Header | Description |
| --- | --- |
| `Content-Type` | Always `application/json; charset=utf-8` |
| `X-Request-ID` | Echo of request ID |
| `X-RateLimit-*` | Rate limit info |
| `Cache-Control` | Caching hints |
| `ETag` | Resource version (where applicable) |
| `Location` | URL of created resource (201 only) |

---

## 10. PII Handling in Responses

| Field | Visibility |
| --- | --- |
| `email` | Returned in own profile; hidden in other users' |
| `phone` | Own profile; masked in admin views |
| `passwordHash` | **Never** returned |
| `mfaSecret` | **Never** returned |
| `recoveryCodeHash` | **Never** returned |
| `tokenHash` (refresh tokens) | **Never** returned; only metadata |

Admin views with elevated permissions may include masked PII:

```
"email": "n****@example.com"
"phone": "+849****5678"
```

---

## 11. Standard Field Set Examples

### 11.1 User Resource

```
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "Nguyễn",
  "lastName": "Văn A",
  "phone": "+84912345678",
  "status": "active",
  "emailVerifiedAt": "2026-07-03T10:00:00Z",
  "locale": "vi-VN",
  "createdAt": "2026-07-01T08:00:00Z",
  "updatedAt": "2026-07-03T10:00:00Z",
  "deletedAt": null
}
```

### 11.2 Product Resource

```
{
  "id": "uuid",
  "name": "Đèn LED âm trần 9W",
  "slug": "den-led-am-tran-9w",
  "shortDescription": "...",
  "description": "...",
  "status": "published",
  "brand": {
    "id": "uuid",
    "name": "Philips",
    "slug": "philips"
  },
  "category": {
    "id": "uuid",
    "name": "Đèn LED",
    "slug": "den-led"
  },
  "basePrice": 20000000,
  "currency": "VND",
  "weight": 250,
  "hasVariants": true,
  "primaryImage": {
    "id": "uuid",
    "url": "https://cdn.smartlight.vn/...",
    "altText": "..."
  },
  "variants": [...],
  "attributes": [...],
  "publishedAt": "2026-06-01T00:00:00Z",
  "createdAt": "...",
  "updatedAt": "...",
  "deletedAt": null
}
```

### 11.3 Order Resource

```
{
  "id": "uuid",
  "orderNumber": "20260703-0001",
  "status": "processing",
  "currency": "VND",
  "subtotal": 195000000,
  "discountAmount": 0,
  "shippingFee": 2500000,
  "taxAmount": 19500000,
  "total": 217000000,
  "paidAmount": 217000000,
  "refundedAmount": 0,
  "items": [...],
  "shippingAddress": { ... },
  "payment": { ... },
  "shipment": { ... },
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 11.4 Cart Resource

```
{
  "id": "uuid",
  "status": "active",
  "currency": "VND",
  "items": [
    {
      "id": "uuid",
      "variantId": "uuid",
      "productName": "Đèn LED ...",
      "sku": "LT-LED-A19-WW",
      "imageUrl": "...",
      "quantity": 2,
      "unitPrice": 20000000,
      "subtotal": 40000000
    }
  ],
  "appliedVoucher": null,
  "subtotal": 40000000,
  "discountAmount": 0,
  "shippingFee": 2500000,
  "taxAmount": 4250000,
  "total": 49250000,
  "expiresAt": "2026-07-03T16:30:00Z"
}
```

---

## 12. Bulk Operations Format

### 12.1 Bulk Create

```
POST /v1/admin/catalog/products/bulk-publish
{
  "ids": ["uuid1", "uuid2", "uuid3"],
  "params": {
    "publishedAt": "2026-07-03T00:00:00Z"
  }
}
```

### 12.2 Bulk Response

```
200 OK
{
  "data": {
    "succeeded": ["uuid1", "uuid2"],
    "failed": [
      { "id": "uuid3", "code": "PRODUCT_LOCKED", "message": "..." }
    ]
  }
}
```

Always partial success — never all-or-nothing for bulk.

---

## 13. File Upload Format

### 13.1 Single File

```
POST /v1/media/upload
Content-Type: multipart/form-data; boundary=...

--boundary
Content-Disposition: form-data; name="file"; filename="product.jpg"
Content-Type: image/jpeg

<binary data>
--boundary
Content-Disposition: form-data; name="altText"

Product image
--boundary
Content-Disposition: form-data; name="metadata"

{"categoryId": "..."}
--boundary--
```

### 13.2 Response

```
201 Created
{
  "data": {
    "id": "uuid",
    "url": "https://cdn.smartlight.vn/...",
    "filename": "product.jpg",
    "size": 102400,
    "mimeType": "image/jpeg",
    "variants": [
      { "name": "thumbnail", "url": "...", "width": 200, "height": 200 },
      { "name": "medium", "url": "...", "width": 800, "height": 600 },
      { "name": "large", "url": "...", "width": 1600, "height": 1200 }
    ],
    "metadata": { ... },
    "uploadedAt": "2026-07-03T15:30:00Z"
  }
}
```

---

## 14. Webhook Payload Format

See `WEBHOOK_SPECIFICATION.md` for full details. Quick reference:

```
POST /v1/webhooks/payment/vnpay
X-Webhook-Signature: <hmac-sha256>
Content-Type: application/json

{
  "eventType": "payment.captured",
  "eventId": "...",
  "occurredAt": "...",
  "data": { ... }
}
```

---

## 15. Special Cases

### 15.1 Long URLs

For URLs > 2048 characters, prefer POST + body over query string.

### 15.2 Binary in Response

GET on `/v1/media/{id}/download` returns binary. Response headers:

```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="..."
Content-Length: ...
```

---

## 16. Field Length Limits (Recommended)

| Type | Min | Max |
| --- | --- | --- |
| Short text | 1 | 100 |
| Medium text | 1 | 255 |
| Long text | 1 | 1000 |
| Body / description | 1 | unlimited |
| Email | 5 | 255 |
| Phone | 10 | 20 |
| Slug | 1 | 100 |
| SKU | 1 | 50 |
| URL | 1 | 2048 |
| Postal code | 1 | 20 |

> Returning `422 VALIDATION_ERROR` with `details[].maxLength` on violation.

---

## 17. Numeric Range Limits

| Type | Min | Max |
| --- | --- | --- |
| Money (xu) | 0 | 99999999999900 |
| Quantity | 1 | 9999 |
| Discount percentage | 0 | 100 |
| Rating | 1 | 5 |
| Page | 1 | 1000 |
| Limit | 1 | 100 (default 20) |

---

## 18. Coverage Validation

| Check | Status |
| --- | --- |
| Request structure documented | ✓ |
| Response envelope defined | ✓ |
| Single resource format | ✓ |
| List format | ✓ |
| Created response format | ✓ |
| Empty list format | ✓ |
| Field conventions documented | ✓ |
| Money format (xu) | ✓ |
| ID format (UUID) | ✓ |
| Timestamp format (ISO 8601 UTC) | ✓ |
| PII handling documented | ✓ |
| Bulk operations format | ✓ |
| File upload format | ✓ |
| Webhook format | ✓ |

---

## 19. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial request/response spec: envelopes, conventions, fields, formats |

---

**End of Document — REQUEST_RESPONSE_SPEC.md**
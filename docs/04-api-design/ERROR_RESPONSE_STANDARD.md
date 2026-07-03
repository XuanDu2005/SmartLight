# ERROR_RESPONSE_STANDARD.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document defines the **uniform error response format** for SmartLight. All endpoints must return errors in this format.

---

## 2. Error Response Envelope

All errors return:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Email không hợp lệ"
      }
    ],
    "traceId": "0192ca3e-c5d8-7e1f-a012-3456789abcde",
    "timestamp": "2026-07-03T15:30:00Z",
    "path": "/v1/auth/login"
  }
}
```

### 2.1 Top-Level Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `error.code` | string | Yes | Machine-readable error code (e.g., `VALIDATION_ERROR`) |
| `error.message` | string | Yes | Human-readable summary (Vietnamese for V1) |
| `error.details` | array | No | For multi-field validation, additional context |
| `error.traceId` | string | Yes | UUID v7 for log correlation |
| `error.timestamp` | string (ISO 8601) | Yes | When error occurred |
| `error.path` | string | Yes | URL path of failed request |

---

## 3. HTTP Status Code Mapping

| Status | When Used |
| --- | --- |
| `400` | Bad Request — malformed JSON, missing required body |
| `401` | Unauthorized — missing/invalid JWT |
| `403` | Forbidden — authenticated but lacks permission |
| `404` | Not Found — resource missing |
| `409` | Conflict — duplicate, version mismatch |
| `410` | Gone — deprecated endpoint |
| `422` | Unprocessable Entity — semantic validation failed |
| `423` | Locked — account locked, resource locked |
| `429` | Too Many Requests — rate-limited |
| `500` | Internal Server Error — unexpected exception |
| `502` | Bad Gateway — upstream failure (e.g., payment provider) |
| `503` | Service Unavailable — temporary outage |
| `504` | Gateway Timeout — upstream timeout |

---

## 4. Standard Error Codes

### 4.1 Validation Errors (422)

| Code | When Used |
| --- | --- |
| `VALIDATION_ERROR` | Generic; details in `details[]` |
| `REQUIRED_FIELD_MISSING` | Required field absent |
| `INVALID_FORMAT` | Format violation (email, phone, etc.) |
| `VALUE_OUT_OF_RANGE` | Out of allowed range |
| `VALUE_TOO_LONG` / `VALUE_TOO_SHORT` | Length violation |
| `INVALID_EMAIL` | Email format failed |
| `INVALID_PHONE` | Phone format failed |
| `INVALID_URL` | URL malformed |
| `INVALID_DATE` | Date format failed |
| `INVALID_ENUM` | Value not in allowed list |
| `INVALID_UUID` | Not a valid UUID |

Example details:
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ",
  "details": [
    { "field": "email", "code": "INVALID_EMAIL", "message": "Email không hợp lệ" },
    { "field": "password", "code": "VALUE_TOO_SHORT", "message": "Mật khẩu phải có ít nhất 8 ký tự" },
    { "field": "quantity", "code": "VALUE_OUT_OF_RANGE", "message": "Số lượng phải từ 1 đến 99" }
  ]
}
```

### 4.2 Authentication Errors (401)

| Code | When Used |
| --- | --- |
| `UNAUTHENTICATED` | No token |
| `INVALID_TOKEN` | Token malformed or signature invalid |
| `TOKEN_EXPIRED` | Access token expired |
| `REFRESH_TOKEN_REVOKED` | Refresh token revoked |
| `REFRESH_TOKEN_EXPIRED` | Refresh token TTL exceeded |
| `INVALID_CREDENTIALS` | Wrong email/password |
| `MFA_REQUIRED` | Admin needs MFA |
| `MFA_INVALID` | Wrong TOTP code |
| `MFA_TOKEN_EXPIRED` | MFA challenge expired |
| `BACKUP_CODE_USED` | Recovery code used (still success) |
| `ACCOUNT_LOCKED` | Too many failed attempts |

### 4.3 Authorization Errors (403)

| Code | When Used |
| --- | --- |
| `FORBIDDEN` | Generic |
| `INSUFFICIENT_PERMISSIONS` | RBAC denies |
| `RESOURCE_NOT_OWNED` | Trying to access another user's resource |
| `EMAIL_NOT_VERIFIED` | Account not email-verified |
| `ACCOUNT_SUSPENDED` | Account suspended |
| `EMAIL_NOT_VERIFIED_BUT_REQUIRED` | For checkout/admin actions |
| `CANNOT_VOTE_OWN_REVIEW` | Review voting |
| `CANNOT_REVOKE_CURRENT_SESSION` | Session management |
| `MFA_NOT_CONFIGURED` | Admin without MFA (when required) |

### 4.4 Resource Errors (404)

| Code | When Used |
| --- | --- |
| `NOT_FOUND` | Generic |
| `USER_NOT_FOUND` | |
| `ORDER_NOT_FOUND` | |
| `PRODUCT_NOT_FOUND` | |
| `VARIANT_NOT_FOUND` | |
| `CART_NOT_FOUND` | |
| `PAYMENT_NOT_FOUND` | |
| `VOUCHER_NOT_FOUND` | |
| `ADDRESS_NOT_FOUND` | |
| `MEDIA_NOT_FOUND` | |
| `WEBHOOK_EVENT_NOT_FOUND` | |

### 4.5 Business Errors (409, 410, 422)

#### Conflict (409)

| Code | When Used |
| --- | --- |
| `CONFLICT` | Generic |
| `DUPLICATE_RESOURCE` | Unique constraint violated |
| `EMAIL_ALREADY_EXISTS` | Registration with existing email |
| `REVIEW_ALREADY_EXISTS` | One review per order item |
| `ORDER_ALREADY_CANCELLED` | Cancel twice |
| `CATEGORY_HAS_PRODUCTS` | Cannot delete with products |
| `BRAND_HAS_PRODUCTS` | Cannot delete with products |
| `CATEGORY_HAS_CHILDREN` | Cannot delete with children |
| `ROLE_HAS_USERS` | Cannot delete role with admins |
| `MEDIA_IN_USE` | Cannot delete in use |
| `INSUFFICIENT_STOCK` | Stock check failed |
| `STOCK_GOES_NEGATIVE` | Manual adjustment invalid |
| `VOUCHER_USAGE_LIMIT_EXCEEDED` | Already used |
| `VOUCHER_MIN_ORDER_NOT_MET` | Cart total too low |
| `VOUCHER_NOT_APPLICABLE` | Doesn't match cart |

#### Gone (410)

| Code | When Used |
| --- | --- |
| `GONE` | Deprecated resource |
| `VOUCHER_EXPIRED` | Past validTo |
| `CHECKOUT_SESSION_EXPIRED` | TTL exceeded |
| `MEDIA_DELETED` | Soft-deleted media |

#### Unprocessable (422)

| Code | When Used |
| --- | --- |
| `UNPROCESSABLE` | Generic |
| `CANNOT_TRANSITION_STATUS` | Wrong state machine transition |
| `ORDER_NOT_CANCELLABLE` | Status not cancellable |
| `TERMS_NOT_AGREED` | Must agree |
| `INVALID_SHIPPING_METHOD` | Not available for address |
| `WEIGHT_EXCEEDS_LIMIT` | Too heavy |
| `INVALID_PROMOTION_APPLICATION` | Promotion rules fail |
| `WEAK_PASSWORD` | Password policy |
| `REASON_TEXT_REQUIRED` | Manual adjustment |
| `PAYPAL_NOT_AVAILABLE` | Country/locale (V1) |
| `BANK_TRANSFER_NOT_AVAILABLE` | V1 (use V1.1) |

### 4.6 Payment Errors (402, 409, 422, 502)

| Code | Status | When Used |
| --- | --- | --- |
| `PAYMENT_REQUIRED` | 402 | Generic |
| `PAYMENT_FAILED` | 409 | Provider rejected |
| `PAYMENT_CANCELLED` | 409 | User cancelled at provider |
| `PAYMENT_EXPIRED` | 410 | Past expiresAt |
| `PAYMENT_ALREADY_PROCESSED` | 409 | Capture/refund attempt on settled |
| `INSUFFICIENT_FUNDS` | 402 | Provider-reported |
| `PAYMENT_DECLINED` | 402 | Card declined |
| `INVALID_CARD` | 422 | Bad card data |
| `PROVIDER_TIMEOUT` | 504 | Provider didn't respond |
| `PROVIDER_UNAVAILABLE` | 503 | Provider down |

### 4.7 Inventory Errors (409, 422)

| Code | Status | When Used |
| --- | --- | --- |
| `INSUFFICIENT_STOCK` | 409 | Stock check failed |
| `STOCK_GOES_NEGATIVE` | 422 | Manual adj invalid |
| `INVALID_REASON_CODE` | 422 | Bad enum value |
| `STOCK_LOCKED` | 423 | During another txn |
| `RESERVATION_EXPIRED` | 410 | Stock reservation TTL |

### 4.8 Rate Limit Errors (429)

| Code | When Used |
| --- | --- |
| `RATE_LIMIT_EXCEEDED` | Generic |
| `TOO_MANY_LOGIN_ATTEMPTS` | Auth throttling |
| `TOO_MANY_REGISTRATIONS` | Registration throttling |
| `TOO_MANY_PAYMENT_ATTEMPTS` | Checkout throttling |
| `TOO_MANY_PASSWORD_RESETS` | Reset throttling |

Includes headers:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After`

---

## 5. Multi-Field Validation

Always use `details[]` for field-level errors:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [
      {
        "field": "user.email",
        "code": "INVALID_EMAIL",
        "message": "Email không hợp lệ",
        "expectedFormat": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
      },
      {
        "field": "user.password",
        "code": "WEAK_PASSWORD",
        "message": "Mật khẩu không đủ mạnh",
        "requirements": [
          "Ít nhất 8 ký tự",
          "Bao gồm chữ hoa",
          "Bao gồm chữ thường",
          "Bao gồm số"
        ]
      }
    ]
  }
}
```

---

## 6. Error Localization

V1 uses **Vietnamese** for user-facing messages. Implementation:

| Layer | Language |
| --- | --- |
| Error `message` | Vietnamese (or `Accept-Language` if provided) |
| Error `code` | English (machine-readable) |
| Error `details[].message` | Localized |

V1.5+: `Accept-Language` for English (`en-US`).

---

## 7. Error Headers

### 7.1 Always Present

- `Content-Type: application/json; charset=utf-8`
- `X-Request-ID: <uuid>`

### 7.2 Authentication Errors (401)

- `WWW-Authenticate: Bearer realm="smartlight", error="invalid_token", error_description="..."`

### 7.3 Rate Limit (429)

- `X-RateLimit-Limit: <number>`
- `X-RateLimit-Remaining: <number>`
- `X-RateLimit-Reset: <unix timestamp>`
- `Retry-After: <seconds>`

---

## 8. Specific Error Patterns

### 8.1 Idempotency Conflict (409)

```
{
  "error": {
    "code": "IDEMPOTENCY_KEY_REUSED",
    "message": "Idempotency key đã được sử dụng với payload khác",
    "details": {
      "previousRequest": { "method": "POST", "path": "/v1/checkout/{id}/place-order", "timestamp": "..." }
    }
  }
}
```

### 8.2 Validation with Multiple Errors

```
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Đăng ký thất bại",
    "details": [
      { "field": "email", "code": "ALREADY_EXISTS", "message": "Email đã được đăng ký" },
      { "field": "password", "code": "WEAK_PASSWORD", "message": "Mật khẩu phải có ít nhất 8 ký tự và chứa chữ hoa" }
    ]
  }
}
```

### 8.3 Stock Race Condition

```
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Sản phẩm không đủ hàng",
    "details": [
      {
        "variantId": "uuid",
        "sku": "LT-LED-A19-WW-9W",
        "requested": 5,
        "available": 3
      }
    ]
  }
}
```

---

## 9. Server Errors (5xx)

### 9.1 Generic 500

```
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Đã xảy ra lỗi. Vui lòng thử lại sau.",
    "traceId": "uuid",
    "timestamp": "...",
    "path": "..."
  }
}
```

> Never expose stack traces or internal details in production.

### 9.2 503 During Deployment

```
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Hệ thống đang bảo trì. Vui lòng thử lại sau ít phút.",
    "estimatedDowntimeMinutes": 15
  }
}
```

---

## 10. Error Code Naming Convention

| Pattern | Example |
| --- | --- |
| `SCREAMING_SNAKE_CASE` | `VALIDATION_ERROR` |
| Resource-scoped prefixes | `USER_NOT_FOUND`, `ORDER_NOT_FOUND` |
| Domain-scoped suffixes | `..._EXPIRED`, `..._LIMIT_EXCEEDED` |

---

## 11. Special Error Cases

### 11.1 Idempotency Errors

| Code | Status | Trigger |
| --- | --- | --- |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Same key with different payload |
| `IDEMPOTENCY_KEY_PROCESSING` | 409 | Same key still processing |
| `IDEMPOTENCY_KEY_EXPIRED` | 422 | TTL exceeded |

### 11.2 Webhook Errors

| Code | Status | Trigger |
| --- | --- | --- |
| `WEBHOOK_SIGNATURE_INVALID` | 401 | Bad signature |
| `WEBHOOK_DUPLICATE` | 200 | Already processed (return success) |
| `WEBHOOK_EVENT_TYPE_UNKNOWN` | 422 | Unrecognized event |

---

## 12. Coverage Validation

| Check | Status |
| --- | --- |
| Standard envelope defined | ✓ |
| HTTP status codes mapped | ✓ |
| Error code catalog by category | ✓ |
| Multi-field validation pattern | ✓ |
| Vietnamese localization | ✓ |
| Required headers documented | ✓ |
| Special case errors covered | ✓ |
| Server error safety (no info leak) | ✓ |

---

## 13. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial error standard: envelope, codes by category, headers, localization |

---

**End of Document — ERROR_RESPONSE_STANDARD.md**
# CHECKOUT_API.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document details the **Checkout API endpoints** for SmartLight. Checkout is a multi-step session that includes address selection, shipping, payment method, voucher, and final order placement. Supports both authenticated users and guest checkout with optional account creation.

---

## 2. Checkout Session Model

| Property | Value |
| --- | --- |
| Identifier | UUID v7 |
| TTL | 15 minutes (BR-CHK-001) |
| Status | `active`, `completed`, `expired`, `abandoned` |
| Idempotency | Required (single Idempotency-Key shared across checkout flow) |

---

## 3. Checkout Endpoints

### 3.1 EP-CHK-001 — Begin Checkout

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/checkout` |
| **Authentication** | Optional (creates guest session if anonymous) |
| **Idempotency** | Required |
| **Audit** | `checkout.started` |
| **Related Use Case** | UC-CHK-001 |
| **Related Entity** | checkout_session |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `cartId` | string | Optional (uses current cart if omitted) |
| `guestEmail` | string | Conditional (required if anonymous) |

**Response `201 Created`:**

```
Location: /v1/checkout/<sessionId>

{
  "data": {
    "sessionId": "uuid",
    "idempotencyKey": "<client-supplied-key>",
    "status": "active",
    "guestEmail": "...",
    "expiresAt": "2026-07-03T16:30:00Z",
    "currency": "VND",
    "items": [...],
    "totals": { ... },
    "stepsCompleted": {
      "shippingAddress": false,
      "billingAddress": false,
      "shippingMethod": false,
      "paymentMethod": false,
      "voucher": false,
      "guestInfo": false
    }
  }
}
```

**Business Rules:**
- BR-CHK-001: 15-min TTL
- BR-CHK-002: Stock reservation converted from cart

---

### 3.2 EP-CHK-002 — Get Session

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/checkout/{sessionId}` |
| **Authentication** | Optional (session token) |
| **Cache** | private, no-cache |

**Response `200 OK`:** Full session state.

---

### 3.3 EP-CHK-003 — Set Shipping Address

| Field | Value |
| --- | --- |
| **Method** | PUT |
| **URL** | `/v1/checkout/{sessionId}/shipping-address` |
| **Idempotency** | Required |
| **Audit** | `checkout.shipping_address_set` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `addressId` | string | One of |
| `newAddress` | object | One of (omit `addressId`) |

**Response `200 OK`:** Updated session with totals recalculated.

**Validation:** Address must be valid Vietnamese province/district/ward.

---

### 3.4 EP-CHK-004 — Set Billing Address

| Field | Value |
| --- | --- |
| **Method** | PUT |
| **URL** | `/v1/checkout/{sessionId}/billing-address` |
| **Idempotency** | Required |

Same shape as shipping address.

> If omitted, defaults to shipping address (BR-CHK-009).

---

### 3.5 EP-CHK-005 — Choose Shipping Method

| Field | Value |
| --- | --- |
| **Method** | PUT |
| **URL** | `/v1/checkout/{sessionId}/shipping-method` |
| **Idempotency** | Required |
| **Audit** | `checkout.shipping_method_chosen` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `methodId` | string | Yes |

**Response `200 OK`:** Updated totals.

**Errors:** `INVALID_SHIPPING_METHOD` (422) — not available for address

---

### 3.6 EP-CHK-006 — Choose Payment Method

| Field | Value |
| --- | --- |
| **Method** | PUT |
| **URL** | `/v1/checkout/{sessionId}/payment-method` |
| **Idempotency** | Required |
| **Audit** | `checkout.payment_method_chosen` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `paymentMethod` | enum | `vnpay`, `momo`, `zalopay`, `paypal`, `bank_transfer` |

**Response `200 OK`:** Updated session.

---

### 3.7 EP-CHK-007 — Apply Voucher

| Field | Value |
| --- | --- |
| **Method** | PUT |
| **URL** | `/v1/checkout/{sessionId}/voucher` |
| **Idempotency** | Required |
| **Related Use Case** | UC-CHK-003 |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `code` | string | Yes |

**Response `200 OK`:** Updated totals.

**Errors:** Same as cart voucher errors.

---

### 3.8 EP-CHK-008 — Set Guest Info

| Field | Value |
| --- | --- |
| **Method** | PUT |
| **URL** | `/v1/checkout/{sessionId}/guest-info` |
| **Authentication** | Anonymous only |
| **Idempotency** | Required |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `email` | string | Yes |
| `phone` | string | Yes (+84) |
| `firstName` | string | Yes |
| `lastName` | string | Yes |
| `acceptMarketing` | boolean | No |

**Response `200 OK`:** Updated session.

**Business Rule:** BR-GCH-002: Guest email required.

---

### 3.9 EP-CHK-009 — Validate Voucher (Without Applying)

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/checkout/{sessionId}/apply-voucher` |

**Request:** Same as apply.

**Response `200 OK`:**

```
{
  "data": {
    "valid": true,
    "code": "SUMMER10",
    "discountType": "percentage",
    "discountValue": 10,
    "discountAmount": 4000000,
    "voucherId": "uuid"
  }
}
```

Or with valid: false and reason.

---

### 3.10 EP-CHK-010 — Recalculate Totals

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/checkout/{sessionId}/calculate` |
| **Idempotency** | Required |

**Response `200 OK`:** Updated totals (shipping fee, tax, etc.)

---

### 3.11 EP-CHK-011 — Place Order

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/checkout/{sessionId}/place-order` |
| **Authentication** | Optional |
| **Idempotency** | Required |
| **Audit** | `order.placed` |
| **Related Use Case** | UC-CHK-002, UC-ORD-001 |
| **Related Entity** | order, order_item, payment |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `agreeTerms` | boolean | Yes; must be `true` |
| `notes` | string | No (order-level notes) |
| `paymentMethod` | enum | Same as `EP-CHK-006` |

**Response `201 Created`:**

```
Location: /v1/orders/<orderId>

{
  "data": {
    "orderId": "uuid",
    "orderNumber": "20260703-0001",
    "status": "pending",
    "total": 130100000,
    "currency": "VND",
    "payment": {
      "paymentId": "uuid",
      "status": "pending",
      "redirectUrl": "https://vnpay.vn/...",
      "expiresAt": "..."
    },
    "nextStep": {
      "type": "redirect",
      "url": "https://vnpay.vn/..."
    }
  }
}
```

**Errors:**
- `INSUFFICIENT_STOCK` (409) — price changed or stock depleted
- `INVALID_VOUCHER` (422) — validation failed
- `EXPIRED_SESSION` (410)
- `TERMS_NOT_AGREED` (422)

**Business Rules:**
- BR-CHK-005: Tax snapshot at order creation
- BR-CHK-006: Price snapshot (per item)
- BR-ORD-001: Order number generation
- BR-PAY-002: Idempotent payment creation
- BR-INV-003: Stock reservation consumed

**Side Effects:**
1. Stock reservations → consumed (stock_movement created)
2. Voucher usage record created (if applied)
3. Order + items + addresses created
4. Payment intent created
5. Cart status = `converted`
6. Checkout session status = `completed`
7. Notification queued

---

### 3.12 EP-CHK-012 — Abandon Session

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/checkout/{sessionId}/abandon` |
| **Audit** | `checkout.abandoned` |

**Response `200 OK`:** `{ "data": { "abandoned": true } }`

**Side Effects:**
- Stock reservations released
- Status = `abandoned`

---

### 3.13 EP-CHK-013 — Create Account from Guest Checkout

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/checkout/{sessionId}/account` |
| **Authentication** | Anonymous (uses session) |
| **Idempotency** | Required |
| **Related Use Case** | UC-GCH-001 |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `password` | string | Yes |
| `acceptTerms` | boolean | Yes |

**Response `200 OK`:**

```
{
  "data": {
    "userId": "uuid",
    "email": "...",
    "accountCreated": true,
    "autoLoggedIn": true,
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Business Rule:** BR-GCH-003: Magic link sent to guest for future tracking.

---

## 4. Guest Checkout Flow

```
1. Anonymous user adds items to cart
2. POST /v1/checkout → session created
3. PUT /v1/checkout/{id}/guest-info (email, phone, name)
4. PUT /v1/checkout/{id}/shipping-address (or new)
5. PUT /v1/checkout/{id}/shipping-method
6. (optional) PUT /v1/checkout/{id}/voucher
7. POST /v1/checkout/{id}/place-order
8. Redirect to payment provider
9. Webhook → payment.captured → order confirmed
10. Notification: order confirmed email
11. (optional) POST /v1/checkout/{id}/account → upgrade to user
```

---

## 5. Authenticated Checkout Flow

Same as guest, but:
- `userId` from JWT
- No `guestEmail`; uses user.email
- Address from user address book (or new)
- Optional: skip guest-info step

---

## 6. Cross-References

| Field | Reference |
| --- | --- |
| Use Cases | UC-CHK-001..006, UC-GCH-001 |
| Business Rules | BR-CHK-001..011, BR-GCH-001..004, BR-ORD-001, BR-PAY-001..002 |
| Workflows | WF-CHK-01..04 |
| Features | SF-CHK-001..012, SF-GCH-001..003 |
| Entities | checkout_session, order, cart |

---

## 7. Coverage Validation

| Check | Status |
| --- | --- |
| Multi-step checkout covered | ✓ |
| Address selection covered | ✓ |
| Shipping method covered | ✓ |
| Payment method covered | ✓ |
| Voucher covered | ✓ |
| Guest info covered | ✓ |
| Place order covered | ✓ |
| Abandon covered | ✓ |
| Account creation from guest covered | ✓ |
| Guest checkout flow documented | ✓ |
| Authenticated flow referenced | ✓ |
| Idempotency required throughout | ✓ |
| Audit logging specified | ✓ |

---

## 8. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial checkout API: 13 endpoints covering full multi-step checkout + guest flow |

---

**End of Document — CHECKOUT_API.md**
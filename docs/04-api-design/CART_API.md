# CART_API.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document details the **Cart API endpoints** for SmartLight. Cart supports both authenticated users and guest sessions, with seamless merge on login.

---

## 2. Cart Model

| Property | Value |
| --- | --- |
| Owner | User OR guest session |
| Currency | VND |
| Status | `active`, `converted`, `abandoned`, `expired` |
| Expiry | 7 days inactive (90 days purge) |
| Stock Reservation | Per-item; 15-min TTL |

---

## 3. Cart Endpoints

### 3.1 EP-CRT-001 — Get Current Cart

| Field | Value |
| --- | --- |
| **Method** | GET |
| --- | --- |
| **URL** | `/v1/cart` |
| **Authentication** | Optional (cookie/session identifies cart) |
| **Cache** | private, no-cache |
| **Related Use Case** | UC-CRT-001 |
| **Related Entity** | cart, cart_item |

**Identification:**
- Authenticated: by `userId`
- Anonymous: by `cart-session-token` cookie

**Response `200 OK`:**

```
{
  "data": {
    "id": "uuid",
    "status": "active",
    "currency": "VND",
    "ownerType": "user",
    "itemCount": 3,
    "items": [
      {
        "id": "uuid",
        "variantId": "uuid",
        "productId": "uuid",
        "productName": "Đèn LED âm trần 9W",
        "productSlug": "den-led-am-tran-9w",
        "sku": "LT-LED-A19-WW-9W",
        "imageUrl": "https://cdn.smartlight.vn/...",
        "quantity": 2,
        "unitPrice": 20000000,
        "subtotal": 40000000,
        "inStock": true,
        "availableQuantity": 45,
        "maxQuantityPerOrder": 99,
        "addedAt": "..."
      }
    ],
    "appliedVoucher": {
      "code": "SUMMER10",
      "discountType": "percentage",
      "discountValue": 10,
      "discountAmount": 4000000
    },
    "totals": {
      "subtotal": 120000000,
      "discountAmount": 4000000,
      "shippingFee": 2500000,
      "taxAmount": 11600000,
      "total": 130100000,
      "currency": "VND"
    },
    "expiresAt": "2026-07-04T15:30:00Z"
  }
}
```

> Totals only populated if shipping address known; otherwise estimated.

---

### 3.2 EP-CRT-002 — Add Item to Cart

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/cart/items` |
| **Authentication** | Optional |
| **Idempotency** | Required |
| **Audit** | `cart.item_added` |
| **Related Use Case** | UC-CRT-002 |

**Request Body:**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `variantId` | string | Yes | Must exist |
| `quantity` | int | Yes | 1..99 |

**Response `200 OK`:** Updated cart.

**Side Effects:**
- Stock reservation created (15-min TTL)
- Cache invalidated

**Errors:**
- `VARIANT_NOT_FOUND` (404)
- `VARIANT_NOT_ACTIVE` (422)
- `INSUFFICIENT_STOCK` (409)
- `QUANTITY_EXCEEDS_MAX` (422)

---

### 3.3 EP-CRT-003 — Update Item Quantity

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/cart/items/{itemId}` |
| **Authentication** | Optional |
| **Idempotency** | Required |
| **Audit** | `cart.item_quantity_updated` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `quantity` | int | Yes (1..99; 0 = remove) |

**Response `200 OK`:** Updated cart.

**Errors:** `INSUFFICIENT_STOCK`, `ITEM_NOT_FOUND`, `CART_NOT_FOUND`

---

### 3.4 EP-CRT-004 — Remove Item

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/cart/items/{itemId}` |
| **Authentication** | Optional |
| **Audit** | `cart.item_removed` |

**Response:** `204 No Content`

**Side Effect:** Stock reservation released.

---

### 3.5 EP-CRT-005 — Clear Cart

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/cart/items` |
| **Authentication** | Optional |
| **Audit** | `cart.cleared` |

**Response:** `204 No Content`

---

### 3.6 EP-CRT-006 — Apply Voucher

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/cart/voucher` |
| **Authentication** | Optional |
| **Idempotency** | Required |
| **Related Use Case** | UC-CRT-005 |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `code` | string | Yes |

**Response `200 OK`:** Cart with `appliedVoucher`.

**Errors:**
- `VOUCHER_NOT_FOUND` (404)
- `VOUCHER_EXPIRED` (410)
- `VOUCHER_USAGE_LIMIT_EXCEEDED` (409)
- `VOUCHER_MIN_ORDER_NOT_MET` (422)
- `VOUCHER_NOT_APPLICABLE` (422)

**Business Rules:**
- BR-PRM-006: Voucher usage limits
- BR-PRM-007: Per-user usage limits
- BR-PRM-010: Cumulative redemption tracked

---

### 3.7 EP-CRT-007 — Remove Voucher

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/cart/voucher` |

**Response:** Cart without voucher applied.

---

### 3.8 EP-CRT-008 — Merge Guest Cart to User

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/cart/merge` |
| **Authentication** | Yes (must be logged in) |
| **Idempotency** | Required |
| **Related Use Case** | UC-CRT-007 |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `guestSessionToken` | string | Yes (from cookie) |

**Behavior:**
- If user cart exists: merge items (combine quantities)
- If not: take ownership of guest cart
- Stock reservations preserved (TTL may have expired)

**Response `200 OK`:** Merged cart.

---

### 3.9 EP-CRT-009 — Calculate Totals (Dry Run)

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/cart/totals` |
| **Authentication** | Optional |
| **Idempotency** | Required |

Computes totals without persisting.

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `shippingAddressId` | string | Optional |
| `province` | string | Optional (for quote) |
| `district` | string | Optional |
| `shippingMethodId` | string | Optional |
| `voucherCode` | string | Optional |

**Response `200 OK`:**

```
{
  "data": {
    "subtotal": 120000000,
    "discountAmount": 0,
    "shippingFee": 2500000,
    "taxAmount": 12250000,
    "total": 134750000,
    "currency": "VND",
    "appliedVoucher": null,
    "shippingQuote": {
      "methodId": "uuid",
      "methodName": "GHN Standard",
      "estimatedDays": 3,
      "fee": 2500000
    }
  }
}
```

---

### 3.10 EP-CRT-010 — Get Shipping Quote

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/cart/shipping/quote` |
| **Authentication** | Optional |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `province` | string | Yes |
| `district` | string | Yes |
| `ward` | string | Yes |
| `cartId` | string | Optional (otherwise current cart) |

**Response `200 OK`:**

```
{
  "data": [
    {
      "methodId": "uuid",
      "carrierCode": "ghn",
      "serviceName": "GHN Standard",
      "fee": 2500000,
      "currency": "VND",
      "estimatedDaysMin": 2,
      "estimatedDaysMax": 4
    },
    {
      "methodId": "uuid",
      "carrierCode": "ghn",
      "serviceName": "GHN Express",
      "fee": 4500000,
      "currency": "VND",
      "estimatedDaysMin": 1,
      "estimatedDaysMax": 2
    }
  ]
}
```

---

### 3.11 EP-CRT-011 — Initialize Guest Session

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/cart/guest-session` |
| **Authentication** | None |

**Response `200 OK`:**

```
{
  "data": {
    "guestSessionToken": "opaque-uuid",
    "cartId": "uuid",
    "expiresAt": "..."
  }
}
```

**Side Effects:**
- Server issues `cart-session-token` cookie (HTTP-only, secure, sameSite=lax).
- Cart created in DB.

---

## 4. Response Examples

### 4.1 Empty Cart

```
{
  "data": {
    "id": "uuid",
    "status": "active",
    "currency": "VND",
    "itemCount": 0,
    "items": [],
    "appliedVoucher": null,
    "totals": {
      "subtotal": 0,
      "discountAmount": 0,
      "shippingFee": 0,
      "taxAmount": 0,
      "total": 0,
      "currency": "VND"
    },
    "expiresAt": "..."
  }
}
```

---

## 5. Cross-References

| Field | Reference |
| --- | --- |
| Use Cases | UC-CRT-001..007 |
| Business Rules | BR-CRT-001..007, BR-PRM-006..010 |
| Workflows | WF-CRT-01..03 |
| Features | SF-CRT-001..007 |
| Entities | cart, cart_item, stock_reservation |

---

## 6. Stock Reservation Behavior

| Action | Effect |
| --- | --- |
| Add to cart (with stock) | Reservation created; TTL 15 min |
| Add to cart (insufficient stock) | Reservation denied; partial allowed? No — full quantity needed |
| Increase quantity | Reservation extended |
| Decrease quantity | Reservation reduced |
| Remove item | Reservation released |
| Cart idle 15 min | Reservation expires; cart updated to reflect |
| Login / merge | Reservations preserved if active |
| Order placed | Reservations consumed |
| Cart TTL exceeded | Cart marked `abandoned`, reservations released |
| Checkout abandon | Reservations released |

---

## 7. Coverage Validation

| Check | Status |
| --- | --- |
| Add/update/remove item covered | ✓ |
| Voucher apply/remove covered | ✓ |
| Guest session init covered | ✓ |
| Merge to user covered | ✓ |
| Total calculation covered | ✓ |
| Shipping quote covered | ✓ |
| Stock reservation semantics documented | ✓ |
| Cart TTL + status lifecycle documented | ✓ |
| Audit logging specified | ✓ |

---

## 8. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial cart API: 11 endpoints (CRUD + voucher + guest/merge) |

---

**End of Document — CART_API.md**
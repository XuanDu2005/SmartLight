# PAYMENT_API.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document details the **Payment API endpoints** for SmartLight. Covers payment creation (intent), capture, refunds, provider integrations (MoMo, VNPay, ZaloPay, PayPal), webhooks, and admin payment management.

---

## 2. Payment State Machine

```
Pending → Authorized → Captured → PartiallyRefunded → Refunded
   ↓         ↓           ↓
Failed   Voided      Cancelled
Failed   Cancelled
```

See `docs/02-system-analysis/STATE_MACHINE.md` §SM-PAY.

---

## 3. Payment Providers (V1)

| Provider | Status | Notes |
| --- | --- | --- |
| VNPay | Live (V1) | Primary Vietnam gateway |
| MoMo | Live (V1) | Mobile wallet |
| ZaloPay | Live (V1) | Mobile wallet |
| PayPal | Live (V1) | International |
| Bank Transfer | V1.1+ | Manual verification |

> V1 supports hosted page flow (redirect). Direct API integration is V1.5.

---

## 4. PCI Compliance

| Rule | Compliance |
| --- | --- |
| No card data stored | BR-PAY-001 |
| All card processing on provider's hosted page | ✓ |
| Provider tokens only stored as `intent_id` | ✓ |
| Webhook signatures verified | ✓ |

---

## 5. Customer Payment Endpoints

### 5.1 EP-PAY-001 — Get Payment

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/payments/{paymentId}` |
| **Authentication** | Yes (own payment) |
| **Related Entity** | payment |

**Response `200 OK`:**

```
{
  "data": {
    "id": "uuid",
    "orderId": "uuid",
    "orderNumber": "20260703-0001",
    "providerCode": "vnpay",
    "status": "pending",
    "amount": 217000000,
    "capturedAmount": 0,
    "refundedAmount": 0,
    "currency": "VND",
    "paymentMethod": "vnpay_card",
    "createdAt": "...",
    "expiresAt": "...",
    "redirectUrl": "https://vnpay.vn/..."
  }
}
```

---

### 5.2 EP-PAY-002 — Cancel Pending Payment

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/payments/{paymentId}/cancel` |
| **Authentication** | Yes (own payment) |
| **Idempotency** | Required |
| **Audit** | `payment.cancelled` |

**Constraint:** Status must be `pending` or `authorized`.

**Response `200 OK`:**

```
{
  "data": {
    "paymentId": "uuid",
    "status": "cancelled",
    "cancelledAt": "...",
    "orderStatus": "cancelled"
  }
}
```

**Side Effect:** Order moved to `cancelled`; stock released; pending voucher usage reversed.

---

### 5.3 EP-PAY-003 to EP-PAY-006 — Create Provider Intent

Each provider has a dedicated endpoint to create the intent:

#### EP-PAY-003 — MoMo
```
POST /v1/payments/{paymentId}/momo/create
```

#### EP-PAY-004 — VNPay
```
POST /v1/payments/{paymentId}/vnpay/create
```

#### EP-PAY-005 — ZaloPay
```
POST /v1/payments/{paymentId}/zalopay/create
```

#### EP-PAY-006 — PayPal
```
POST /v1/payments/{paymentId}/paypal/create
```

| Field | Value |
| --- | --- |
| **Method** | POST |
| **Authentication** | Yes (own payment) |
| **Idempotency** | Required |
| **Audit** | `payment.intent_created` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `paymentMethod` | enum | `card`, `bank_transfer`, `wallet`, etc. (provider-specific) |
| `returnUrl` | string | Yes; client redirect after payment |
| `cancelUrl` | string | Yes; client redirect on cancel |

**Response `200 OK`:**

```
{
  "data": {
    "paymentId": "uuid",
    "status": "pending",
    "providerCode": "vnpay",
    "intentId": "...",
    "redirectUrl": "https://vnpay.vn/payment?...",
    "expiresAt": "...",
    "deeplink": null  // For mobile wallets
  }
}
```

**Business Rule:** BR-PAY-002: Idempotent via `providerCode + intentId`.

---

### 5.4 EP-PAY-007 — Get Redirect URL

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/payments/{paymentId}/redirect-url` |
| **Authentication** | Yes |

Re-fetch redirect URL (e.g., if user closed the page). Idempotent.

**Response `200 OK`:** Same as create intent response (just the URL).

---

### 5.5 EP-PAY-008 — Get Payment for Order

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/payments/order/{orderId}` |
| **Authentication** | Yes (own order) |

**Response `200 OK`:** Payment (or null if none).

---

## 6. Refund Endpoints

### 6.1 EP-PAY-021 — List Refunds for Payment

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/payments/{paymentId}/refunds` |
| **Authentication** | Yes (own payment) |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "paymentId": "uuid",
      "amount": 217000000,
      "reason": "Order cancelled",
      "status": "processed",
      "providerRefundId": "...",
      "processedAt": "...",
      "createdAt": "..."
    }
  ]
}
```

---

### 6.2 EP-PAY-022 — Request Refund (Customer)

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/payments/{paymentId}/refunds` |
| **Authentication** | Yes |
| **Idempotency** | Required |
| **Related Use Case** | UC-PAY-004 |
| **Related Entity** | refund |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `amount` | int | Optional (default = full) |
| `reason` | string | Yes |
| `orderId` | string | Required (for admin-context) |

> **Note:** Customer refunds are usually initiated via order cancel or return. Direct refund request is admin-only; for customers, use `/orders/{id}/cancel`.

---

## 7. Admin Payment Endpoints

### 7.1 EP-ADM-PAY-001 — List All Payments

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/payments` |
| **Authentication** | Yes (FinanceManager+) |

**Query Parameters:** `status`, `providerCode`, `from`, `to`, `orderId`, `minAmount`, `maxAmount`, etc.

---

### 7.2 EP-ADM-PAY-002 — Get Payment (Admin)

Same shape as customer; admin scope.

---

### 7.3 EP-ADM-PAY-003 — Get Payment Transactions

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/payments/{paymentId}/transactions` |

**Response `200 OK`:** List of all `payment_transaction` records.

---

### 7.4 EP-ADM-PAY-004 — Retry Payment Capture

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/payments/{paymentId}/retry` |
| **Audit** | `payment.retry_capture` |

Used when automatic capture fails.

---

### 7.5 EP-ADM-PAY-005 — Manual Capture

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/payments/{paymentId}/capture` |
| **Audit** | `payment.manual_capture` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `amount` | int | No (default full) |
| `reason` | string | Yes |

For admin override (e.g., partial capture after negotiation).

---

## 8. Admin Refund Endpoints

### 8.1 EP-ADM-PAY-021 — List All Refunds

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/refunds` |
| **Authentication** | Yes (FinanceManager+) |

**Query Parameters:** `status`, `paymentId`, `orderId`, `from`, `to`, `requestedBy`, etc.

---

### 8.2 EP-ADM-PAY-022 — Get Refund

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/refunds/{refundId}` |

---

### 8.3 EP-ADM-PAY-023 — Process Manual Refund

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/refunds/{refundId}/process` |
| **Audit** | `refund.processed` |

**Side Effects:**
- Calls provider's refund API
- Updates payment.capturedAmount/refundedAmount
- Initiates customer notification
- For bank transfers, marks as `manual_processed`

---

### 8.4 EP-ADM-PAY-024 — Approve Refund (Pre-Approval Workflow)

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/refunds/{refundId}/approve` |
| **Audit** | `refund.approved` |

For refunds > threshold requiring manager approval (BR-PAY-009).

---

## 9. Payment Webhook Endpoints

Detailed in `WEBHOOK_SPECIFICATION.md`. Summary:

| EP | URL | Provider |
| --- | --- | --- |
| EP-WHK-001 | `POST /v1/webhooks/payment/momo` | MoMo |
| EP-WHK-002 | `POST /v1/webhooks/payment/vnpay` | VNPay |
| EP-WHK-003 | `POST /v1/webhooks/payment/zalopay` | ZaloPay |
| EP-WHK-004 | `POST /v1/webhooks/payment/paypal` | PayPal |

All webhook endpoints:
- Authenticated by signature header
- Idempotent via `eventId`
- Return 200 even on processing errors (after logging)
- Retry by provider with exponential backoff

---

## 10. Retry & Failure Recovery

### 10.1 Capture Failure

| Scenario | Recovery |
| --- | --- |
| Provider timeout | Retry after 30s; max 3 attempts |
| Provider error | Log; admin manual retry |
| Customer cancels mid-payment | Payment → `cancelled`; order stays `pending` for X min |

### 10.2 Webhook Failure

| Scenario | Recovery |
| --- | --- |
| Signature invalid | Log; return 401; provider retries |
| Validation fails | Log; return 422; no retry |
| Internal error (500) | Provider retries (up to 24h) |

---

## 11. Cross-References

| Field | Reference |
| --- | --- |
| Use Cases | UC-PAY-001..005 |
| Business Rules | BR-PAY-001..011 |
| State Machine | SM-PAY |
| Workflows | WF-PAY-01..05 |
| Features | SF-PAY-001..005 |
| Entities | payment, payment_transaction, webhook_event, refund |

---

## 12. Coverage Validation

| Check | Status |
| --- | --- |
| Payment creation covered for all providers | ✓ |
| Provider redirect covered | ✓ |
| Cancellation covered | ✓ |
| Refund flow covered (customer + admin) | ✓ |
| Admin payment management covered | ✓ |
| Manual capture/override covered | ✓ |
| Webhooks referenced | ✓ |
| Retry strategy documented | ✓ |
| Audit logging specified | ✓ |
| Idempotency strategy documented | ✓ |

---

## 13. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial payment API: 30+ endpoints (4 providers × intents, webhooks, refunds, admin) |

---

**End of Document — PAYMENT_API.md**
# WEBHOOK_SPECIFICATION.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document defines **inbound webhook** specifications for SmartLight. Webhooks are HTTP callbacks that external services (payment providers, shipping carriers) POST to our system to notify us of asynchronous events.

---

## 2. Inbound Webhook URLs

| EP-ID | Method | URL | Provider |
| --- | --- | --- | --- |
| EP-WHK-001 | POST | `/v1/webhooks/payment/momo` | MoMo |
| EP-WHK-002 | POST | `/v1/webhooks/payment/vnpay` | VNPay |
| EP-WHK-003 | POST | `/v1/webhooks/payment/zalopay` | ZaloPay |
| EP-WHK-004 | POST | `/v1/webhooks/payment/paypal` | PayPal |
| EP-WHK-011 | POST | `/v1/webhooks/shipping/ghn` | GHN |
| EP-WHK-012 | POST | `/v1/webhooks/shipping/ghtk` | GHTK |
| EP-WHK-013 | POST | `/v1/webhooks/shipping/viettel-post` | Viettel Post |
| EP-WHK-021 | POST | `/v1/webhooks/notifications/email` | Email provider (V1.5+) |

---

## 3. Common Webhook Behavior

### 3.1 Response

| Status | When |
| --- | --- |
| `200 OK` | Successfully processed |
| `200 OK` | Idempotent retry (already processed; log) |
| `400 BAD_REQUEST` | Bad payload (no retry) |
| `401 UNAUTHORIZED` | Signature failed (provider retries) |
| `422 UNPROCESSABLE` | Unknown event (no retry) |
| `500 INTERNAL_ERROR` | Server error (provider retries) |

> Always return `200` if signature valid + payload parseable, even if processing fails (after logging).

### 3.2 Idempotency

- Each event has a unique `eventId`.
- Server stores `(provider, eventId)` and skips duplicates.
- Returns `200 OK` for duplicates.

### 3.3 Async Processing

For long-running operations:
- Acknowledge `200` quickly (< 5s).
- Push to queue for background processing.

---

## 4. Webhook Payload Format

```json
{
  "eventId": "uuid-or-provider-id",
  "eventType": "payment.captured",
  "occurredAt": "2026-07-03T15:30:00Z",
  "provider": "vnpay",
  "apiVersion": "1.0",
  "data": {
    "transactionId": "...",
    "paymentId": "...",
    "orderNumber": "...",
    "amount": 217000000,
    "currency": "VND",
    "status": "captured",
    "raw": { /* provider-specific */ }
  }
}
```

---

## 5. Payment Webhook Events

### 5.1 Event Types

| Event Type | Description |
| --- | --- |
| `payment.authorized` | Card authorized; awaiting capture |
| `payment.captured` | Funds captured |
| `payment.failed` | Authorization failed |
| `payment.cancelled` | Cancelled by user |
| `payment.expired` | Past TTL |
| `refund.processed` | Refund completed |
| `refund.failed` | Refund rejected |
| `refund.pending` | Awaiting processing |

### 5.2 MoMo Webhook

**Header:** `X-Signature: <hmac-sha256>`

```
POST /v1/webhooks/payment/momo
X-Signature: <hmac-sha256 of body with secret>
X-Partner-Code: SMARTLIGHT
Content-Type: application/json

{
  "partnerCode": "...",
  "orderId": "...",
  "requestId": "...",
  "amount": 217000000,
  "orderInfo": "...",
  "orderType": "momo_wallet",
  "transId": 1234567890,
  "resultCode": 0,
  "message": "Success",
  "payType": "...",
  "responseTime": 1690000000000,
  "extraData": "...",
  "signature": "..."
}
```

**Verification:** HMAC-SHA256 with MoMo secret.

### 5.3 VNPay Webhook

**Header:** `X-Vnp-Signature: <hmac-sha512>`

```
POST /v1/webhooks/payment/vnpay
Content-Type: application/json

{
  "vnp_TmnCode": "...",
  "vnp_Amount": 21700000000,    // amount * 100
  "vnp_BankCode": "...",
  "vnp_OrderInfo": "...",
  "vnp_PayDate": "20260703153000",
  "vnp_ResponseCode": "00",
  "vnp_TxnRef": "...",
  "vnp_SecureHash": "..."
}
```

**Verification:** HMAC-SHA512 with VNPay secret.

### 5.4 ZaloPay Webhook

```
POST /v1/webhooks/payment/zalopay
Content-Type: application/json

{
  "app_id": 1234,
  "app_trans_id": "...",
  "app_user": "...",
  "amount": 217000000,
  "zp_trans_token": "...",
  "server_time": 1690000000,
  "channel": 1,
  "merchant_user_id": "...",
  "user_fee_amount": 0,
  "discount_amount": 0,
  "status": 1,
  "mac": "..."
}
```

**Verification:** HMAC-SHA256 with ZaloPay key.

### 5.5 PayPal Webhook

```
POST /v1/webhooks/payment/paypal
PAYPAL-TRANSMISSION-SIG: <signature>
PAYPAL-CERT-URL: <cert-url>
PAYPAL-AUTH-ALGO: SHA256withRSA

{
  "id": "WH-...",
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "resource_type": "capture",
  "summary": "Payment captured",
  "resource": { /* PayPal capture object */ },
  "created": "..."
}
```

**Verification:** PayPal certificate-based signature.

---

## 6. Shipping Webhook Events

### 6.1 Event Types

| Event Type | Description |
| --- | --- |
| `shipment.dispatched` | Carrier picked up |
| `shipment.in_transit` | In transit |
| `shipment.out_for_delivery` | Out for delivery |
| `shipment.delivered` | Delivered |
| `shipment.exception` | Exception (delay, damage, etc.) |
| `shipment.returned` | Returned to sender |
| `shipment.cancelled` | Cancelled |

### 6.2 Common Format (Carrier-Agnostic)

```json
{
  "eventId": "...",
  "eventType": "shipment.in_transit",
  "provider": "ghn",
  "occurredAt": "...",
  "data": {
    "trackingNumber": "GHN123456",
    "status": "in_transit",
    "location": "Hà Nội Hub",
    "description": "...",
    "occurredAt": "...",
    "raw": { /* provider-specific */ }
  }
}
```

---

## 7. Signature Validation

### 7.1 HMAC Verification

For MoMo, VNPay, ZaloPay:

```
expected = HMAC-SHA256(secret, body)
constantTimeEqual(expected, header.Signature)
```

| Step | Action |
| --- | --- |
| 1 | Read raw body bytes (do NOT parse JSON first) |
| 2 | Compute HMAC |
| 3 | Constant-time compare |
| 4 | Reject if mismatch |

### 7.2 PayPal

| Step | Action |
| --- | --- |
| 1 | Fetch cert from `PAYPAL-CERT-URL` |
| 2 | Verify `PAYPAL-TRANSMISSION-SIG` with cert |
| 3 | Validate cert chain |
| 4 | Reject if invalid |

### 7.3 GHN

HMAC-SHA256 with GHN token in header.

### 7.4 Other Carriers

Each has its own signing scheme; documented per provider.

---

## 8. Retry Strategy

### 8.1 Provider Retries (Inbound)

Each provider has its own retry policy:

| Provider | Initial Backoff | Max Retries |
| --- | --- | --- |
| MoMo | 5 min | 5 |
| VNPay | 1 min | 10 |
| ZaloPay | 5 min | 5 |
| PayPal | 30 sec | 25 (over 24h) |
| GHN | 5 min | 5 |

### 8.2 Our Retry

For background jobs that process webhook data:
- Use job queue (e.g., BullMQ).
- Exponential backoff: 1s, 5s, 30s, 5min, 30min.
- Dead-letter queue after 5 retries; admin notification.

---

## 9. Webhook Event Storage

### 9.1 Schema

```
WebhookEvent {
  id (UUID)
  provider (enum)
  eventId (string)
  eventType (enum)
  payload (JSONB)
  status (enum: received, processing, processed, failed, ignored)
  processedAt (timestamp)
  failureReason (string)
  attemptCount (int)
  receivedAt (timestamp)
}
```

### 9.2 Deduplication

Unique constraint on `(provider, eventId)`. Duplicate inserts → ignore.

---

## 10. Webhook Audit

All webhook receipt, processing, and errors are logged in audit:

| Event | Audit |
| --- | --- |
| Webhook received | `webhook.received` (info) |
| Webhook processed | `webhook.processed` (info) |
| Webhook signature failed | `webhook.signature_failed` (warning) |
| Webhook processing failed | `webhook.processing_failed` (error) |
| Webhook ignored (duplicate) | `webhook.duplicate` (info) |

---

## 11. Security

| Rule | Implementation |
| --- | --- |
| HTTPS only | Required |
| Signature verification | All webhooks |
| Replay prevention | Event idempotency |
| IP whitelisting | Per provider (optional) |
| Rate limit | 1000/min per provider (anti-flood) |

### 11.1 IP Whitelist (Configurable)

Default provider IPs are known; admin can configure allowlist per provider.

---

## 12. Outbound Webhooks (V1.5+)

For future V1.5+ where SmartLight calls third-party webhooks:

- Use signed requests (HMAC).
- Retry with exponential backoff.
- Store delivery status.

> V1: outbound not implemented.

---

## 13. Webhook Configuration (Admin)

### 13.1 List Webhook Endpoints

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/webhooks/endpoints` |
| **Auth** | Yes (SuperAdmin) |

### 13.2 Configure Webhook

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/webhooks/endpoints/{id}` |
| **Audit** | `webhook.config_updated` |

### 13.3 Test Webhook

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/webhooks/endpoints/{id}/test` |

Sends a test payload (signed) to verify config.

### 13.4 Webhook Logs

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/webhooks/logs` |

Query and view received/processed events.

---

## 14. Cross-References

| Field | Reference |
| --- | --- |
| Use Cases | UC-WHK-001..005 |
| Business Rules | BR-WHK-001..006 |
| Workflows | WF-WHK-01..03 |
| Features | SF-WHK-001..005 |
| Entities | webhook_event |

---

## 15. Coverage Validation

| Check | Status |
| --- | --- |
| Inbound webhook URLs documented | ✓ |
| Common response codes covered | ✓ |
| Idempotency pattern documented | ✓ |
| Async processing guidance | ✓ |
| Signature verification per provider | ✓ |
| Retry strategy documented | ✓ |
| Event storage schema | ✓ |
| Audit logging specified | ✓ |
| Admin endpoints for webhook config | ✓ |

---

## 16. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial webhook spec: payment + shipping providers, signature verification, retry, audit |

---

**End of Document — WEBHOOK_SPECIFICATION.md**
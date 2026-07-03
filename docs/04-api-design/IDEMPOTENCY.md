# IDEMPOTENCY.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document defines the **idempotency strategy** for SmartLight APIs. Idempotency ensures that retrying the same request doesn't create duplicate effects (e.g., double-charging, double-shipping).

---

## 2. Idempotency Principle

> "An idempotent operation can be applied multiple times without changing the result beyond the initial application."

For state-changing endpoints, clients **should** send an idempotency key. Server uses it to:
1. Detect duplicate requests.
2. Return cached response for repeats.

---

## 3. Idempotency Key

### 3.1 Header

```
Idempotency-Key: <UUID v7>
```

### 3.2 Format

- UUID v7 (or any unique string up to 255 chars)
- Recommended: UUID v7 for time-ordering

### 3.3 Client Responsibility

- Generate per logical operation
- Different operations = different keys
- Same operation retried = same key
- Persist key on client until success

### 3.4 Server Behavior

| Scenario | Behavior |
| --- | --- |
| No key on idempotent-required endpoint | `400 MISSING_IDEMPOTENCY_KEY` |
| Same key + same payload + same user | Return cached response |
| Same key + different payload | `409 IDEMPOTENCY_KEY_REUSED` |
| Same key + different user | `409 IDEMPOTENCY_KEY_REUSED` |
| Same key, original still processing | `409 IDEMPOTENCY_KEY_PROCESSING` |
| Same key, original failed (5xx) | Process again (retry) |
| Same key, original 4xx error | Return cached error |
| Key expired (>24h) | Process as new |

---

## 4. Endpoints Requiring Idempotency

| Endpoint | Method | Reason |
| --- | --- | --- |
| `/v1/auth/register` | POST | Avoid duplicate registration |
| `/v1/auth/reset-password` | POST | Avoid double password change |
| `/v1/checkout` | POST | Avoid duplicate checkout session |
| `/v1/checkout/{id}/place-order` | POST | Avoid duplicate order (CRITICAL) |
| `/v1/payments/{id}/momo/create` | POST | Avoid duplicate intent |
| `/v1/payments/{id}/vnpay/create` | POST | Avoid duplicate intent |
| `/v1/payments/{id}/zalopay/create` | POST | Avoid duplicate intent |
| `/v1/payments/{id}/paypal/create` | POST | Avoid duplicate intent |
| `/v1/payments/{id}/refunds` | POST | Avoid duplicate refund |
| `/v1/cart/items` | POST | Avoid duplicate add (when retrying) |
| `/v1/returns` | POST | Avoid duplicate return request |
| `/v1/reviews` | POST | Avoid duplicate review |
| `/v1/users/me/addresses` | POST | Avoid duplicate creation |
| `/v1/admin/catalog/products/{id}/price` | POST | Avoid duplicate price update |
| `/v1/admin/inventory/{id}/adjust` | POST | Avoid double-adjustment |
| `/v1/admin/inventory/bulk-adjust` | POST | Avoid double-bulk-adjust |
| `/v1/media/upload` | POST | Avoid duplicate upload |
| `/v1/notifications/cookie-consent` | POST | Avoid duplicate consent |

---

## 5. Server Storage

### 5.1 Storage Strategy

```
Redis:
  Key: "idempotency:{key}"
  Value: JSON({
    "requestHash": "sha256-of-payload",
    "userId": "uuid-or-ip",
    "status": "processing" | "completed" | "failed",
    "response": { /* full HTTP response cached */ },
    "statusCode": 201,
    "createdAt": "...",
    "expiresAt": "..."
  })
  TTL: 24 hours
```

### 5.2 Request Hashing

- Hash = `sha256(method + url + body + userId)`
- Used to detect payload mismatch.

---

## 6. Response Caching

### 6.1 Successful Response

```
Original: 201 Created + Location header + body
Repeat: 201 Created + Location header + body (same)
```

`Idempotency-Replay: true` header added for replay.

### 6.2 Error Response

```
Original: 422 VALIDATION_ERROR
Repeat: 422 VALIDATION_ERROR (same body)
```

> 5xx errors are NOT cached; subsequent retries can succeed.

---

## 7. Race Conditions

### 7.1 Concurrent Requests with Same Key

| Approach | Behavior |
| --- | --- |
| Lock-based | First request locks; others wait |
| Status check | Subsequent requests see `processing` → return `409 IDEMPOTENCY_KEY_PROCESSING` |

Implementation:
- Set Redis key with `NX` (set if not exists).
- If exists and `processing` → return 409.
- If exists and `completed` → return cached response.

---

## 8. Scenarios

### 8.1 Successful Payment Retry

```
1. Client: POST /v1/payments/{id}/vnpay/create  (Idempotency-Key: A)
   → 200 OK, redirectUrl: "https://vnpay.vn/..." (cached)

2. Network error; client retries with same key
   → 200 OK, same redirectUrl (cached)
```

### 8.2 Double Place Order

```
1. POST /v1/checkout/{id}/place-order (Idempotency-Key: A)
   → 201 Created, orderId: uuid-1 (cached)

2. Network error; client retries
   → 201 Created, orderId: uuid-1 (cached) — NOT uuid-2!
```

### 8.3 Different Payload with Same Key

```
1. POST /v1/cart/items { variantId: A, quantity: 2 } (Idempotency-Key: A)
   → 200 OK

2. POST /v1/cart/items { variantId: B, quantity: 1 } (Idempotency-Key: A)
   → 409 IDEMPOTENCY_KEY_REUSED
```

### 8.4 Key Reuse After Expiry

```
1. Key A used 24 hours ago → expired
2. Key A reused for new request → processed as new
```

---

## 9. Headers

### 9.1 Client Sends

```
Idempotency-Key: 0192ca3e-c5d8-7e1f-a012-3456789abcde
```

### 9.2 Server Returns (on replay)

```
Idempotency-Replay: true
```

### 9.3 Server Returns (on conflict)

```
HTTP/1.1 409 Conflict
Idempotency-Status: conflict
```

---

## 10. Error Codes

| Code | Status | When |
| --- | --- | --- |
| `MISSING_IDEMPOTENCY_KEY` | 400 | Required but absent |
| `IDEMPOTENCY_KEY_INVALID` | 400 | Format invalid (>255 chars, etc.) |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Same key + different payload |
| `IDEMPOTENCY_KEY_PROCESSING` | 409 | Same key + original still running |
| `IDEMPOTENCY_KEY_EXPIRED` | 422 | Past TTL but somehow accessed (rare) |

---

## 11. Storage TTL

| Storage | TTL |
| --- | --- |
| Idempotency record (Redis) | 24 hours |
| Idempotency record (DB) — V1.5+ | 7 days |

> V1 uses Redis only; V1.5+ may extend to DB for compliance/audit.

---

## 12. Recommended Implementation

### 12.1 Middleware

```pseudo
async function idempotencyMiddleware(request, next):
  if not requiresIdempotency(request):
    return await next()
  
  key = request.headers['Idempotency-Key']
  if not key:
    return 400 MISSING_IDEMPOTENCY_KEY
  
  if not isValidKeyFormat(key):
    return 400 IDEMPOTENCY_KEY_INVALID
  
  requestHash = sha256(method + url + body + userId)
  
  // Try to claim key
  record = await redis.setNX('idem:'+key, {
    requestHash,
    userId,
    status: 'processing',
    createdAt: now()
  }, 86400)
  
  if not record:
    // Already exists
    existing = await redis.get('idem:'+key)
    if existing.requestHash != requestHash:
      return 409 IDEMPOTENCY_KEY_REUSED
    if existing.status == 'processing':
      return 409 IDEMPOTENCY_KEY_PROCESSING
    if existing.status == 'completed':
      response = existing.response
      response.headers['Idempotency-Replay'] = true
      return response
  
  // Process
  response = await next()
  
  // Cache response
  await redis.set('idem:'+key, {
    ...record,
    status: response.statusCode < 500 ? 'completed' : 'failed',
    response: { headers, body, statusCode }
  }, 86400)
  
  return response
```

---

## 13. Best Practices

### 13.1 Client-Side

1. **Generate UUID v7** for each logical operation.
2. **Persist key** until response received.
3. **Retry same key** on network errors.
4. **Different key** for new operation.
5. **Don't reuse keys** across users/sessions.

### 13.2 Server-Side

1. **Hash payload + user** to detect reuse.
2. **Cache full response** for replay.
3. **Don't cache 5xx** errors.
4. **Lock during processing** to prevent race.
5. **Log idempotency hits** for telemetry.

---

## 14. Coverage Validation

| Check | Status |
| --- | --- |
| Header format documented | ✓ |
| Server behavior matrix | ✓ |
| Endpoints requiring idempotency listed | ✓ |
| Storage strategy documented | ✓ |
| Race conditions covered | ✓ |
| Error codes specified | ✓ |
| Implementation pseudo-code | ✓ |
| Best practices covered | ✓ |

---

## 15. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial idempotency spec: header, storage, replay, race conditions, error codes |

---

**End of Document — IDEMPOTENCY.md**
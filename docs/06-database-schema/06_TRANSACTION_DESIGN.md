# 06 — Transaction Design

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04
**Author:** Principal Database Architect

---

## 1. Purpose

This document defines the **transactional patterns** SmartLight uses for critical operations:

- Placing an order
- Capturing a payment
- Adjusting inventory
- Issuing refunds
- Reserving stock
- Idempotent webhook handling

It is the bridge between **the schema design** (this folder) and **the application/service code** that the implementation phase will write.

---

## 2. Transaction Boundaries

A transaction begins at the outermost business action. Specifically:

| Boundary | Span |
|---|---|
| Read-only operations | Default autocommit; `Serializable` only for critical paths |
| Single-row write | Default |
| Checkout (cart → order) | **Serializable** |
| Stock decrement (order capture) | Default with row locks (`SELECT … FOR UPDATE`) |
| Inventory adjustment | Default with audit insert |
| Webhook processing | **Serializable** on `WebhookEvent` + payment rows |
| Coupon redemption | Default with row lock on `coupon.usage_count` |
| Refund issuance | **Serializable** |

In Prisma:

```ts
await prisma.$transaction(
  async (tx) => { /* ... */ },
  { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10_000 },
);
```

---

## 3. Standard Patterns

### 3.1 Pattern A — Reserve Stock (Cart Add)

**Trigger:** Adding an item to cart.
**Goal:** Reserve stock so other shoppers see updated availability.

```
BEGIN
  SELECT available FROM inventory WHERE product_variant_id = :vid FOR UPDATE
    -- if available < qty, raise conflict
    UPDATE inventory
      SET reserved = reserved + :qty,
          available = available - :qty
      WHERE product_variant_id = :vid
  INSERT INTO stock_reservation (... status=ACTIVE, expires_at=now()+15m ...)
  INSERT INTO stock_movement (... type='RESERVATION', qty, on_hand_after, reserved_after)
COMMIT
```

**Failure modes:**

- Stock unavailable → 409 with `OUT_OF_STOCK`.
- Deadlock (rare): retry once with `LockTimeoutException`.

### 3.2 Pattern B — Release Reservation (Cart Remove or Checkout Abandon)

```
BEGIN
  UPDATE stock_reservation SET status='RELEASED', released_at=now(), released_reason=?
  UPDATE inventory
    SET reserved = reserved - :qty,
        available = available + :qty
    WHERE product_variant_id = :vid
    RETURNING *
  INSERT INTO stock_movement (... type='RELEASE', qty, …)
COMMIT
```

### 3.3 Pattern C — Convert Cart to Order (Idempotent)

**Trigger:** POST `/v1/checkout/complete`.
**Anchor:** `Idempotency-Key` header. Stored in `idempotency_record`.

```
BEGIN ISOLATION SERIALIZABLE
  SELECT cart FROM cart WHERE id=:cartId AND status='ACTIVE' FOR UPDATE
    -- lock and confirm state
  SELECT every cart_item with current variant price FOR UPDATE
  SELECT every coupon (if applied) FOR UPDATE
    -- compute totals at full precision
  INSERT INTO "order" (...) RETURNING *
  INSERT INTO order_item (snapshot) for each cart_item
  INSERT INTO order_address (snapshot)
  INSERT INTO order_status_history (from=null, to='PENDING')
  UPDATE cart SET status='CONVERTED', converted_order_id=:orderId
  UPDATE every reservation SET status='CONSUMED', consumed_at=now()
  UPDATE inventory -- on_hand unchanged, reserved -= qty, available += qty
  INSERT INTO stock_movement (type='SALE', on_hand_after, reserved_after)
  -- coupon usage row
  INSERT INTO voucher_usage (...) and UPDATE coupon SET usage_count = usage_count + 1
COMMIT
```

**After commit:**

- Insert `OutboxMessage` events (`OrderCreated`, `StockConsumed`, `CouponConsumed`).
- The outbox dispatcher picks them up and broadcasts.

**Failure recovery:**

- If `idempotency_record` already has a result for this key, **return the previous response** verbatim — do not re-execute.

### 3.4 Pattern D — Payment Capture (Webhook + Service)

Two intertwined transactions:

1. **Webhook in transaction** (idempotent):

```
BEGIN ISOLATION SERIALIZABLE
  INSERT INTO webhook_event (provider, event_id, payload, status='RECEIVED')
    ON CONFLICT (provider, event_id) DO NOTHING RETURNING ...
    -- if no row returned, mark DUPLICATE and exit
  UPDATE webhook_event SET status='PROCESSED', processed_at=now() WHERE id=...
COMMIT
```

2. **Payment capture in transaction**:

```
BEGIN ISOLATION SERIALIZABLE
  SELECT payment FROM payment WHERE id=:pid FOR UPDATE
    -- if status already CAPTURED, skip (idempotent)
  UPDATE payment SET status='CAPTURED', captured_at=now(), provider_txn_id=:txn
  INSERT INTO payment_transaction (type='CAPTURE', status='SUCCEEDED')
  -- inside the SAME order update only the allowed columns:
  UPDATE "order" SET paid_at = now(), status='CONFIRMED', updated_at=now() WHERE id=:oid AND paid_at IS NULL
  INSERT INTO order_status_history (from='PENDING', to='CONFIRMED', changed_by_type='WEBHOOK')
  -- outbox
  INSERT INTO outbox_message (event_id, type='PaymentCaptured', payload)
COMMIT
```

### 3.5 Pattern E — Inventory Adjustment (Admin Action)

```
BEGIN
  SELECT inventory FROM inventory WHERE product_variant_id=:vid FOR UPDATE
    -- compute new on_hand
  UPDATE inventory SET on_hand=:new_on_hand, available=:new_on_hand - reserved, last_counted_at=now()
  INSERT INTO inventory_adjustment (qty_delta, on_hand_after, reason, admin_user_id)
  INSERT INTO stock_movement (type=:adjType, quantity, on_hand_after, reserved_after, ...)
  INSERT INTO audit_log (category='INVENTORY_ADJUSTMENT', entity_type='product_variant', entity_id=:vid, ...)
COMMIT
```

### 3.6 Pattern F — Refund (Partial / Full)

```
BEGIN ISOLATION SERIALIZABLE
  SELECT payment FROM payment WHERE id=:pid FOR UPDATE
  SELECT order FROM "order" WHERE id=:oid FOR UPDATE
    -- compute already-refunded sum
    -- ensure remaining >= :amount
  INSERT INTO refund (status='PENDING', ...)
  UPDATE payment
    SET status = CASE WHEN total_refunded + :amount = amount THEN 'REFUNDED' ELSE 'PARTIALLY_REFUNDED' END
  INSERT INTO payment_transaction (type='REFUND', status='PENDING', amount)
  -- outbox event 'RefundRequested'
COMMIT

-- external provider call (outside transaction)

BEGIN ISOLATION SERIALIZABLE
  UPDATE refund SET status='SUCCEEDED', provider_refund_id, processed_at=now() WHERE id=:rid
  -- on failure: status='FAILED', refund.status='FAILED', retry via cron
  INSERT INTO audit_log (category='PAYMENT_REFUND', ...)
COMMIT
```

### 3.7 Pattern G — Idempotency Header (General)

```
BEGIN
  -- try to insert (with TTL)
  INSERT INTO idempotency_record (key, method, path, actor_id, request_hash, in_flight=true)
    ON CONFLICT (key) DO NOTHING RETURNING id
    -- if 0 rows: SELECT existing record
  if record.in_flight:
    RETURN 409 { error: "IN_PROGRESS", retry-after: 5 }
  if request_hash differs from record.request_hash:
    RETURN 422 { error: "IDEMPOTENCY_KEY_REUSED", message: "Same key, different payload" }
  RETURN response_json from record
COMMIT

-- after successful response:
UPDATE idempotency_record SET response_json=:body, response_status=:status, in_flight=false, updated_at=now() WHERE key=:k
```

---

## 4. Outbox / Event Publishing

All cross-context events follow the **Outbox pattern**:

1. In the same DB transaction as the business change, insert into `outbox_message`.
2. A separate **dispatch worker** (in NestJS) reads `status='PENDING' AND available_at <= now()`, publishes to the bus (BullMQ events), and updates status.
3. Re-publish on failure with exponential backoff.

Events emitted (sample):

| Aggregate | Event | Subscribers |
|---|---|---|
| Order | `OrderCreated` | Notification, Analytics |
| Order | `OrderPaid` | Email, Inventory, Accounting |
| Order | `OrderShipped` | Email |
| Order | `OrderDelivered` | Email, Review prompt |
| Order | `OrderCancelled` | Inventory release, Email |
| Payment | `PaymentCaptured` | Order, Notification |
| Refund | `RefundSucceeded` | Notification |
| Inventory | `InventoryLowStock` | Catalog manager |
| User | `UserRegistered` | Welcome email |
| Review | `ReviewPublished` | Marketing |

> Event schema is defined in the **Software Architecture** `05_EVENT_DRIVEN_ARCHITECTURE.md`; the schema-level `outbox_message.payload` is JSON.

---

## 5. Locking Strategy

| Resource | Lock | Note |
|---|---|---|
| `product_variant` row | none | Rare direct updates |
| `inventory` row | `FOR UPDATE` | Always when mutating |
| `coupon` row | `FOR UPDATE` | When redeeming |
| `payment` row | `FOR UPDATE` | During capture/refund |
| `order` row | `FOR UPDATE` | During status change after payment |
| `cart` row | `FOR UPDATE` | During checkout |
| `outbox_message` row | none | Worker uses `SELECT … FOR UPDATE SKIP LOCKED` |

Postgres advisory locks are not used in MVP; revisit in V2.

---

## 6. Retry and Deadlock Handling

| Scenario | Action |
|---|---|
| `SerializationFailure` (Postgres code 40001) | Retry up to 3 times with jittered backoff (50–250 ms) |
| `DeadlockDetected` (code 40P01) | Retry once; surface error after second failure |
| Statement timeout | 10 s default; operations exceeding escalate |
| Lock timeout | 5 s default |

> Implementation lives in a shared `retryWithBackoff` helper.

---

## 7. Distributed Concurrency & Sub-second Idempotency

- All `INSERT` operations guarded by unique keys (idempotency).
- Webhook handler never trusts the payload — only the `(provider, event_id)` unique constraint.
- Order placement is anchored on `Idempotency-Key` header AND on `(cart_id → converted_order_id)` UNIQUE constraint to prevent double conversion.

---

## 8. Read-Only Optimizations

| Query | Materialization / Read Strategy |
|---|---|
| Category tree | Materialized path (`Category.path`) |
| Product list filters | Composite indexes + Redis cache |
| Order summary for user | Composite index `(user_id, status)` |
| Inventory dashboard | Composite index `(product_variant_id, created_at DESC)` |
| Reviews tab | Composite index `(product_id, status, created_at DESC)` |
| Coupon lookup by code | `@@unique` on `code` (citext) |

---

## 9. Snapshot Strategy

| Snapshot | Source | Why |
|---|---|---|
| `OrderItem` price/tax snapshots | `Product.price`, `TaxRate.ratePercent` at order creation | Order integrity if product changes price |
| `OrderItem` SKU/name snapshots | from `ProductVariant.sku` | Resistant to SKU rename |
| `OrderAddress` snapshot | from `Address` fields | Independent of Address edits |

---

## 10. Eventual Consistency

| Pattern | Lag tolerance |
|---|---|
| Order → Email (welcome, confirmation) | < 30 s |
| Order → Analytics | < 60 s |
| Inventory → Catalog display | Sub-second on hot listings via Redis |
| Inventory → Low-stock alert | < 60 s |
| Returns → Refund | Up to 5 business days (provider latency) |

---

## 11. Failure & Recovery Matrix

| Operation | Failure | Recovery |
|---|---|---|
| Checkout | Network drop | Idempotency-Key replay returns same response |
| Order placed but not paid | TTL pass | Cancel order, release stock |
| Webhook lost | Retry policy (provider) | Manual reconciliation tool |
| Stock move missing | Drift detection cron | Background reconciliation |
| Outbox stuck (PENDING too long) | Alarm | Worker alert after > 5 min |
| DB connection lost | Idempotency-Key safe | Retry on reconnect |

---

## 12. Test Strategy (TX Patterns)

| Test | Purpose |
|---|---|
| Concurrent stock decrement | Ensure no over-sell |
| Webhook dup replay | Ensure idempotent |
| Order immutability | UPDATE blocked after `paid_at` |
| Cart total drift | Totals consistent on mutation |
| Coupon limit cap | Reject when `usageCount >= usageLimit` |

---

## 13. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial transaction patterns |

---

**End of 06_TRANSACTION_DESIGN.md**

# 05 — Event-Driven Architecture

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document defines SmartLight's **internal event-driven architecture**: the domain events, their publishers, consumers, payloads, retry semantics, and the bus that carries them.

> External (provider) webhooks are described in `docs/04-api-design/WEBHOOK_SPECIFICATION.md`. This document covers **internal** events.

---

## 2. Event Bus Architecture

```
┌──────────┐    publish    ┌──────────────┐    enqueue    ┌──────────┐
│ Module A │ ────────────▶ │ Event Bus    │ ────────────▶ │ Redis    │
└──────────┘               │ (in-proc +   │               │ (BullMQ) │
                           │  outbox)     │               └────┬─────┘
                           └──────────────┘                    │
                                                                ▼
                                                          ┌──────────┐
                                                          │ Worker   │
                                                          │ → Module │
                                                          │   B      │
                                                          └──────────┘
```

### 2.1 Hybrid Strategy

| Mode | When |
|---|---|
| **In-process synchronous** | Same-process consumers requiring immediate consistency (e.g., Audit log) |
| **Outbox + Queue (async)** | Cross-process consumers; notifications; analytics; webhooks |

### 2.2 Outbox Pattern (Guaranteed Delivery)

```
Transaction {
  ... main writes ...
  INSERT INTO outbox (event_id, type, payload, created_at)
}
```

A relay worker reads from the outbox and publishes to the event bus. This guarantees that events are emitted if and only if the originating transaction commits.

---

## 3. Event Naming Convention

```
{context}.{noun}.{past-tense-action}

Examples:
  user.registered
  order.placed
  payment.captured
  inventory.reserved
  review.approved
```

- All lowercase
- Dot-separated
- Past-tense verbs
- Bounded context prefix

---

## 4. Event Payload Structure

```
interface DomainEvent {
  eventId: string;          // UUID v7
  eventType: string;        // e.g., "order.placed"
  occurredAt: string;       // ISO 8601 UTC
  aggregateId: string;      // Affected entity ID
  aggregateType: string;    // e.g., "Order"
  correlationId: string;    // Trace/request correlation
  causationId?: string;     // Preceding event (for chains)
  payload: Record<string, any>;  // Event-specific data
  metadata: {
    userId?: string;
    actorType?: 'user' | 'admin' | 'system' | 'webhook';
    ipAddress?: string;
    userAgent?: string;
  };
}
```

### 4.1 Payload Convention

- **Immutable** — events are past-tense facts.
- **Self-contained** — consumer should not need to query the publisher.
- **Versioned** — `payloadVersion` for backward compat.
- **Small** — large blobs (emails, images) referenced by ID, not embedded.

---

## 5. Domain Event Catalog

### 5.1 Identity Events

| Event | Publisher | Payload (key fields) |
|---|---|---|
| `user.registered` | Identity | userId, email, locale, acceptMarketing |
| `user.email_verified` | Identity | userId, email, verifiedAt |
| `user.password_changed` | Identity | userId |
| `user.password_reset_requested` | Identity | userId, email |
| `user.deleted` | Identity | userId, deletionType ('soft' \| 'anonymized'), gracePeriodEndsAt |
| `user.restored` | Identity | userId |
| `admin_user.created` | Identity (Admin) | adminUserId, email, roleIds |
| `admin_user.login_succeeded` | Identity (Admin) | adminUserId, ip, userAgent |
| `admin_user.login_failed` | Identity (Admin) | email, ip, reason |
| `admin_user.mfa_enabled` | Identity (Admin) | adminUserId |
| `admin_user.mfa_disabled` | Identity (Admin) | adminUserId |
| `admin_user.role_assigned` | Admin (RBAC) | adminUserId, roleId |
| `admin_user.role_revoked` | Admin (RBAC) | adminUserId, roleId |

### 5.2 User Events

| Event | Publisher | Payload |
|---|---|---|
| `address.created` | User | addressId, userId |
| `address.updated` | User | addressId, userId |
| `address.deleted` | User | addressId, userId |
| `user.preferences_changed` | User | userId, preferences |

### 5.3 Catalog Events

| Event | Publisher | Payload |
|---|---|---|
| `product.created` | Catalog | productId, name, slug |
| `product.updated` | Catalog | productId, fields[] |
| `product.published` | Catalog | productId, publishedAt |
| `product.unpublished` | Catalog | productId |
| `product.deleted` | Catalog | productId |
| `product.price_changed` | Catalog | productId, oldPrice, newPrice, effectiveAt |
| `product.stock_low_warning` | Catalog | productId, currentStock, threshold |
| `category.created` | Catalog | categoryId, name |
| `category.updated` | Catalog | categoryId |
| `category.deleted` | Catalog | categoryId |
| `brand.created` | Catalog | brandId |
| `brand.updated` | Catalog | brandId |
| `brand.deleted` | Catalog | brandId |

### 5.4 Inventory Events

| Event | Publisher | Payload |
|---|---|---|
| `inventory.reserved` | Inventory | reservationId, items[], userId/sessionId, expiresAt |
| `inventory.released` | Inventory | reservationId, reason |
| `inventory.consumed` | Inventory | reservationId, orderId |
| `inventory.adjusted` | Inventory | variantId, before, after, reason, actorId |
| `inventory.low_stock` | Inventory | variantId, currentStock, threshold |
| `inventory.out_of_stock` | Inventory | variantId |

### 5.5 Cart Events

| Event | Publisher | Payload |
|---|---|---|
| `cart.item_added` | Cart | cartId, variantId, quantity |
| `cart.item_removed` | Cart | cartId, variantId |
| `cart.item_quantity_changed` | Cart | cartId, variantId, oldQty, newQty |
| `cart.voucher_applied` | Cart | cartId, code, discountAmount |
| `cart.voucher_removed` | Cart | cartId |
| `cart.cleared` | Cart | cartId |
| `cart.merged` | Cart | fromSessionId, toUserId |

### 5.6 Checkout Events

| Event | Publisher | Payload |
|---|---|---|
| `checkout.started` | Checkout | sessionId, userId?, guestEmail? |
| `checkout.completed` | Checkout | sessionId, orderId |
| `checkout.abandoned` | Checkout | sessionId, reason |
| `checkout.expired` | Checkout | sessionId |

### 5.7 Order Events

| Event | Publisher | Payload |
|---|---|---|
| `order.placed` | Order | orderId, orderNumber, customerId, total, currency |
| `order.confirmed` | Order | orderId, paymentId |
| `order.processing` | Order | orderId |
| `order.shipped` | Order | orderId, shipmentId, trackingNumber, carrierCode |
| `order.delivered` | Order | orderId, deliveredAt |
| `order.completed` | Order | orderId |
| `order.cancelled` | Order | orderId, reason, refundedAmount |
| `return.requested` | Order | returnId, rmaNumber, orderId, items[] |
| `return.approved` | Order | returnId, orderId, refundAmount |
| `return.rejected` | Order | returnId, reason |
| `return.item_received` | Order | returnId, itemId, condition |
| `return.closed` | Order | returnId, finalAction |

### 5.8 Payment Events

| Event | Publisher | Payload |
|---|---|---|
| `payment.created` | Payment | paymentId, orderId, providerCode, amount |
| `payment.authorized` | Payment | paymentId, providerCode, authCode |
| `payment.captured` | Payment | paymentId, orderId, amount, providerCode |
| `payment.failed` | Payment | paymentId, orderId, reason |
| `payment.cancelled` | Payment | paymentId, orderId, reason |
| `payment.expired` | Payment | paymentId |
| `refund.created` | Payment | refundId, paymentId, amount, reason |
| `refund.processed` | Payment | refundId, providerRefundId |
| `refund.failed` | Payment | refundId, reason |

### 5.9 Shipping Events

| Event | Publisher | Payload |
|---|---|---|
| `shipment.created` | Shipping | shipmentId, orderId |
| `shipment.dispatched` | Shipping | shipmentId, trackingNumber, carrierCode |
| `shipment.in_transit` | Shipping | shipmentId, location, occurredAt |
| `shipment.out_for_delivery` | Shipping | shipmentId |
| `shipment.delivered` | Shipping | shipmentId, deliveredAt |
| `shipment.exception` | Shipping | shipmentId, reason |
| `shipment.returned` | Shipping | shipmentId |

### 5.10 Promotion Events

| Event | Publisher | Payload |
|---|---|---|
| `promotion.created` | Promotion | promotionId |
| `promotion.activated` | Promotion | promotionId |
| `promotion.deactivated` | Promotion | promotionId |
| `promotion.deleted` | Promotion | promotionId |
| `voucher.applied` | Promotion | voucherCode, userId, discountAmount |
| `voucher.rejected` | Promotion | voucherCode, reason |

### 5.11 Review Events

| Event | Publisher | Payload |
|---|---|---|
| `review.submitted` | Review | reviewId, productId, userId, rating |
| `review.approved` | Review | reviewId |
| `review.rejected` | Review | reviewId, reason |
| `review.replied` | Review | reviewId, replyId, by |

### 5.12 Notification Events

| Event | Publisher | Payload |
|---|---|---|
| `notification.requested` | Notification | notificationId, channel, templateCode, recipient, data |
| `notification.sent` | Notification | notificationId |
| `notification.failed` | Notification | notificationId, reason |
| `notification.delivered` | Notification | notificationId (email open/click) |
| `notification.bounced` | Notification | notificationId, reason |

### 5.13 Media Events

| Event | Publisher | Payload |
|---|---|---|
| `media.uploaded` | Media | mediaId, mimeType, size, ownerType, ownerId |
| `media.deleted` | Media | mediaId |
| `media.transformed` | Media | mediaId, variant |

### 5.14 Support Events

| Event | Publisher | Payload |
|---|---|---|
| `support_ticket.created` | Support | ticketId, userId, subject |
| `support_ticket.assigned` | Support | ticketId, agentId |
| `support_ticket.responded` | Support | ticketId, by, messageId |
| `support_ticket.resolved` | Support | ticketId |
| `support_ticket.closed` | Support | ticketId |

### 5.15 Platform Events

| Event | Publisher | Payload |
|---|---|---|
| `feature_flag.changed` | Platform | flagKey, oldValue, newValue |
| `system_config.changed` | Platform | configKey, oldValue, newValue |

---

## 6. Subscriber Catalog

| Event | Subscribers | Purpose |
|---|---|---|
| `user.registered` | Notification (welcome email), Analytics | Onboarding |
| `order.placed` | Inventory (consume reservation), Notification (order confirmation), Analytics, Audit | Multi-effect |
| `order.placed` | Admin (dashboard refresh) | Live ops |
| `order.cancelled` | Inventory (release), Payment (refund), Notification (cancellation email), Analytics | Cleanup |
| `payment.captured` | Order (confirm), Notification (payment receipt), Audit | Confirmation |
| `payment.failed` | Order (cancel if pending), Notification (payment failure email), Analytics | Failure path |
| `inventory.low_stock` | Notification (admin alert), Analytics | Ops |
| `return.approved` | Payment (refund), Inventory (restock if appropriate), Notification | Fulfillment |
| `review.approved` | Notification (review confirmation), Analytics (rating recalc) | Engagement |
| `*.*` | Audit | All events |
| `*.*` | Analytics (sampled) | BI |
| `*.*` | Cache invalidation (specific keys) | Performance |

---

## 7. Event Flow Examples

### 7.1 Place Order Flow

```
1. Customer places order via Checkout.placeOrder
2. Checkout persists Order aggregate in transaction
3. Same transaction: write `order.placed` to outbox
4. Transaction commits
5. Outbox relay publishes `order.placed` to bus
6. Consumers react:
   - Inventory: consume reservation
   - Notification: send confirmation email
   - Audit: record event
   - Analytics: track conversion
```

### 7.2 Payment Failure Flow

```
1. Customer chooses payment, completes at provider
2. Provider webhook → POST /v1/webhooks/payment/vnpay
3. Payment module processes webhook, persists Payment aggregate
4. Emits `payment.failed`
5. Subscribers react:
   - Order: if order was pending, transition to `cancelled`
   - Notification: send payment failure email
   - Analytics: track drop-off
```

---

## 8. Retry Policy

### 8.1 Retry Strategy

| Failure Type | Retry |
|---|---|
| Transient (timeout, network) | Yes — exponential backoff |
| Permanent (validation, business rule) | No — DLQ |
| External service down | Yes — bounded retry (5 attempts) |

### 8.2 Backoff Schedule

| Attempt | Delay | Jitter |
|---|---|---|
| 1 | Immediate | — |
| 2 | 30s | ±5s |
| 3 | 2min | ±15s |
| 4 | 10min | ±30s |
| 5 | 1h | ±2min |
| 6 (DLQ) | — | — |

### 8.3 Dead Letter Queue

- After 5 retries, event goes to DLQ.
- DLQ messages trigger admin alert.
- Admin can replay from DLQ after fix.

---

## 9. Event Versioning

### 9.1 Versioning Strategy

- `eventType` includes version: `order.placed.v1`
- Consumers MUST specify version when subscribing
- Breaking changes introduce new version (`order.placed.v2`)
- Old version supported for 6 months

### 9.2 Payload Versioning

- `payloadVersion: "1.0"` field in every event
- Backward-compatible additions: optional fields
- Breaking changes: new event type

---

## 10. Event Idempotency

### 10.1 Consumer Idempotency

Every consumer must be idempotent. Strategies:

| Strategy | Used For |
|---|---|
| **Event ID dedup** | Audit log writes |
| **Aggregate state check** | "Already cancelled?" before transitioning |
| **Outbox table** | Outbox relay uses unique event ID |
| **Idempotency keys** | Stored with side-effect records |

### 10.2 At-Least-Once Delivery

BullMQ provides at-least-once. Consumers must handle duplicates.

---

## 11. Event Ordering

### 11.1 Per-Aggregate Ordering

Events for the same aggregate are processed in order. BullMQ uses FIFO per queue, but parallel workers may break this.

### 11.2 Ordering Guarantee

- **Same aggregate ID** → processed sequentially
- **Different aggregates** → can be parallel

Implementation: BullMQ uses partition keys; consumers process by aggregate ID.

---

## 12. Event Bus Implementation

### 12.1 V1 (Modular Monolith)

- In-process event bus via **NestJS EventEmitter2** (sync) for same-process subscribers.
- **BullMQ** for async, cross-process, and external-triggered events.
- **Outbox table** in PostgreSQL for guaranteed delivery.

### 12.2 V2 (Microservices)

- **Redis Streams** or **NATS** for cross-service events.
- Outbox pattern retained.
- Event schema registry (e.g., Confluent).

---

## 13. Event Tracing

Every event carries:

- `eventId` (UUID v7)
- `correlationId` (from originating request)
- `causationId` (preceding event, if any)

This enables full event chain tracing via logs and traces.

---

## 14. Coverage Validation

| Check | Status |
|---|---|
| Event bus architecture described | ✓ |
| Naming convention defined | ✓ |
| Payload structure defined | ✓ |
| Event catalog by context | ✓ (60+ events) |
| Subscriber catalog | ✓ |
| Example flows | ✓ |
| Retry policy | ✓ |
| Versioning strategy | ✓ |
| Idempotency strategy | ✓ |
| Ordering guarantees | ✓ |
| Implementation notes (V1 + V2) | ✓ |

---

## 15. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial event-driven architecture: 60+ events, outbox pattern, retry policy |

---

**End of 05_EVENT_DRIVEN_ARCHITECTURE.md**
# 02 — Module Architecture

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document defines the **module-level architecture** for SmartLight. For every bounded context, it documents responsibilities, dependencies, public interfaces, events, and the future microservice boundary.

---

## 2. Module Conventions

Each NestJS module follows this structure:

```
modules/{context-name}/
├── {context}.module.ts            # NestJS module definition
├── domain/                        # Pure domain (no framework)
│   ├── aggregates/
│   ├── entities/
│   ├── value-objects/
│   ├── events/
│   ├── services/                  # Domain services
│   └── exceptions/
├── application/                   # Use cases (orchestration)
│   ├── commands/
│   ├── queries/
│   ├── orchestrators/
│   └── handlers/                  # Event handlers
├── infrastructure/                # Adapters (DB, external)
│   ├── repositories/
│   ├── adapters/                  # Payment, shipping, email adapters
│   ├── mappers/
│   └── prisma/
├── interface/                     # API layer
│   ├── controllers/
│   ├── dtos/
│   ├── decorators/
│   └── guards/
├── tests/
└── index.ts                       # Public exports
```

### 2.1 Public Interface

Each module exposes its functionality through:

1. **Public Service** — methods called by other modules
2. **Domain Events** — published to the event bus
3. **REST Controllers** — HTTP boundary

The module's `index.ts` re-exports only the **public surface**; internal modules remain private.

---

## 3. Module Dependency Matrix

A `→` means "depends on (synchronous)".

```
Identity → Platform
User → Identity, Platform
Catalog → Platform
Inventory → Catalog, Platform
Cart → Catalog, Inventory, Platform
Checkout → Cart, Catalog, Inventory, Address, Promotion, Tax, Shipping, Platform
Order → Inventory, Address, Promotion, Tax, Shipping, Payment, Platform
Payment → Order, Platform
Refund → Payment, Order, Platform
Shipping → Address, Platform
Promotion → Catalog, Platform
Review → Order, Catalog, Platform
Notification → Platform, (consumes events from all)
Media → Platform
Support → Order, Platform
Admin → Identity, Platform
Audit → (subscribes to all event topics)
Platform → (no deps)
```

> Event-based dependencies are additional (see `05_EVENT_DRIVEN_ARCHITECTURE.md`).

---

## 4. Module Specifications

### 4.1 Platform (Cross-Cutting)

| | |
|---|---|
| **Responsibilities** | Feature flags, system config, static pages, env loading |
| **Aggregate Roots** | `feature_flag`, `system_config`, `static_page` |
| **Dependencies** | None |
| **Events Published** | `feature_flag.changed`, `system_config.changed` |
| **Events Consumed** | None |
| **Public Services** | `FeatureFlagService.isEnabled(key)`, `ConfigService.get(key)`, `StaticPageService.findBySlug()` |
| **Future Microservice** | Platform Service (V2) |

### 4.2 Identity

| | |
|---|---|
| **Responsibilities** | Customer registration, login, refresh, logout, password reset, email verification, MFA, admin login |
| **Aggregate Roots** | `user`, `admin_user`, `refresh_token`, `session`, `mfa_secret`, `recovery_code` |
| **Dependencies** | Platform (config), Notification (event-based) |
| **Events Published** | `user.registered`, `user.email_verified`, `user.password_changed`, `user.deleted`, `admin_user.login_failed`, `admin_user.mfa_enabled` |
| **Events Consumed** | None |
| **Public Services** | `IdentityService.getUser(id)`, `IdentityService.validateToken(token)` |
| **Future Microservice** | Identity Service (V2 first extraction) |

### 4.3 User

| | |
|---|---|
| **Responsibilities** | Profile, addresses, notification preferences, PDPD data export / anonymization |
| **Aggregate Roots** | `user_profile`, `address`, `notification_preference`, `cookie_consent` |
| **Dependencies** | Identity (via `IdentityService`) |
| **Events Published** | `user.profile_updated`, `address.created`, `user.consent_updated` |
| **Events Consumed** | `user.registered` (initialize profile) |
| **Public Services** | `UserService.getProfile(id)`, `AddressService.list(userId)` |
| **Future Microservice** | Merge with Identity Service (V2) |

### 4.4 Catalog

| | |
|---|---|
| **Responsibilities** | Categories, brands, products, variants, attributes, images |
| **Aggregate Roots** | `category`, `brand`, `product`, `product_variant`, `product_attribute`, `product_image`, `attribute_definition` |
| **Dependencies** | Platform, Media |
| **Events Published** | `product.created`, `product.updated`, `product.published`, `product.unpublished`, `product.deleted`, `price.changed` |
| **Events Consumed** | None |
| **Public Services** | `CatalogService.findProductById(id)`, `CatalogService.findVariantById(id)`, `CatalogService.searchProducts(query)` |
| **Future Microservice** | Catalog Service |

### 4.5 Inventory

| | |
|---|---|
| **Responsibilities** | Stock tracking, reservations, adjustments, movement log |
| **Aggregate Roots** | `inventory`, `stock_reservation`, `stock_movement`, `inventory_adjustment`, `low_stock_alert` |
| **Dependencies** | Catalog (via `CatalogService`) |
| **Events Published** | `inventory.reserved`, `inventory.released`, `inventory.adjusted`, `inventory.low_stock` |
| **Events Consumed** | `order.placed` (consume reservations), `order.cancelled` (release) |
| **Public Services** | `InventoryService.getAvailableStock(variantId)`, `InventoryService.reserve(items)`, `InventoryService.release(reservationId)` |
| **Future Microservice** | Inventory Service |

### 4.6 Cart

| | |
|---|---|
| **Responsibilities** | Cart CRUD, voucher application, totals calculation |
| **Aggregate Roots** | `cart`, `cart_item` |
| **Dependencies** | Catalog, Inventory, Promotion |
| **Events Published** | `cart.item_added`, `cart.item_removed`, `cart.voucher_applied` |
| **Events Consumed** | `price.changed` (revalidate cart) |
| **Public Services** | `CartService.getCurrentCart()`, `CartService.addItem(variantId, qty)`, `CartService.calculateTotals()` |
| **Future Microservice** | Merge with Checkout Service |

### 4.7 Checkout

| | |
|---|---|
| **Responsibilities** | Multi-step checkout session, address selection, shipping choice, payment choice, voucher, place order |
| **Aggregate Roots** | `checkout_session` |
| **Dependencies** | Cart, Catalog, Inventory, Address, Promotion, Tax, Shipping |
| **Events Published** | `checkout.started`, `checkout.completed`, `order.placed` |
| **Events Consumed** | None |
| **Public Services** | `CheckoutService.start()`, `CheckoutService.placeOrder(sessionId)` |
| **Future Microservice** | Checkout Orchestrator Service |

### 4.8 Order

| | |
|---|---|
| **Responsibilities** | Order lifecycle, status history, fulfillment, returns |
| **Aggregate Roots** | `order`, `order_item`, `order_address`, `order_status_history`, `return`, `return_item` |
| **Dependencies** | Inventory, Promotion, Tax, Shipping, Payment, Address, Catalog |
| **Events Published** | `order.placed`, `order.confirmed`, `order.processing`, `order.shipped`, `order.delivered`, `order.completed`, `order.cancelled`, `return.requested`, `return.approved`, `return.received`, `return.closed` |
| **Events Consumed** | `payment.captured` (→ confirm), `payment.failed` (→ cancel), `shipment.delivered` (→ deliver) |
| **Public Services** | `OrderService.findById(id)`, `OrderService.findByCustomer(userId)`, `OrderService.cancel(id, reason)` |
| **Future Microservice** | Order Service |

### 4.9 Payment

| | |
|---|---|
| **Responsibilities** | Payment intents (VNPay, MoMo, ZaloPay, PayPal), capture, refunds, webhooks |
| **Aggregate Roots** | `payment`, `payment_transaction`, `webhook_event` |
| **Dependencies** | Order (via OrderService) |
| **Events Published** | `payment.created`, `payment.authorized`, `payment.captured`, `payment.failed`, `payment.cancelled`, `refund.created`, `refund.processed` |
| **Events Consumed** | None |
| **Public Services** | `PaymentService.createIntent(orderId, provider)`, `PaymentService.refund(paymentId, amount)` |
| **Future Microservice** | Payment Service |

### 4.10 Refund

| | |
|---|---|
| **Responsibilities** | Refund lifecycle (refunds are a sub-aggregate of payment) |
| **Aggregate Roots** | `refund` (owned by Payment aggregate) |
| **Dependencies** | Payment, Order |
| **Events Published** | (via Payment) |
| **Events Consumed** | `order.cancelled` (initiate refund), `return.approved` (initiate refund) |
| **Public Services** | `RefundService.request(paymentId, amount, reason)` |
| **Future Microservice** | Merge with Payment Service |

### 4.11 Shipping

| | |
|---|---|
| **Responsibilities** | Zones, rates, shipment lifecycle, tracking, carrier webhooks |
| **Aggregate Roots** | `shipping_zone`, `shipping_rate`, `shipment`, `tracking_event` |
| **Dependencies** | Address |
| **Events Published** | `shipment.dispatched`, `shipment.in_transit`, `shipment.out_for_delivery`, `shipment.delivered`, `shipment.exception` |
| **Events Consumed** | `order.placed` (create shipment), webhook events from carriers |
| **Public Services** | `ShippingService.quote(address, items)`, `ShippingService.track(trackingNumber)`, `ShippingService.createShipment(orderId)` |
| **Future Microservice** | Shipping Service |

### 4.12 Promotion

| | |
|---|---|
| **Responsibilities** | Promotions, vouchers, flash sales, usage tracking |
| **Aggregate Roots** | `promotion`, `voucher`, `promotion_usage`, `voucher_usage` |
| **Dependencies** | Catalog |
| **Events Published** | `voucher.applied`, `voucher.rejected`, `promotion.activated`, `promotion.deactivated` |
| **Events Consumed** | None |
| **Public Services** | `PromotionService.validateVoucher(code, cart)`, `PromotionService.calculateDiscount(promotion, items)` |
| **Future Microservice** | Promotion Service |

### 4.13 Review

| | |
|---|---|
| **Responsibilities** | Verified-purchase reviews, ratings, helpful votes, moderation |
| **Aggregate Roots** | `review`, `review_reply`, `review_helpful_vote` |
| **Dependencies** | Catalog, Order (verified purchase) |
| **Events Published** | `review.submitted`, `review.approved`, `review.rejected` |
| **Events Consumed** | `order.delivered` (eligible for review) |
| **Public Services** | `ReviewService.findByProduct(productId)`, `ReviewService.moderate(reviewId)` |
| **Future Microservice** | Review Service |

### 4.14 Notification

| | |
|---|---|
| **Responsibilities** | Email templates, send logs, preferences, in-app inbox (V1.5) |
| **Aggregate Roots** | `email_template`, `notification_log`, `notification_preference`, `cookie_consent`, `notification_inbox_item` (V1.5) |
| **Dependencies** | Identity (preferences), Platform |
| **Events Published** | `notification.requested`, `notification.sent`, `notification.failed` |
| **Events Consumed** | `user.registered`, `order.placed`, `order.confirmed`, `order.shipped`, `order.delivered`, `payment.captured`, `payment.failed`, `review.approved`, `return.requested`, `inventory.low_stock`, `admin_user.login_failed` |
| **Public Services** | `NotificationService.send(channel, templateCode, recipient, data)`, `NotificationService.getPreferences(userId)` |
| **Future Microservice** | Notification Service |

### 4.15 Media

| | |
|---|---|
| **Responsibilities** | File metadata, signed upload URLs, image variants registry |
| **Aggregate Roots** | `media_file` |
| **Dependencies** | Cloudinary adapter |
| **Events Published** | `media.uploaded`, `media.deleted`, `media.transformed` |
| **Events Consumed** | None |
| **Public Services** | `MediaService.upload(file, metadata)`, `MediaService.getVariants(mediaId)`, `MediaService.requestSignedUpload(purpose)` |
| **Future Microservice** | Media Service |

### 4.16 Support

| | |
|---|---|
| **Responsibilities** | Support tickets, messages, SLA tracking |
| **Aggregate Roots** | `support_ticket`, `ticket_message` |
| **Dependencies** | Identity, Order |
| **Events Published** | `support_ticket.created`, `support_ticket.assigned`, `support_ticket.responded`, `support_ticket.resolved` |
| **Events Consumed** | `order.placed` (link ticket to order), `payment.failed` |
| **Public Services** | `SupportService.createTicket(...)`, `SupportService.listByUser(userId)` |
| **Future Microservice** | Support Service |

### 4.17 Admin (RBAC)

| | |
|---|---|
| **Responsibilities** | Roles, permissions, admin user management, RBAC enforcement |
| **Aggregate Roots** | `role`, `permission`, `admin_user_role`, `role_permission` |
| **Dependencies** | Identity |
| **Events Published** | `role.created`, `role.updated`, `role.deleted`, `admin_user.role_assigned` |
| **Events Consumed** | None |
| **Public Services** | `RbacService.userHasPermission(userId, permission)`, `RbacService.getUserRoles(userId)` |
| **Future Microservice** | Auth Service (merge with Identity V2) |

### 4.18 Audit

| | |
|---|---|
| **Responsibilities** | Immutable audit log, webhook event log |
| **Aggregate Roots** | `audit_log`, `webhook_event` |
| **Dependencies** | None (subscribes only) |
| **Events Published** | `audit.written` (for internal monitoring) |
| **Events Consumed** | Subscribes to all major domain events via wildcard `domain.#` |
| **Public Services** | `AuditService.record(action, entityType, entityId, actor, metadata)`, `AuditService.search(query)` |
| **Future Microservice** | Audit Service |

---

## 5. Cross-Cutting Modules

### 5.1 Common (Shared Kernel)

Located at `src/common/`. Allowed in every module:

```
common/
├── errors/          # Business exceptions
├── value-objects/   # Money, Email, Phone, Address
├── types/           # Shared TypeScript types
├── constants/       # App-wide constants
└── utils/           # Pure utility functions
```

### 5.2 Platform Infrastructure

Infrastructure adapters live in `src/platform/`:

```
platform/
├── database/        # Prisma client, transaction helpers
├── cache/           # Redis client, cache abstractions
├── queue/           # BullMQ producers and consumers
├── logger/          # Pino logger
├── storage/         # Cloudinary adapter
├── email/           # Email provider adapter
├── events/          # Event bus
└── auth/            # Passport strategies, JWT helpers
```

---

## 6. Public Interfaces (Examples)

### 6.1 InventoryService Public Interface

```
class InventoryService {
  getStock(variantId): Promise<StockSnapshot>
  reserve(items, ttlMinutes): Promise<Reservation>
  release(reservationId): Promise<void>
  consume(reservationId): Promise<void>             // order placement
  adjust(variantId, delta, reason, actor): Promise<void>
  findMovements(variantId, query): Promise<Movement[]>
}
```

### 6.2 PaymentService Public Interface

```
class PaymentService {
  createIntent(orderId, provider, returnUrl, cancelUrl): Promise<PaymentIntent>
  capture(paymentId, amount?): Promise<Payment>
  cancel(paymentId, reason): Promise<Payment>
  refund(paymentId, amount, reason): Promise<Refund>
  getPayment(paymentId): Promise<Payment>
}
```

### 6.3 ShippingService Public Interface

```
class ShippingService {
  quote(address, items): Promise<ShippingQuote[]>
  createShipment(orderId, methodId): Promise<Shipment>
  dispatch(shipmentId, trackingNumber, carrierCode): Promise<Shipment>
  track(trackingNumber): Promise<TrackingInfo>
  markDelivered(shipmentId): Promise<Shipment>
}
```

---

## 7. Module Boundaries for Future Microservices

The following modules are the **candidates for first extraction** when moving to microservices:

1. **Identity + Admin (Auth Service)** — high cohesion; well-defined API; can be extracted independently
2. **Payment Service** — strict isolation; external integrations; PCI compliance; independent scaling
3. **Notification Service** — async, queue-driven; can scale separately
4. **Catalog Service** — read-heavy; good candidate for read replicas
5. **Search/AI Service** (V1.5+) — needs dedicated compute (vector DB)

> See `21_MICROSERVICE_MIGRATION_PLAN.md` for full migration roadmap.

---

## 8. Coverage Validation

| Check | Status |
|---|---|
| All bounded contexts documented | ✓ (18 modules) |
| Responsibilities per module | ✓ |
| Dependencies per module | ✓ |
| Public interfaces per module | ✓ |
| Events published / consumed per module | ✓ |
| Future microservice boundary identified | ✓ |
| Shared kernel documented | ✓ |
| Public service examples | ✓ |

---

## 9. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial module architecture: 18 modules + shared kernel |

---

**End of 02_MODULE_ARCHITECTURE.md**
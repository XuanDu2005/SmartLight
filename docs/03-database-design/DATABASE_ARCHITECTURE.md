# DATABASE_ARCHITECTURE.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal Database Architect
**Source of Truth:** `docs/02-system-analysis/`

---

## 1. Purpose

This document defines the **database architecture** for SmartLight: domain boundaries, aggregate ownership, transaction boundaries, future microservice boundaries, shared references, and read/write classification.

This is **design only** — no SQL, no Prisma schema.

---

## 2. Database Technology Choices

### 2.1 Primary Database

- **DBMS:** PostgreSQL 16 (LTS)
- **Rationale:** ACID, JSONB, partial indexes, full-text search, mature ecosystem, Prisma support.
- **Hosting:** Neon (managed PostgreSQL with point-in-time recovery, branching for preview environments)

### 2.2 Supporting Stores

| Store | Purpose | Hosting |
| --- | --- | --- |
| Redis | Cache, sessions, BullMQ queue, stock reservations TTL | Upstash |
| Object Storage | Media (Cloudinary owns the storage) | Cloudinary |
| Search Index | (V1.5) Meilisearch or PostgreSQL FTS | PostgreSQL FTS in V1 |

### 2.3 Per-Bounded-Context Data Storage

> **MVP:** Single PostgreSQL database with logical separation via **schema-per-context**. Each module owns tables prefixed with `mod_` or grouped by schema.

```
smartlight (database)
├── schema: identity (tables: users, admin_users, roles, ...)
├── schema: catalog (tables: products, product_variants, categories, ...)
├── schema: inventory (tables: inventory, stock_movements, ...)
├── schema: cart (tables: carts, cart_items, ...)
├── schema: checkout (tables: checkout_sessions, ...)
├── schema: promotion (tables: promotions, vouchers, ...)
├── schema: tax (tables: tax_rates, ...)
├── schema: order (tables: orders, order_items, ...)
├── schema: payment (tables: payments, refunds, ...)
├── schema: shipping (tables: shipments, ...)
├── schema: returns (tables: returns, ...)
├── schema: review (tables: reviews, ...)
├── schema: notification (tables: email_templates, ...)
├── schema: support (tables: support_tickets, ...)
├── schema: audit (tables: audit_logs, ...)
└── schema: platform (tables: feature_flags, static_pages, ...)
```

> **Note:** Schemas provide logical separation; physical DB remains single for MVP. Migration to per-context databases (or instances) is straightforward in V2.

---

## 3. Domain Boundaries

Each bounded context has its own schema, its own tables, and its own aggregate roots. Communication across contexts is via **ID reference** + **domain events**, never direct joins.

### 3.1 Boundary Map

```
┌──────────────────────────────────────────────────────────────┐
│                       SMARTLIGHT DOMAIN                       │
│                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Identity │  │ Catalog  │  │ Inventory│  │  Media   │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │              │
│       │             └────┬────────┘             │              │
│       │                  │                      │              │
│  ┌────▼─────┐  ┌─────────▼──────┐  ┌────────────▼─────┐        │
│  │  Cart    │  │   Checkout     │  │   Catalog (images)│       │
│  └────┬─────┘  └─────────┬──────┘  └──────────────────┘        │
│       │                  │                                      │
│  ┌────▼─────┐  ┌─────────▼──────┐  ┌──────────────┐            │
│  │Promotion │  │   Order        │  │    Tax       │            │
│  └────┬─────┘  └─────────┬──────┘  └──────┬───────┘            │
│       │                  │                  │                   │
│       └──────┬───────────┼──────────────────┘                   │
│              │           │                                       │
│         ┌────▼─────┐  ┌───▼──────┐  ┌──────────┐                │
│         │ Payment  │  │ Shipping │  │ Returns  │                │
│         └────┬─────┘  └────┬─────┘  └────┬─────┘                │
│              │             │             │                       │
│         ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐                │
│         │ Notify   │  │ Support  │  │ Review   │                │
│         └──────────┘  └──────────┘  └──────────┘                │
│                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │ Audit    │  │ Analytics│  │ Platform │                       │
│  └──────────┘  └──────────┘  └──────────┘                       │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Upstream / Downstream Relationships

Following DDD's "Conformist" / "Anti-Corruption Layer" pattern:

| Upstream | Downstream | Relationship |
| --- | --- | --- |
| Identity | Order, Cart, Checkout, Returns, Support | Customer-Supplier (Conformist) |
| Catalog | Cart, Order, Checkout, Returns, Inventory | Customer-Supplier (Conformist) |
| Inventory | Cart, Checkout, Order | Customer-Supplier (Conformist) |
| Order | Payment, Shipping, Notification, Returns, Tax, Analytics | Customer-Supplier (Conformist) |
| Payment | Order, Notification | Customer-Supplier |
| Shipping | Order, Notification | Customer-Supplier |
| Promotion | Cart, Checkout, Order | Customer-Supplier |
| Notification | Order, Shipping, Returns, Inventory (low stock), Identity | Open Host Service |

> **Anti-Corruption Layers (ACL):** Not required in V1; will be needed in V2 when contexts split into microservices.

---

## 4. Aggregate Ownership

### 4.1 Ownership Rules

1. **Single owner per aggregate** — only the owning module may directly INSERT/UPDATE/DELETE rows in that aggregate.
2. **Other modules** use read-only access or trigger domain events that the owning module processes.
3. **Cross-aggregate references** use only the aggregate root ID (e.g., `orderId`); child entity IDs are not exposed.

### 4.2 Ownership Matrix

| Aggregate | Owner Module | Read-Only Access By |
| --- | --- | --- |
| User, AdminUser, Role, Address, MfaSecret, RefreshToken | M-ID | All authenticated contexts (for auth check) |
| Category, Brand, Product, ProductVariant, ProductImage, ProductAttribute | M-CAT | M-CRT, M-CHK, M-ORD, M-INV, M-RVW, M-ANL |
| Inventory, StockReservation, StockMovement, InventoryAdjustment | M-INV | M-CRT, M-CHK, M-ORD, M-CAT |
| MediaFile | M-MED | M-CAT (image lookup) |
| Cart, CartItem, Wishlist (V1.1) | M-CRT | M-CHK (checkout reads) |
| CheckoutSession | M-CHK | None |
| Promotion, PromotionUsage | M-PRM | M-CHK, M-ORD |
| Voucher, VoucherUsage | M-PRM | M-CHK, M-ORD |
| TaxRate | M-TAX | M-ORD, M-CHK, M-ANL |
| Order, OrderItem, OrderAddress, OrderStatusHistory | M-ORD | M-PAY, M-SHP, M-RTN, M-NOT, M-ANL, M-RVW, M-CUST |
| Payment, PaymentTransaction, WebhookEvent | M-PAY | M-ORD, M-RTN, M-NOT, M-ANL |
| Refund | M-PAY | M-RTN, M-NOT, M-ANL |
| ShippingZone, Shipment, TrackingEvent | M-SHP | M-ORD, M-NOT, M-CUST |
| Return, ReturnItem | M-RTN | M-ORD, M-PAY, M-INV, M-NOT |
| Review, ReviewReply, ReviewHelpfulVote | M-RVW | M-CAT, M-CUST, M-ANL |
| EmailTemplate, NotificationLog, NotificationPreference, CookieConsent | M-NOT | M-ADM (templates) |
| SupportTicket, TicketMessage | M-SUP | M-CUST, M-ORD |
| AuditLog | M-ADM | M-ADM (read only) |
| FeatureFlag, FeatureFlagOverride, SystemConfig | M-PLT | All (cached) |
| StaticPage | M-PLT | M-CUST |

---

## 5. Transaction Boundaries

### 5.1 Single-Aggregate Transactions

The default: a single ACID transaction modifies one aggregate.

**Example:** Creating an order — single transaction locks the Order aggregate (header + items + history + addresses).

### 5.2 Cross-Aggregate Transactions

Cross-aggregate operations use **eventual consistency** via domain events, never multi-aggregate ACID transactions.

**Example: Order Checkout**
```
Transaction 1 (M-CHK aggregate boundary):
  - Create CheckoutSession
  - Validate cart, address, shipping

Transaction 2 (M-CRT):
  - Convert cart to immutable snapshot

Transaction 3 (M-ORD aggregate boundary):
  - Create Order
  - Snapshot tax
  - Decrement stock via M-INV (separate transaction)
  - Decrement voucher usage via M-PRM (separate transaction)
  - Create payment intent via M-PAY (separate transaction)

Eventual:
  - Payment webhook arrives → Order transitions to Confirmed
  - Notification service sends email
```

### 5.3 Saga Pattern (Cross-Context Operations)

For multi-step operations that span aggregates, use the **Saga pattern** with compensating actions.

**Order Placement Saga:**
```
Step 1: Begin order saga
Step 2: M-ORD: Create order in Pending (commit)
Step 3: M-INV: Convert reservations to decrements (commit)
Step 4: M-PAY: Create payment intent (commit)
Step 5: Webhook: payment.succeeded → M-ORD: Confirm order (commit)
Step 6: M-NOT: Send confirmation email (async)

Compensation (on failure):
  - Payment fails → M-ORD: Cancel order, M-INV: Release reservations
```

### 5.4 Outbox Pattern

For guaranteed event delivery within transactions:

```
Transaction:
  - Update aggregate
  - Insert OutboxMessage row (event payload)

Background worker:
  - Read unpublished OutboxMessage rows
  - Publish to internal bus (and external in V2)
  - Mark as published
```

> **V1:** Use NestJS `@nestjs/event-emitter` for in-process events; persist via outbox if cross-process required.

---

## 6. Future Microservice Boundaries

When SmartLight evolves to microservices in **V2**, the bounded contexts map cleanly to services:

```
V2 Microservices (from MODULE_INTERACTION.md §8):
┌────────────────────┐    ┌────────────────────┐
│ IdentityService    │◄───┤ All others         │
└────────────────────┘    └────────────────────┘

┌────────────────────┐    ┌────────────────────┐
│ CatalogService     │◄───┤ Order, Cart, etc.  │
└────────────────────┘    └────────────────────┘

┌────────────────────┐    ┌────────────────────┐
│ InventoryService   │◄───┤ Order, Cart, etc.  │
└────────────────────┘    └────────────────────┘

┌────────────────────┐    ┌────────────────────┐
│ OrderService       │◄───┤ All                │
└────────────────────┘    └────────────────────┘

┌────────────────────┐    ┌────────────────────┐
│ PaymentService     │◄───┤ Order              │
│ (PCI zone)         │    └────────────────────┘
└────────────────────┘

┌────────────────────┐
│ NotificationService│ (subscriber)
└────────────────────┘
```

### 6.1 Database Per Service (V2)

| Service | Database Type |
| --- | --- |
| IdentityService | PostgreSQL (own DB) |
| CatalogService | PostgreSQL + OpenSearch (search) |
| InventoryService | PostgreSQL (own DB) |
| OrderService | PostgreSQL (own DB, partitioned by date) |
| PaymentService | PostgreSQL (own DB, PCI-isolated) |
| ShippingService | PostgreSQL (own DB) |
| ReturnsService | PostgreSQL (shared with Order V2) or separate |
| NotificationService | PostgreSQL + Redis |

### 6.2 Shared Database Anti-Pattern (V2 Forbidden)

In V2:
- ❌ Direct cross-service database access
- ❌ Shared database for multiple services
- ❌ Foreign keys across services
- ✅ Each service owns its data
- ✅ Cross-service via APIs + events

---

## 7. Shared References

### 7.1 Within Same Database (MVP)

References between aggregates in the same database use **logical foreign keys** (via app-level enforcement + soft references). They are NOT actual DB foreign keys in V1 to allow easier aggregate refactoring.

**Logical reference columns** (with documented meaning):
- `Order.customerId` → references `User.id`
- `OrderItem.productId` → references `Product.id`
- `OrderItem.variantId` → references `ProductVariant.id`
- `CartItem.variantId` → references `ProductVariant.id`
- `Inventory.variantId` → references `ProductVariant.id` (1:1)
- `StockReservation.variantId` → references `ProductVariant.id`
- `Payment.orderId` → references `Order.id`
- `Refund.paymentId` → references `Payment.id`
- `Shipment.orderId` → references `Order.id`
- `Return.orderId` → references `Order.id`
- `ReturnItem.orderItemId` → references `OrderItem.id`
- `Review.productId` → references `Product.id`
- `Review.customerId` → references `User.id`
- `Review.orderItemId` → references `OrderItem.id`
- `NotificationLog.userId` → references `User.id` (nullable for guest)
- `SupportTicket.customerId` → references `User.id` (nullable for guest)
- `SupportTicket.orderId` → references `Order.id` (optional)
- `AuditLog.actorId` → references `User.id` or `AdminUser.id` (polymorphic)

### 7.2 No Actual Foreign Key Constraints (Recommended for V1)

**Why:** Physical foreign keys (with cascading deletes) couple aggregates tightly and complicate V2 microservice split. The domain enforces integrity via:

- Application-level invariant checks (in services / transactions)
- Database **CHECK constraints** for value validation
- Database **UNIQUE constraints** for uniqueness
- **NOT NULL constraints** for required fields
- Logical foreign keys (no FK constraint, but indexed)

> **Trade-off:** Lose automatic referential integrity at the DB layer. **Mitigation:** Strong application-layer testing + integration tests + the use of explicit `Id` columns on related entities.

> **V2 Exception:** Some foreign keys (like `Inventory.variantId → ProductVariant.id`) MAY be added for high-criticality references. Documented per relationship in `RELATIONSHIP_MATRIX.md`.

---

## 8. Read-Heavy vs Write-Heavy Classification

### 8.1 Read-Heavy Entities

These entities are queried much more often than written:

| Entity | Read Pattern | Write Pattern |
| --- | --- | --- |
| Product | High (browse, search) | Low (admin CRUD) |
| ProductVariant | High (PDP, listings) | Low |
| ProductImage | High (display) | Low |
| Category | High (navigation) | Low |
| Brand | High (filter) | Very low |
| Review | Medium-high (display) | Medium (submissions) |
| EmailTemplate | Low (render) | Very low |
| FeatureFlag | High (per request) | Very low |
| StaticPage | Medium | Very low |
| Address | Medium (checkout) | Low |
| TaxRate | Medium (order calc) | Very low |

**Strategy:**
- Redis cache for hot entities (TTL-based)
- Read replicas in V2
- Database connection pooling
- Pre-aggregated views for analytics

### 8.2 Write-Heavy Entities

These entities have frequent writes:

| Entity | Write Pattern | Notes |
| --- | --- | --- |
| Order | High (peak hours) | ACID critical |
| OrderItem | High | With Order |
| OrderStatusHistory | High | With Order |
| Payment | High | With Order |
| PaymentTransaction | High | With Payment |
| StockMovement | Very high | Append-only; consider partitioning |
| StockReservation | Very high | High churn (15-min TTL) |
| AuditLog | Very high | Append-only; consider partitioning |
| NotificationLog | High | Append-only |
| WebhookEvent | Medium | Idempotency key |
| Cart / CartItem | Medium | |

**Strategy:**
- Strong indexing
- Append-only pattern where possible
- Background batching for notifications
- Asynchronous processing via BullMQ
- Partitioning in V2 (StockMovement, AuditLog)

### 8.3 Mixed

| Entity | Strategy |
| --- | --- |
| Inventory | Cache `stockOnHand` in Redis with invalidation on mutation |
| User | Index on email; session table separate |
| Return | Read-heavy after creation; rare writes |

---

## 9. Multi-Tenancy and Isolation

### 9.1 MVP: Single-Tenant

V1 is **single-vendor, single-tenant**. All entities are global — no tenant_id column needed.

> **V2 Marketplace:** Introduce `sellerId` foreign key in Product, Order, etc.

---

## 10. Data Lifecycle

### 10.1 Archival Strategy

| Data Type | Retention |
| --- | --- |
| Orders | Permanent (financial record) |
| Payments / Refunds | Permanent (financial record) |
| AuditLog | 7 years (regulatory) |
| NotificationLog | 1 year (operational) |
| WebhookEvent | 90 days (idempotency window) |
| StockReservation (released/expired) | 30 days |
| Cart (abandoned) | 90 days |
| RefreshToken (expired) | 30 days |
| UserSession (ended) | 30 days |
| SupportTicket (closed) | 2 years |

### 10.2 Soft Delete

Most entities support soft delete (`deletedAt`). See `SOFT_DELETE_STRATEGY.md`.

Hard delete is reserved for:
- Test data (dev/staging only)
- GDPR/PDPD right-to-be-forgotten (with cascade anonymization)
- Compiled tokens (refresh tokens, sessions)

---

## 11. Backup and Disaster Recovery

| Aspect | Decision |
| --- | --- |
| Frequency | Continuous (Neon PITR) + daily snapshots |
| Retention | 30 days |
| RPO | ≤ 1 hour |
| RTO | ≤ 4 hours |
| Cross-region | (V2) Read replica in ap-southeast-1 |

---

## 12. Database Architecture Coverage Validation

| Check | Status |
| --- | --- |
| Every bounded context has a schema | ✓ |
| Every aggregate has an owner module | ✓ |
| Cross-aggregate refs use ID only | ✓ |
| Read/write classification done | ✓ |
| Future microservice mapping documented | ✓ |
| Transaction boundaries clear | ✓ |
| Outbox pattern referenced | ✓ |
| No actual foreign keys (recommended) | ✓ |
| Soft delete covered | ✓ (separate doc) |
| Backup strategy defined | ✓ |

---

## 13. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal Database Architect | Initial database architecture: 18 schemas, aggregate ownership, transaction boundaries, future microservice mapping, read/write classification |

---

**End of Document — DATABASE_ARCHITECTURE.md**
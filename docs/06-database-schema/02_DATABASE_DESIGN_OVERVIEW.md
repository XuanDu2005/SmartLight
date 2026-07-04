# 02 — Database Design Overview

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04
**Author:** Principal Database Architect

---

## 1. Purpose

This document gives the **high-level view of the SmartLight database design**:

- Goals & quality attributes
- Design principles applied
- Target state
- Statistical overview
- Out-of-scope items

For entity-level details, see `01_PRISMA_SCHEMA.prisma` and the entity-by-entity explanation in `03_ENTITY_RELATIONSHIP_EXPLANATION.md`.

---

## 2. Quality Attributes (Goals)

| Quality Goal | Target | Achieved by |
|---|---|---|
| **Read performance on catalog** | p95 < 50 ms | B-tree indexes on category / brand / status; PostgreSQL planner; query-level cache |
| **Write performance on order placement** | p95 < 200 ms | Single Prisma `prisma.$transaction` per checkout; minimal row count |
| **Strong consistency on stock** | No oversell | Atomic UPDATE with `available >= qty` check; row-level locking; StockMovement audit |
| **Money correctness** | No rounding errors | `Decimal(20,4)` for all monetary columns |
| **Audit completeness** | All state changes traceable | `audit_log` table; `createdAt/updatedAt` on every model; append-only history tables |
| **PDPD / GDPR compliance** | Data export & anonymization | `gdprAnonymizedAt`, soft delete, `data_export` audit category |
| **Microservice portability** | Future-ready | `cuid()` string IDs; no cross-context direct FKs (only via ID columns where appropriate) |
| **Vietnamese market** | Defaults correct | `locale="vi-VN"`, `CITEXT` for case-insensitive emails/codes, VND currency default |
| **Multi-warehouse future** | Ready | `Inventory.warehouseCode` field already in schema |
| **Multi-vendor future** | Ready | All aggregate designs tenant-aware via association IDs |

---

## 3. Design Principles

### 3.1 Universals

1. **3rd Normal Form by default** — denormalize **only** for documented hot paths (rating aggregates, materialized path on Category).
2. **UUID-style global IDs** — `cuid()` strings, microservice-portable, lexicographic (indexed efficiently).
3. **Money is `Decimal(20, 4)`** — never `Float`. VND has 0 minor unit at DB layer; renderer formats.
4. **Soft delete everywhere** — `deletedAt` on business entities; physical deletes only via background purge job after retention.
5. **Audit fields everywhere** — `createdAt`, `updatedAt` minimum; `createdBy`/`updatedBy` on user-mutated models.
6. **Enums for state** — no free-form status strings.
7. **Snake_case at DB** — Prisma `@map`/`@@map` keeps code idiomatic while DB is conventional.

### 3.2 Module Discipline (per Software Architecture §02_MODULE_ARCHITECTURE)

- Modules do **not** introduce cross-schema FKs. Where they need external IDs, they store them as plain columns (`paymentId` on `Shipment` is the **only** justified cross-context FK because they share an aggregate; see ADR-014 in Architecture).
- All events are derived from the schema (outbox table).
- Job scheduler is **outside** the schema.

### 3.3 Performance Discipline

- Every table has a primary key.
- Hot lookup paths have explicit B-tree indexes.
- JSON columns used **only** for truly flexible payloads (feature flag values, audit metadata, payment raw responses).
- `Decimal` cost: indexed comparison still works; ORDER BY supported.

---

## 4. Target Database State

### 4.1 Engine

- **PostgreSQL 16** (Neon in MVP).
- Extensions enabled: `citext`, `pgcrypto`, `pg_trgm` (search-ready for V1.1).

### 4.2 Connection Topology

```
NestJS App ─────▶ PgBouncer (or Neon pooler) ─────▶ Postgres primary
                                                    ▲
                                                    │ async
                                                    │
                                              Postgres read replica (V1.5+)
```

### 4.3 Connection Pooling

| Env | Pool strategy |
|---|---|
| Local / Dev | Direct via `prisma` client (small pool) |
| Preview | Neon pooler |
| Staging | Neon pooler |
| Production | Neon pooler + planned PgBouncer in V1.5 |

### 4.4 Read Replica Strategy

| When | What to do |
|---|---|
| Phase V1 | All reads against primary; latency acceptable |
| Phase V1.5 | Catalog / category-tree / static pages → read replica via Prisma `replicaUrl` |
| Phase V2 | Service-extracted queries route to per-service DB |

---

## 5. Schema Statistics

| Metric | Count |
|---|---|
| Models | **52** |
| Enums | **45** |
| Bounded contexts | 16 |
| Indexes | ~ 110 (counted from `@@index` + `@unique`) |
| Unique constraints | ~ 60 |
| Decimal money fields | 30+ |
| Soft-deletable models | 36 |
| Append-only audit tables | 8 (`StockMovement`, `OrderStatusHistory`, `TrackingEvent`, `PaymentTransaction`, `WebhookEvent`, `AuditLog`, `OutboxMessage`, `TicketMessage`) |

---

## 6. Schema Layers (Conceptual)

```
┌─────────────────────────────────────────────┐
│  Identity & Auth (12)                       │  Users, AdminUser, Roles, Permissions
├─────────────────────────────────────────────┤
│  Catalog (8)                                │  Category, Brand, Product, Variant, Images, Attributes
├─────────────────────────────────────────────┤
│  Inventory (4)                              │  Inventory, StockMovement, StockReservation, Adjustments
├─────────────────────────────────────────────┤
│  Media (1)                                  │  MediaFile
├─────────────────────────────────────────────┤
│  Cart & Checkout (3)                        │  Cart, CartItem, CheckoutSession
├─────────────────────────────────────────────┤
│  Promotion & Tax (5)                        │  Promotion, Coupon, VoucherUsage, PromotionUsage, TaxRate, TaxExemption
├─────────────────────────────────────────────┤
│  Order (4)                                  │  Order, OrderItem, OrderAddress, OrderStatusHistory
├─────────────────────────────────────────────┤
│  Payment (4)                                │  Payment, PaymentTransaction, WebhookEvent, Refund
├─────────────────────────────────────────────┤
│  Shipping (4)                               │  Shipment, TrackingEvent, ShippingZone, ShippingRate
├─────────────────────────────────────────────┤
│  Returns (3)                                │  Return, ReturnItem, ReturnInspection
├─────────────────────────────────────────────┤
│  Reviews (3)                                │  Review, ReviewReply, ReviewHelpfulVote
├─────────────────────────────────────────────┤
│  Notifications (4)                          │  EmailTemplate, NotificationLog, NotificationPreference, CookieConsent
├─────────────────────────────────────────────┤
│  Support (2)                                │  SupportTicket, TicketMessage
├─────────────────────────────────────────────┤
│  Audit (1)                                  │  AuditLog
├─────────────────────────────────────────────┤
│  Platform (4)                               │  FeatureFlag, FeatureFlagOverride, StaticPage, SystemConfig
├─────────────────────────────────────────────┤
│  Cross-cutting infra (2)                    │  IdempotencyRecord, OutboxMessage
└─────────────────────────────────────────────┘
```

---

## 7. Money Handling

### 7.1 Storage

- All money fields: `Decimal @db.Decimal(20, 4)`.
- VND has no minor unit at DB layer.
- `Decimal(20, 4)` reserves space for future multi-currency (USD, EUR); the 4 decimals represent 1/10000 of a VND unit, safe precision.

### 7.2 Rounding

- **Never** round at storage.
- Rounding only at presentation layer (`formatVND` helper) using **banker's rounding**.
- Tax/total computations performed at full precision; rounding reported only once at checkout display.

### 7.3 Display

- VND example: `123,456,789 ₫`
- For Vietnamese users, no decimals; for USD/EUR (V2 multi-currency): two decimals.

---

## 8. Time & Time Zones

- All `DateTime` columns are `timestamptz(6)` (PostgreSQL type) → UTC stored.
- `DateTime` in Prisma always carries timezone info.
- Application is **Vietnam time (Asia/Ho_Chi_Minh, UTC+7)** but DB stores UTC.
- Display via `Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })`.

---

## 9. ID Strategy

- **MVP:** `cuid()` — collision-resistant, lexicographic, URL-safe.
- **V2 / Microservice:** Replace with **UUID v7** via `pgcrypto` (`gen_random_uuid()` won't be time-ordered; UUIDv7 generator in app).
- The schema design is **portable** — switching to UUIDv7 requires zero schema changes since `String @id` is already used.

---

## 10. Soft Delete Strategy (Summary)

| Aspect | Decision |
|---|---|
| Default | `deletedAt: DateTime?` on all business entities |
| Active rows | `WHERE deleted_at IS NULL` |
| Indexes | All soft-deletable models have `@@index([deletedAt])` to support partial scans |
| Unique constraints | Soft-deletable unique columns ship as a unique index **partial**: `CREATE UNIQUE INDEX … ON … (col) WHERE deleted_at IS NULL` (Prisma `@@unique` plus migration `WHERE deleted_at IS NULL`) |
| Hard delete | Only via scheduled purge after retention window (see `07_DATA_LIFECYCLE.md`) |
| Audit | Soft delete recorded in `audit_log`; never silently removed |

> See `08_SOFT_DELETE_STRATEGY.md` for details.

---

## 11. Cascade Rules Summary

| Pattern | Default | Rationale |
|---|---|---|
| User → Cart | `Cascade` | Cart belongs to user; lifetime tied |
| User → Order | `SetNull` | Order outlives user (legal records) |
| Cart → CartItem | `Cascade` | Items live and die with cart |
| Product → ProductVariant | `Cascade` | Variants are part of product |
| Product → Review | `Restrict` | Reviews remain after product (soft-archive) |
| Order → OrderItem | `Cascade` | Order line items owned by order |
| Order → OrderAddress | `Cascade` | Snapshot belongs to order |
| Order → Payment | `Restrict` | Don't delete payment with order |
| Order → Shipment | `Cascade` | One-to-one |
| Order → Refund | `Restrict` | Preserve refund history |
| ProductVariant → Inventory | `Cascade` | Inventory tied to variant |
| Coupon / Promotion deletions | `Restrict` | Prevent loss of usage history |

> Detailed cascade map in `05_CONSTRAINTS_AND_RULES.md`.

---

## 12. High-Traffic / Hot Path Tables

| Table | Read/Write Mix | Why Hot |
|---|---|---|
| `product` | Reads heavy | Storefront listing |
| `product_variant` | Reads heavy | Cart/checkout |
| `inventory` | Reads + writes | Stock checks every cart action |
| `cart` | Writes heavy | Frequent mutations |
| `order` | Writes for creation; reads after | Order placement critical path |
| `payment` | Mixed | Real-time during checkout |
| `shipping_rate` | Reads heavy | Quoting |
| `category` | Reads heavy | Navigation |

Indexes targeted at these (see `04_INDEXING_STRATEGY.md`).

---

## 13. Out of Scope for This Phase

| Not produced | Reason |
|---|---|
| Application code | This phase is design only |
| Seed data **content** (actual rows) | Listed in `15_SEED_DATA_DESIGN.md` for future implementation |
| Migrations | Created by `prisma migrate` in implementation phase |
| Test data fixtures | Implementation phase |
| Docker compose / Dockerfile | Architecture deployment phase |
| Operational runbooks | Implementation phase |

---

## 14. Approval

| Check | Status |
|---|---|
| Aligned with `docs/05-software-architecture/` module dependencies | ✅ |
| Aligned with `docs/04-api-design/` request/response shapes | ✅ |
| Idempotent payments modeled | ✅ via `Payment.idempotencyKey` UNIQUE + `WebhookEvent(provider, eventId)` UNIQUE |
| Order immutability post-payment modeled | ✅ via snapshot columns in OrderItem; `OrderStatusHistory` audit; future PG trigger |
| Inventory concurrency safety modeled | ✅ via `Inventory.available` + `StockReservation` |
| Cart expiry modeled | ✅ via `Cart.expiresAt` + `CheckoutSession.expiresAt` |
| Coupon usage limit enforced atomically | ✅ via `usageLimit` + `usageCount` columns; updates are transactional |
| Audit logs immutable | ✅ append-only model; DB role enforcement in V1.1 |
| Multi-role users (future seller) | ✅ extension path via `AdminUserRole` + future `SellerProfile` |
| Vietnamese market defaults | ✅ locale, VND, CITEXT, province codes |

---

## 15. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial database design overview |

---

**End of 02_DATABASE_DESIGN_OVERVIEW.md**

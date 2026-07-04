# 03 — Entity-Relationship Explanation

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04
**Author:** Principal Database Architect

---

## 1. Purpose

This document explains the **entity-relationship map** of the SmartLight database in human-readable form. Each bounded context is summarized with:

- Aggregate root(s)
- Key relationships (one-to-one, one-to-many, many-to-many)
- Cardinality notes
- Notes on cross-context references

For schema, see `01_PRISMA_SCHEMA.prisma`.

---

## 2. ER Notation

- `1..1` = one-to-one
- `1..N` = one-to-many
- `N..M` = many-to-many (with explicit junction table)
- `→` = reference (FK)

---

## 3. Identity & Authorization

### 3.1 Aggregate: User

```
User 1 ────── N Address
User 1 ────── N RefreshToken
User 1 ────── N UserSession
User 1 ────── 0..1 MfaSecret
User 1 ────── N Cart
User 1 ────── N Order (as customer)
User 1 ────── N Review
User 1 ────── N Return
User 1 ────── N SupportTicket (as customer)
User 1 ────── 1 NotificationPreference
```

### 3.2 Aggregate: AdminUser

```
AdminUser 1 ─── N AdminUserRole
AdminUser 1 ─── 0..1 MfaSecret
AdminUser 1 ─── N RefreshToken
AdminUser 1 ─── N UserSession
AdminUser 1 ─── N Address (optional)
AdminUser 1 ─── N ReviewReply (as author)
AdminUser 1 ─── N SupportTicket (as assignedAgent)
AdminUser 1 ─── N TicketMessage (as author)
```

### 3.3 RBAC

```
Role 1 ─────── N AdminUserRole N ──────── 1 AdminUser     (N:M)
Role 1 ─────── N RolePermission N ──────── 1 Permission  (N:M)
```

- Many admins ⇒ many roles; many roles ⇒ many permissions.
- `AdminUserRole` and `RolePermission` are the explicit junction tables (no implicit M:N in Prisma, per the design rule).

---

## 4. Catalog

### 4.1 Category Tree (Self-Referencing)

```
Category 1 ───── N Category (children via parentId)
Category 1 ───── N Product
Category 1 ───── 0..1 MediaFile (image banner)
```

- `path` is a materialized path `/1/22/47/` so descendant queries are O(1).
- Cannot delete category with children (`Restrict`).

### 4.2 Brand

```
Brand 1 ───── N Product
Brand 1 ───── 0..1 MediaFile (logo)
```

### 4.3 Product & Variant

```
Category 1 ──── N Product ─── 1..N ProductVariant ─── 1 Inventory
Brand 1 ─────── N Product
Product 1 ───── N ProductVariant
Product 1 ───── N ProductImage ─── 1 MediaFile
ProductVariant 1 ─ 0..N ProductImage
Product 1 ───── N ProductAttributeValue ──── 1 ProductAttribute
TaxRate 1 ───── N Product
```

### 4.4 Attributes

```
ProductAttribute 1 ──── N ProductAttributeValue
Product 1 ──── N ProductAttributeValue (associative)
```

- A product gets values for each attribute it uses.
- `@@unique([productId, attributeId])` makes the per-product assignment unique.

---

## 5. Inventory

### 5.1 Inventory per Variant

```
ProductVariant 1 ── 1 Inventory (per warehouse)
Inventory 1 ─────── N StockMovement (append-only)
Inventory 1 ─────── N InventoryAdjustment
```

- Each `ProductVariant` has exactly **one** `Inventory` row per `warehouseCode` (default "MAIN").
- `available` is derived (= on_hand − reserved) and is enforced via a Postgres `CHECK` + application-level atomic update.

### 5.2 Stock Reservation

```
Cart 1 ────────── N StockReservation ─── 1 ProductVariant
Order 1 ───────── N StockReservation ─── 1 ProductVariant
StockReservation 1 ─ 1 CartItem (line reservation)
```

- A reservation is held by cart (15 min default TTL).
- On order placement, reservation status → CONSUMED.
- TTL expiry worker sets status → EXPIRED and releases inventory.

### 5.3 Append-Only Movement

```
ProductVariant 1 ── N StockMovement (chronological)
User 0..1 ──────── N StockMovement (actor)
```

- `StockMovement` is **never** updated.
- Stock mutation always writes one movement row reflecting `onHandAfter`/`reservedAfter`.

---

## 6. Media

```
MediaFile 0..1 ─── N ProductImage
MediaFile 0..1 ─── N CategoryBanner       (Category.imageMedia)
MediaFile 0..1 ─── N BrandLogo           (Brand.logoMedia)
```

Polymorphic by `(ownerType, ownerId)` columns (used for orphan sweep + audit), not a hard FK.

---

## 7. Cart, Checkout, Orders

### 7.1 Cart

```
User 1 ────────── N Cart
Cart 1 ──────────── N CartItem
CartItem 1 ──────── 1 ProductVariant
CartItem 1 ──────── 0..1 StockReservation
Cart 0..1 ───────── N Coupon (currently applied)
```

- A cart may be tied to a `User` (logged in) **or** a `guestSessionId` (anonymous), never both enforced.
- `CartItem` snapshot data captured so abandoned carts remain readable.

### 7.2 Checkout & Order Creation

```
Cart 1 ───── N CheckoutSession
CheckoutSession 1 ──── 1 Cart
CheckoutSession 0..1 ── 1 Payment (intent)
CheckoutSession 0..1 ── 1 Shipment (intent)
```

When the checkout completes:

```
Cart → convertedOrderId (1..1)
CartItem ×N → OrderItem ×N (snapshot)
Cart.address → OrderAddress ×M
CartItem.reservation → consumed
New Order created
New OrderItem rows created
Order.userId = Cart.userId (or guest)
```

> All these operations are wrapped in **one Prisma `$transaction`** (see `06_TRANSACTION_DESIGN.md`).

### 7.3 Order Aggregate

```
Order 1 ──────── N OrderItem
Order 1 ──────── N OrderAddress
Order 1 ──────── N OrderStatusHistory (append-only)
Order 1 ──────── 0..1 Payment
Order 1 ──────── 0..1 Shipment
Order 1 ──────── N Refund
Order 1 ──────── N Return
OrderItem ───── 1 ProductVariant (NOT cascade — restrict)
```

- `OrderItem` carries **snapshots** (sku, name, price, tax) so order integrity survives product rename/delete.

---

## 8. Payment

### 8.1 Payment Aggregate

```
Order 1 ──── 0..1 Payment
Payment 1 ──── N PaymentTransaction (append-only)
Payment 1 ──── N Refund
```

### 8.2 Webhook Idempotency

```
WebhookEvent:
  unique (provider, eventId)   ← idempotency anchor
  composite index (status, receivedAt) ← processing scans
```

- A duplicate `(provider, eventId)` is detected and short-circuited (status `DUPLICATE`).
- The webhook archiver marks old rows `archivedAt` after 90 days.

### 8.3 Refund

```
Refund N ──── 1 Order
Refund N ──── 1 Payment
Refund N ──── 0..1 AdminUser (requester)
```

---

## 9. Shipping

### 9.1 Shipment Lifecycle

```
Order 1 ───── 0..1 Shipment
Shipment 1 ── N TrackingEvent (append-only)
Shipment N ── 1 ShippingRate (selected at checkout)
```

### 9.2 Shipping Config

```
ShippingZone 1 ── N ShippingRate
ShippingZone 1 ── N ShippingRate
ShippingRate N ── 1 ShippingZone
```

`ShippingRate` is the **selection table** at quote time. Province filtering via `zone.provinceCodes` (text[]).

---

## 10. Promotion & Tax

### 10.1 Promotion

```
Promotion 1 ─── N Coupon (codes attached)
Promotion 1 ─── N PromotionUsage
User 1 ──── N VoucherUsage
Order 1 ──── N VoucherUsage
```

### 10.2 Coupon Lifecycle

```
Coupon 1 ──── N VoucherUsage
Coupon (usageCount, usageLimit) — atomically updated
```

### 10.3 Tax

```
TaxRate 1 ──── N Product
TaxRate 1 ──── N OrderItem.taxRatePercent (snapshot)
TaxExemption N ─── 1 Category
```

- Tax rates have an `effectiveFrom` / `effectiveTo` window and an `isDefault` flag.
- Order items snapshot the rate at the moment of order creation.

---

## 11. Returns

```
Order 1 ──── N Return
Return 1 ──── N ReturnItem
ReturnItem 1 ── 1 OrderItem
ReturnItem 1 ── 1 ProductVariant
Return 1 ─── N ReturnInspection
ReturnItem 1 ─ 0..1 ReturnInspection
Return 1 ─── N Refund
```

`Return.rmaNumber` is the user-facing identifier; the ID is internal.

---

## 12. Reviews

```
Product 1 ───── N Review
Review 1 ── 0..1 ReviewReply
Review 1 ── N ReviewHelpfulVote
Review N ── 1 User
Review 0..N ── 1 AdminUser (moderator)
Review 0..1 ── 1 OrderItem (verified-purchase anchor)
```

- Only one review per (User, OrderItem) at the database layer is enforced via composite uniqueness in the design plan (see `05_CONSTRAINTS_AND_RULES.md` §5.3).

---

## 13. Notifications

```
EmailTemplate: unique (code, locale, version)
User 1 ──── 1 NotificationPreference
User 0..N ── N CookieConsent
NotificationLog: recipientUserId | recipientAdminId | recipientEmail
NotificationLog: index (status, createdAt) for delivery monitoring
```

`EmailTemplate` versions accumulate. The active combo (`code, locale, isActive=true`) is what renderers use.

---

## 14. Support

```
User 1 ───── N SupportTicket
SupportTicket 0..1 ── 1 AdminUser (assigned)
SupportTicket 1 ──── N TicketMessage
```

---

## 15. Audit

```
AuditLog:
  polymorphic actor: (actorUserId | actorAdminId)
  composite index (entityType, entityId, createdAt DESC)
  composite index (category, createdAt DESC)
```

`AuditLog` rows are never updated. The DB role in V1.1 will refuse UPDATE/DELETE.

---

## 16. Platform

```
AdminUser (updater) → FeatureFlag / StaticPage / SystemConfig
FeatureFlag 1 ── N FeatureFlagOverride
FeatureFlagOverride:
  targetType ∈ { USER, ADMIN_USER, SEGMENT, PERCENTAGE }
  unique (flagId, targetType, targetId)
```

---

## 17. Cross-Cutting Infra

### 17.1 Outbox

```
OutboxMessage:
  unique eventId (idempotency anchor)
  composite index (status, availableAt)
  composite index (aggregateType, aggregateId)
```

- A scheduling worker picks `PENDING` rows whose `availableAt <= now()`.
- On dispatch: `status='DISPATCHED'`, `dispatchedAt` set.

### 17.2 Idempotency

```
IdempotencyRecord:
  unique key (Idempotency-Key header)
  responseJson + responseStatus snapshot
  inFlight boolean — race detection
  expiresAt for cleanup
```

- Stops dual-charge on retry; first request wins if `inFlight=true`.

---

## 18. Relationship Cardinality Reference

| From | To | Cardinality | FK behavior |
|---|---|---|---|
| User | Cart | 1..N | ON DELETE CASCADE |
| Cart | CartItem | 1..N | ON DELETE CASCADE |
| Product | ProductVariant | 1..N | ON DELETE CASCADE |
| ProductVariant | Inventory | 1..1 | ON DELETE CASCADE |
| Order | OrderItem | 1..N | ON DELETE CASCADE |
| Order | OrderAddress | 1..N | ON DELETE CASCADE |
| Order | OrderStatusHistory | 1..N | ON DELETE CASCADE |
| Order | Payment | 1..0..1 | ON DELETE RESTRICT (preserved) |
| Order | Shipment | 1..0..1 | ON DELETE CASCADE |
| Order | Refund | 1..N | ON DELETE RESTRICT |
| Order | Return | 1..N | ON DELETE RESTRICT |
| Payment | PaymentTransaction | 1..N | ON DELETE CASCADE |
| Payment | Refund | 1..N | ON DELETE RESTRICT |
| Shipment | TrackingEvent | 1..N | ON DELETE CASCADE |
| Return | ReturnItem | 1..N | ON DELETE CASCADE |
| ReturnItem | ReturnInspection | 1..0..1 | ON DELETE CASCADE |
| Product | Review | 1..N | ON DELETE RESTRICT |
| Review | ReviewReply | 1..0..1 | ON DELETE CASCADE |
| Review | ReviewHelpfulVote | 1..N | ON DELETE CASCADE |
| SupportTicket | TicketMessage | 1..N | ON DELETE CASCADE |
| Role | AdminUserRole | 1..N | ON DELETE CASCADE |
| Role | RolePermission | 1..N | ON DELETE CASCADE |
| Permission | RolePermission | 1..N | ON DELETE CASCADE |
| Coupon | VoucherUsage | 1..N | ON DELETE RESTRICT |
| Promotion | PromotionUsage | 1..N | ON DELETE RESTRICT |

---

## 19. Logical ER Diagram (ASCII)

```
                              ┌────────────┐
                              │   User     │
                              └─────┬──────┘
                                    │
        ┌───────────────────┬──────┼───────────┬───────────────┐
        ▼                   ▼      ▼           ▼               ▼
   ┌────────┐         ┌────────┐ ┌─────┐  ┌───────────┐  ┌──────────┐
   │ Address│         │  Cart  │ │Order│  │  Review   │  │  Ticket  │
   └────────┘         └────┬───┘ └──┬──┘  └───────────┘  └─────┬────┘
                           │        │                          │
                       ┌───▼───┐ ┌───▼──────┐
                       │CartItem│ │OrderItem │───▶ ProductVariant ─▶ Product ─▶ Category
                       └───────┘ └──────────┘                            ─▶ Brand
                                        │
                                        ▼
                                   ┌────────┐  1..0..1  ┌────────────┐
                                   │ Payment│ ─────────▶│  Refund    │
                                   └────┬───┘            └────────────┘
                                        │
                                  ┌─────▼──────┐
                                  │ Shipment   │
                                  └─────┬──────┘
                                        │
                                  ┌─────▼────────┐
                                  │TrackingEvent │
                                  └──────────────┘
```

---

## 20. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial ER explanation |

---

**End of 03_ENTITY_RELATIONSHIP_EXPLANATION.md**

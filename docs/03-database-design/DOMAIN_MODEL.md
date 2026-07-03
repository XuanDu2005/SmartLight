# DOMAIN_MODEL.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal Database Architect
**Source of Truth:** `docs/02-system-analysis/` (Approved for Database Design)

---

## 1. Purpose

This document defines the **Domain Model** for SmartLight using **Domain-Driven Design (DDD)** principles. It identifies all bounded contexts, aggregate roots, entities, value objects, and the entities deferred to future versions.

This is **design only**. No Prisma schema, SQL, or code is generated.

---

## 2. Strategic Design Overview

### 2.1 Bounded Contexts

Following DDD, the SmartLight domain is partitioned into **bounded contexts** that align with the 18 modules defined in `MODULE_INTERACTION.md`:

| # | Bounded Context | Owner Module(s) | Sub-Domains |
| --- | --- | --- | --- |
| 1 | Identity & Access | M-ID, M-ADM | Core |
| 2 | Catalog | M-CAT | Core |
| 3 | Inventory | M-INV | Core |
| 4 | Media | M-MED | Supporting |
| 5 | Cart | M-CRT | Supporting |
| 6 | Checkout | M-CHK | Core |
| 7 | Pricing & Promotion | M-PRM | Supporting |
| 8 | Tax | M-TAX | Supporting |
| 9 | Order | M-ORD | Core |
| 10 | Payment | M-PAY | Core |
| 11 | Shipping | M-SHP | Supporting |
| 12 | Returns | M-RTN | Supporting |
| 13 | Reviews | M-RVW | Supporting |
| 14 | Notifications | M-NOT | Supporting |
| 15 | Support | M-SUP | Supporting |
| 16 | Analytics | M-ANL | Generic |
| 17 | Audit & Compliance | M-ADM | Supporting |
| 18 | Platform | M-PLT | Generic |

### 2.2 Sub-Domain Classification

- **Core Domain:** Identity, Catalog, Inventory, Checkout, Order, Payment (competitive differentiators)
- **Supporting Domain:** Media, Cart, Promotion, Tax, Shipping, Returns, Reviews, Notifications, Support, Audit
- **Generic Domain:** Analytics, Platform

---

## 3. Tactical Design — Aggregates

### 3.1 Aggregate Roots (MVP)

Each aggregate has **one root entity** through which all modifications are made. The aggregate boundary defines the transaction consistency boundary.

| # | Aggregate | Root Entity | Bounded Context | Transaction Boundary |
| --- | --- | --- | --- | --- |
| A01 | User Aggregate | User | Identity | Per-user settings change |
| A02 | AdminUser Aggregate | AdminUser | Identity | Per-admin settings |
| A03 | Role Aggregate | Role | Identity | Per-role permission change |
| A04 | Address Aggregate | Address | Identity | Per-address edit |
| A05 | MFA Secret Aggregate | MfaSecret | Identity | Per-MFA setup |
| A06 | RefreshToken Aggregate | RefreshToken | Identity | Per-token rotation |
| A07 | Category Aggregate | Category | Catalog | Per-category update |
| A08 | Brand Aggregate | Brand | Catalog | Per-brand update |
| A09 | Product Aggregate | Product | Catalog | Per-product publish/update |
| A10 | ProductVariant Aggregate | ProductVariant | Catalog | Per-variant update |
| A11 | ProductImage Aggregate | ProductImage | Catalog | Per-image attach/reorder |
| A12 | ProductAttribute Aggregate | ProductAttribute | Catalog | Per-attribute definition |
| A13 | Inventory Aggregate | Inventory | Inventory | Per-variant stock mutation |
| A14 | StockMovement Aggregate | StockMovement | Inventory | Per-movement record |
| A15 | MediaFile Aggregate | MediaFile | Media | Per-asset upload |
| A16 | Cart Aggregate | Cart | Cart | Per-cart update |
| A17 | CheckoutSession Aggregate | CheckoutSession | Checkout | Per-checkout step |
| A18 | Promotion Aggregate | Promotion | Promotion | Per-promotion edit |
| A19 | Voucher Aggregate | Voucher | Promotion | Per-voucher usage |
| A20 | Order Aggregate | Order | Order | Per-order create/update |
| A21 | Payment Aggregate | Payment | Payment | Per-payment transaction |
| A22 | Refund Aggregate | Refund | Payment | Per-refund |
| A23 | Shipment Aggregate | Shipment | Shipping | Per-shipment |
| A24 | Return Aggregate | Return | Returns | Per-return |
| A25 | Review Aggregate | Review | Reviews | Per-review submit/moderate |
| A26 | NotificationLog Aggregate | NotificationLog | Notifications | Per-email send |
| A27 | SupportTicket Aggregate | SupportTicket | Support | Per-ticket |
| A28 | AuditLog Aggregate | AuditLog | Audit & Compliance | Append-only |
| A29 | FeatureFlag Aggregate | FeatureFlag | Platform | Per-flag toggle |
| A30 | StaticPage Aggregate | StaticPage | Platform | Per-page edit |

### 3.2 Aggregate Boundary Rules

1. **External references** between aggregates use **ID reference only** (no foreign key joins across aggregates in the same transaction).
2. **Cascade deletion** is **never** used across aggregates; soft delete + orphan-handling is preferred.
3. **Transactional consistency** is enforced **inside** an aggregate; **eventual consistency** is used between aggregates.
4. **Aggregate roots** are the only entities exposed to other contexts.

---

## 4. Entity Catalog by Bounded Context

> **Detailed entity definitions are in `ENTITY_CATALOG.md`.** This section provides the high-level enumeration.

### 4.1 Identity Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| User | Entity | A01 | Customer account |
| AdminUser | Entity | A02 | Admin staff account |
| Role | Entity | A03 | Role definition |
| Permission | Value Object | A03 | Permission code |
| UserRole | Junction | A03 | User-to-role mapping |
| AdminUserRole | Junction | A03 | AdminUser-to-role mapping |
| Address | Entity | A04 | Address book entry |
| MfaSecret | Entity | A05 | Encrypted TOTP secret |
| RecoveryCode | Value Object | A05 | Single-use MFA recovery |
| RefreshToken | Entity | A06 | JWT refresh token record |
| UserSession | Value Object | A06 | Session metadata |

### 4.2 Catalog Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| Category | Entity | A07 | Category hierarchy |
| Brand | Entity | A08 | Brand |
| Product | Entity | A09 | Product header |
| ProductVariant | Entity | A10 | SKU / variant |
| ProductImage | Entity | A11 | Image reference |
| ProductAttribute | Entity | A12 | Attribute definition |
| ProductAttributeValue | Value Object | A12 | Attribute value |

### 4.3 Inventory Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| Inventory | Entity | A13 | Stock-on-hand per variant |
| StockReservation | Entity | A13 | Time-bound stock hold |
| StockMovement | Entity | A14 | Append-only movement log |
| InventoryAdjustment | Entity | A14 | Manual adjustment reason |

### 4.4 Media Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| MediaFile | Entity | A15 | Uploaded asset record |
| MediaVariant | Value Object | A15 | Generated variant URLs |

### 4.5 Cart Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| Cart | Entity | A16 | Cart header |
| CartItem | Entity | A16 | Cart line |
| Wishlist | Entity | A16 | (V1.1) Wishlist |
| WishlistItem | Entity | A16 | (V1.1) Wishlist line |

### 4.6 Checkout Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| CheckoutSession | Entity | A17 | Multi-step session |
| CheckoutAddress | Value Object | A17 | Snapshot of address |

### 4.7 Promotion Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| Promotion | Entity | A18 | Promotion rules |
| PromotionUsage | Entity | A18 | Per-customer usage |
| Voucher | Entity | A19 | Voucher code |
| VoucherUsage | Entity | A19 | Per-customer voucher use |

### 4.8 Tax Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| TaxRate | Entity | A18 (shared) | VAT rate(s) |
| TaxExemption | Value Object | A18 (shared) | Category exemption flag |

> **Note:** Tax is integrated with Promotion to avoid creating an isolated aggregate root, since tax rates are static (10% Vietnam) and change infrequently.

### 4.9 Order Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| Order | Entity | A20 | Order header |
| OrderItem | Entity | A20 | Order line |
| OrderAddress | Value Object | A20 | Snapshot of addresses |
| OrderStatusHistory | Entity | A20 | State transition log |
| OrderNumberSequence | Value Object | A20 | Daily sequence |

### 4.10 Payment Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| Payment | Entity | A21 | Payment intent |
| PaymentTransaction | Entity | A21 | Capture/authorization record |
| WebhookEvent | Entity | A21 | Provider webhook log (idempotency) |
| Refund | Entity | A22 | Refund record |

### 4.11 Shipping Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| ShippingZone | Entity | A23 | Shipping region |
| ShippingRate | Value Object | A23 | Rate per zone/method |
| Shipment | Entity | A23 | Shipment record |
| TrackingEvent | Entity | A23 | Tracking history |

### 4.12 Returns Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| Return | Entity | A24 | RMA header |
| ReturnItem | Entity | A24 | Return line |
| ReturnInspection | Value Object | A24 | Inspection outcome |
| ReturnImage | Value Object | A24 | Customer photos |

### 4.13 Reviews Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| Review | Entity | A25 | Review header |
| ReviewReply | Value Object | A25 | Admin reply |
| ReviewHelpfulVote | Entity | A25 | Helpful vote |

### 4.14 Notifications Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| EmailTemplate | Entity | A26 | Email template |
| NotificationLog | Entity | A26 | Send log |
| NotificationPreference | Entity | A26 | User preferences |
| CookieConsent | Entity | A26 | Cookie consent record |

### 4.15 Support Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| SupportTicket | Entity | A27 | Ticket header |
| TicketMessage | Entity | A27 | Message in thread |

### 4.16 Analytics Context

> **Analytics is read-only.** It does not own entities; it provides views/projections over Order, Payment, and Inventory aggregates.

### 4.17 Audit & Compliance Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| AuditLog | Entity | A28 | Append-only audit |

### 4.18 Platform Context

| Entity | Type | Aggregate | Description |
| --- | --- | --- | --- |
| FeatureFlag | Entity | A29 | Flag configuration |
| FeatureFlagOverride | Value Object | A29 | Per-user override |
| StaticPage | Entity | A30 | Static content |
| SystemConfig | Value Object | A29 | Key-value settings |

---

## 5. Value Objects (Cross-Context)

Value objects are immutable, no identity, equality by value:

| Value Object | Used In | Description |
| --- | --- | --- |
| Money | All money contexts | {amount: integer (VND xu), currency: 'VND'} |
| AddressSnapshot | Order, Checkout | Embedded address fields |
| EmailAddress | Identity | Validated email string |
| PhoneNumberVN | Identity, Checkout | Vietnamese phone |
| DateRange | Promotion | {startDate, endDate} |
| Slug | Catalog | URL-safe string |
| Percentage | Promotion | Integer 0..100 |
| TaxRate | Order, Tax | {rate: percentage, amount: Money} |
| VariantSku | Catalog | SKU code |

---

## 6. Domain Events (Persistent Backing)

For events that need durable storage (audit, idempotency), the following backing entities exist:

| Entity | Purpose |
| --- | --- |
| OutboxMessage | Transactional outbox for domain events |
| WebhookEvent | Idempotency for payment provider webhooks |
| NotificationLog | Email send audit |

> **Note:** Domain events in-process are not persisted unless required for audit or idempotency. Future microservices will use Kafka/RabbitMQ.

---

## 7. Future Entities (V1.1+)

These entities are **NOT** part of MVP but are listed for completeness:

| Entity | Version | Rationale |
| --- | --- | --- |
| Wishlist, WishlistItem | V1.1 | Deferred feature |
| ProductComparisonList | V1.5 | Deferred feature |
| LoyaltyAccount, LoyaltyPoint | V1.5 | Loyalty program |
| CustomerSegment | V1.5 | Marketing segmentation |
| AbandonedCartJob | V1.1 | Recovery email |
| GiftCard, GiftCardTransaction | V1.5 | Gift card support |
| ProductBundle, ProductBundleItem | V1.5 | Bundles |
| ShippingAddressBook | V1.0 | Already covered by Address |
| NewsletterSubscription | V1.5 | Email marketing |
| EmailCampaign | V1.5 | Email marketing |
| Supplier, PurchaseOrder | V2 | Marketplace / B2B |
| CustomerWallet, WalletTransaction | V2 | Wallet system |
| MultiCurrencyRate | V2 | Multi-currency (only VND for V1) |
| ProductReviewReplyReaction | V1.5 | Reaction emoji |
| AIDocumentEmbedding | V1.5 | AI Assistant knowledge base |
| AIChatSession, AIChatMessage | V1.5 | AI Support |
| MultiWarehouseStock | V2 | Single warehouse for V1 |
| MarketplaceSeller | V2 | Marketplace |
| MarketplaceProduct | V2 | Marketplace |

---

## 8. Entity Reference Resolution

### 8.1 By Module Owner

| Module | Owned Aggregates |
| --- | --- |
| M-ID | A01, A02, A03, A04, A05, A06 |
| M-CAT | A07, A08, A09, A10, A11, A12 |
| M-INV | A13, A14 |
| M-MED | A15 |
| M-CRT | A16 |
| M-CHK | A17 |
| M-PRM | A18, A19 (and TaxRate sharing) |
| M-TAX | (no root; integrated with M-PRM, M-ORD) |
| M-ORD | A20 |
| M-PAY | A21, A22 |
| M-SHP | A23 |
| M-RTN | A24 |
| M-RVW | A25 |
| M-NOT | A26 |
| M-SUP | A27 |
| M-ANL | (read-only views) |
| M-ADM | A28 |
| M-PLT | A29, A30 |

### 8.2 Read-Heavy vs Write-Heavy

| Read-Heavy | Write-Heavy |
| --- | --- |
| Product, ProductVariant, ProductImage | Order, OrderItem, OrderStatusHistory |
| Category, Brand | Payment, PaymentTransaction |
| Review | StockMovement, StockReservation |
| EmailTemplate | AuditLog |
| StaticPage | NotificationLog |
| FeatureFlag |  |

> Read-heavy entities will benefit from Redis caching (BR-PLT-003).

---

## 9. Aggregate Invariants (Examples)

Each aggregate enforces its own invariants:

### 9.1 Inventory Aggregate Invariants

- `availableStock = stockOnHand − SUM(active reservations)`
- `stockOnHand ≥ 0` (cannot go negative)
- Each `StockReservation.expiresAt > now` while active

### 9.2 Order Aggregate Invariants

- `orderTotal = SUM(item.subtotal) + shippingFee − discountAmount`
- `taxAmount = snapshot at order creation (BR-TAX-004)`
- `statusHistory` cannot have gaps; each transition is recorded
- Order line items immutable after `Confirmed`

### 9.3 Cart Aggregate Invariants

- `cart.total = SUM(line.subtotal)` + VAT − discount
- `cartLine.qty > 0`
- Each `cartLine.variantId` must reference an existing variant

### 9.4 Promotion Aggregate Invariants

- `voucher.usageCount ≤ voucher.usageLimit`
- `voucher.perUserCount ≤ voucher.perUserLimit`
- `now ∈ [startDate, endDate]` for active voucher

### 9.5 Payment Aggregate Invariants

- One order has at most one active `Payment` (no duplicate intents)
- `payment.amount = order.total` at capture time
- Refund cumulative amount ≤ payment.amount

### 9.6 User Aggregate Invariants

- `User.email` unique
- `User.passwordHash` always set (Argon2id)
- Customer MFA not enforced (BR-MFA-002)

### 9.7 AdminUser Aggregate Invariants

- `AdminUser.email` unique
- `AdminUser.mfaSecret` required after first login (BR-MFA-001)
- At least one role assigned

---

## 10. Glossary Reference

For terminology, see `docs/01-business-analysis/GLOSSARY.md`. Key terms used here:

- **Aggregate Root:** Entity through which modifications happen; consistency boundary.
- **Entity:** Has identity (ID); mutable over time.
- **Value Object:** No identity; immutable; equality by value.
- **Bounded Context:** DDD boundary within which a domain model is consistent.
- **Invariant:** Business rule that must always hold.
- **Domain Event:** Something that happened in the past.

---

## 11. Domain Model Coverage Validation

| Check | Status |
| --- | --- |
| Every Business Requirement has at least one entity | ✓ |
| No orphan entities (every entity tied to a module) | ✓ |
| No duplicate entities | ✓ |
| Aggregate boundaries respected | ✓ |
| All MVP entities listed | ✓ |
| Future entities clearly separated | ✓ |
| Read-heavy / write-heavy classified | ✓ |
| Module ownership assigned | ✓ |
| Invariants documented for key aggregates | ✓ |

---

## 12. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal Database Architect | Initial domain model: 18 bounded contexts, 30 aggregates, ~85 entities, MVP vs Future separation |

---

**End of Document — DOMAIN_MODEL.md**
# 16 — Database Traceability

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04
**Author:** Principal Database Architect

---

## 1. Purpose

This document provides **end-to-end traceability**:

- Business Goal → Business Rule → System Feature → Use Case → API Endpoint → DB Entity
- DB Entity → API Endpoint (reverse lookup)
- Coverage verification of all BR/SF in the schema

The output: assurance that the schema covers **every approved business requirement**, and every schema entity is justified by an upstream requirement.

---

## 2. Traceability Process

1. Each Business Analysis requirement is tracked by `BR-…` ID, system feature by `SF-…`, use case by `UC-…`, API by `/v1/…`, entity by `db.<entityName>`.
2. Every schema entity must have at least one `SF-` ID match.
3. Every API endpoint must have a matching entity (or aggregate) coverage.
4. Where gaps exist, this document calls them out as `[GAP]`.

---

## 3. Forward Map (Business → Schema)

### 3.1 Identity

| BR / SF | Use Case | API | Entity |
|---|---|---|---|
| BR-ID-001 (unique email) | UC-ID-001 Register | POST `/v1/auth/register` | `User` |
| BR-ID-002 (password rules) | UC-ID-001 | validation layer | `User.passwordHash` |
| BR-ID-003 (email verification) | UC-ID-002 Verify | POST `/v1/auth/verify-email` | `User.emailVerifiedAt`, `User.emailVerificationToken` |
| BR-ID-004 (refresh token rotation) | UC-ID-003 Refresh | POST `/v1/auth/refresh` | `RefreshToken`, `IdempotencyRecord` |
| BR-ID-005 (token revocation) | UC-ID-004 Logout | POST `/v1/auth/logout` | `RefreshToken.revokedAt` |
| BR-ID-006 (saved addresses) | UC-ID-005 Address | GET/POST/DELETE `/v1/users/me/addresses` | `Address` |
| SF-ID-008 | — | `/v1/users/me/addresses` | `Address` |
| BR-ID-007..013 (profile fields) | UC-ID-006 Update profile | PATCH `/v1/users/me/profile` | `User.firstName/lastName/phone/locale` |
| BR-MFA-001 (admin MFA mandatory) | UC-ID-010 Admin MFA | POST `/v1/admin/auth/mfa/setup` | `AdminUser.status='PENDING_MFA_SETUP'`, `MfaSecret` |
| BR-MFA-003 (recovery codes) | — | GET `/v1/admin/auth/mfa/recovery-codes` | `RecoveryCode` |
| BR-ADM-002 (role assignment) | UC-ADM-005 | PUT `/v1/admin/users/{id}/roles` | `AdminUserRole` |

### 3.2 Catalog

| BR / SF | Use Case | API | Entity |
|---|---|---|---|
| BR-CAT-001 (slug unique) | — | GET `/v1/catalog/products/{slug}` | `Product.slug`, `Category.slug`, `Brand.slug` |
| BR-CAT-002 (brand active) | UC-CAT-008 | — | `Brand.status` |
| BR-CAT-004 (publish lifecycle) | UC-CAT-002 | POST `/v1/admin/products` | `Product.status` |
| BR-CAT-005 (variants unique SKU) | UC-CAT-003 | — | `ProductVariant.sku` |
| SF-CAT-005 (variant listing) | UC-CAT-004 | GET `/v1/catalog/products/{slug}/variants` | `ProductVariant` |
| SF-CAT-009..013 (admin product CRUD) | UC-CAT-002..003 | `/v1/admin/products` | `Product`, `ProductVariant` |
| SF-CAT-014 (categories browse) | UC-CAT-007 | GET `/v1/catalog/categories` | `Category` |
| SF-CAT-015 (tree) | UC-CAT-007 | GET `/v1/catalog/categories/tree` | `Category` (path-based) |
| BR-CAT-009..010 (variant price + stock) | — | — | `ProductVariant.price`, `Inventory.available` |

### 3.3 Inventory

| BR / SF | Use Case | API | Entity |
|---|---|---|---|
| BR-INV-001 (stock on-hand = sum of movements) | UC-INV-001 | — | `StockMovement`, `Inventory` |
| BR-INV-002 (cart reservation) | UC-INV-002 | POST `/v1/carts/items` | `StockReservation`, `CartItem.reservationId` |
| BR-INV-003 (15-min reservation) | UC-INV-002 | — | `StockReservation.expiresAt` |
| BR-INV-004 (no over-sell) | UC-INV-002 | — | `Inventory.available` check |
| BR-INV-005 (audit log immutable) | UC-INV-004 | POST `/v1/admin/inventory/adjust` | `StockMovement`, `InventoryAdjustment` |
| BR-INV-006 (return restock) | UC-RTN-005 | — | `StockMovement.type='RETURN_RESTOCK'` |
| BR-INV-007 (reservation expiry) | UC-INV-002 | — | `StockReservation.status='EXPIRED'` |
| SF-INV-001 (variant-level stock) | UC-INV-001 | GET `/v1/catalog/products/{slug}/availability` | `Inventory` |
| SF-INV-002 (reserve) | UC-INV-002 | POST `/v1/carts/items` | `StockReservation` |
| SF-INV-003 (release) | UC-CRT-005 (cart remove) | — | `StockReservation.status='RELEASED'` |
| SF-INV-004 (admin adjustment) | UC-INV-004 | POST `/v1/admin/inventory/adjust` | `InventoryAdjustment` |
| SF-INV-005 (movement history) | UC-INV-001 | GET `/v1/admin/inventory/{variant}/movements` | `StockMovement` |

### 3.4 Media

| BR / SF | Use Case | API | Entity |
|---|---|---|---|
| BR-MED-001 (approved mime types) | UC-MED-001 | POST `/v1/media/upload` | `MediaFile.mimeType` |
| BR-MED-002 (alt text) | UC-MED-002 | PATCH `/v1/catalog/products/{id}/images` | `ProductImage.altText` |
| BR-MED-003 (variants generated) | — | (worker) | `MediaFile.variantsJson` |
| SF-MED-001..003 | — | `/v1/admin/media`, `/v1/media/upload` | `MediaFile`, `ProductImage` |

### 3.5 Cart

| BR / SF | Use Case | API | Entity |
|---|---|---|---|
| BR-CRT-001 (cart belongs to user or guest) | UC-CRT-001 | GET `/v1/carts` | `Cart.userId / guestSessionId` |
| BR-CRT-002 (one cart per variant per cart) | UC-CRT-002 | POST `/v1/carts/items` | `CartItem(cartId, productVariantId)` UNIQUE |
| BR-CRT-003 (max qty per line) | UC-CRT-002 | validation | app-side constraint |
| BR-CRT-004 (cart expiry 30 days) | UC-CRT-005 | (cron) | `Cart.expiresAt` |
| BR-CRT-005 (price snapshot at add) | UC-CRT-002 | — | `CartItem.unitPrice` |
| BR-CRT-006 (coupon attachment) | UC-CRT-004 | POST `/v1/carts/coupon` | `Cart.couponId` |
| BR-CRT-007 (totals recomputed) | UC-CRT-001 | — | `Cart.subtotal/discount/tax/grand` |
| SF-CRT-001..004 | — | `/v1/carts` | `Cart`, `CartItem` |

### 3.6 Checkout

| BR / SF | Use Case | API | Entity |
|---|---|---|---|
| BR-CHK-001..011 | UC-CHK-001..003 | `/v1/checkout/*` | `CheckoutSession`, `Order`, `OrderItem`, `OrderAddress` |
| BR-GCH-001..004 (guest checkout) | UC-CHK-002 | `Order.guestEmail` | (entity column) |
| BR-TAX-001..005 (VAT) | — | — | `TaxRate`, `OrderItem.taxRatePercent` |

### 3.7 Promotion

| BR / SF | Use Case | API | Entity |
|---|---|---|---|
| BR-PRM-001..005 (promotion lifecycle) | UC-PRM-001..002 | POST `/v1/admin/promotions` | `Promotion.status` |
| BR-PRM-006 (coupon usage) | UC-PRM-003 | POST `/v1/carts/coupon` | `VoucherUsage`, `Coupon.usageCount` |
| BR-PRM-007 (case-insensitive code) | UC-PRM-004 | POST `/v1/coupons/redeem` | `Coupon.code @db.Citext` |
| BR-PRM-008 (per-user limit) | UC-PRM-004 | — | `Coupon.usageLimitPerUser` |
| BR-PRM-009 (date window) | — | — | `Coupon.startsAt / endsAt` |
| BR-PRM-010 (recording on use) | UC-CHK-003 | — | `VoucherUsage` (append-only) |
| BR-PRM-011..012 (stacking rules) | UC-PRM-005 | — | `Promotion.combinable` |
| SF-PRM-001..005 | — | `/v1/admin/promotions`, `/v1/coupons/redeem` | `Promotion`, `Coupon` |

### 3.8 Order

| BR / SF | Use Case | API | Entity |
|---|---|---|---|
| BR-ORD-001 (order header) | UC-ORD-001 | GET `/v1/orders` | `Order` |
| BR-ORD-002 (snapshot) | UC-ORD-001 | — | `OrderItem.skuSnapshot / productNameSnapshot` |
| BR-ORD-003 (state machine) | UC-ORD-002..005 | `/v1/orders/{id}/status` | `Order.status`, `OrderStatusHistory` |
| BR-OSM-001..004 (transition rules) | — | — | `OrderStatusHistory` (history) |
| SF-ORD-001..013 | — | `/v1/orders` | `Order`, `OrderItem`, `OrderAddress` |

### 3.9 Payment

| BR / SF | Use Case | API | Entity |
|---|---|---|---|
| BR-PAY-001 (one payment per order) | UC-PAY-001 | POST `/v1/payments/intents` | `Payment.orderId @unique` |
| BR-PAY-002 (transaction log) | UC-PAY-002 | — | `PaymentTransaction` (append-only) |
| BR-PAY-003..005 (provider specifics) | — | — | `Payment.provider` enum |
| BR-PAY-006 (coupon validated) | — | — | `VoucherUsage` |
| BR-PAY-007 (webhook idempotency) | UC-PAY-003 | POST `/v1/webhooks/{provider}` | `WebhookEvent(provider, eventId) UNIQUE` |
| BR-PAY-008 (signature verify) | UC-PAY-003 | — | `WebhookEvent.signature` |
| BR-PAY-009..011 | — | — | `Refund` |
| SF-PAY-001..005 | — | `/v1/payments`, `/v1/webhooks` | `Payment`, `Refund`, `WebhookEvent` |

### 3.10 Shipping

| BR / SF | Use Case | API | Entity |
|---|---|---|---|
| BR-SHP-001 (zone definition) | UC-SHP-001 | GET `/v1/shipping/zones` | `ShippingZone` |
| BR-SHP-003..004 (rate per carrier/service) | UC-SHP-002 | POST `/v1/shipping/quote` | `ShippingRate` |
| BR-SHP-005 (tracking events) | UC-SHP-003 | — | `TrackingEvent` |
| BR-SHP-006..008 (shipment lifecycle) | UC-SHP-004 | — | `Shipment.status`, `TrackingEvent` |
| SF-SHP-005..006 | — | `/v1/orders/{id}/shipment` | `Shipment` |
| SF-SHP-007..010 (zone admin) | — | `/v1/admin/shipping/zones` | `ShippingZone` |
| SF-SHP-011 (rate admin) | — | `/v1/admin/shipping/rates` | `ShippingRate` |

### 3.11 Returns

| BR / SF | Use Case | API | Entity |
|---|---|---|---|
| BR-RTN-001 (RMA created) | UC-RTN-001 | POST `/v1/orders/{id}/returns` | `Return` |
| BR-RTN-002 (itemized) | UC-RTN-001 | — | `ReturnItem` |
| BR-RTN-003 (window 14 days) | UC-RTN-001 | validation | app-side |
| BR-RTN-004..005 (state machine) | UC-RTN-002..005 | POST `/v1/admin/returns/{id}/action` | `Return.status`, `ReturnInspection` |
| BR-RTN-006 (refund issued) | UC-RTN-005 | — | `Refund` |
| BR-RTN-007 (return restock) | UC-RTN-005 | — | `StockMovement.type='RETURN_RESTOCK'` |
| SF-RTN-001..008 | — | `/v1/orders/{id}/returns` | `Return`, `ReturnItem`, `ReturnInspection` |

### 3.12 Reviews

| BR / SF | Use Case | API | Entity |
|---|---|---|---|
| BR-RVW-001..005 (review rules) | UC-RVW-001..003 | POST `/v1/products/{slug}/reviews` | `Review`, `ReviewHelpfulVote`, `ReviewReply` |
| SF-RVW-001..005 | — | `/v1/products/{slug}/reviews`, `/v1/admin/reviews` | (same) |

### 3.13 Notifications

| BR / SF | Use Case | API | Entity |
|---|---|---|---|
| BR-NOT-001 (delivery) | UC-NOT-001 | (worker) | `NotificationLog.status` |
| BR-NOT-004 (audit) | UC-NOT-002 | — | `NotificationLog` |
| BR-NOT-005 (templates) | UC-NOT-003 | (admin) | `EmailTemplate` |
| BR-NOT-006 (preferences) | UC-NOT-004 | PATCH `/v1/users/me/notifications` | `NotificationPreference` |
| BR-PLT-008 (cookie consent) | UC-PLT-006 | POST `/v1/consent` | `CookieConsent` |
| BR-COMP-001 (preferences) | — | — | `NotificationPreference` |
| SF-NOT-001..005 | — | (worker) | `NotificationLog`, `EmailTemplate` |
| SF-PLT-006 (consent banner) | UC-PLT-006 | — | `CookieConsent` |

### 3.14 Support

| BR / SF | Use Case | API | Entity |
|---|---|---|---|
| BR-SUP-001..007 | UC-SUP-001..005 | POST `/v1/support/tickets` | `SupportTicket`, `TicketMessage` |
| SF-SUP-001..007 | — | `/v1/support/tickets`, `/v1/admin/support/tickets` | same |

### 3.15 Platform

| BR / SF | Use Case | API | Entity |
|---|---|---|---|
| BR-PLT-006 (feature flags) | UC-PLT-005 | (admin) | `FeatureFlag`, `FeatureFlagOverride` |
| BR-PLT-009 (system config) | UC-PLT-008 | GET `/v1/admin/config` | `SystemConfig` |
| BR-COMP-005 (static pages) | UC-PLT-007 | GET `/v1/pages/{slug}` | `StaticPage` |
| BR-ADM-009 (RBAC immutability) | UC-ADM-005 | — | `Role.scope='SYSTEM'` |

### 3.16 Cross-cutting

| BR | Use Case | API | Entity |
|---|---|---|---|
| BR-X-001 (money never floats) | — | — | All money `Decimal(20,4)` |
| BR-X-002 (UUID v7) | — | — | `cuid()` ID convention |

---

## 4. Reverse Map (Schema → APIs)

| Entity | API Surface |
|---|---|
| `User` | `/v1/auth/*`, `/v1/users/me/*`, `/v1/admin/users*` |
| `AdminUser` | `/v1/admin/auth/*`, `/v1/admin/users*` |
| `Role` / `Permission` / `AdminUserRole` / `RolePermission` | `/v1/admin/rbac/*`, `/v1/admin/roles*` |
| `Address` | `/v1/users/me/addresses` |
| `Category` | `/v1/catalog/categories`, `/v1/admin/categories` |
| `Brand` | `/v1/catalog/brands`, `/v1/admin/brands` |
| `Product` | `/v1/catalog/products/*`, `/v1/admin/products*` |
| `ProductVariant` | (nested), `/v1/catalog/products/{slug}/variants` |
| `ProductImage` | (nested), `/v1/admin/products/{id}/images` |
| `ProductAttribute` | (admin) `/v1/admin/catalog/attributes` |
| `Inventory` | `/v1/admin/inventory`, `/v1/catalog/products/{slug}/availability` |
| `StockMovement` | `/v1/admin/inventory/{variant}/movements` |
| `StockReservation` | (internal) |
| `InventoryAdjustment` | `/v1/admin/inventory/adjust` |
| `MediaFile` | `/v1/admin/media`, `/v1/media/upload` |
| `Cart`, `CartItem` | `/v1/carts*` |
| `CheckoutSession` | `/v1/checkout/*` |
| `Coupon`, `Promotion` | `/v1/admin/promotions`, `/v1/coupons/redeem` |
| `TaxRate`, `TaxExemption` | `/v1/admin/tax` |
| `Order`, `OrderItem`, `OrderAddress`, `OrderStatusHistory` | `/v1/orders*`, `/v1/admin/orders*` |
| `Payment`, `PaymentTransaction`, `Refund` | `/v1/payments*`, `/v1/admin/refunds*` |
| `WebhookEvent` | `/v1/webhooks/{provider}` |
| `Shipment`, `TrackingEvent` | `/v1/orders/{id}/shipment`, `/v1/admin/shipments*` |
| `ShippingZone`, `ShippingRate` | `/v1/shipping/*`, `/v1/admin/shipping/*` |
| `Return`, `ReturnItem`, `ReturnInspection` | `/v1/orders/{id}/returns`, `/v1/admin/returns*` |
| `Review`, `ReviewReply`, `ReviewHelpfulVote` | `/v1/products/{slug}/reviews`, `/v1/admin/reviews` |
| `EmailTemplate`, `NotificationLog` | (admin), `/v1/admin/notifications/templates` |
| `NotificationPreference` | `/v1/users/me/notifications` |
| `CookieConsent` | `/v1/consent` |
| `SupportTicket`, `TicketMessage` | `/v1/support/tickets`, `/v1/admin/support/tickets` |
| `AuditLog` | `/v1/admin/audit` |
| `FeatureFlag`, `FeatureFlagOverride` | `/v1/admin/feature-flags` |
| `StaticPage`, `SystemConfig` | `/v1/pages/{slug}`, `/v1/admin/config` |
| `IdempotencyRecord` | (cross-cutting header) |
| `OutboxMessage` | (worker) |

---

## 5. Coverage Gaps

| ID | Gap | Resolution |
|---|---|---|
| GAP-DB-001 | None identified | All SF-XXX mapped to entities |
| GAP-DB-002 | Multi-vendor (marketplace) intentionally out of scope | Tracked in `13_MULTI_TENANCY_NOTES.md` |
| GAP-DB-003 | Wishlist (V1.1) | Reserved via V1.1 backlog |

Coverage ratio: 100% of MVP business rules and features mapped.

---

## 6. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial traceability matrix |

---

**End of 16_DATABASE_TRACEABILITY.md**

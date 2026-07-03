# ENTITY_CATALOG.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal Database Architect

---

## 1. Purpose

This document catalogs **every MVP entity** in the SmartLight database. For each entity, it provides:

- Purpose
- Description
- Aggregate membership
- Owner module
- Lifecycle
- Related business rules
- Related system features
- Future migration notes

**No column definitions** (see `DATA_DICTIONARY.md` for that level).

---

## 2. Identity Context

### 2.1 User

| Field | Detail |
| --- | --- |
| **Purpose** | Represents a customer account on SmartLight |
| **Description** | Stores authentication credentials, profile, and verification state for end-user shoppers |
| **Aggregate** | A01 - User |
| **Owner Module** | M-ID |
| **Lifecycle** | Created on registration → verified → active → soft-deleted (GDPR) → purged |
| **Related Business Rules** | BR-ID-001..005, BR-ID-013, BR-MFA-002 |
| **Related Features** | SF-ID-001..005, SF-ID-007, SF-ID-009, SF-ID-010 |
| **Future Notes** | V2: loyalty points linkage; multi-currency wallet |

### 2.2 AdminUser

| Field | Detail |
| --- | --- |
| **Purpose** | Represents a staff/admin account |
| **Description** | Internal user with role-based access to admin portal |
| **Aggregate** | A02 - AdminUser |
| **Owner Module** | M-ID |
| **Lifecycle** | Created by Admin → MFA setup (mandatory) → active → suspended/disabled |
| **Related Business Rules** | BR-MFA-001, BR-ADM-001..003 |
| **Related Features** | SF-ID-011..014 |
| **Future Notes** | V2: SSO via OIDC |

### 2.3 Role

| Field | Detail |
| --- | --- |
| **Purpose** | Role definition for RBAC |
| **Description** | Named grouping of permissions |
| **Aggregate** | A03 - Role |
| **Owner Module** | M-ID (with M-ADM cooperation) |
| **Lifecycle** | System role (immutable) or custom role → active → retired |
| **Related Business Rules** | BR-ADM-009 |
| **Related Features** | SF-ID-013 |
| **Future Notes** | — |

### 2.4 Permission

| Field | Detail |
| --- | --- |
| **Purpose** | Atomic permission code |
| **Description** | Stable identifier like `catalog.product.update` |
| **Aggregate** | A03 - Role (value object) |
| **Owner Module** | M-ADM (system seed only) |
| **Lifecycle** | System-defined; immutable once shipped |
| **Related Business Rules** | BR-ADM-009 |
| **Related Features** | SF-ID-013 |
| **Future Notes** | — |

### 2.5 AdminUserRole

| Field | Detail |
| --- | --- |
| **Purpose** | Junction: AdminUser to Role |
| **Description** | Resolves M:N relationship between admin users and their roles |
| **Aggregate** | A03 - Role |
| **Owner Module** | M-ADM |
| **Lifecycle** | Created on assignment; revoked on un-assignment (soft) |
| **Related Business Rules** | BR-ADM-002 |
| **Related Features** | SF-ID-013 |
| **Future Notes** | — |

### 2.6 RolePermission

| Field | Detail |
| --- | --- |
| **Purpose** | Junction: Role to Permission |
| **Description** | Defines which permissions each role grants |
| **Aggregate** | A03 - Role |
| **Owner Module** | M-ADM |
| **Lifecycle** | Created at role definition; immutable post-shipping |
| **Related Business Rules** | BR-ADM-009 |
| **Related Features** | SF-ID-013 |
| **Future Notes** | — |

### 2.7 Address

| Field | Detail |
| --- | --- |
| **Purpose** | Saved address (Vietnamese format: province/district/ward/street) |
| **Description** | Owned by either User or AdminUser (polymorphic) |
| **Aggregate** | A04 - Address |
| **Owner Module** | M-ID |
| **Lifecycle** | Created → used at checkout → soft-deleted on remove |
| **Related Business Rules** | BR-ID-006 |
| **Related Features** | SF-ID-008 |
| **Future Notes** | — |

### 2.8 MfaSecret

| Field | Detail |
| --- | --- |
| **Purpose** | Encrypted TOTP secret + recovery codes |
| **Description** | One row per MFA-enabled account (AdminUser mandatory; User V1.5+) |
| **Aggregate** | A05 - MfaSecret |
| **Owner Module** | M-ID |
| **Lifecycle** | Created on MFA setup → active → replaced on reset |
| **Related Business Rules** | BR-MFA-001, BR-MFA-003, NFR-SEC-012 |
| **Related Features** | SF-ID-011 |
| **Future Notes** | V1.5: support customer MFA |

### 2.9 RecoveryCode

| Field | Detail |
| --- | --- |
| **Purpose** | Single-use MFA recovery code (8 issued per MFA setup) |
| **Description** | Hash of recovery code; one-time use |
| **Aggregate** | A05 - MfaSecret |
| **Owner Module** | M-ID |
| **Lifecycle** | Issued → used (one-time) |
| **Related Business Rules** | BR-MFA-003 |
| **Related Features** | SF-ID-011 |
| **Future Notes** | — |

### 2.10 RefreshToken

| Field | Detail |
| --- | --- |
| **Purpose** | JWT refresh token record |
| **Description** | Persisted for revocation; rotated on use |
| **Aggregate** | A06 - RefreshToken |
| **Owner Module** | M-ID |
| **Lifecycle** | Issued → rotated → revoked or expired |
| **Related Business Rules** | BR-ID-005, BR-SEC-011 |
| **Related Features** | SF-ID-005 |
| **Future Notes** | — |

### 2.11 UserSession

| Field | Detail |
| --- | --- |
| **Purpose** | Active session metadata (for "active sessions" UI) |
| **Description** | Tracks IP, user agent, last active time |
| **Aggregate** | A06 - RefreshToken (related) |
| **Owner Module** | M-ID |
| **Lifecycle** | Created on login → refreshed on activity → expires |
| **Related Business Rules** | BR-SEC-012 |
| **Related Features** | SF-ID-005 |
| **Future Notes** | — |

---

## 3. Catalog Context

### 3.1 Category

| Field | Detail |
| --- | --- |
| **Purpose** | Hierarchical product category |
| **Description** | Self-referencing tree (parent/child) |
| **Aggregate** | A07 - Category |
| **Owner Module** | M-CAT |
| **Lifecycle** | Draft → Active → Archived |
| **Related Business Rules** | BR-CAT-001, BR-TAX-003 |
| **Related Features** | SF-CAT-014, SF-CAT-015 |
| **Future Notes** | — |

### 3.2 Brand

| Field | Detail |
| --- | --- |
| **Purpose** | Product brand |
| **Description** | Manufacturer or brand name |
| **Aggregate** | A08 - Brand |
| **Owner Module** | M-CAT |
| **Lifecycle** | Active → Inactive |
| **Related Business Rules** | BR-CAT-002 |
| **Related Features** | SF-CAT-002 |
| **Future Notes** | — |

### 3.3 Product

| Field | Detail |
| --- | --- |
| **Purpose** | Product header (light variant) |
| **Description** | General info; pricing/variants separate |
| **Aggregate** | A09 - Product |
| **Owner Module** | M-CAT |
| **Lifecycle** | Draft → Published → Unpublished → Archived |
| **Related Business Rules** | BR-CAT-001, BR-CAT-004 |
| **Related Features** | SF-CAT-009..013 |
| **Future Notes** | V2: marketplace (multiple sellers per product) |

### 3.4 ProductVariant

| Field | Detail |
| --- | --- |
| **Purpose** | Sellable SKU / variant |
| **Description** | Each variant has its own price, stock, attributes |
| **Aggregate** | A10 - ProductVariant |
| **Owner Module** | M-CAT (inventory in M-INV) |
| **Lifecycle** | Active → Out-of-stock → Discontinued |
| **Related Business Rules** | BR-CAT-005, BR-CAT-009, BR-CAT-010, BR-INV-001 |
| **Related Features** | SF-CAT-005, SF-CAT-006, SF-INV-001 |
| **Future Notes** | — |

### 3.5 ProductImage

| Field | Detail |
| --- | --- |
| **Purpose** | Image attached to product (optionally variant) |
| **Description** | Reference to MediaFile with display order |
| **Aggregate** | A11 - ProductImage |
| **Owner Module** | M-CAT |
| **Lifecycle** | Attached → reordered → detached |
| **Related Business Rules** | BR-MED-002 |
| **Related Features** | SF-MED-001..003 |
| **Future Notes** | — |

### 3.6 ProductAttribute

| Field | Detail |
| --- | --- |
| **Purpose** | Attribute definition (Color, Wattage, Size) |
| **Description** | Catalog-wide attribute dictionary |
| **Aggregate** | A12 - ProductAttribute |
| **Owner Module** | M-CAT |
| **Lifecycle** | Active → Deprecated |
| **Related Business Rules** | BR-CAT-001 |
| **Related Features** | SF-CAT-014 |
| **Future Notes** | — |

### 3.7 ProductAttributeValue

| Field | Detail |
| --- | --- |
| **Purpose** | Attribute value assignment to product or variant |
| **Description** | Resolves M:N between products/variants and attributes |
| **Aggregate** | A12 - ProductAttribute |
| **Owner Module** | M-CAT |
| **Lifecycle** | Created on assign → removed on remove |
| **Related Business Rules** | BR-CAT-005 |
| **Related Features** | SF-CAT-014 |
| **Future Notes** | — |

---

## 4. Inventory Context

### 4.1 Inventory

| Field | Detail |
| --- | --- |
| **Purpose** | Stock-on-hand per variant |
| **Description** | 1:1 with ProductVariant; tracks `onHand`, `reserved` |
| **Aggregate** | A13 - Inventory |
| **Owner Module** | M-INV |
| **Lifecycle** | Created with variant → updated on each mutation |
| **Related Business Rules** | BR-INV-001, BR-INV-002, BR-INV-003, BR-INV-004, BR-INV-005 |
| **Related Features** | SF-INV-001..005 |
| **Future Notes** | V2: multi-warehouse |

### 4.2 StockReservation

| Field | Detail |
| --- | --- |
| **Purpose** | Time-bound hold for cart or order |
| **Description** | 15-min TTL for cart, expires on order |
| **Aggregate** | A13 - Inventory |
| **Owner Module** | M-INV |
| **Lifecycle** | Created → Active → Consumed or Released/Expired |
| **Related Business Rules** | BR-INV-002, BR-INV-003, BR-INV-007 |
| **Related Features** | SF-INV-002 |
| **Future Notes** | — |

### 4.3 StockMovement

| Field | Detail |
| --- | --- |
| **Purpose** | Append-only audit log of stock changes |
| **Description** | Records every mutation with reference (order, return, adjustment) |
| **Aggregate** | A14 - StockMovement |
| **Owner Module** | M-INV |
| **Lifecycle** | Append-only; never updated or deleted |
| **Related Business Rules** | BR-INV-001, BR-INV-005, BR-INV-006 |
| **Related Features** | SF-INV-001, SF-INV-005 |
| **Future Notes** | V2: partitioning by date |

### 4.4 InventoryAdjustment

| Field | Detail |
| --- | --- |
| **Purpose** | Manual stock adjustment with reason |
| **Description** | Catalog Manager action; audit logged |
| **Aggregate** | A14 - StockMovement |
| **Owner Module** | M-INV |
| **Lifecycle** | Created → applied to inventory |
| **Related Business Rules** | BR-INV-005 |
| **Related Features** | SF-INV-004 |
| **Future Notes** | — |

---

## 5. Media Context

### 5.1 MediaFile

| Field | Detail |
| --- | --- |
| **Purpose** | Uploaded asset record |
| **Description** | References Cloudinary asset ID + variant URLs |
| **Aggregate** | A15 - MediaFile |
| **Owner Module** | M-MED |
| **Lifecycle** | Uploaded → Variants generated → Linked to product → Removed |
| **Related Business Rules** | BR-MED-001, BR-MED-002, BR-MED-003 |
| **Related Features** | SF-MED-001, SF-MED-002 |
| **Future Notes** | V1.5: video support |

---

## 6. Cart Context

### 6.1 Cart

| Field | Detail |
| --- | --- |
| **Purpose** | Shopping cart |
| **Description** | Owned by User (registered) or guest session |
| **Aggregate** | A16 - Cart |
| **Owner Module** | M-CRT |
| **Lifecycle** | Active → Converted (to order) → Abandoned (TTL) → Soft-deleted |
| **Related Business Rules** | BR-CRT-001..007, BR-INV-002 |
| **Related Features** | SF-CRT-001..007 |
| **Future Notes** | V1.1: persistent guest carts across devices |

### 6.2 CartItem

| Field | Detail |
| --- | --- |
| **Purpose** | Line in cart |
| **Description** | Variant + quantity + reservation |
| **Aggregate** | A16 - Cart |
| **Owner Module** | M-CRT |
| **Lifecycle** | Added → Updated → Removed → Converted to Order |
| **Related Business Rules** | BR-CRT-002 |
| **Related Features** | SF-CRT-001..004 |
| **Future Notes** | — |

### 6.3 Wishlist, WishlistItem (V1.1)

| Field | Detail |
| --- | --- |
| **Purpose** | Saved items (deferred) |
| **Description** | Customer wishlist collection |
| **Aggregate** | A16 - Cart (extension) |
| **Owner Module** | M-CRT |
| **Lifecycle** | V1.1 |
| **Related Business Rules** | — |
| **Related Features** | SF-CRT-006 |
| **Future Notes** | V1.1 |

---

## 7. Checkout Context

### 7.1 CheckoutSession

| Field | Detail |
| --- | --- |
| **Purpose** | Multi-step checkout state |
| **Description** | 15-min TTL; idempotency key; holds final order preview |
| **Aggregate** | A17 - CheckoutSession |
| **Owner Module** | M-CHK |
| **Lifecycle** | Started → Step 1..N → Completed → Expired |
| **Related Business Rules** | BR-CHK-001..011, BR-GCH-001..004, BR-TAX-001..005 |
| **Related Features** | SF-CHK-001..012 |
| **Future Notes** | — |

---

## 8. Promotion Context

### 8.1 Promotion

| Field | Detail |
| --- | --- |
| **Purpose** | Promotion rules (percentage, fixed, flash sale) |
| **Description** | Eligibility, windows, usage limits |
| **Aggregate** | A18 - Promotion |
| **Owner Module** | M-PRM |
| **Lifecycle** | Draft → Scheduled → Active → Paused → Expired/Depleted/Cancelled |
| **Related Business Rules** | BR-PRM-001..012 |
| **Related Features** | SF-PRM-001..005 |
| **Future Notes** | — |

### 8.2 PromotionUsage

| Field | Detail |
| --- | --- |
| **Purpose** | Per-user per-order usage record |
| **Description** | Tracks discount amount applied per usage |
| **Aggregate** | A18 - Promotion |
| **Owner Module** | M-PRM |
| **Lifecycle** | Created on order confirmation |
| **Related Business Rules** | BR-PRM-006, BR-PRM-010 |
| **Related Features** | SF-PRM-005 |
| **Future Notes** | — |

### 8.3 Voucher

| Field | Detail |
| --- | --- |
| **Purpose** | Voucher code attached to a promotion |
| **Description** | Code, limits, valid window |
| **Aggregate** | A19 - Voucher |
| **Owner Module** | M-PRM |
| **Lifecycle** | Draft → Active → Paused → Expired/Depleted/Cancelled |
| **Related Business Rules** | BR-PRM-006, BR-PRM-007, BR-PRM-008, BR-PRM-009, BR-PRM-010 |
| **Related Features** | SF-PRM-005 |
| **Future Notes** | — |

### 8.4 VoucherUsage

| Field | Detail |
| --- | --- |
| **Purpose** | Per-user voucher redemption |
| **Description** | Tracks redemption and discount applied |
| **Aggregate** | A19 - Voucher |
| **Owner Module** | M-PRM |
| **Lifecycle** | Created on order confirmation |
| **Related Business Rules** | BR-PRM-006, BR-PRM-010 |
| **Related Features** | SF-PRM-005 |
| **Future Notes** | — |

### 8.5 TaxRate

| Field | Detail |
| --- | --- |
| **Purpose** | VAT rate(s) |
| **Description** | Vietnam standard 10%; future multi-rate support |
| **Aggregate** | A18 (shared with Promotion) |
| **Owner Module** | M-TAX |
| **Lifecycle** | Active → Replaced → Inactive |
| **Related Business Rules** | BR-TAX-001, BR-TAX-005 |
| **Related Features** | SF-TAX-001, SF-TAX-004 |
| **Future Notes** | V1.5: multi-rate (5%, 8%, 10%) |

### 8.6 TaxExemption

| Field | Detail |
| --- | --- |
| **Purpose** | Marks category as VAT-exempt |
| **Description** | Reason and audit trail |
| **Aggregate** | A18 (shared) |
| **Owner Module** | M-TAX |
| **Lifecycle** | Created → Active → Removed |
| **Related Business Rules** | BR-TAX-003 |
| **Related Features** | SF-TAX-003 |
| **Future Notes** | — |

---

## 9. Order Context

### 9.1 Order

| Field | Detail |
| --- | --- |
| **Purpose** | Customer order header |
| **Description** | One per checkout; state machine driven |
| **Aggregate** | A20 - Order |
| **Owner Module** | M-ORD |
| **Lifecycle** | Pending → Confirmed → Processing → Shipped → Delivered → Completed; or Cancelled/Returned |
| **Related Business Rules** | BR-ORD-001..003, BR-OSM-001..004 |
| **Related Features** | SF-ORD-001..013 |
| **Future Notes** | — |

### 9.2 OrderItem

| Field | Detail |
| --- | --- |
| **Purpose** | Line item in order |
| **Description** | Variant snapshot (price, name, tax) at order time |
| **Aggregate** | A20 - Order |
| **Owner Module** | M-ORD |
| **Lifecycle** | Created on order → immutable post-Confirmed |
| **Related Business Rules** | BR-ORD-002, BR-TAX-004 |
| **Related Features** | SF-ORD-001, SF-ORD-002 |
| **Future Notes** | — |

### 9.3 OrderAddress

| Field | Detail |
| --- | --- |
| **Purpose** | Shipping/billing address snapshot |
| **Description** | Copied at order creation; original Address may be edited/deleted |
| **Aggregate** | A20 - Order |
| **Owner Module** | M-ORD |
| **Lifecycle** | Created with order → immutable |
| **Related Business Rules** | BR-ORD-002 |
| **Related Features** | SF-ORD-001 |
| **Future Notes** | — |

### 9.4 OrderStatusHistory

| Field | Detail |
| --- | --- |
| **Purpose** | State transition audit |
| **Description** | Append-only; from → to with actor and metadata |
| **Aggregate** | A20 - Order |
| **Owner Module** | M-ORD |
| **Lifecycle** | Append-only; never deleted |
| **Related Business Rules** | BR-OSM-003 |
| **Related Features** | SF-ORD-003 |
| **Future Notes** | — |

---

## 10. Payment Context

### 10.1 Payment

| Field | Detail |
| --- | --- |
| **Purpose** | Payment intent / authorization |
| **Description** | One per order; tracks provider ID and status |
| **Aggregate** | A21 - Payment |
| **Owner Module** | M-PAY |
| **Lifecycle** | Pending → Authorized → Captured (or Failed/Cancelled); Refunded |
| **Related Business Rules** | BR-PAY-001..011 |
| **Related Features** | SF-PAY-001..005 |
| **Future Notes** | V1.5: multi-provider support |

### 10.2 PaymentTransaction

| Field | Detail |
| --- | --- |
| **Purpose** | Sub-events on a payment (authorize, capture, void) |
| **Description** | Append-only log per payment |
| **Aggregate** | A21 - Payment |
| **Owner Module** | M-PAY |
| **Lifecycle** | Append-only |
| **Related Business Rules** | BR-PAY-002, BR-PAY-007 |
| **Related Features** | SF-PAY-001 |
| **Future Notes** | — |

### 10.3 WebhookEvent

| Field | Detail |
| --- | --- |
| **Purpose** | Provider webhook idempotency |
| **Description** | Deduplication by eventId |
| **Aggregate** | A21 - Payment |
| **Owner Module** | M-PAY |
| **Lifecycle** | Received → Processed (or archived after 90 days) |
| **Related Business Rules** | BR-PAY-007, BR-PAY-008 |
| **Related Features** | SF-PAY-003 |
| **Future Notes** | — |

### 10.4 Refund

| Field | Detail |
| --- | --- |
| **Purpose** | Refund record |
| **Description** | Partial or full refund to original payment method |
| **Aggregate** | A22 - Refund |
| **Owner Module** | M-PAY |
| **Lifecycle** | Pending → Processed (or Failed) |
| **Related Business Rules** | BR-PAY-009, BR-RTN-006, BR-RTN-007 |
| **Related Features** | SF-PAY-004 |
| **Future Notes** | — |

---

## 11. Shipping Context

### 11.1 ShippingZone

| Field | Detail |
| --- | --- |
| **Purpose** | Shipping region definition |
| **Description** | Vietnam provinces/districts |
| **Aggregate** | A23 - Shipment |
| **Owner Module** | M-SHP |
| **Lifecycle** | Active → Inactive |
| **Related Business Rules** | BR-SHP-001..005 |
| **Related Features** | SF-SHP-001, SF-SHP-007..010 |
| **Future Notes** | — |

### 11.2 ShippingRate

| Field | Detail |
| --- | --- |
| **Purpose** | Per-zone rate table |
| **Description** | Carrier + service + fee calculation |
| **Aggregate** | A23 - Shipment |
| **Owner Module** | M-SHP |
| **Lifecycle** | Active → Replaced |
| **Related Business Rules** | BR-SHP-003, BR-SHP-004 |
| **Related Features** | SF-SHP-001 |
| **Future Notes** | — |

### 11.3 Shipment

| Field | Detail |
| --- | --- |
| **Purpose** | Per-order shipment record |
| **Description** | Carrier, tracking number, label |
| **Aggregate** | A23 - Shipment |
| **Owner Module** | M-SHP |
| **Lifecycle** | Created → Dispatched → InTransit → Delivered (or Lost/Returned) |
| **Related Business Rules** | BR-SHP-006, BR-SHP-007, BR-SHP-008 |
| **Related Features** | SF-SHP-005, SF-SHP-006, SF-SHP-011 |
| **Future Notes** | — |

### 11.4 TrackingEvent

| Field | Detail |
| --- | --- |
| **Purpose** | Per-shipment tracking history |
| **Description** | Status + location + timestamp |
| **Aggregate** | A23 - Shipment |
| **Owner Module** | M-SHP |
| **Lifecycle** | Append-only |
| **Related Business Rules** | BR-SHP-005 |
| **Related Features** | SF-SHP-006 |
| **Future Notes** | — |

---

## 12. Returns Context

### 12.1 Return

| Field | Detail |
| --- | --- |
| **Purpose** | RMA (Return Merchandise Authorization) header |
| **Description** | Customer return request; status state machine |
| **Aggregate** | A24 - Return |
| **Owner Module** | M-RTN |
| **Lifecycle** | Pending → Approved/Rejected → Received → Inspecting → Inspected → Refunded |
| **Related Business Rules** | BR-RTN-001..007, BR-INV-006 |
| **Related Features** | SF-RTN-001..008 |
| **Future Notes** | — |

### 12.2 ReturnItem

| Field | Detail |
| --- | --- |
| **Purpose** | Line item in return |
| **Description** | Original OrderItem + quantity + reason |
| **Aggregate** | A24 - Return |
| **Owner Module** | M-RTN |
| **Lifecycle** | Created with return → inspected → restocked/disposed |
| **Related Business Rules** | BR-RTN-002, BR-INV-006 |
| **Related Features** | SF-RTN-003, SF-INV-005 |
| **Future Notes** | — |

### 12.3 ReturnInspection

| Field | Detail |
| --- | --- |
| **Purpose** | Inspection outcome record |
| **Description** | PASS (restock) or FAIL (dispose) per item |
| **Aggregate** | A24 - Return |
| **Owner Module** | M-RTN |
| **Lifecycle** | Created on inspection → drives stock update |
| **Related Business Rules** | BR-INV-006 |
| **Related Features** | SF-RTN-005 |
| **Future Notes** | — |

---

## 13. Reviews Context

### 13.1 Review

| Field | Detail |
| --- | --- |
| **Purpose** | Customer review on product |
| **Description** | Rating + content; verified purchase only |
| **Aggregate** | A25 - Review |
| **Owner Module** | M-RVW |
| **Lifecycle** | Pending → Published/Rejected |
| **Related Business Rules** | BR-RVW-001..005 |
| **Related Features** | SF-RVW-001..005 |
| **Future Notes** | V1.5: photo reviews |

### 13.2 ReviewReply

| Field | Detail |
| --- | --- |
| **Purpose** | Admin reply to review |
| **Description** | One optional reply per review |
| **Aggregate** | A25 - Review |
| **Owner Module** | M-RVW |
| **Lifecycle** | Created → soft-deleted (not physically removed) |
| **Related Business Rules** | BR-RVW-005 |
| **Related Features** | SF-RVW-005 |
| **Future Notes** | — |

### 13.3 ReviewHelpfulVote

| Field | Detail |
| --- | --- |
| **Purpose** | Per-customer "helpful" vote |
| **Description** | Unique per (review, customer) |
| **Aggregate** | A25 - Review |
| **Owner Module** | M-RVW |
| **Lifecycle** | Added → Removed |
| **Related Business Rules** | BR-RVW-004 |
| **Related Features** | SF-RVW-004 |
| **Future Notes** | — |

---

## 14. Notifications Context

### 14.1 EmailTemplate

| Field | Detail |
| --- | --- |
| **Purpose** | Email template |
| **Description** | Versioned Vietnamese templates |
| **Aggregate** | A26 - NotificationLog |
| **Owner Module** | M-NOT |
| **Lifecycle** | Draft → Active → Deprecated |
| **Related Business Rules** | BR-NOT-005 |
| **Related Features** | SF-NOT-004 |
| **Future Notes** | V1.5: multi-locale templates |

### 14.2 NotificationLog

| Field | Detail |
| --- | --- |
| **Purpose** | Email send audit |
| **Description** | Delivery status, attempts, errors |
| **Aggregate** | A26 - NotificationLog |
| **Owner Module** | M-NOT |
| **Lifecycle** | Queued → Sent (or Failed) → Archived after 1 year |
| **Related Business Rules** | BR-NOT-001, BR-NOT-004 |
| **Related Features** | SF-NOT-001, SF-NOT-003 |
| **Future Notes** | V2: partition by month |

### 14.3 NotificationPreference

| Field | Detail |
| --- | --- |
| **Purpose** | Per-user notification opt-in/out |
| **Description** | Owned by User or AdminUser |
| **Aggregate** | A26 - NotificationLog |
| **Owner Module** | M-NOT |
| **Lifecycle** | Created on register → updated by user |
| **Related Business Rules** | BR-NOT-006, BR-COMP-001 |
| **Related Features** | SF-NOT-005 |
| **Future Notes** | — |

### 14.4 CookieConsent

| Field | Detail |
| --- | --- |
| **Purpose** | Cookie consent record (PDPD) |
| **Description** | Per visitor; tracks consent flags |
| **Aggregate** | A26 - NotificationLog |
| **Owner Module** | M-PLT |
| **Lifecycle** | Created on first visit → updated on revisit |
| **Related Business Rules** | BR-PLT-008, BR-COMP-001 |
| **Related Features** | SF-PLT-006 |
| **Future Notes** | — |

---

## 15. Support Context

### 15.1 SupportTicket

| Field | Detail |
| --- | --- |
| **Purpose** | Support ticket header |
| **Description** | Customer support request |
| **Aggregate** | A27 - SupportTicket |
| **Owner Module** | M-SUP |
| **Lifecycle** | Open → Pending → Resolved → Closed |
| **Related Business Rules** | BR-SUP-001..007 |
| **Related Features** | SF-SUP-001..007 |
| **Future Notes** | — |

### 15.2 TicketMessage

| Field | Detail |
| --- | --- |
| **Purpose** | Message in ticket thread |
| **Description** | Customer or staff reply |
| **Aggregate** | A27 - SupportTicket |
| **Owner Module** | M-SUP |
| **Lifecycle** | Created → immutable |
| **Related Business Rules** | BR-SUP-004 |
| **Related Features** | SF-SUP-003 |
| **Future Notes** | — |

---

## 16. Audit Context

### 16.1 AuditLog

| Field | Detail |
| --- | --- |
| **Purpose** | Sensitive action audit |
| **Description** | Append-only; polymorphic actor |
| **Aggregate** | A28 - AuditLog |
| **Owner Module** | M-ADM |
| **Lifecycle** | Created on action → immutable; 7-year retention |
| **Related Business Rules** | BR-ADM-002, BR-SEC-007 |
| **Related Features** | SF-ADM-009 |
| **Future Notes** | V2: streaming to SIEM |

---

## 17. Platform Context

### 17.1 FeatureFlag

| Field | Detail |
| --- | --- |
| **Purpose** | Feature toggle |
| **Description** | System-wide flag with optional per-target override |
| **Aggregate** | A29 - FeatureFlag |
| **Owner Module** | M-PLT |
| **Lifecycle** | Created → Active → Inactive |
| **Related Business Rules** | BR-PLT-006 |
| **Related Features** | SF-PLT-005 |
| **Future Notes** | — |

### 17.2 FeatureFlagOverride

| Field | Detail |
| --- | --- |
| **Purpose** | Per-user/segment flag override |
| **Description** | Optional layered override |
| **Aggregate** | A29 - FeatureFlag |
| **Owner Module** | M-PLT |
| **Lifecycle** | Created → Expires |
| **Related Business Rules** | BR-PLT-006 |
| **Related Features** | SF-PLT-005 |
| **Future Notes** | — |

### 17.3 StaticPage

| Field | Detail |
| --- | --- |
| **Purpose** | Static content (about, terms, FAQ) |
| **Description** | Markdown/HTML content |
| **Aggregate** | A30 - StaticPage |
| **Owner Module** | M-PLT |
| **Lifecycle** | Draft → Published → Unpublished |
| **Related Business Rules** | BR-COMP-005 |
| **Related Features** | SF-PLT-007 |
| **Future Notes** | — |

### 17.4 SystemConfig

| Field | Detail |
| --- | --- |
| **Purpose** | Key-value system settings |
| **Description** | Runtime configuration |
| **Aggregate** | A29 - FeatureFlag |
| **Owner Module** | M-PLT |
| **Lifecycle** | Created → Updated |
| **Related Business Rules** | BR-PLT-009 |
| **Related Features** | SF-PLT-008 |
| **Future Notes** | — |

---

## 18. Entity Counts by Context

| Bounded Context | Entity Count |
| --- | --- |
| Identity | 11 |
| Catalog | 7 |
| Inventory | 4 |
| Media | 1 |
| Cart | 4 (incl. Wishlist V1.1) |
| Checkout | 1 |
| Promotion & Tax | 6 |
| Order | 4 |
| Payment | 4 |
| Shipping | 4 |
| Returns | 4 (incl. ReturnImage) |
| Reviews | 3 |
| Notifications | 4 |
| Support | 2 |
| Audit | 1 |
| Platform | 4 |
| **Total MVP** | **64** |

---

## 19. Future Entities (V1.1+) — Listed but Not in MVP Build

See `DOMAIN_MODEL.md` §7 for the full list of 21 future entities (Wishlist, Loyalty, GiftCard, etc.).

---

## 20. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal Database Architect | Initial entity catalog: 64 MVP entities across 16 bounded contexts |

---

**End of Document — ENTITY_CATALOG.md**
# DATA_DICTIONARY.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal Database Architect

---

## 1. Purpose

This document is the **business-level data dictionary** for SmartLight. For every entity it lists:

- Business meaning of each attribute
- Data owner
- Confidentiality classification
- Retention policy
- Validation notes

**No SQL types or column names yet** — those will be defined when the Prisma schema is generated in a later phase.

---

## 2. Confidentiality Classification

| Class | Description | Examples |
| --- | --- | --- |
| **PUBLIC** | Publicly shareable | Product name, price, description |
| **INTERNAL** | Internal use only; not for customers | Internal notes, system configs |
| **CONFIDENTIAL** | Personal data; PCI scope; PII | Email, phone, address, password hashes |
| **RESTRICTED** | Highly sensitive; encrypted at rest | MFA secrets, refund bank details (future) |

---

## 3. Identity Entities

### 3.1 User

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Identifier | Unique user ID (UUID) | INTERNAL | Until purge + 30 days | Non-null |
| Email | Login email | CONFIDENTIAL | Until purge + 30 days | Unique; RFC 5322 |
| Password Hash | Argon2id hash | RESTRICTED | Until purge | Argon2id encoded |
| First Name | First name (Vietnamese diacritics) | CONFIDENTIAL | Until purge | Max 100 chars |
| Last Name | Last name | CONFIDENTIAL | Until purge | Max 100 chars |
| Phone | Vietnamese mobile | CONFIDENTIAL | Until purge | +84 prefix; 10 digits |
| Locale | UI language | INTERNAL | Until purge | Default vi-VN |
| Status | Account status | INTERNAL | Until purge | Active/Suspended/Closed |
| Email Verified Timestamp | When email was verified | INTERNAL | Until purge | Nullable |
| Email Verification Token | Pending verification token | CONFIDENTIAL | Until verified or 24h | Random; expires 24h |
| Created/Updated/Deleted Timestamps | Audit | INTERNAL | Permanent | UTC ISO 8601 |

### 3.2 AdminUser

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Identifier | Unique admin ID | INTERNAL | Until purge | Non-null |
| Email | Login email | CONFIDENTIAL | Until purge | Unique |
| Password Hash | Argon2id hash | RESTRICTED | Until purge | Argon2id |
| Display Name | Name shown in UI | INTERNAL | Until purge | Max 100 |
| Status | Active/Suspended | INTERNAL | Until purge | Non-null |
| Last Login Timestamp | Audit | INTERNAL | Until purge | Nullable |

### 3.3 Role, Permission, AdminUserRole, RolePermission

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Role Name | e.g., "Admin", "Catalog Manager" | INTERNAL | Permanent | Unique; max 50 |
| Permission Code | e.g., "catalog.product.update" | INTERNAL | Permanent | Unique; max 100 |
| Assigned By | Admin who assigned | INTERNAL | Permanent | Reference |
| Assigned At | Assignment timestamp | INTERNAL | Permanent | UTC |

### 3.4 Address

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Owner Type | User or AdminUser | INTERNAL | Until delete | Enum |
| Owner ID | FK | CONFIDENTIAL | Until delete | Non-null |
| Full Name | Recipient name | CONFIDENTIAL | Until delete | Max 100 |
| Phone | Recipient phone | CONFIDENTIAL | Until delete | +84 format |
| Province | Vietnamese province | INTERNAL | Until delete | Required |
| District | District | INTERNAL | Until delete | Required |
| Ward | Ward | INTERNAL | Until delete | Required |
| Street | Street address | CONFIDENTIAL | Until delete | Max 255 |
| Default | Is default? | INTERNAL | Until delete | Boolean |

### 3.5 MfaSecret, RecoveryCode

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Owner Type | User or AdminUser | INTERNAL | Until delete | Enum |
| Owner ID | FK | CONFIDENTIAL | Until delete | Non-null |
| Secret (encrypted) | TOTP base32 secret | RESTRICTED | Until MFA removed | AES-256-GCM encrypted |
| Enabled | Is MFA active | INTERNAL | Until delete | Boolean |
| Failed Attempts | Counter for backoff | INTERNAL | Until delete | Int |
| Last Used At | Last successful auth | INTERNAL | Until delete | Nullable |
| Recovery Code Hash | SHA-256 of one-time code | RESTRICTED | Until used or MFA removed | One-time use |

### 3.6 RefreshToken

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Owner Type | User or AdminUser | INTERNAL | Until delete | Enum |
| Owner ID | FK | CONFIDENTIAL | Until delete | Non-null |
| Token Hash | SHA-256 of token | CONFIDENTIAL | Until revoke | Unique |
| User Agent | Browser/client | INTERNAL | Until revoke | Max 500 |
| IP Address | Client IP | INTERNAL | Until revoke | IPv4/IPv6 |
| Expires At | TTL | INTERNAL | Until revoke | Future timestamp |
| Revoked At | When revoked | INTERNAL | Permanent | Nullable |

---

## 4. Catalog Entities

### 4.1 Category

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Identifier | Unique ID | INTERNAL | Permanent | UUID |
| Parent ID | Parent category (null = root) | INTERNAL | Permanent | Nullable FK |
| Name | Display name (Vietnamese) | PUBLIC | Permanent | Max 100 |
| Slug | URL slug | PUBLIC | Permanent | URL-safe; unique |
| Description | Optional description | PUBLIC | Permanent | Text |
| Display Order | Sort order | INTERNAL | Permanent | Int |
| Active | Visible? | INTERNAL | Permanent | Boolean |
| Tax Exempt | VAT-exempt flag | INTERNAL | Permanent | Boolean |

### 4.2 Brand

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Name | Brand name | PUBLIC | Permanent | Max 100 |
| Slug | URL slug | PUBLIC | Permanent | Unique |
| Description | Description | PUBLIC | Permanent | Text |
| Logo | Reference to media | PUBLIC | Permanent | FK |
| Active | Visible? | INTERNAL | Permanent | Boolean |

### 4.3 Product

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Identifier | Unique product ID | INTERNAL | Permanent | UUID |
| Category | FK | PUBLIC | Permanent | Required |
| Brand | FK | PUBLIC | Permanent | Required |
| Name | Vietnamese name | PUBLIC | Permanent | Max 255 |
| Slug | URL slug | PUBLIC | Permanent | Unique |
| Short Description | Brief | PUBLIC | Permanent | Max 500 |
| Description | Full HTML/Markdown | PUBLIC | Permanent | Long text |
| Status | Draft/Published/Unpublished | INTERNAL | Permanent | Enum |
| Base Price | Default variant price (if no variants) | PUBLIC | Permanent | Money ≥ 0 |
| Currency | Always VND | PUBLIC | Permanent | "VND" |
| Weight | Default weight (kg) | INTERNAL | Permanent | Decimal ≥ 0 |
| Has Variants | Boolean | INTERNAL | Permanent | — |
| Published At | First publish time | INTERNAL | Permanent | Nullable |

### 4.4 ProductVariant

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Identifier | Variant ID | INTERNAL | Permanent | UUID |
| Product | FK | INTERNAL | Permanent | Required |
| SKU | Stock Keeping Unit | INTERNAL | Permanent | Unique; max 50 |
| Barcode | Optional barcode | INTERNAL | Permanent | Max 50 |
| Price | Selling price | PUBLIC | Permanent | Money ≥ 0 |
| Compare At Price | Strikethrough price | PUBLIC | Permanent | Money ≥ 0; ≥ price |
| Cost Price | Cost (internal) | CONFIDENTIAL | Permanent | Money ≥ 0 |
| Weight | Variant weight | INTERNAL | Permanent | Decimal ≥ 0 |
| Low Stock Threshold | Alert level | INTERNAL | Permanent | Int ≥ 0 |
| Active | Visible? | INTERNAL | Permanent | Boolean |
| Display Order | Sort order | INTERNAL | Permanent | Int |

### 4.5 ProductImage

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Product | FK | INTERNAL | Permanent | Required |
| Variant | FK (optional) | INTERNAL | Permanent | Nullable |
| Media File | FK | PUBLIC | Permanent | Required |
| Alt Text | Accessibility | PUBLIC | Permanent | Max 255 |
| Display Order | Sort | INTERNAL | Permanent | Int |
| Primary | Main image flag | INTERNAL | Permanent | Boolean |

### 4.6 ProductAttribute, ProductAttributeValue

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Name | e.g., "color" | PUBLIC | Permanent | Unique; max 50 |
| Display Name | e.g., "Màu sắc" | PUBLIC | Permanent | Max 100 |
| Type | text/number/boolean | INTERNAL | Permanent | Enum |
| Filterable | Use in filters | INTERNAL | Permanent | Boolean |
| Required | Required for product | INTERNAL | Permanent | Boolean |
| Value | Text or numeric | PUBLIC | Permanent | String or decimal |

---

## 5. Inventory Entities

### 5.1 Inventory

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Variant | FK (1:1) | INTERNAL | Permanent | Unique |
| Stock On Hand | Physical stock | CONFIDENTIAL | Permanent | Int ≥ 0 |
| Stock Reserved | Active reservation total | CONFIDENTIAL | Permanent | Int ≥ 0 |
| Low Stock Threshold | Override of variant threshold | INTERNAL | Permanent | Int ≥ 0 |
| Last Counted At | Last physical count | INTERNAL | Permanent | Nullable |

### 5.2 StockReservation

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Variant | FK | INTERNAL | 30 days post-release | Required |
| Cart | FK (optional) | INTERNAL | 30 days | Nullable |
| Order | FK (optional) | INTERNAL | 30 days | Nullable |
| Quantity | Held quantity | INTERNAL | 30 days | Int > 0 |
| Status | Active/Consumed/Released | INTERNAL | 30 days | Enum |
| Expires At | 15-min TTL | INTERNAL | 30 days | Future timestamp |
| Created At | Creation time | INTERNAL | 30 days | UTC |
| Released At | When released/consumed | INTERNAL | 30 days | Nullable |

### 5.3 StockMovement

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Variant | FK | INTERNAL | 7 years | Required |
| Type | Order/Sale/Return/Adjustment | INTERNAL | 7 years | Enum |
| Quantity | +/- value | INTERNAL | 7 years | Int (signed) |
| Balance After | Snapshot of stock | INTERNAL | 7 years | Int ≥ 0 |
| Reference Type | Order/Return/Adjustment | INTERNAL | 7 years | Enum |
| Reference ID | FK to source | INTERNAL | 7 years | Non-null |
| Reason | Human-readable | INTERNAL | 7 years | Max 255 |
| Actor Type | User/System | INTERNAL | 7 years | Enum |
| Actor ID | FK or null | INTERNAL | 7 years | Nullable |

### 5.4 InventoryAdjustment

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Variant | FK | INTERNAL | 7 years | Required |
| Quantity Before | Before snapshot | INTERNAL | 7 years | Int ≥ 0 |
| Quantity After | After snapshot | INTERNAL | 7 years | Int ≥ 0 |
| Delta | Difference | INTERNAL | 7 years | Int (signed) |
| Reason Code | Damage/Audit/Theft/Other | INTERNAL | 7 years | Enum |
| Reason Text | Optional detail | INTERNAL | 7 years | Max 500 |
| Actor Admin | FK | INTERNAL | 7 years | Required |

---

## 6. Cart Entities

### 6.1 Cart

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Owner | User or guest session | INTERNAL | Until converted + 90 days | Either userId or sessionToken |
| Status | Active/Converted/Abandoned | INTERNAL | Until converted + 90 days | Enum |
| Currency | Always VND | INTERNAL | Until converted + 90 days | "VND" |
| Expires At | TTL | INTERNAL | Until converted + 90 days | Future timestamp |

### 6.2 CartItem

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Cart | FK | INTERNAL | With cart | Required |
| Variant | FK | INTERNAL | With cart | Required |
| Quantity | Count | INTERNAL | With cart | Int > 0 |
| Unit Price | Snapshot at add-time | INTERNAL | With cart | Money ≥ 0 |
| Reservation | FK | INTERNAL | With cart | Required |

---

## 7. Checkout Entity

### 7.1 CheckoutSession

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| User | FK (optional) | INTERNAL | Until expiry + 30 days | Either userId or guestEmail |
| Guest Email | For guest | CONFIDENTIAL | Until expiry + 30 days | Valid email |
| Cart | FK | INTERNAL | Until expiry + 30 days | Required |
| Status | Step in flow | INTERNAL | Until expiry + 30 days | Enum |
| Shipping Address | FK | INTERNAL | Until expiry + 30 days | Required |
| Shipping Method | FK | INTERNAL | Until expiry + 30 days | Required |
| Payment Method | Code | INTERNAL | Until expiry + 30 days | "vnpay" / "momo" / etc. |
| Voucher Code | Optional | INTERNAL | Until expiry + 30 days | Nullable |
| Subtotal | Sum of lines | INTERNAL | Until expiry + 30 days | Money ≥ 0 |
| Discount | Applied discount | INTERNAL | Until expiry + 30 days | Money ≥ 0 |
| Shipping Fee | Calculated fee | INTERNAL | Until expiry + 30 days | Money ≥ 0 |
| Tax Amount | VAT | INTERNAL | Until expiry + 30 days | Money ≥ 0 |
| Total | Final | INTERNAL | Until expiry + 30 days | Money ≥ 0 |
| Idempotency Key | Anti-duplicate | INTERNAL | Until expiry + 30 days | Unique |
| Expires At | 15-min TTL | INTERNAL | Until expiry + 30 days | Future timestamp |

---

## 8. Promotion Entities

### 8.1 Promotion

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Name | Internal name | INTERNAL | Until delete + 30 days | Max 100 |
| Type | Percentage/Fixed/Flash | INTERNAL | Until delete + 30 days | Enum |
| Value | Discount value | INTERNAL | Until delete + 30 days | Decimal ≥ 0 |
| Applicable Type | All/Category/Product | INTERNAL | Until delete + 30 days | Enum |
| Min Order Amount | Threshold | INTERNAL | Until delete + 30 days | Money ≥ 0 |
| Usage Limit | Total | INTERNAL | Until delete + 30 days | Int ≥ 0 |
| Usage Count | Current | INTERNAL | Until delete + 30 days | Int ≥ 0 |
| Per-User Limit | Per customer | INTERNAL | Until delete + 30 days | Int ≥ 0 |
| Stackable | With other promos? | INTERNAL | Until delete + 30 days | Boolean |
| Start Date | Activation | INTERNAL | Until delete + 30 days | UTC timestamp |
| End Date | Expiry | INTERNAL | Until delete + 30 days | UTC timestamp |
| Status | Draft/Scheduled/Active/Paused/Expired/Depleted/Cancelled | INTERNAL | Until delete + 30 days | Enum |

### 8.2 Voucher

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Promotion | FK | INTERNAL | Until delete + 30 days | Required |
| Code | User-entered code | INTERNAL | Until delete + 30 days | Unique; alphanumeric |
| Usage Limit | Total | INTERNAL | Until delete + 30 days | Int ≥ 0 |
| Usage Count | Current | INTERNAL | Until delete + 30 days | Int ≥ 0 |
| Per-User Limit | Per customer | INTERNAL | Until delete + 30 days | Int ≥ 0 |
| Valid From / Valid To | Active window | INTERNAL | Until delete + 30 days | UTC |

### 8.3 TaxRate, TaxExemption

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Rate Name | e.g., "Standard VAT 10%" | INTERNAL | Permanent | Max 50 |
| Rate Percentage | 10% standard | INTERNAL | Permanent | Decimal 0..100 |
| Country Code | ISO 3166-1 | INTERNAL | Permanent | "VN" |
| Effective From / To | Active window | INTERNAL | Permanent | UTC |
| Default | Is fallback? | INTERNAL | Permanent | Boolean |
| Exemption Reason | Why exempt | CONFIDENTIAL | Until delete | Max 500 |

---

## 9. Order Entities

### 9.1 Order

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Identifier | Order ID | INTERNAL | 7 years | UUID |
| Order Number | Human-readable | CONFIDENTIAL | 7 years | Unique; YYYYMMDD-NNNN |
| User | FK (optional for guest) | INTERNAL | 7 years | Either userId or guestEmail |
| Guest Email | For guest orders | CONFIDENTIAL | 7 years | Valid email |
| Guest Phone | For guest | CONFIDENTIAL | 7 years | +84 format |
| Status | State machine | INTERNAL | 7 years | Enum |
| Currency | VND | INTERNAL | 7 years | "VND" |
| Subtotal, Discount, Shipping, Tax, Total | Order totals | INTERNAL | 7 years | Money ≥ 0 |
| Paid Amount | Amount captured | INTERNAL | 7 years | Money ≥ 0 |
| Refunded Amount | Cumulative refund | INTERNAL | 7 years | Money ≥ 0 |
| Tax Rate | Snapshot at creation | INTERNAL | 7 years | Decimal |
| Voucher Code | Applied voucher | INTERNAL | 7 years | Nullable |
| Notes | Customer notes | CONFIDENTIAL | 7 years | Nullable |
| Status Timestamps | When transitions occurred | INTERNAL | 7 years | Nullable |

### 9.2 OrderItem

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Order | FK | INTERNAL | 7 years | Required |
| Variant | FK | INTERNAL | 7 years | Required |
| Product | FK | INTERNAL | 7 years | Required |
| Product Name | Snapshot | INTERNAL | 7 years | Max 255 |
| Variant SKU | Snapshot | INTERNAL | 7 years | Max 50 |
| Quantity | Count | INTERNAL | 7 years | Int > 0 |
| Unit Price | Snapshot | INTERNAL | 7 years | Money ≥ 0 |
| Subtotal, Tax, Discount, Total | Snapshot | INTERNAL | 7 years | Money ≥ 0 |
| Tax Rate | Snapshot | INTERNAL | 7 years | Decimal |

### 9.3 OrderAddress

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Order | FK | INTERNAL | 7 years | Required |
| Type | Shipping/Billing | INTERNAL | 7 years | Enum |
| Full Name, Phone, Province, District, Ward, Street | Snapshot | CONFIDENTIAL | 7 years | Required |
| Notes | Delivery notes | CONFIDENTIAL | 7 years | Max 500 |

### 9.4 OrderStatusHistory

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Order | FK | INTERNAL | 7 years | Required |
| From Status | Previous | INTERNAL | 7 years | Nullable (initial) |
| To Status | New | INTERNAL | 7 years | Required |
| Actor Type | User/System/Admin | INTERNAL | 7 years | Enum |
| Actor ID | FK | INTERNAL | 7 years | Nullable |
| Reason | Why | INTERNAL | 7 years | Max 500 |
| Metadata | JSON | INTERNAL | 7 years | JSONB |

---

## 10. Payment Entities

### 10.1 Payment

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Order | FK | INTERNAL | 7 years | Required |
| Provider Code | vnpay/momo/zalopay | INTERNAL | 7 years | Enum |
| Intent ID | Provider's ID | CONFIDENTIAL | 7 years | Unique per provider |
| Status | State | INTERNAL | 7 years | Enum |
| Amount | Authorized | INTERNAL | 7 years | Money ≥ 0 |
| Captured Amount | Actually captured | INTERNAL | 7 years | Money ≥ 0 |
| Refunded Amount | Cumulative | INTERNAL | 7 years | Money ≥ 0 |
| Payment Method | card/wallet/etc. | INTERNAL | 7 years | Enum |
| Timestamps | Status transitions | INTERNAL | 7 years | Nullable |

### 10.2 PaymentTransaction

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Payment | FK | INTERNAL | 7 years | Required |
| Type | Authorize/Capture/Void | INTERNAL | 7 years | Enum |
| Amount | Tx amount | INTERNAL | 7 years | Money ≥ 0 |
| Provider Transaction ID | Provider's ref | CONFIDENTIAL | 7 years | Required |
| Provider Code | Status code | INTERNAL | 7 years | Required |
| Status | Success/Failed | INTERNAL | 7 years | Enum |
| Raw Response | Provider JSON | CONFIDENTIAL | 7 years | JSONB |

### 10.3 WebhookEvent

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Provider Code | vnpay/momo | INTERNAL | 90 days | Required |
| Event ID | Provider's unique ID | INTERNAL | 90 days | Unique |
| Event Type | payment.succeeded etc. | INTERNAL | 90 days | Max 100 |
| Payload | Full body | CONFIDENTIAL | 90 days | JSONB |
| Processed At | When handled | INTERNAL | 90 days | Nullable |
| Received At | When received | INTERNAL | 90 days | UTC |

### 10.4 Refund

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Payment | FK | INTERNAL | 7 years | Required |
| Order | FK | INTERNAL | 7 years | Required |
| Amount | Refund amount | INTERNAL | 7 years | Money > 0 |
| Reason | Why | CONFIDENTIAL | 7 years | Max 500 |
| Provider Refund ID | Provider's ref | CONFIDENTIAL | 7 years | Required |
| Status | Pending/Processed/Failed | INTERNAL | 7 years | Enum |
| Requested By | Admin FK | INTERNAL | 7 years | Required |
| Processed At | When done | INTERNAL | 7 years | Nullable |

---

## 11. Shipping Entities

### 11.1 ShippingZone, ShippingRate

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Zone Name | "North Vietnam" | INTERNAL | Permanent | Max 100 |
| Country Code | ISO 3166-1 | INTERNAL | Permanent | "VN" |
| Region Codes | Province codes | INTERNAL | Permanent | Array |
| Carrier Code | ghn/ghtk/viettel | INTERNAL | Permanent | Enum |
| Service Name | "Standard", "Express" | INTERNAL | Permanent | Max 100 |
| Weight Range | Min/Max kg | INTERNAL | Permanent | Decimal |
| Base Fee | Starting fee | INTERNAL | Permanent | Money ≥ 0 |
| Per-Kg Fee | Variable | INTERNAL | Permanent | Money ≥ 0 |
| Estimated Days | Min/Max | INTERNAL | Permanent | Int ≥ 0 |

### 11.2 Shipment

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Order | FK | INTERNAL | 7 years | Required |
| Carrier Code | ghn/ghtk | INTERNAL | 7 years | Required |
| Tracking Number | Unique | INTERNAL | 7 years | Unique |
| Weight | Kg | INTERNAL | 7 years | Decimal ≥ 0 |
| Shipping Fee | Snapshot | INTERNAL | 7 years | Money ≥ 0 |
| Status | Created/Dispatched/InTransit/Delivered/Lost/Returned | INTERNAL | 7 years | Enum |
| Label URL | Download URL | CONFIDENTIAL | 7 years | URL |
| Status Timestamps | Transitions | INTERNAL | 7 years | Nullable |

### 11.3 TrackingEvent

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Shipment | FK | INTERNAL | 2 years | Required |
| Status | At time of event | INTERNAL | 2 years | Enum |
| Location | Where | INTERNAL | 2 years | Max 255 |
| Description | Detail | INTERNAL | 2 years | Max 500 |
| Event At | Carrier's timestamp | INTERNAL | 2 years | UTC |

---

## 12. Returns Entities

### 12.1 Return

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| RMA Number | Human-readable | INTERNAL | 2 years | Unique; RMA-NNNN |
| Order | FK | INTERNAL | 2 years | Required |
| Customer | FK | INTERNAL | 2 years | Required |
| Status | Pending/Approved/Rejected/Received/Inspecting/Inspected/Restocked/Disposed/Refunded | INTERNAL | 2 years | Enum |
| Reason | High-level | CONFIDENTIAL | 2 years | Max 100 |
| Customer Notes | Detail | CONFIDENTIAL | 2 years | Max 1000 |
| Total Refund Amount | Calculated | INTERNAL | 2 years | Money ≥ 0 |
| Status Timestamps | Transitions | INTERNAL | 2 years | Nullable |

### 12.2 ReturnItem

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Return | FK | INTERNAL | 2 years | Required |
| Order Item | FK | INTERNAL | 2 years | Required |
| Variant | FK | INTERNAL | 2 years | Required |
| Quantity | Count | INTERNAL | 2 years | Int > 0 |
| Unit Price | Snapshot | INTERNAL | 2 years | Money ≥ 0 |
| Reason | Item-specific reason | CONFIDENTIAL | 2 years | Max 100 |
| Condition | sellable/damaged | INTERNAL | 2 years | Enum |

### 12.3 ReturnInspection

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Return | FK | INTERNAL | 2 years | Required |
| Return Item | FK | INTERNAL | 2 years | Required |
| Outcome | PASS/FAIL | INTERNAL | 2 years | Enum |
| Notes | Inspector notes | CONFIDENTIAL | 2 years | Max 1000 |
| Photos | JSON | CONFIDENTIAL | 2 years | Array of mediaIds |
| Inspector | Admin FK | INTERNAL | 2 years | Required |
| Inspected At | UTC | INTERNAL | 2 years | Required |

---

## 13. Reviews Entities

### 13.1 Review, ReviewReply, ReviewHelpfulVote

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Product | FK | INTERNAL | Permanent | Required |
| Variant | FK (optional) | INTERNAL | Permanent | Nullable |
| Customer | FK | INTERNAL | Permanent (anonymize on user delete) | Required |
| Order Item | FK (verified purchase) | INTERNAL | Permanent | Required (for verification) |
| Rating | 1-5 stars | PUBLIC | Permanent | Int 1..5 |
| Title | Brief | PUBLIC | Permanent | Max 200 |
| Content | Full text | PUBLIC | Permanent | Max 1000 |
| Status | Pending/Published/Rejected | INTERNAL | Permanent | Enum |
| Helpful Votes | Counter | PUBLIC | Permanent | Int ≥ 0 |
| Published At | When published | INTERNAL | Permanent | Nullable |

---

## 14. Notifications Entities

### 14.1 EmailTemplate

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Code | E.g., "order_confirmation" | INTERNAL | Permanent | Unique |
| Subject | Vietnamese subject | INTERNAL | Permanent | Max 255 |
| Body Template | HTML/text | INTERNAL | Permanent | Long text |
| Locale | vi-VN | INTERNAL | Permanent | "vi-VN" |
| Version | Increment on edit | INTERNAL | Permanent | Int |
| Active | Currently used | INTERNAL | Permanent | Boolean |

### 14.2 NotificationLog

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Template | FK | INTERNAL | 1 year | Required |
| Recipient Type | User/AdminUser/Guest | INTERNAL | 1 year | Enum |
| Recipient ID | FK | INTERNAL | 1 year | Nullable |
| Recipient Email | Actual email | CONFIDENTIAL | 1 year | Valid email |
| Subject | Rendered | INTERNAL | 1 year | Max 255 |
| Status | Queued/Sent/Failed | INTERNAL | 1 year | Enum |
| Provider Message ID | Provider's ref | INTERNAL | 1 year | Max 200 |
| Attempts | Retry count | INTERNAL | 1 year | Int ≥ 0 |
| Last Error | Error message | INTERNAL | 1 year | Max 1000 |

### 14.3 NotificationPreference

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Owner Type | User/AdminUser | INTERNAL | With owner | Enum |
| Owner ID | FK | INTERNAL | With owner | Required |
| Channel | Email/SMS/Push | INTERNAL | With owner | Enum |
| Event Type | E.g., "order.shipped" | INTERNAL | With owner | Max 100 |
| Enabled | Opt-in flag | INTERNAL | With owner | Boolean |

### 14.4 CookieConsent

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Visitor ID | Anonymous ID | CONFIDENTIAL | 1 year | UUID |
| Session ID | Browser session | INTERNAL | 1 year | Random |
| Necessary | Always true | INTERNAL | 1 year | Boolean |
| Analytics | Opt-in | INTERNAL | 1 year | Boolean |
| Marketing | Opt-in | INTERNAL | 1 year | Boolean |
| IP Address | Audit | CONFIDENTIAL | 1 year | IP |
| User Agent | Audit | INTERNAL | 1 year | Max 500 |
| Consented At | UTC | INTERNAL | 1 year | Required |
| Expires At | 1-year TTL | INTERNAL | 1 year | Future timestamp |

---

## 15. Support Entities

### 15.1 SupportTicket, TicketMessage

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Ticket Number | T-NNNN | INTERNAL | 2 years | Unique |
| Customer | FK | INTERNAL | 2 years (anonymize on user delete) | Nullable for guest |
| Guest Email/Name | For guest | CONFIDENTIAL | 2 years | Required if no user |
| Order | FK (optional) | INTERNAL | 2 years | Nullable |
| Subject | Brief | CONFIDENTIAL | 2 years | Max 200 |
| Status | Open/Pending/Resolved/Closed | INTERNAL | 2 years | Enum |
| Priority | Low/Medium/High | INTERNAL | 2 years | Enum |
| Assigned To | Admin FK | INTERNAL | 2 years | Nullable |
| SLA Due At | First response target | INTERNAL | 2 years | UTC |
| Status Timestamps | Transitions | INTERNAL | 2 years | Nullable |

---

## 16. Audit Entity

### 16.1 AuditLog

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Actor Type | User/AdminUser/System | INTERNAL | 7 years | Enum |
| Actor ID | FK | INTERNAL | 7 years | Nullable |
| Action | e.g., "refund.issued" | INTERNAL | 7 years | Max 100 |
| Entity Type | E.g., "Order" | INTERNAL | 7 years | Max 100 |
| Entity ID | FK | INTERNAL | 7 years | Max 100 |
| Before | JSON snapshot | CONFIDENTIAL | 7 years | JSONB |
| After | JSON snapshot | CONFIDENTIAL | 7 years | JSONB |
| IP Address | Audit | INTERNAL | 7 years | IP |
| User Agent | Audit | INTERNAL | 7 years | Max 500 |
| Created At | UTC | INTERNAL | 7 years | Required |

---

## 17. Platform Entities

### 17.1 FeatureFlag, FeatureFlagOverride, StaticPage, SystemConfig

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Flag Key | Unique key | INTERNAL | Permanent | Max 100 |
| Description | What it does | INTERNAL | Permanent | Max 500 |
| Value Type | boolean/string/number | INTERNAL | Permanent | Enum |
| Default Value | Initial | INTERNAL | Permanent | String |
| Enabled | Active? | INTERNAL | Permanent | Boolean |
| Override Target Type | User/Segment | INTERNAL | Until expiry | Enum |
| Override Value | Custom value | INTERNAL | Until expiry | String |
| Override Expires At | Optional | INTERNAL | Until expiry | Nullable |

### 17.2 StaticPage

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Slug | URL slug | PUBLIC | Permanent | Unique |
| Title | Page title | PUBLIC | Permanent | Max 255 |
| Content | HTML/Markdown | PUBLIC | Permanent | Long text |
| Meta Title | SEO | PUBLIC | Permanent | Max 255 |
| Meta Description | SEO | PUBLIC | Permanent | Max 500 |
| Published | Live? | INTERNAL | Permanent | Boolean |

### 17.3 SystemConfig

| Attribute | Business Meaning | Confidentiality | Retention | Validation |
| --- | --- | --- | --- | --- |
| Key | E.g., "vat.rate" | INTERNAL | Permanent | Unique |
| Value | Setting value | INTERNAL | Permanent | String/JSON |
| Value Type | string/number/boolean/json | INTERNAL | Permanent | Enum |
| Description | What | INTERNAL | Permanent | Max 500 |

---

## 18. Cross-Entity Standards

### 18.1 Common Timestamps

Every entity has:
- `createdAt` (UTC, set once)
- `updatedAt` (UTC, updated on every write)
- `deletedAt` (UTC, nullable; set on soft delete)

### 18.2 Common Identifier

- All IDs are UUID v7 (time-ordered, monotonic)
- Format: 36 characters including hyphens
- Stored as `text` (PostgreSQL native UUID type in V1.5+)

### 18.3 Money

- Always integer in **VND xu** (1 VND = 100 xu) — avoids float (BR-X-001)
- Total amounts use bigint to avoid overflow
- Rounding: Banker's rounding per BR-TAX-005
- Currency always "VND" in MVP

### 18.4 Boolean Flags

- Use `boolean` (not `tinyint`)
- Default false unless explicitly true

### 18.5 JSON Fields

- Use `jsonb` (PostgreSQL native) for semi-structured data
- Examples: `OrderStatusHistory.metadata`, `AuditLog.before`, `AuditLog.after`

### 18.6 Text Length Standards

| Type | Max Length |
| --- | --- |
| Short text | 100 |
| Medium text | 255 |
| Long text | 1000 |
| Body / description | unlimited |
| SKU / code | 50 |
| Email | 255 |
| Phone | 20 |
| Slug | 100 |
| URL | 2048 |
| IP address | 45 (IPv6 max) |

---

## 19. Validation Notes Summary

| Pattern | Rule |
| --- | --- |
| Email | RFC 5322; max 255; lowercase enforced |
| Vietnamese phone | +84 prefix; 10 digits; mobile only |
| Vietnamese diacritics | Allowed in names; UTF-8 encoding |
| Money | Non-negative unless signed; integer (xu) |
| Quantity | Int > 0 |
| SKU | Uppercase alphanumeric; max 50; unique |
| Slug | Lowercase; URL-safe; max 100; unique |
| UUID | v7; UUID format |
| Date | ISO 8601 UTC |
| JSON | Valid jsonb |
| IP | IPv4 or IPv6 |

---

## 20. Coverage Validation

| Check | Status |
| --- | --- |
| Every entity has business meaning defined | ✓ |
| Every attribute has confidentiality class | ✓ |
| Every entity has retention policy | ✓ |
| Every entity has validation notes | ✓ |
| Money uses integer xu convention | ✓ |
| Timestamps are UTC | ✓ |
| PII classified as CONFIDENTIAL or higher | ✓ |
| MFA secrets classified RESTRICTED | ✓ |

---

## 21. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal Database Architect | Initial data dictionary: 64 entities, 4 confidentiality classes, retention policies, validation notes |

---

**End of Document — DATA_DICTIONARY.md**
# 10 — Enums and Constants

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04
**Author:** Principal Database Architect

---

## 1. Purpose

This document catalogs all:

- **Enums** defined in the Prisma schema
- **Constants** that don't fit as enums (small lookup tables)
- Allowed value mappings for forms / API responses

The intent is **single source of truth for all categorical fields** at the DB layer.

---

## 2. Enum Conventions

| Rule | Detail |
|---|---|
| Type name | PascalCase (`UserStatus`, `OrderStatus`) |
| Value style | `UPPER_SNAKE` |
| Default | Always explicit in Prisma (`@default(...)`) |
| Backward compat | Add new values; never rename or remove |
| Mapping | UI labels in `vi-VN`; raw enum is API contract |

### 2.1 Enum Value Inventory

#### UserStatus

| Value | When |
|---|---|
| `PENDING_VERIFICATION` | Email not confirmed |
| `ACTIVE` | Verified and usable |
| `SUSPENDED` | Admin blocked |
| `CLOSED` | User self-close |
| `ANONYMIZED` | PDPD/GDPR erasure |

#### AdminUserStatus

| Value | When |
|---|---|
| `PENDING_MFA_SETUP` | Created but no MFA yet (cannot log in beyond initial setup) |
| `ACTIVE` | MFA verified |
| `SUSPENDED` | Blocked |
| `LOCKED` | `failedLoginCount` exceeded |
| `DISABLED` | Retired |

#### RoleScope

| Value | When |
|---|---|
| `SYSTEM` | Seeded by system; immutable |
| `CUSTOM` | Created by `super_admin` |

#### AddressOwnerType

| Value | When |
|---|---|
| `USER` | Owned by `User` |
| `ADMIN_USER` | Owned by `AdminUser` |

#### MfaType

| Value | When |
|---|---|
| `TOTP` | RFC 6238 — Authenticator app |
| `BACKUP_CODES` | Backup recovery codes (used during enrollment) |

#### RefreshTokenReason

| Value | When |
|---|---|
| `REFRESH` | Routine refresh |
| `LOGOUT` | On logout |
| `ADMIN_REVOKE` | Admin action |
| `PASSWORD_RESET` | Reset flow |
| `SECURITY` | Anti-hijack |

#### UserSessionStatus

| Value |
|---|
| `ACTIVE` |
| `REVOKED` |
| `EXPIRED` |

#### CategoryStatus

| Value |
|---|
| `DRAFT` |
| `ACTIVE` |
| `ARCHIVED` |

#### BrandStatus

| Value |
|---|
| `ACTIVE` |
| `INACTIVE` |

#### ProductStatus

| Value | Notes |
|---|---|
| `DRAFT` | Admin-only |
| `PUBLISHED` | Live on storefront |
| `UNPUBLISHED` | Hidden temporarily |
| `ARCHIVED` | Soft-deleted from storefront |

#### ProductVariantStatus

| Value |
|---|
| `ACTIVE` |
| `OUT_OF_STOCK` |
| `DISCONTINUED` |

#### AttributeDataType

| Value |
|---|
| `TEXT` |
| `NUMBER` |
| `BOOLEAN` |
| `COLOR_HEX` |
| `LIST` |

#### StockMovementType

| Value | Direction |
|---|---|
| `PURCHASE` | + |
| `SALE` | − |
| `RESERVATION` | reserved + |
| `RELEASE` | reserved − |
| `ADJUSTMENT_IN` | + manual |
| `ADJUSTMENT_OUT` | − manual |
| `TRANSFER_IN` | + |
| `TRANSFER_OUT` | − |
| `RETURN_RESTOCK` | + |
| `RETURN_DISPOSE` | n/a |

#### StockReservationStatus

| Value |
|---|
| `ACTIVE` |
| `CONSUMED` |
| `RELEASED` |
| `EXPIRED` |

#### InventoryAdjustmentReason

| Value |
|---|
| `COUNT_CORRECTION` |
| `DAMAGE` |
| `LOSS` |
| `RECEIVING` |
| `TRANSFER` |
| `INITIAL_STOCK` |
| `OTHER` |

#### MediaPurpose

| Value |
|---|
| `PRODUCT_IMAGE` |
| `PRODUCT_GALLERY` |
| `CATEGORY_BANNER` |
| `BRAND_LOGO` |
| `REVIEW_ATTACHMENT` |
| `AVATAR` |
| `STATIC_PAGE` |
| `SUPPORT_ATTACHMENT` |
| `EMAIL_ASSET` |

#### CartStatus

| Value |
|---|
| `ACTIVE` |
| `CONVERTED` |
| `ABANDONED` |
| `EXPIRED` |

#### CheckoutSessionStatus

| Value |
|---|
| `IN_PROGRESS` |
| `AWAITING_PAYMENT` |
| `COMPLETED` |
| `EXPIRED` |
| `CANCELLED` |

#### PaymentStatus

| Value | Meaning |
|---|---|
| `PENDING` | Created; no auth yet |
| `AUTHORIZED` | Auth OK; not yet captured |
| `CAPTURED` | Paid |
| `FAILED` | Provider rejected |
| `CANCELLED` | Voided |
| `EXPIRED` | Intent expired |
| `REFUNDED` | Fully refunded |
| `PARTIALLY_REFUNDED` | Some refunds issued |

#### PaymentProvider

| Value |
|---|
| `VNPAY` |
| `MOMO` |
| `ZALOPAY` |
| `PAYPAL` |
| `BANK_TRANSFER` |

#### PaymentTransactionType

| Value |
|---|
| `CREATE` |
| `AUTHORIZE` |
| `CAPTURE` |
| `REFUND` |
| `VOID` |
| `WEBHOOK` |

#### PaymentTransactionStatus

| Value |
|---|
| `PENDING` |
| `SUCCEEDED` |
| `FAILED` |

#### RefundStatus

| Value |
|---|
| `PENDING` |
| `PROCESSING` |
| `SUCCEEDED` |
| `FAILED` |
| `CANCELLED` |

#### WebhookProvider

| Value |
|---|
| `VNPAY` |
| `MOMO` |
| `ZALOPAY` |
| `PAYPAL` |
| `GHN` |
| `GHTK` |
| `VIETTEL_POST` |

#### WebhookEventStatus

| Value |
|---|
| `RECEIVED` |
| `PROCESSED` |
| `FAILED` |
| `DUPLICATE` |
| `ARCHIVED` |

#### OrderStatus

| Value | Meaning |
|---|---|
| `PENDING` | Awaiting payment |
| `CONFIRMED` | Paid |
| `PROCESSING` | Being prepared |
| `SHIPPED` | Handed to carrier |
| `DELIVERED` | Confirmed delivered |
| `COMPLETED` | Final state (after delivery + return window) |
| `CANCELLED` | Cancelled |
| `REFUNDED` | Refund processed |

#### OrderReturnStatus

| Value |
|---|
| `PENDING` |
| `APPROVED` |
| `REJECTED` |
| `RECEIVED` |
| `INSPECTING` |
| `REFUNDED` |
| `CLOSED` |

#### ShipmentStatus

| Value |
|---|
| `CREATED` |
| `DISPATCHED` |
| `IN_TRANSIT` |
| `OUT_FOR_DELIVERY` |
| `DELIVERED` |
| `EXCEPTION` |
| `RETURNED` |
| `CANCELLED` |

#### ShippingCarrier

| Value |
|---|
| `GHN` |
| `GHTK` |
| `VIETTEL_POST` |
| `VNPOST` |
| `INTERNAL` |

#### PromotionType

| Value |
|---|
| `PERCENT_OFF` |
| `FIXED_OFF` |
| `FLASH_SALE` |
| `BUNDLE` |
| `FREE_SHIPPING` |
| `GIFT_WITH_PURCHASE` |

#### PromotionStatus

| Value |
|---|
| `DRAFT` |
| `SCHEDULED` |
| `ACTIVE` |
| `PAUSED` |
| `EXPIRED` |
| `DEPLETED` |
| `CANCELLED` |

#### PromotionDiscountTarget

| Value |
|---|
| `ORDER_TOTAL` |
| `LINE_ITEMS` |
| `SHIPPING_FEE` |

#### VoucherStatus

| Value |
|---|
| `DRAFT` |
| `ACTIVE` |
| `PAUSED` |
| `EXPIRED` |
| `DEPLETED` |
| `CANCELLED` |

#### ReviewStatus

| Value |
|---|
| `PENDING` |
| `PUBLISHED` |
| `REJECTED` |
| `HIDDEN` |

#### NotificationChannel

| Value |
|---|
| `EMAIL` |
| `IN_APP` |
| `PUSH` |
| `SMS` |

#### NotificationStatus

| Value |
|---|
| `QUEUED` |
| `SENT` |
| `DELIVERED` |
| `FAILED` |
| `BOUNCED` |

#### TemplateLocale

| Value |
|---|
| `VI` |
| `EN` |

#### TicketStatus

| Value |
|---|
| `OPEN` |
| `PENDING` |
| `RESOLVED` |
| `CLOSED` |
| `REOPENED` |

#### TicketPriority

| Value |
|---|
| `LOW` |
| `MEDIUM` |
| `HIGH` |
| `URGENT` |

#### TicketMessageAuthorType

| Value |
|---|
| `CUSTOMER` |
| `STAFF` |
| `SYSTEM` |

#### AuditActionCategory

| Value | Examples |
|---|---|
| `AUTH` | login, logout |
| `AUTHN_FAILED` | wrong password |
| `AUTHN_SUCCESS` | successful login |
| `AUTHZ_DENIED` | permission denied |
| `USER_MANAGEMENT` | create/update user |
| `ROLE_MANAGEMENT` | create/update role |
| `RBAC_CHANGE` | permission change |
| `PRODUCT_MANAGEMENT` | catalog edit |
| `INVENTORY_ADJUSTMENT` | stock change |
| `ORDER_MANAGEMENT` | order edit |
| `PAYMENT_REFUND` | refund issued |
| `SHIPMENT` | shipment manual update |
| `PROMOTION` | promotion change |
| `REVIEW_MODERATION` | review approval |
| `SYSTEM_CONFIG` | config change |
| `ADMIN_LOGIN` | admin login (sub of AUTH but separated) |
| `DATA_EXPORT` | customer data export |
| `DATA_DELETE` | soft delete / anonymize |

#### ActorType

| Value |
|---|
| `USER` |
| `ADMIN_USER` |
| `SYSTEM` |
| `WEBHOOK` |
| `ANONYMOUS` |

#### FeatureFlagValueType

| Value |
|---|
| `BOOLEAN` |
| `STRING` |
| `NUMBER` |
| `JSON` |

#### FeatureFlagTargetType

| Value |
|---|
| `USER` |
| `ADMIN_USER` |
| `SEGMENT` |
| `PERCENTAGE` |

---

## 3. Lookup Tables (Not Enums)

Some values are **not** enums because they change over time. They live in dedicated tables:

| Table | Purpose |
|---|---|
| `tax_rate` | VAT rates (multiple values; effective window) |
| `shipping_zone` | Vietnam province groupings |
| `shipping_rate` | Per-zone × carrier × service rates |
| `currency` (future) | Will become a table in V2 multi-currency |
| `country` (future) | Reserved in V2 |

### 3.1 Why Not Enums?

- **Time-varying** (tax rates change).
- **Multi-attribute** (shipping rate has min_weight, fee, free_above).
- **Admin-managed** (super_admin can add/edit shipping zones).

---

## 4. Cross-Context Reference Patterns

If a value crosses module boundaries, the schema keeps it as a single enum to avoid divergence:

| Enum | Modules |
|---|---|
| `OrderStatus` | Order, Payment, Shipment, Refund |
| `PaymentStatus` | Payment, Order, Notification |

---

## 5. Display Mapping (Vietnamese)

The frontend maps enums to Vietnamese labels; the API always returns raw enum values. (See `docs/01-business-analysis/GLOSSARY.md` for canonical translations.)

| Enum value | Vietnamese label (UI) |
|---|---|
| `PENDING_VERIFICATION` | Chờ xác thực |
| `ACTIVE` | Đang hoạt động |
| `SUSPENDED` | Tạm ngưng |
| `PENDING` (Order) | Chờ thanh toán |
| `CONFIRMED` (Order) | Đã xác nhận |
| `PROCESSING` (Order) | Đang xử lý |
| `SHIPPED` (Order) | Đang giao |
| `DELIVERED` (Order) | Đã giao |
| `COMPLETED` (Order) | Hoàn tất |
| `CANCELLED` (Order) | Đã hủy |
| `REFUNDED` (Order) | Đã hoàn tiền |

---

## 6. Hard-Coded Magic Numbers (Constants)

These live in code, NOT in DB tables, because they're tied to code behavior:

| Constant | Value | Use |
|---|---|---|
| `CART_INACTIVITY_TTL_MS` | 1 800 000 | Cart activity window (30 min) |
| `CART_EXPIRY_MS` | 30 days | Cart expiry |
| `CHECKOUT_SESSION_TTL_MS` | 900 000 | 15 min checkout timer |
| `STOCK_RESERVATION_TTL_MS` | 900 000 | 15 min reservation |
| `VND_DECIMAL` | 0 | VND has no minor unit |
| `IDEMPOTENCY_TTL_MS` | 86 400 000 | 24 hours |
| `WEBHOOK_RETRY_MAX` | 5 | Webhook retry attempts |
| `MAX_PAGE_SIZE` | 100 | Pagination limit |
| `DEFAULT_PAGE_SIZE` | 20 | Pagination default |
| `MIN_PASSWORD_LENGTH` | 10 | Password policy |
| `MAX_LOGIN_ATTEMPTS` | 5 | Lockout threshold |
| `LOCKOUT_DURATION_MS` | 900 000 | 15 min lockout |
| `ACCESS_TOKEN_TTL` | 900 | 15 min |
| `REFRESH_TOKEN_TTL` | 2 592 000 | 30 days |

> All defined in `common/constants/limits.ts` (to be implemented).

---

## 7. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial enum catalogue: 45 enums |

---

**End of 10_ENUMS_AND_CONSTANTS.md**

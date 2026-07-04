# 05 — Constraints and Rules

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04
**Author:** Principal Database Architect

---

## 1. Purpose

This document captures all **database-level constraints, business-rule enforcement, and cascading rules** that the Prisma schema must implement. It complements `02_DATABASE_DESIGN_OVERVIEW.md` by giving the formal rules per entity.

The constraints fall into five categories:

| Category | Tool | Layer |
|---|---|---|
| Type-level | Prisma type | Schema |
| Nullability | `?` modifier | Schema |
| Uniqueness | `@@unique`, `@unique` | Schema + DB |
| Referential integrity | `references`, `onDelete` | Schema + DB FK |
| Business constraint | Postgres `CHECK`, partial UNIQUE, trigger | Migration (V1.1) |
| Domain invariant | App-level (e.g., immutability of paid Order) | Service layer |

---

## 2. Universal Constraints

| # | Rule | Enforcement |
|---|---|---|
| U-01 | Every primary key is `String @id @default(cuid())` | Schema |
| U-02 | Every business entity has `deletedAt: DateTime?` | Schema |
| U-03 | Every business entity has `createdAt` and `updatedAt` | Schema (defaults) |
| U-04 | Every Money column is `Decimal @db.Decimal(20, 4)` | Schema |
| U-05 | Every Timestamp is `timestamptz(6)` | Schema `@db.Timestamptz(6)` |
| U-06 | Every enum is PascalCase type | Schema |
| U-07 | Every FK has explicit `onDelete` | Schema |
| U-08 | Every soft-deletable table has `@@index([deletedAt])` | Schema |
| U-09 | Snake_case table and column names via `@map`/`@@map` | Schema |
| U-10 | Email columns use `CITEXT` | Schema `@db.Citext` |
| U-11 | Status fields are enum-typed | Schema |
| U-12 | Long free-text fields use `Text` not `Varchar(n)` | Schema |

---

## 3. Per-Entity Constraint Catalogue

### 3.1 Identity

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `user` | Email is unique | `email String @unique @db.Citext` | Login |
| `user` | Email format | CHECK (`email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'`) | Migration |
| `user` | Status enum | `status UserStatus` | `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, `CLOSED`, `ANONYMIZED` |
| `user` | Phone format (VN) | CHECK (`phone IS NULL OR phone ~ '^\+?[0-9 ()-]{8,20}$'`) | Migration |
| `admin_user` | Email is unique | `@unique @db.Citext` | Login |
| `admin_user` | Mandatory MFA state | `status AdminUserStatus` enforces `PENDING_MFA_SETUP` default | Service-enforced |
| `admin_user` | Failed-login lockout | `failedLoginCount Int`, `lockedUntil DateTime?` | Service reset |
| `role` | Code is unique | `@unique` | System codes immutable |
| `role` | System role immutability | CHECK on `scope = 'SYSTEM' → no update / delete`) | Migration + DB role |
| `permission` | Code is unique & stable | `@unique` | Once shipped, immutable |
| `admin_user_role` | Unique (admin, role) | `@@unique([adminUserId, roleId])` | No double-assign |
| `admin_user_role` | Cascade on admin delete | `onDelete: Cascade` | Cleanup |
| `admin_user_role` | Restrict on role delete | `onDelete: Restrict` | If assigned, can't delete role |
| `role_permission` | Unique (role, permission) | `@@unique([roleId, permissionId])` | Idempotent insert |
| `role_permission` | Cascade on either delete | `onDelete: Cascade` | Cleanup |
| `address` | Exactly one owner (CHECK) | CHECK (`user_id IS NOT NULL) != (admin_user_id IS NOT NULL)`) | Migration |
| `mfa_secret` | Exactly one owner | CHECK (XOR on user_id / admin_user_id) | Migration |
| `mfa_secret` | user_id unique | `@unique` | One MFA per user |
| `mfa_secret` | admin_user_id unique | `@unique` | One MFA per admin |
| `recovery_code` | Unique (secret, hash) | `@@unique([mfaSecretId, codeHash])` | One-shot |
| `refresh_token` | Hash unique | `@unique @map("token_hash")` | Validator |
| `refresh_token` | Exactly one owner | XOR CHECK on user_id / admin_user_id | Migration |
| `refresh_token` | replaced_by_id self-ref unique | `@unique` | Rotation chain |
| `user_session` | Exactly one owner | XOR CHECK | Migration |

### 3.2 Catalog

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `category` | slug unique and partial | `slug @unique` + migration `UNIQUE (slug) WHERE deleted_at IS NULL` | Soft delete active constraint |
| `category` | Self-parent restrict | `parentId references category(id) ON DELETE RESTRICT` | No orphan subtrees |
| `category` | Cycle prevention | App: refuse if new path contains self | Service layer |
| `category` | path format | CHECK (`path ~ '^(\/[0-9]+)+$'`) | Migration |
| `brand` | slug unique | `@unique` | URL routing |
| `product` | slug unique partial | `slug @unique` + migration | Soft delete unique |
| `product` | category restrict | `categoryId → category ON DELETE RESTRICT` | Cannot delete cat with products |
| `product` | rating bounds | CHECK (`rating_avg BETWEEN 0 AND 5`) | Migration |
| `product` | ratingCount range | CHECK (`rating_count >= 0`) | Migration |
| `product_variant` | sku unique | `sku @unique` | EDI friendly |
| `product_variant` | price non-negative | CHECK (`price >= 0`) | Migration |
| `product_variant` | Attributes JSON shape | App-level Zod | Schema-validated |
| `product_image` | Product referenced | `productId → product ON DELETE CASCADE` | Cleanup |
| `product_image` | Variant optional | `variantId ON DELETE SET NULL` | Variant deleted, image lives |
| `product_image` | media_id restrict | `mediaId ON DELETE RESTRICT` | Don't orphan media |
| `product_attribute` | code unique | `@unique` | Lookup |
| `product_attribute_value` | Unique (product, attr) | `@@unique([productId, attributeId])` | One value per product attr |

### 3.3 Inventory

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `inventory` | Unique (variant, warehouse) | `@@unique([productVariantId, warehouseCode])` | One per warehouse |
| `inventory` | on_hand >= 0 | CHECK | Migration |
| `inventory` | available = on_hand - reserved | App maintains; CHECK `(available = on_hand - reserved)` after trigger | Migration trigger V1.1 |
| `inventory` | available >= 0 | CHECK | Migration |
| `inventory` | Cascade on variant delete | `onDelete: Cascade` | Cleanup |
| `stock_movement` | quantity non-zero | CHECK (`quantity != 0`) | Migration |
| `stock_movement` | reference either present or both null | App | Migration |
| `stock_movement` | Restrict on variant delete | `onDelete: Restrict` | Preserve audit |
| `stock_reservation` | quantity > 0 | CHECK | Migration |
| `stock_reservation` | status constraint | CHECK | Migration |
| `stock_reservation` | Cascade on cart delete | `onDelete: Cascade` | Cart cleanup |
| `stock_reservation` | SetNull on order delete | `onDelete: SetNull` | Order removed, reservation remains |
| `inventory_adjustment` | quantity_delta != 0 | CHECK | Migration |

### 3.4 Media

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `media_file` | provider + providerAssetId unique | `@@unique([provider, providerAssetId])` | No double-ingest |
| `media_file` | size_bytes > 0 | CHECK | Migration |
| `media_file` | SetNull on referenced media | Owner columns nullify | App |

### 3.5 Cart & Checkout

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `cart` | Exactly one owner | XOR CHECK on user_id / guest_session_id | Migration |
| `cart` | expires_at > created_at | CHECK | Migration |
| `cart` | grand_total = subtotal - discount + tax + shipping | App rebuild; CHECK after trigger | Migration trigger V1.1 |
| `cart` | item_count >= 0 | CHECK | Migration |
| `cart` | currency ∈ {VND,…} | CHECK | Migration |
| `cart_item` | quantity > 0 | CHECK | Migration |
| `cart_item` | Unique (cart, variant) | `@@unique([cartId, productVariantId])` | One line per variant |
| `cart_item` | price snapshot non-negative | CHECK | Migration |
| `cart_item` | Reservation 1:1 | `reservationId @unique` | One reservation per cart_item |
| `checkout_session` | idempotency_key unique nullable | `@unique` | Optional |
| `checkout_session` | status enum | `CheckoutSessionStatus` | Restrict states |

### 3.6 Promotion & Tax

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `coupon` | code CITEXT unique | `code @unique @db.Citext` | Case insensitive |
| `coupon` | usage_count <= usage_limit | CHECK | Migration (when limit set) |
| `coupon` | dates valid | CHECK (`ends_at IS NULL OR ends_at > starts_at`) | Migration |
| `coupon` | minOrderTotal >= 0 | CHECK | Migration |
| `coupon` | Restrict on promotion delete | `onDelete: Restrict` | Preserve coupons used |
| `promotion` | discountValue >= 0 | CHECK | Migration |
| `promotion` | percentage cap | CHECK (`type != 'PERCENT_OFF' OR discount_value BETWEEN 0 AND 100`) | Migration |
| `promotion` | usageCount <= usageLimit | CHECK | Migration |
| `promotion` | Combinable cap | App flag | Service |
| `tax_rate` | rate_percent between 0 and 100 | CHECK | Migration |
| `tax_rate` | is_default mutual exclusion | CHECK (`is_default = true` ⇒ only one active row) | Migration unique partial index |
| `tax_exemption` | unique (category, effectiveFrom) | `@@unique` | History per window |

### 3.7 Order

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `order` | order_number unique | `@unique` | Customer-friendly |
| `order` | exactly one of user/guest | XOR CHECK | Migration |
| `order` | grand_total >= 0 | CHECK | Migration |
| `order` | paid_at implies status in (CONFIRMED…) | CHECK | Migration |
| `order` | subtotal + tax + shipping - discount == grand_total | CHECK | Migration trigger |
| `order` | Immutability after `paid_at IS NOT NULL` | PG trigger (UPDATE BLOCKED if `paid_at IS NOT NULL` AND col not in allowlist) | Migration |
| `order_item` | quantity > 0 | CHECK | Migration |
| `order_item` | unit_price >= 0 | CHECK | Migration |
| `order_item` | tax_amount >= 0 | CHECK | Migration |
| `order_item` | line_total = (unit_price * qty) - discount + tax | CHECK via trigger | Migration trigger |
| `order_item` | snapshot fields non-null | NOT NULL on `*_snapshot` | Schema |
| `order_address` | kind ∈ {shipping, billing} | CHECK | Migration |
| `order_status_history` | Append-only (no UPDATE/DELETE by DB role) | DB role + trigger | Migration |

### 3.8 Payment

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `payment` | unique per order | `orderId @unique` | One payment per order |
| `payment` | idempotency_key unique | `@unique` | DB-side idempotency |
| `payment` | amount > 0 | CHECK | Migration |
| `payment` | status enum | `PaymentStatus` | All states |
| `payment_transaction` | amount >= 0 | CHECK | Migration |
| `webhook_event` | unique (provider, event_id) | `@@unique` | De-dupe |
| `webhook_event` | received_at default now | `@default(now())` | Schema |
| `webhook_event` | retry_count >= 0 | CHECK | Migration |
| `refund` | amount > 0 | CHECK | Migration |
| `refund` | status enum | `RefundStatus` | All states |
| `refund` | restict on payment/order delete | `onDelete: Restrict` | Preserve history |

### 3.9 Shipping

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `shipment` | unique per order | `orderId @unique` | One shipment per order |
| `shipment` | tracking_number unique nullable | `@unique` | Optional |
| `shipment` | weight_grams >= 0 | CHECK | Migration |
| `shipment` | shipping_fee >= 0 | CHECK | Migration |
| `tracking_event` | occurred_at <= now | CHECK (trigger) | Migration |
| `shipping_zone` | code unique | `@unique` | Lookup |
| `shipping_rate` | unique (zone, carrier, service) | `@@unique` | Dedup |
| `shipping_rate` | base_fee >= 0 | CHECK | Migration |
| `shipping_rate` | min_weight > 0 | CHECK | Migration |

### 3.10 Returns

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `return` | rma_number unique | `@unique` | Customer-facing |
| `return` | quantity consistency in items | App via service | Service |
| `return` | status enum | `OrderReturnStatus` | All states |
| `return_item` | quantity > 0 | CHECK | Migration |
| `return_inspection` | outcome ∈ {PASS, FAIL} | CHECK | Migration |
| `return_inspection` | restockQuantity >= 0 | CHECK | Migration |
| `return_inspection` | one per return_item | `returnItemId @unique` | One-shot |

### 3.11 Reviews

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `review` | rating 1..5 | CHECK | Migration |
| `review` | status enum | `ReviewStatus` | All states |
| `review` | max one per (user, product) | `@@unique([userId, productId])` | Migration (after multi-tenant) |
| `review_reply` | one per review | `reviewId @unique` | One reply |
| `review_helpful_vote` | unique (review, user) | `@@unique` | One vote per user |

### 3.12 Notifications

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `email_template` | unique (code, locale, version) | `@@unique` | Versioning |
| `notification_log` | status enum | `NotificationStatus` | All states |
| `notification_log` | sent_at required when status = SENT | CHECK | Migration |
| `notification_preference` | unique user | `userId @unique` | One row per user |

### 3.13 Support

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `support_ticket` | ticket_number unique | `@unique` | Customer search |
| `support_ticket` | priority ∈ priorities | CHECK | Migration |
| `support_ticket` | status enum | `TicketStatus` | All states |
| `ticket_message` | body not empty | CHECK (`length(body) > 0`) | Migration |
| `ticket_message` | authorType enum | enum | All states |

### 3.14 Audit

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `audit_log` | Append-only | Trigger rejects UPDATE / DELETE | Migration |
| `audit_log` | category enum | `AuditActionCategory` | All |
| `audit_log` | polymorphic actor XOR | App | Service |

### 3.15 Platform

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `feature_flag` | key unique | `@unique` | Lookup |
| `feature_flag_override` | unique (flag, targetType, targetId) | `@@unique` | Idempotent |
| `static_page` | slug unique | `@unique` | URL routing |
| `system_config` | key unique | `@unique` | Lookup |
| `system_config` | is_secret flagged | CHECK | Migration |

### 3.16 Cross-cutting

| Table | Constraint | Form | Notes |
|---|---|---|---|
| `idempotency_record` | key unique | `@unique` | Header key |
| `idempotency_record` | expires_at in future on insert | CHECK | Migration |
| `idempotency_record` | response_status bound 100..599 | CHECK | Migration |
| `outbox_message` | event_id unique | `@unique` | Idempotency |
| `outbox_message` | status enum (PENDING, DISPATCHED, FAILED) | CHECK | Migration |
| `outbox_message` | retry_count >= 0 | CHECK | Migration |

---

## 4. Cascade Action Matrix (Cross-Cutting)

| Parent Action | Children Effect | Pattern |
|---|---|---|
| DELETE User | Cascade Cart; SetNull RefreshToken.user_id; SetNull SupportTicket.created_by; cascade MfaSecret; cascade RecoveryCode | User lifecycle tied |
| DELETE AdminUser | Cascade Address, MfaSecret, RecoveryCode; SetNull ReviewReply.authorId; SetNull TicketMessage.authorId; SetNull SystemConfig.updated_by | Admin offboarding |
| DELETE Product | Cascade ProductVariant → cascade Inventory & StockReservation → cascade InventoryAdjustment; Restrict on Review; SetNull Brand, Category reference | Catalog hygiene |
| DELETE ProductVariant | Cascade Inventory; Restrict on OrderItem | Order history protected |
| DELETE Cart | Cascade CartItem; Cascade StockReservation | Cart lifecycle |
| DELETE CartItem | SetNull StockReservation | Reservation remains (could expire) |
| DELETE Order | Cascade OrderItem, OrderAddress, OrderStatusHistory; Cascade Shipment → cascade TrackingEvent; Restrict on Payment / Refund; Restrict on Return | Order history preserved |
| DELETE Payment | Restrict on Refund; Cascade PaymentTransaction | Refund history preserved |
| DELETE Shipment | Cascade TrackingEvent | Log preservation tied |
| DELETE Review | Cascade ReviewReply; Cascade ReviewHelpfulVote | Cleanup |
| DELETE SupportTicket | Cascade TicketMessage | Thread lifecycle |
| DELETE FeatureFlag | Cascade FeatureFlagOverride | Cleanup |
| DELETE StaticPage | Soft delete enforced | No cascade |
| DELETE OutboxMessage | Forbid via DB role | Append-only integrity |

---

## 5. Trigger / Migration-Maintained Constraints (V1.1)

> The MVP schema does not include Postgres triggers; the implementation phase adds them via a `prisma migrate` migration. They are listed here so the application code respects them.

| # | Trigger | Logic |
|---|---|---|
| T-01 | `audit_log_no_modify` | Reject UPDATE / DELETE on `audit_log` |
| T-02 | `order_immutable_after_paid` | Block UPDATE on `order` columns except `updated_at` once `paid_at IS NOT NULL` |
| T-03 | `order_item_immutable` | Block UPDATE on `order_item` once parent `paid_at IS NOT NULL` |
| T-04 | `webhook_event_idempotency` | Insert ignore on duplicate `(provider, event_id)` |
| T-05 | `inventory_available_sync` | After UPDATE of `on_hand` or `reserved`, compute `available = on_hand - reserved` |
| T-06 | `cart_totals_recompute` | Recompute subtotal/tax/grand_total on item changes |
| T-07 | `coupon_usage_limit_enforce` | Reject INSERT/UPDATE on `voucher_usage` if `usage_count >= usage_limit` |
| T-08 | `idempotency_inflight_lifecycle` | First writer wins; reject second with `inFlight=true` |
| T-09 | `payment_capture_immutable` | After `status='CAPTURED'`, deny direct UPDATE |
| T-10 | `stock_movement_no_modify` | Reject UPDATE / DELETE on `stock_movement` |

---

## 6. Check Constraint Mapping Summary (Approx.)

| Constraint family | Count |
|---|---|
| Range / non-negative | 40+ |
| Format (email, phone, ZIP, slug) | 8 |
| Enum-like (status, type) | 25 |
| Time window | 6 |
| Polymorphic XOR | 7 |
| Money invariants | 8 |
| State-derived | 6 |

Total: ~110 CHECK constraints added in V1.1 migration.

---

## 7. Constraint Implementation Plan

| Layer | Tool | Step |
|---|---|---|
| 1. Prisma schema | Validation at codegen | Now (this phase) |
| 2. Migration adds indexes | `prisma migrate dev` | Implementation phase |
| 3. Migration adds CHECK + partial UNIQUE | `prisma migrate dev --create-only` raw SQL | Implementation phase |
| 4. DB roles for append-only | `npx prisma migrate` raw SQL | V1.1 |
| 5. Application invariants | Zod / class-validator at API | Implementation |

---

## 8. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial constraint catalogue |

---

**End of 05_CONSTRAINTS_AND_RULES.md**

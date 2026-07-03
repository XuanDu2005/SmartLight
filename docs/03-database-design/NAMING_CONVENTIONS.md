# NAMING_CONVENTIONS.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal Database Architect

---

## 1. Purpose

This document defines the **naming conventions** for SmartLight's database layer. Consistency is critical for V2 microservice extraction and for Prisma compatibility.

This applies to:
- Tables
- Columns
- Primary keys
- Foreign keys
- Unique constraints
- Indexes
- Enums
- Prisma model names
- API DTO names

---

## 2. General Principles

1. **English only** — all names in English; user-facing content uses Vietnamese.
2. **Lowercase** — no uppercase in identifiers.
3. **No abbreviations** unless widely understood (e.g., `id`, `sku`).
4. **No plural** — table names are singular.
5. **No reserved words** — avoid SQL/Prisma/TypeScript keywords.
6. **Snake_case** for SQL identifiers.
7. **CamelCase** for Prisma model names (matches Prisma default).
8. **CamelCase** for TypeScript/Prisma property names.

---

## 3. Table Naming

### 3.1 Format

**`<entity_name>`** — singular, snake_case.

| Pattern | Example |
| --- | --- |
| Regular entity | `user`, `product`, `order` |
| Junction | `<a>_<b>` (alphabetical) | `admin_user_role`, `role_permission` |
| Composite value | `<entity>_<value>` | `order_item`, `cart_item` |
| Log/history | `<entity>_log` or `<entity>_history` | `audit_log`, `order_status_history` |
| Image/media | `<entity>_image`, `<entity>_media` | `product_image`, `return_image` |
| Usage record | `<entity>_usage` | `promotion_usage`, `voucher_usage` |
| Snapshot | `<entity>_snapshot` | (rare; e.g., address_snapshot) |

### 3.2 Tables vs Aggregate Roots

Each aggregate root has its own table. Internal entities of the aggregate may either:
- Be embedded as JSONB (for value objects), OR
- Have their own table (for queried entities)

### 3.3 Schema Prefixes (Conceptual)

Schemas group tables by bounded context:

| Schema | Tables |
| --- | --- |
| `identity` | user, admin_user, role, permission, address, mfa_secret, ... |
| `catalog` | category, brand, product, product_variant, ... |
| `inventory` | inventory, stock_reservation, stock_movement, ... |
| ... | ... |

> In V1 with single DB, schemas are organizational; no physical separation required. In V2 (microservices), schemas become physical databases.

### 3.4 Complete Table List

| Entity | Table Name |
| --- | --- |
| User | `user` |
| AdminUser | `admin_user` |
| Role | `role` |
| Permission | `permission` |
| AdminUserRole | `admin_user_role` |
| RolePermission | `role_permission` |
| Address | `address` |
| MfaSecret | `mfa_secret` |
| RecoveryCode | `recovery_code` |
| RefreshToken | `refresh_token` |
| UserSession | `user_session` |
| Category | `category` |
| Brand | `brand` |
| Product | `product` |
| ProductVariant | `product_variant` |
| ProductImage | `product_image` |
| ProductAttribute | `product_attribute` |
| ProductAttributeValue | `product_attribute_value` |
| Inventory | `inventory` |
| StockReservation | `stock_reservation` |
| StockMovement | `stock_movement` |
| InventoryAdjustment | `inventory_adjustment` |
| MediaFile | `media_file` |
| Cart | `cart` |
| CartItem | `cart_item` |
| Wishlist (V1.1) | `wishlist` |
| WishlistItem (V1.1) | `wishlist_item` |
| CheckoutSession | `checkout_session` |
| Promotion | `promotion` |
| PromotionUsage | `promotion_usage` |
| Voucher | `voucher` |
| VoucherUsage | `voucher_usage` |
| TaxRate | `tax_rate` |
| TaxExemption | `tax_exemption` |
| Order | `order` |
| OrderItem | `order_item` |
| OrderAddress | `order_address` |
| OrderStatusHistory | `order_status_history` |
| Payment | `payment` |
| PaymentTransaction | `payment_transaction` |
| WebhookEvent | `webhook_event` |
| Refund | `refund` |
| ShippingZone | `shipping_zone` |
| ShippingRate | `shipping_rate` |
| Shipment | `shipment` |
| TrackingEvent | `tracking_event` |
| Return | `return` |
| ReturnItem | `return_item` |
| ReturnInspection | `return_inspection` |
| ReturnImage | `return_image` |
| Review | `review` |
| ReviewReply | `review_reply` |
| ReviewHelpfulVote | `review_helpful_vote` |
| EmailTemplate | `email_template` |
| NotificationLog | `notification_log` |
| NotificationPreference | `notification_preference` |
| CookieConsent | `cookie_consent` |
| SupportTicket | `support_ticket` |
| TicketMessage | `ticket_message` |
| AuditLog | `audit_log` |
| FeatureFlag | `feature_flag` |
| FeatureFlagOverride | `feature_flag_override` |
| StaticPage | `static_page` |
| SystemConfig | `system_config` |

---

## 4. Column Naming

### 4.1 Format

**`snake_case`**, lowercase, no abbreviations.

### 4.2 Common Columns

| Concept | Column Name | Notes |
| --- | --- | --- |
| Primary key | `id` | Always UUID (string in MVP; native UUID V1.5+) |
| Foreign key | `<entity>_id` | E.g., `customer_id`, `product_id` |
| Created at | `created_at` | UTC timestamp |
| Updated at | `updated_at` | UTC timestamp |
| Deleted at (soft) | `deleted_at` | Nullable; UTC |
| Status | `status` | String enum |
| Name | `name` | Short string |
| Description | `description` | Longer text |
| Slug | `slug` | URL-safe |
| Email | `email` | Lowercase enforced |
| Phone | `phone` | +84 format |
| Code | `code` | Alphanumeric |
| SKU | `sku` | Unique product code |
| Price | `price` | Money integer (xu) |
| Compare-at price | `compare_at_price` | Money integer (xu) |
| Cost | `cost` or `cost_price` | Money integer (xu) |
| Currency | `currency` | "VND" in MVP |
| Quantity | `quantity` | Integer |
| Stock | `stock_on_hand`, `stock_reserved` | Integer |
| Threshold | `low_stock_threshold` | Integer |
| Note / Comment | `notes` or `note` | Text |
| Reason | `reason` or `reason_code` + `reason_text` | Enum + text |
| Type | `type` | Enum string |
| Status | `status` | Enum string |
| Order | `display_order` | Integer |
| Version | `version` | Integer (optimistic locking) |
| Active flag | `is_active` or `active` | Boolean |
| Default flag | `is_default` or `is_default` | Boolean |
| Primary flag | `is_primary` or `is_primary` | Boolean |
| Flag pattern | `is_*` or `*_at` for timestamps |

### 4.3 Boolean Columns

- Prefix with `is_` when ambiguous: `is_active`, `is_primary`
- For known-bool columns: `active`, `enabled` acceptable
- Default `false` unless explicitly true

### 4.4 Timestamp Columns

- Always UTC
- Always nullable for "happened-at" timestamps (until event occurs)
- Always non-null for `created_at`

### 4.5 Money Columns

- Integer in VND xu (1 VND = 100 xu)
- Examples: `price`, `total`, `tax_amount`, `discount_amount`, `shipping_fee`
- Companion `currency` column ("VND" in MVP)

### 4.6 Polymorphic Columns

- Two columns: `<concept>_type` (enum) + `<concept>_id` (text)
- Example: `owner_type` + `owner_id`

---

## 5. Primary Keys

### 5.1 Format

| Pattern | Example |
| --- | --- |
| `<table>.id` | `user.id` |
| Type | UUID v7 (stored as `text` in MVP; `uuid` in PostgreSQL native) |

### 5.2 Naming

- Always `id`
- Never `<table>_id` for PK
- Use `<table>_id` only for FK references

### 5.3 Special Identifiers

Some entities use business keys in addition to UUID:

| Entity | Business Key | Example |
| --- | --- | --- |
| Order | `order_number` | "20260703-0001" |
| Return | `rma_number` | "RMA-0001" |
| SupportTicket | `ticket_number` | "T-0001" |
| Voucher | `code` | "SUMMER10" |

---

## 6. Foreign Keys

### 6.1 Format

`<referenced_entity_singular>_id`

| Reference | Column |
| --- | --- |
| User | `user_id` (not `customer_id`, even for customer references) |
| Product | `product_id` |
| ProductVariant | `variant_id` (not `product_variant_id`) |
| Order | `order_id` |
| Cart | `cart_id` |

### 6.2 Polymorphic FKs

`<concept>_type` + `<concept>_id`:

| Concept | Columns |
| --- | --- |
| Owner (User/AdminUser) | `owner_type` + `owner_id` |
| Actor | `actor_type` + `actor_id` |
| Recipient | `recipient_type` + `recipient_id` |
| Sender | `sender_type` + `sender_id` |

### 6.3 FK Constraint Naming (Future-Proof)

Even though V1 doesn't have actual FK constraints, when added in V2:

```
fk_<table>_<column>
fk_orders_customer_id
fk_cart_items_cart_id
```

---

## 7. Unique Constraints

### 7.1 Format

| Pattern | Example |
| --- | --- |
| Single column | `uq_<table>_<column>` |
| Multi-column | `uq_<table>_<col1>_<col2>` |

### 7.2 Examples

| Constraint | Pattern | Example |
| --- | --- | --- |
| User email | `uq_user_email` | — |
| SKU | `uq_product_variant_sku` | — |
| Order number | `uq_order_order_number` | — |
| Code + locale | `uq_email_template_code_locale` | — |
| Owner MFA | `uq_mfa_secret_owner_type_owner_id` | — |

---

## 8. Indexes

### 8.1 Format

| Type | Pattern |
| --- | --- |
| Primary key | `pk_<table>` |
| Unique | `uq_<table>_<col>` (same as unique constraint) |
| FK (within aggregate) | `fk_<table>_<col>` |
| Single column B-tree | `idx_<table>_<col>` |
| Composite | `idx_<table>_<col1>_<col2>` |
| Partial | `idx_<table>_<col>_where_<cond>` |
| GIN | `gin_<table>_<col>` |
| BRIN | `brin_<table>_<col>` |
| Full-text | `fts_<table>_<col>` |

### 8.2 Examples

| Index | Pattern |
| --- | --- |
| Email lookup | `idx_user_email` or `uq_user_email` |
| Cart by user | `idx_cart_user_id` |
| Orders by user, recent | `idx_order_user_id_created_at` |
| Active products | `idx_product_status_where_active` |
| JSONB search | `gin_audit_log_before` |

---

## 9. Constraints

### 9.1 Format

`<table>_<column>_<rule>`

| Rule | Pattern | Example |
| --- | --- | --- |
| NOT NULL | (implicit) | — |
| UNIQUE | `uq_*` | See §7 |
| CHECK | `ck_<table>_<col>_<cond>` | `ck_product_price_positive` |
| DEFAULT | `df_<table>_<col>` | `df_order_currency_vnd` |
| PRIMARY KEY | `pk_*` | `pk_user` |
| FOREIGN KEY (V2) | `fk_*` | See §6 |

### 9.2 Check Constraints Examples

| Constraint | Pattern |
| --- | --- |
| Price >= 0 | `ck_product_variant_price_non_negative` |
| Stock >= 0 | `ck_inventory_stock_on_hand_non_negative` |
| Quantity > 0 | `ck_cart_item_quantity_positive` |
| Rating 1..5 | `ck_review_rating_range` |
| Email format | `ck_user_email_format` |
| Phone format | `ck_address_phone_format` |
| Money integer | `ck_*_amount_integer` |

---

## 10. Enums

### 10.1 Format

`<entity>_<field>_enum` (PostgreSQL native) OR string check constraint.

### 10.2 Naming

| Pattern | Example |
| --- | --- |
| PascalCase or snake_case | `order_status`, `OrderStatus` |
| Singular form | `order_status` (not `order_statuses`) |

### 10.3 Major Enums

| Enum | Values |
| --- | --- |
| `user_status` | Active, Suspended, Closed, PendingVerification |
| `admin_user_status` | Active, Suspended, Invited |
| `address_owner_type` | User, AdminUser |
| `product_status` | Draft, Published, Unpublished, Archived |
| `order_status` | Pending, Confirmed, Processing, Shipped, Delivered, Completed, Cancelled, Returned |
| `payment_status` | Pending, Authorized, Captured, PartiallyRefunded, Refunded, Failed, Cancelled, Voided |
| `payment_method` | VnpayCard, VnpayBank, Momo, ZaloPay, BankTransfer |
| `refund_status` | Pending, Processed, Failed |
| `payment_transaction_type` | Authorize, Capture, Void, Refund |
| `shipment_status` | Created, Dispatched, InTransit, Delivered, Lost, Returned |
| `return_status` | Pending, Approved, Rejected, Received, Inspecting, Inspected, Restocked, Disposed, Refunded |
| `return_inspection_outcome` | Pass, Fail |
| `review_status` | Pending, Published, Rejected |
| `ticket_status` | Open, Pending, Resolved, Closed |
| `ticket_priority` | Low, Medium, High |
| `promotion_type` | Percentage, Fixed, Flash, Bundle |
| `promotion_status` | Draft, Scheduled, Active, Paused, Expired, Depleted, Cancelled |
| `promotion_applicable_type` | All, Category, Product |
| `voucher_status` | Draft, Active, Paused, Expired, Depleted, Cancelled |
| `cart_status` | Active, Converted, Abandoned, Expired |
| `cart_owner_type` | User, Guest |
| `checkout_session_status` | Active, Completed, Expired, Abandoned |
| `reservation_status` | Active, Consumed, Released, Expired |
| `stock_movement_type` | OrderSale, OrderCancel, ReturnRestock, ReturnDispose, ManualAdjustment, InitialStock |
| `adjustment_reason_code` | Damage, Audit, Theft, Other, RestockFromReturn |
| `notification_status` | Queued, Sent, Failed, Bounced |
| `notification_channel` | Email, Sms, Push |
| `email_template_locale` | vi-VN, en-US |
| `notification_recipient_type` | User, AdminUser, Guest |
| `notification_owner_type` | User, AdminUser |
| `audit_actor_type` | User, AdminUser, System, Anonymous |
| `support_sender_type` | User, AdminUser, System |
| `support_assignee_type` | AdminUser |
| `feature_flag_value_type` | Boolean, String, Number, Json |
| `feature_flag_override_target_type` | User, Segment, Percentage |

---

## 11. Prisma Model Naming

### 11.1 Models

Prisma uses the same name as the table but in **PascalCase singular**:

| Table | Prisma Model |
| --- | --- |
| `user` | `User` |
| `admin_user` | `AdminUser` |
| `product_variant` | `ProductVariant` |
| `cart_item` | `CartItem` |
| `order_status_history` | `OrderStatusHistory` |

### 11.2 Mapping

Use `@map` and `@@map`:

```
model User {
  id    String @id @map("id")
  email String @map("email") @unique

  @@map("user")
}
```

### 11.3 Fields

| Concept | Prisma Field | DB Column |
| --- | --- | --- |
| Primary key | `id` | `id` |
| Created at | `createdAt` | `created_at` |
| Updated at | `updatedAt` | `updated_at` |
| Deleted at | `deletedAt` | `deleted_at` |
| Foreign key | `userId` | `user_id` |

### 11.4 Relations

| Prisma | Meaning |
| --- | --- |
| `user User? @relation(...)` | FK field |
| `orders Order[]` | Reverse relation |
| `@@index([userId])` | Index |

### 11.5 Enums

Prisma enums use PascalCase and are mapped to PostgreSQL enums:

```
enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  COMPLETED
  CANCELLED
  RETURNED

  @@map("order_status")
}
```

### 11.6 Composite Unique

```
@@unique([cartId, variantId])
@@unique([ownerType, ownerId])
```

---

## 12. API DTO Naming

### 12.1 Request DTOs

| Verb | Pattern | Example |
| --- | --- | --- |
| Create | `Create<Entity>Dto` | `CreateProductDto` |
| Update | `Update<Entity>Dto` | `UpdateProductDto` |
| Partial update | `Patch<Entity>Dto` | (rare) |
| Query | `<Entity>QueryDto` | `ProductQueryDto` |
| Filter | `<Entity>FilterDto` | `OrderFilterDto` |

### 12.2 Response DTOs

| Verb | Pattern | Example |
| --- | --- | --- |
| Single | `<Entity>Dto` | `ProductDto` |
| List item | `<Entity>SummaryDto` or `<Entity>ListItemDto` | `ProductSummaryDto` |
| Detailed | `<Entity>DetailDto` | `ProductDetailDto` |
| Paginated | `Paginated<Entity>Dto` | `PaginatedProductDto` |

### 12.3 Field Naming

DTOs use **camelCase**:

```typescript
{
  productId: "uuid",
  productName: "string",
  unitPrice: 20000000,  // integer xu
  createdAt: "2026-07-03T...",
  isActive: true
}
```

### 12.4 Money in DTOs

Always returned as **integer (xu)**. The client formats to VND.

---

## 13. Reserved Words to Avoid

| Reserved | Use Instead |
| --- | --- |
| `user` | `user` (allowed in PostgreSQL but care needed in some contexts) |
| `order` | `order` (reserved in SQL) — use `purchase_order` if issues |
| `group` | `role`, `category` |
| `select` | avoid as column name |
| `from` | avoid as column name |
| `to` | use `recipient` instead |
| `key` | use `code`, `slug`, `token` |
| `value` | use `value_text`, `value_number` |
| `where` | avoid |
| `count` | use `quantity`, `total` |
| `timestamp` | use `created_at`, `updated_at` |
| `datetime` | use `created_at`, etc. |

---

## 14. Migration File Naming

| Pattern | Example |
| --- | --- |
| `YYYYMMDDHHMMSS_<description>` | `20260703120000_create_identity_tables` |
| Description | snake_case, verb-led |

---

## 15. Examples (End-to-End)

### 15.1 Order Entity

**DB:**
- Table: `order`
- Columns: `id`, `order_number`, `user_id`, `guest_email`, `status`, `currency`, `subtotal`, `tax_amount`, `total`, `created_at`, `updated_at`, `deleted_at`
- Indexes: `pk_order`, `uq_order_order_number`, `idx_order_user_id`, `idx_order_user_id_created_at`, `idx_order_status`

**Prisma:**
```
model Order {
  id            String    @id
  orderNumber   String    @unique @map("order_number")
  userId        String?   @map("user_id")
  guestEmail    String?   @map("guest_email")
  status        OrderStatus
  currency      String    @default("VND")
  subtotal      BigInt
  taxAmount     BigInt    @map("tax_amount")
  total         BigInt
  createdAt     DateTime  @map("created_at")
  updatedAt     DateTime  @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  user          User?         @relation(fields: [userId], references: [id])
  items         OrderItem[]
  payment       Payment?
  shipment      Shipment?

  @@map("order")
  @@index([userId, createdAt(sort: Desc)])
  @@index([status])
}
```

**DTO:**
```typescript
export class OrderDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;          // xu
  taxAmount: number;          // xu
  total: number;              // xu
  currency: 'VND';
  createdAt: string;
  // ...
}
```

---

## 16. Coverage Validation

| Check | Status |
| --- | --- |
| Tables snake_case singular | ✓ |
| Columns snake_case | ✓ |
| PKs always `id` | ✓ |
| FKs `<entity>_id` | ✓ |
| Polymorphic FKs `<concept>_type` + `<concept>_id` | ✓ |
| Money integer (xu) | ✓ |
| Timestamps UTC | ✓ |
| Prisma PascalCase singular | ✓ |
| DTO PascalCase + suffix | ✓ |
| Reserved words avoided | ✓ |

---

## 17. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal Database Architect | Initial naming conventions: tables, columns, PKs, FKs, unique, indexes, enums, Prisma models, DTOs, reserved words |

---

**End of Document — NAMING_CONVENTIONS.md**
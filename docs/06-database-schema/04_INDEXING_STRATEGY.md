# 04 — Indexing Strategy

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04
**Author:** Principal Database Architect

---

## 1. Purpose

This document defines the **indexing strategy** for the SmartLight database. Goals:

- Sub-50 ms p95 catalog reads.
- Hot-path writes (< 5 ms update).
- Maintain zero-locked DELETEs via partial indexes on soft-delete.
- Search-friendly (V1.1 trigram + GIN for fuzzy).

The PostgreSQL indexing features used:

| Index kind | Use |
|---|---|
| B-tree (default) | Equality / range / ORDER BY on scalars |
| GIN | Trigram (`pg_trgm`), JSONB containment |
| Partial | `WHERE deleted_at IS NULL` to keep index size small |
| Composite | Multi-column with leading equality column |
| Hash | Reserved for exact-match UUID lookups in V2 |

---

## 2. Universal Rules

1. **Primary key** is automatically indexed (B-tree).
2. **Every FK** must have an indexed leading column (the FK side).
3. **Soft-delete** filter `deletedAt` IS NULL on hot listings ⇒ **partial composite** indexes.
4. **`createdAt` DESC** indexes on time-ordered tables (orders, payment_log, audit_log).
5. **Order-status hot path**: composite `(status, createdAt DESC)` for ops dashboards.
6. **JSONB columns** are NOT indexed in MVP; V1.1 adds GIN trigram on `product.tags`.
7. **No** indexes on low-cardinality enum columns alone (e.g., `status`); only as composite.

---

## 3. Naming Convention

| Type | Name pattern | Example |
|---|---|---|
| Single column | `idx_{table}_{col}` | `idx_user_email` |
| Composite | `idx_{table}_{col1}_{col2}` | `idx_product_status_published` |
| Unique single | `uq_{table}_{col}` | `uq_user_email` |
| Unique composite | `uq_{table}_{col1}_{col2}` | `uq_admin_user_role_admin_id_role_id` |
| Partial | `part_{table}_{rest_of_name}_active` | `part_product_slug_active` |

> Prisma `@@index([...])` does not directly emit "idx" names; in the generated SQL migration we will rename indexes following this convention.

---

## 4. Index Inventory by Context

### 4.1 Identity

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `user` | `uq_user_email` | `email` | UNIQUE B-tree | Login |
| `user` | `idx_user_phone` | `phone` | B-tree | Profile lookup |
| `user` | `idx_user_status` | `status` | B-tree | Admin operations |
| `user` | `idx_user_deleted_at` | `deleted_at` | partial `WHERE deleted_at IS NULL` | Active scans |
| `user` | `idx_user_created_at` | `created_at DESC` | B-tree | Growth reporting |
| `admin_user` | `uq_admin_user_email` | `email` | UNIQUE | Login |
| `admin_user` | `idx_admin_user_status` | `status` | B-tree | Admin list |
| `refresh_token` | `uq_refresh_token_hash` | `token_hash` | UNIQUE | Lookup by hash |
| `refresh_token` | `idx_refresh_token_user_id` | `user_id` | B-tree | Revoke by user |
| `refresh_token` | `idx_refresh_token_expires_at` | `expires_at` | B-tree | Cleanup job |
| `user_session` | `idx_user_session_user_id_status` | `(user_id, status)` | composite B-tree | Active-sessions list |
| `user_session` | `idx_user_session_expires_at` | `expires_at` | B-tree | Expiry sweep |
| `mfa_secret` | `uq_mfa_secret_user_id` | `user_id` | UNIQUE | One MFA per user |
| `recovery_code` | `uq_recovery_code_secret_hash` | `(mfa_secret_id, code_hash)` | UNIQUE | One-shot redemption |
| `address` | `idx_address_user` | `user_id` | B-tree | Address book |
| `address` | `idx_address_province_district` | `(province_code, district_code)` | B-tree | Shipping logic |

### 4.2 Catalog

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `category` | `uq_category_slug` | `slug` | UNIQUE | URL routing |
| `category` | `idx_category_parent_id` | `parent_id` | B-tree | Tree traversal |
| `category` | `idx_category_status_display_order` | `(status, display_order)` | B-tree | Active listing |
| `category` | `idx_category_path` | `path` | B-tree prefix | Descendant queries |
| `brand` | `uq_brand_slug` | `slug` | UNIQUE | URL routing |
| `brand` | `idx_brand_status` | `status` | B-tree | Active brands |
| `product` | `uq_product_slug_active` | `slug` | UNIQUE partial `WHERE deleted_at IS NULL` | Listing pages |
| `product` | `idx_product_category_status_published` | `(category_id, status, published_at DESC)` | composite | Category browse |
| `product` | `idx_product_status_published` | `(status, published_at DESC)` | composite | Latest list |
| `product` | `idx_product_brand_status` | `(brand_id, status)` | composite | Brand pages |
| `product` | `idx_product_is_featured_status` | `(is_featured, status)` | partial `WHERE is_featured = TRUE` | Featured rail |
| `product` | `idx_product_tags_gin` | `tags` | GIN | Tag filter (V1.1) |
| `product` | `idx_product_deleted_at` | `deleted_at` | partial | Soft delete |
| `product_variant` | `uq_product_variant_sku_active` | `sku` | UNIQUE | SKU lookup; partial active |
| `product_variant` | `idx_product_variant_product_status_order` | `(product_id, status, display_order)` | composite | Variant group |
| `product_image` | `idx_product_image_product_order` | `(product_id, display_order)` | composite | Gallery order |
| `product_image` | `idx_product_image_media` | `media_id` | B-tree | Reverse lookup |
| `product_attribute` | `uq_product_attribute_code` | `code` | UNIQUE | Attribute list |
| `product_attribute_value` | `uq_product_attribute_value_product_attribute` | `(product_id, attribute_id)` | UNIQUE | One value/attribute |
| `product_attribute_value` | `idx_product_attribute_value_attribute` | `attribute_id` | B-tree | Filter by attribute |

### 4.3 Inventory

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `inventory` | `uq_inventory_variant_warehouse` | `(product_variant_id, warehouse_code)` | UNIQUE | One per warehouse |
| `inventory` | `idx_inventory_available` | `available` | B-tree | Low-stock alert |
| `inventory` | `idx_inventory_low_stock_threshold` | `low_stock_threshold` | B-tree | Threshold scans |
| `stock_movement` | `idx_stock_movement_variant_created_at` | `(product_variant_id, created_at DESC)` | composite | Movement log |
| `stock_movement` | `idx_stock_movement_type` | `type` | B-tree | Type analysis |
| `stock_movement` | `idx_stock_movement_reference` | `(reference_type, reference_id)` | composite | Reverse lookup |
| `stock_movement` | `idx_stock_movement_created_at` | `created_at DESC` | B-tree | Time range scans |
| `stock_reservation` | `idx_stock_reservation_variant_status` | `(product_variant_id, status)` | composite | Active reservations |
| `stock_reservation` | `idx_stock_reservation_status_expires_at` | `(status, expires_at)` | composite | Expiry sweep |
| `stock_reservation` | `idx_stock_reservation_cart` | `cart_id` | B-tree | Cart cleanup |
| `inventory_adjustment` | `idx_inventory_adjustment_variant_created_at` | `(product_variant_id, created_at DESC)` | composite | Adjustment history |

### 4.4 Media

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `media_file` | `idx_media_file_provider_asset_id` | `(provider, provider_asset_id)` | composite | Cloudinary reverse lookup |
| `media_file` | `idx_media_file_owner` | `(owner_type, owner_id)` | composite | Owner index |
| `media_file` | `idx_media_file_purpose_deleted_at` | `(purpose, deleted_at)` | partial | Listing purge candidates |

### 4.5 Cart & Checkout

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `cart` | `idx_cart_user_status` | `(user_id, status)` | composite | User cart list |
| `cart` | `idx_cart_guest_session_status` | `(guest_session_id, status)` | composite | Guest cart |
| `cart` | `idx_cart_status_expires_at` | `(status, expires_at)` | composite | Expiry sweep |
| `cart` | `idx_cart_last_activity_at` | `last_activity_at` | B-tree | Activity tracking |
| `cart_item` | `uq_cart_item_cart_variant` | `(cart_id, product_variant_id)` | UNIQUE | One line per variant |
| `checkout_session` | `idx_checkout_session_cart` | `cart_id` | B-tree | Session lookup |
| `checkout_session` | `idx_checkout_session_status_expires_at` | `(status, expires_at)` | composite | Expiry sweep |
| `checkout_session` | `uq_checkout_session_idempotency` | `idempotency_key` | UNIQUE | Duplicate-check |

### 4.6 Promotion & Tax

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `coupon` | `uq_coupon_code` | `code` | UNIQUE | Code validation (case-insensitive via citext) |
| `coupon` | `idx_coupon_status_ends_at` | `(status, ends_at)` | composite | Active coupons |
| `coupon` | `idx_coupon_starts_ends` | `(starts_at, ends_at)` | composite | Schedule scan |
| `promotion` | `idx_promotion_status_starts_at` | `(status, starts_at)` | composite | Activation scan |
| `promotion` | `idx_promotion_status_ends_at` | `(status, ends_at)` | composite | Expiry scan |
| `promotion` | `idx_promotion_type` | `type` | B-tree | Type filter |
| `voucher_usage` | `uq_voucher_usage_unique` | `(coupon_id, user_id, order_id)` | UNIQUE | Per-user-per-order uniqueness |
| `promotion_usage` | `uq_promotion_usage_unique` | `(promotion_id, user_id, order_id)` | UNIQUE | Same |
| `tax_rate` | `uq_tax_rate_code` | `code` | UNIQUE | Code lookup |
| `tax_rate` | `idx_tax_rate_active_effective_from` | `(is_active, effective_from)` | composite | Default rate selector |
| `tax_exemption` | `uq_tax_exemption_category_effective_from` | `(category_id, effective_from)` | UNIQUE | Active window anchor |

### 4.7 Order

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `order` | `uq_order_number` | `order_number` | UNIQUE | Customer-facing search |
| `order` | `idx_order_user_status` | `(user_id, status)` | composite | Customer dashboard |
| `order` | `idx_order_status_created_at` | `(status, created_at DESC)` | composite | Admin ops |
| `order` | `idx_order_created_at` | `created_at DESC` | B-tree | Reporting |
| `order` | `idx_order_guest_email` | `guest_email` | B-tree | Guest lookup |
| `order` | `idx_order_paid_at` | `paid_at` | B-tree | Paid-orders |
| `order_item` | `idx_order_item_order` | `order_id` | B-tree | Join |
| `order_item` | `idx_order_item_variant` | `product_variant_id` | B-tree | Variant sales analytics |
| `order_address` | `idx_order_address_order` | `order_id` | B-tree | Order sheet |
| `order_status_history` | `idx_order_status_history_order_created_at` | `(order_id, created_at DESC)` | composite | Timeline |

### 4.8 Payment

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `payment` | `uq_payment_order` | `order_id` | UNIQUE | One payment per order |
| `payment` | `uq_payment_idempotency_key` | `idempotency_key` | UNIQUE | Idempotency |
| `payment` | `idx_payment_provider_status` | `(provider, status)` | composite | Provider ops |
| `payment` | `idx_payment_status_created_at` | `(status, created_at DESC)` | composite | Settlement ops |
| `payment` | `idx_payment_provider_txn_id` | `provider_txn_id` | B-tree | Webhook lookup |
| `payment_transaction` | `idx_payment_transaction_payment_created_at` | `(payment_id, created_at DESC)` | composite | History |
| `webhook_event` | `uq_webhook_event_provider_event_id` | `(provider, event_id)` | UNIQUE | Idempotency |
| `webhook_event` | `idx_webhook_event_provider_event_type` | `(provider, event_type)` | composite | Filtering |
| `webhook_event` | `idx_webhook_event_status_received_at` | `(status, received_at)` | composite | Processing queue |
| `webhook_event` | `idx_webhook_event_archived_at` | `archived_at` | partial | Archiver |
| `refund` | `idx_refund_payment` | `payment_id` | B-tree | Refund history |
| `refund` | `idx_refund_order` | `order_id` | B-tree | Order refunds |
| `refund` | `idx_refund_status` | `status` | B-tree | State filter |

### 4.9 Shipping

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `shipment` | `uq_shipment_order` | `order_id` | UNIQUE | One per order |
| `shipment` | `uq_shipment_tracking_number` | `tracking_number` | UNIQUE | Tracking |
| `shipment` | `idx_shipment_carrier_status` | `(carrier, status)` | composite | Ops dashboard |
| `shipment` | `idx_shipment_status_created_at` | `(status, created_at)` | composite | Aging |
| `tracking_event` | `idx_tracking_event_shipment_occurred_at` | `(shipment_id, occurred_at DESC)` | composite | Reverse chronological |
| `shipping_zone` | `uq_shipping_zone_code` | `code` | UNIQUE | Zone lookup |
| `shipping_rate` | `uq_shipping_rate_zone_carrier_service` | `(zone_id, carrier, service_code)` | UNIQUE | Rate dedup |
| `shipping_rate` | `idx_shipping_rate_carrier_active` | `(carrier, is_active)` | partial | Quote-time |

### 4.10 Returns

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `return` | `uq_return_rma_number` | `rma_number` | UNIQUE | Customer search |
| `return` | `idx_return_order` | `order_id` | B-tree | Order details |
| `return` | `idx_return_user_status` | `(user_id, status)` | composite | Customer dashboard |
| `return` | `idx_return_status_created_at` | `(status, created_at)` | composite | Ops |
| `return_item` | `idx_return_item_return` | `return_id` | B-tree | Detail |
| `return_item` | `idx_return_item_order_item` | `order_item_id` | B-tree | Origin lookup |

### 4.11 Reviews

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `review` | `idx_review_product_status_created_at` | `(product_id, status, created_at DESC)` | composite | Product reviews tab |
| `review` | `idx_review_user` | `user_id` | B-tree | User's reviews |
| `review` | `idx_review_rating` | `rating` | partial `WHERE status = 'PUBLISHED'` | Rating filters |
| `review_helpful_vote` | `uq_review_helpful_vote_review_user` | `(review_id, user_id)` | UNIQUE | One vote per user |

### 4.12 Notifications

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `email_template` | `uq_email_template_code_locale_version` | `(code, locale, version)` | UNIQUE | Version anchor |
| `email_template` | `idx_email_template_active_lookup` | `(code, locale, is_active)` | partial `WHERE is_active = TRUE` | Active template pull |
| `notification_log` | `idx_notification_log_recipient_user` | `(recipient_user_id, created_at DESC)` | composite | User inbox |
| `notification_log` | `idx_notification_log_status_created_at` | `(status, created_at DESC)` | composite | Delivery ops |
| `notification_log` | `idx_notification_log_recipient_email` | `recipient_email` | B-tree | Bounce lookup |
| `notification_log` | `idx_notification_log_created_at` | `created_at DESC` | B-tree | Time scan |
| `notification_preference` | `uq_notification_preference_user` | `user_id` | UNIQUE | One per user |
| `cookie_consent` | `idx_cookie_consent_user` | `user_id` | B-tree | User consent |
| `cookie_consent` | `idx_cookie_consent_session` | `session_id` | B-tree | Guest consent |
| `cookie_consent` | `idx_cookie_consent_accepted_at` | `accepted_at` | B-tree | Policy change audit |

### 4.13 Support

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `support_ticket` | `uq_support_ticket_ticket_number` | `ticket_number` | UNIQUE | Customer search |
| `support_ticket` | `idx_support_ticket_user_status` | `(user_id, status)` | composite | Customer list |
| `support_ticket` | `idx_support_ticket_assigned_status` | `(assigned_to_id, status)` | partial `WHERE assigned_to_id IS NOT NULL` | Agent queue |
| `support_ticket` | `idx_support_ticket_status_created_at` | `(status, created_at DESC)` | composite | Ops |
| `ticket_message` | `idx_ticket_message_ticket_created_at` | `(ticket_id, created_at ASC)` | composite | Thread order |

### 4.14 Audit

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `audit_log` | `idx_audit_log_entity_created_at` | `(entity_type, entity_id, created_at DESC)` | composite | Entity trail |
| `audit_log` | `idx_audit_log_category_created_at` | `(category, created_at DESC)` | composite | Category ops |
| `audit_log` | `idx_audit_log_actor_user_created_at` | `(actor_user_id, created_at DESC)` | composite | User activity |
| `audit_log` | `idx_audit_log_actor_admin_created_at` | `(actor_admin_id, created_at DESC)` | composite | Admin activity |
| `audit_log` | `idx_audit_log_created_at` | `created_at DESC` | B-tree | Reporting |

### 4.15 Platform

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `feature_flag` | `uq_feature_flag_key` | `key` | UNIQUE | Lookup |
| `feature_flag` | `idx_feature_flag_is_enabled` | `is_enabled` | partial `WHERE is_enabled = TRUE` | Active flags |
| `feature_flag_override` | `uq_feature_flag_override_target` | `(flag_id, target_type, target_id)` | UNIQUE | Idempotent overrides |
| `feature_flag_override` | `idx_feature_flag_override_target` | `(target_type, target_id)` | composite | Resolve path |
| `feature_flag_override` | `idx_feature_flag_override_expires_at` | `expires_at` | partial `WHERE expires_at IS NOT NULL` | Sweep |
| `static_page` | `uq_static_page_slug` | `slug` | UNIQUE | URL routing |
| `static_page` | `idx_static_page_is_published` | `is_published` | partial | Public list |
| `system_config` | `uq_system_config_key` | `key` | UNIQUE | Lookup |
| `system_config` | `idx_system_config_category` | `category` | B-tree | Admin grouping |

### 4.16 Cross-cutting

| Table | Index | Columns | Kind | Reason |
|---|---|---|---|---|
| `idempotency_record` | `uq_idempotency_record_key` | `key` | UNIQUE | Header anchor |
| `idempotency_record` | `idx_idempotency_record_expires_at` | `expires_at` | partial `WHERE in_flight = TRUE` | Sweep |
| `outbox_message` | `uq_outbox_message_event_id` | `event_id` | UNIQUE | Idempotency |
| `outbox_message` | `idx_outbox_message_status_available_at` | `(status, available_at)` | composite | Dispatch query |
| `outbox_message` | `idx_outbox_message_aggregate` | `(aggregate_type, aggregate_id)` | composite | Reverse lookup |

---

## 5. Composite Index Sort Order

For composite B-tree indexes, columns should follow:

1. Equality filter first (`=`, `IN`)
2. Range filter second (`<`, `>`, `BETWEEN`, `LIKE 'prefix%'`)
3. Sort order last (`ORDER BY`)

Example: `idx_order_user_status_created_at` filters `user_id = ? AND status IN (?) ORDER BY created_at DESC`. PostgreSQL can index-scan + skip-scan.

---

## 6. Partial Index Examples

```sql
-- Active users only
CREATE INDEX idx_user_email_active ON "user" (email) WHERE deleted_at IS NULL;

-- Active catalog products
CREATE INDEX idx_product_slug_active ON product (slug) WHERE deleted_at IS NULL AND status = 'PUBLISHED';

-- Active flags
CREATE INDEX idx_feature_flag_is_enabled ON feature_flag (is_enabled) WHERE is_enabled = TRUE;

-- Open shipments in transit
CREATE INDEX idx_shipment_in_transit ON shipment (carrier, created_at)
  WHERE status IN ('DISPATCHED','IN_TRANSIT','OUT_FOR_DELIVERY');
```

The Prisma schema expresses the partial via migration steps in V1.1 (`prisma migrate diff` of `prisma.config.ts`).

---

## 7. JSONB / GIN Strategy (V1.1+)

| Column | Index | Use |
|---|---|---|
| `product.tags` (TEXT[]) | GIN `array_ops` | Tag facet filter |
| `product_variant.attributes_json` | GIN `jsonb_path_ops` | Variant filtering |
| `audit_log.metadata_json` | GIN `jsonb_path_ops` | Search |
| `notification_log.metadata_json` | GIN `jsonb_path_ops` | Delivery grouping |
| `email_template.variables_json` | (no) | Editor-only |
| `feature_flag.default_value` | (no) | Tiny JSON |

JSONB GIN added in V1.1 via follow-up migration; not introduced in V1 to keep schema lean.

---

## 8. Index Maintenance

| Task | When | Command |
|---|---|---|
| `ANALYZE` | After bulk insert/update | `ANALYZE <table>;` (Postgres autovacuum handles most; we trigger after seed) |
| `REINDEX CONCURRENTLY` | Quarterly | `REINDEX INDEX CONCURRENTLY <name>;` to rebuild bloat |
| Unused-index check | Monthly | `pg_stat_user_indexes.idx_scan = 0` → consider drop |
| Bloat check | Monthly | `pgstatindex()` for btree bloat |

---

## 9. Cost / Tradeoff Notes

- Each index slows writes. Therefore, **prefer composite indexes that serve multiple query patterns** over separate single-column indexes.
- Partial indexes on `deletedAt IS NULL` keep index small (~10–20% of table size).
- Listing-page hot paths use composite `(category_id, status, published_at DESC)` rather than two indexes — single index serves browse, list-newest, and admin categorization.

---

## 10. Verification

| Step | How |
|---|---|
| Plans chosen correctly | `EXPLAIN ANALYZE` on representative queries |
| Index used | `\d <table>` shows indexes; `pg_stat_user_indexes` shows usage |
| Slow queries | `pg_stat_statements` (top 50 by mean time) |

Representative queries (must hit indexes):

1. `SELECT * FROM product WHERE category_id = ? AND status = 'PUBLISHED' ORDER BY published_at DESC LIMIT 24;` — uses `idx_product_category_status_published`.
2. `SELECT * FROM "order" WHERE user_id = ? AND status = 'SHIPPED' ORDER BY created_at DESC LIMIT 20;` — uses `idx_order_user_status`.
3. `SELECT * FROM cart WHERE user_id = ? AND status = 'ACTIVE';` — uses `idx_cart_user_status`.
4. `SELECT 1 FROM coupon WHERE code = ?;` (case-insensitive) — uses `uq_coupon_code` (citext).
5. `SELECT 1 FROM webhook_event WHERE provider = ? AND event_id = ?;` — uses `uq_webhook_event_provider_event_id`.
6. `UPDATE inventory SET available = available - ? WHERE product_variant_id = ? AND available >= ?;` — row lock + index seek on PK.

---

## 11. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial indexing strategy: 100+ indexes |

---

**End of 04_INDEXING_STRATEGY.md**

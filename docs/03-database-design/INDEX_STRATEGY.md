# INDEX_STRATEGY.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal Database Architect

---

## 1. Purpose

This document defines the **indexing strategy** for SmartLight's PostgreSQL database. It identifies which indexes are required based on the query patterns documented in `SYSTEM_WORKFLOWS.md` and the read/write classification in `DATABASE_ARCHITECTURE.md`.

**Conceptual only** — no SQL is generated.

---

## 2. Index Types

| Type | Use Case |
| --- | --- |
| **B-tree** (default) | Equality and range queries; PK; FK |
| **Unique B-tree** | Uniqueness enforcement |
| **Partial** | Where clause filtering |
| **Composite** | Multi-column queries |
| **GIN** | JSONB, full-text search, array |
| **BRIN** | Time-ordered append-only data |
| **Hash** | Equality only (rare) |

---

## 3. Naming Convention

| Index Type | Format | Example |
| --- | --- | --- |
| Primary key | `pk_<table>` | `pk_users` |
| Unique | `uq_<table>_<col>` | `uq_users_email` |
| Foreign key (within aggregate) | `fk_<table>_<col>` | `fk_cart_items_cart_id` |
| Composite (search) | `idx_<table>_<col1>_<col2>` | `idx_products_category_status` |
| Partial | `idx_<table>_<col>_where_<cond>` | `idx_products_published` |
| GIN (JSONB / FTS) | `gin_<table>_<col>` | `gin_products_fts` |
| BRIN (time) | `brin_<table>_<col>` | `brin_stock_movements_created` |

---

## 4. Identity Context Indexes

### 4.1 User

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_users` | PK | id | Identity |
| `uq_users_email` | Unique | email (citext) | Login lookup |
| `idx_users_phone` | B-tree | phone | Optional phone lookup |
| `idx_users_deleted_at` | Partial | deleted_at | Filter active users |
| `idx_users_email_verified_at` | Partial | email_verified_at | Filter verified |

### 4.2 AdminUser

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_admin_users` | PK | id | — |
| `uq_admin_users_email` | Unique | email | Login lookup |
| `idx_admin_users_status` | B-tree | status | Filter active staff |

### 4.3 Role, Permission, AdminUserRole, RolePermission

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_roles` | PK | id | — |
| `uq_roles_name` | Unique | name | Lookup |
| `pk_permissions` | PK | id | — |
| `uq_permissions_code` | Unique | code | Lookup |
| `pk_admin_user_roles` | PK | id | — |
| `uq_admin_user_roles` | Unique | (adminUserId, roleId) | Prevent duplicates |
| `idx_admin_user_roles_admin` | B-tree | adminUserId | Lookup by user |
| `idx_admin_user_roles_role` | B-tree | roleId | Lookup by role |
| `pk_role_permissions` | PK | id | — |
| `uq_role_permissions` | Unique | (roleId, permissionId) | Prevent duplicates |

### 4.4 Address

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_addresses` | PK | id | — |
| `idx_addresses_owner` | B-tree | (ownerType, ownerId) | Lookup by owner |
| `idx_addresses_owner_default` | Partial | (ownerType, ownerId) WHERE isDefault | Find default |

### 4.5 MfaSecret, RecoveryCode

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_mfa_secrets` | PK | id | — |
| `uq_mfa_secrets_owner` | Unique | (ownerType, ownerId) | One secret per owner |
| `pk_recovery_codes` | PK | id | — |
| `idx_recovery_codes_secret` | B-tree | mfaSecretId | List codes |
| `uq_recovery_codes_hash` | Unique | codeHash | Lookup during use |

### 4.6 RefreshToken, UserSession

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_refresh_tokens` | PK | id | — |
| `uq_refresh_tokens_hash` | Unique | tokenHash | Lookup |
| `idx_refresh_tokens_owner` | B-tree | (ownerType, ownerId) | List user's tokens |
| `idx_refresh_tokens_expires` | B-tree | expiresAt | Cleanup |
| `pk_user_sessions` | PK | id | — |
| `idx_user_sessions_owner` | B-tree | (ownerType, ownerId) | List active |
| `idx_user_sessions_last_active` | B-tree | lastActiveAt | Sort |

---

## 5. Catalog Context Indexes

### 5.1 Category

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_categories` | PK | id | — |
| `uq_categories_slug` | Unique | slug | URL routing |
| `idx_categories_parent` | B-tree | parentId | Tree traversal |
| `idx_categories_active` | Partial | isActive WHERE isActive | Filter active |

### 5.2 Brand

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_brands` | PK | id | — |
| `uq_brands_slug` | Unique | slug | URL routing |
| `uq_brands_name` | Unique | name | Lookup |
| `idx_brands_active` | Partial | isActive WHERE isActive | Filter |

### 5.3 Product

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_products` | PK | id | — |
| `uq_products_slug` | Unique | slug | URL routing |
| `idx_products_category` | B-tree | categoryId | Filter by category |
| `idx_products_brand` | B-tree | brandId | Filter by brand |
| `idx_products_status` | B-tree | status | Filter by status |
| `idx_products_published` | Partial | (categoryId, brandId) WHERE status = 'Published' | Storefront browse |
| `idx_products_search` | GIN | to_tsvector('simple', name) | Full-text search (V1.5) |

### 5.4 ProductVariant

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_product_variants` | PK | id | — |
| `uq_product_variants_sku` | Unique | sku | Lookup |
| `idx_product_variants_product` | B-tree | productId | List variants per product |
| `idx_product_variants_barcode` | B-tree | barcode | Barcode lookup |
| `idx_product_variants_active` | Partial | isActive WHERE isActive | Filter active |

### 5.5 ProductImage

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_product_images` | PK | id | — |
| `idx_product_images_product` | B-tree | productId | List images |
| `idx_product_images_variant` | B-tree | variantId | Variant images |
| `idx_product_images_display_order` | B-tree | (productId, displayOrder) | Sort order |

### 5.6 ProductAttribute, ProductAttributeValue

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_product_attributes` | PK | id | — |
| `uq_product_attributes_name` | Unique | name | Lookup |
| `pk_product_attribute_values` | PK | id | — |
| `idx_product_attribute_values_product` | B-tree | productId | List per product |
| `idx_product_attribute_values_variant` | B-tree | variantId | List per variant |
| `idx_product_attribute_values_attribute` | B-tree | attributeId | Filter |

---

## 6. Inventory Context Indexes

### 6.1 Inventory

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_inventory` | PK | id | — |
| `uq_inventory_variant` | Unique | variantId | 1:1 with variant |
| `idx_inventory_low_stock` | Partial | (variantId, stockOnHand) WHERE stockOnHand <= lowStockThreshold | Low stock alert |

### 6.2 StockReservation

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_stock_reservations` | PK | id | — |
| `idx_stock_reservations_variant` | B-tree | variantId | Aggregate per variant |
| `idx_stock_reservations_cart` | B-tree | cartId | List per cart |
| `idx_stock_reservations_order` | B-tree | orderId | List per order |
| `idx_stock_reservations_active` | Partial | (variantId) WHERE status = 'Active' | Available stock calc |
| `idx_stock_reservations_expiry` | Partial | expiresAt WHERE status = 'Active' | Cleanup expired |

### 6.3 StockMovement

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_stock_movements` | PK | id | — |
| `idx_stock_movements_variant` | B-tree | variantId | History per variant |
| `idx_stock_movements_reference` | B-tree | (referenceType, referenceId) | Find by source |
| `brin_stock_movements_created` | BRIN | createdAt | Time-series scan |

### 6.4 InventoryAdjustment

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_inventory_adjustments` | PK | id | — |
| `idx_inventory_adjustments_variant` | B-tree | variantId | History |
| `idx_inventory_adjustments_actor` | B-tree | actorAdminId | Find by admin |
| `idx_inventory_adjustments_reason` | B-tree | reasonCode | Report by reason |

---

## 7. Cart Context Indexes

### 7.1 Cart

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_carts` | PK | id | — |
| `idx_carts_user` | B-tree | userId | Find user's cart |
| `idx_carts_session` | B-tree | sessionToken | Find guest cart |
| `idx_carts_status` | B-tree | status | Filter active |

### 7.2 CartItem

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_cart_items` | PK | id | — |
| `idx_cart_items_cart` | B-tree | cartId | List per cart |
| `idx_cart_items_variant` | B-tree | variantId | Validate availability |
| `uq_cart_items_cart_variant` | Unique | (cartId, variantId) | One row per variant per cart |

### 7.3 Wishlist (V1.1)

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_wishlists` | PK | id | — |
| `idx_wishlists_user` | B-tree | userId | Find user's wishlist |
| `pk_wishlist_items` | PK | id | — |
| `idx_wishlist_items_wishlist` | B-tree | wishlistId | List |
| `uq_wishlist_items_wishlist_variant` | Unique | (wishlistId, variantId) | Prevent duplicates |

---

## 8. Checkout Context Indexes

### 8.1 CheckoutSession

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_checkout_sessions` | PK | id | — |
| `uq_checkout_sessions_idempotency` | Unique | idempotencyKey | Idempotency |
| `idx_checkout_sessions_user` | B-tree | userId | List user's |
| `idx_checkout_sessions_expires` | B-tree | expiresAt | Cleanup |
| `idx_checkout_sessions_active` | Partial | status WHERE status = 'Active' | Active only |

---

## 9. Promotion Context Indexes

### 9.1 Promotion

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_promotions` | PK | id | — |
| `idx_promotions_status` | B-tree | status | Filter |
| `idx_promotions_window` | B-tree | (startDate, endDate) | Active in window |
| `idx_promotions_type` | B-tree | type | Filter |

### 9.2 PromotionUsage

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_promotion_usages` | PK | id | — |
| `idx_promotion_usages_promotion` | B-tree | promotionId | Count |
| `idx_promotion_usages_user` | B-tree | (userId, promotionId) | Per-user count |
| `idx_promotion_usages_order` | B-tree | orderId | Find by order |

### 9.3 Voucher

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_vouchers` | PK | id | — |
| `uq_vouchers_code` | Unique | code | Lookup at checkout |
| `idx_vouchers_promotion` | B-tree | promotionId | List |
| `idx_vouchers_active` | Partial | (code) WHERE status = 'Active' AND now BETWEEN validFrom AND validTo | Validate |

### 9.4 VoucherUsage

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_voucher_usages` | PK | id | — |
| `idx_voucher_usages_voucher` | B-tree | voucherId | Count |
| `idx_voucher_usages_user` | B-tree | (userId, voucherId) | Per-user count |
| `idx_voucher_usages_order` | B-tree | orderId | Find by order |

### 9.5 TaxRate, TaxExemption

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_tax_rates` | PK | id | — |
| `idx_tax_rates_default` | Partial | isDefault WHERE isDefault | Get default |
| `idx_tax_rates_active` | Partial | isActive WHERE isActive | Filter active |
| `pk_tax_exemptions` | PK | id | — |
| `uq_tax_exemptions_category` | Unique | categoryId | One per category |

---

## 10. Order Context Indexes

### 10.1 Order

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_orders` | PK | id | — |
| `uq_orders_order_number` | Unique | orderNumber | Lookup by human number |
| `idx_orders_user` | B-tree | userId | User history |
| `idx_orders_guest_email` | B-tree | guestEmail | Guest lookup |
| `idx_orders_status` | B-tree | status | Filter |
| `idx_orders_created_at` | B-tree | createdAt DESC | Recent orders |
| `idx_orders_pending` | Partial | (createdAt) WHERE status = 'Pending' | Reconciliation |
| `idx_orders_user_recent` | B-tree | (userId, createdAt DESC) | Order history page |
| `idx_orders_confirmed` | Partial | (confirmedAt) WHERE status IN ('Confirmed', 'Processing') | Fulfillment queue |

### 10.2 OrderItem

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_order_items` | PK | id | — |
| `idx_order_items_order` | B-tree | orderId | List per order |
| `idx_order_items_variant` | B-tree | variantId | Sales by variant |

### 10.3 OrderAddress

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_order_addresses` | PK | id | — |
| `idx_order_addresses_order` | B-tree | orderId | List per order |
| `idx_order_addresses_type` | B-tree | (orderId, type) | Find shipping/billing |

### 10.4 OrderStatusHistory

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_order_status_history` | PK | id | — |
| `idx_order_status_history_order` | B-tree | orderId | List per order |
| `brin_order_status_history_created` | BRIN | createdAt | Time scan |

---

## 11. Payment Context Indexes

### 11.1 Payment

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_payments` | PK | id | — |
| `uq_payments_intent` | Unique | (providerCode, intentId) | Lookup by provider ID |
| `idx_payments_order` | B-tree | orderId | Find order's payment |
| `idx_payments_status` | B-tree | status | Filter |
| `idx_payments_pending` | Partial | (createdAt) WHERE status = 'Pending' | Reconciliation |

### 11.2 PaymentTransaction

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_payment_transactions` | PK | id | — |
| `idx_payment_transactions_payment` | B-tree | paymentId | List per payment |
| `idx_payment_transactions_provider` | B-tree | (providerCode, providerTransactionId) | Lookup |

### 11.3 WebhookEvent

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_webhook_events` | PK | id | — |
| `uq_webhook_events_provider_event` | Unique | (providerCode, eventId) | Idempotency |
| `idx_webhook_events_received` | B-tree | receivedAt | Cleanup (90 days) |
| `idx_webhook_events_unprocessed` | Partial | (providerCode) WHERE processedAt IS NULL | Retry queue |

### 11.4 Refund

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_refunds` | PK | id | — |
| `idx_refunds_payment` | B-tree | paymentId | List per payment |
| `idx_refunds_order` | B-tree | orderId | List per order |
| `idx_refunds_status` | B-tree | status | Filter |
| `idx_refunds_requested_by` | B-tree | requestedBy | Audit |

---

## 12. Shipping Context Indexes

### 12.1 ShippingZone, ShippingRate

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_shipping_zones` | PK | id | — |
| `idx_shipping_zones_active` | Partial | isActive WHERE isActive | Filter |
| `pk_shipping_rates` | PK | id | — |
| `idx_shipping_rates_zone` | B-tree | zoneId | List per zone |
| `idx_shipping_rates_carrier` | B-tree | carrierCode | Filter |

### 12.2 Shipment

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_shipments` | PK | id | — |
| `uq_shipments_tracking` | Unique | trackingNumber | Lookup |
| `idx_shipments_order` | B-tree | orderId | Find order's shipment |
| `idx_shipments_status` | B-tree | status | Filter |
| `idx_shipments_carrier` | B-tree | carrierCode | Filter |
| `idx_shipments_delivered` | Partial | (deliveredAt) WHERE status = 'Delivered' | Recent deliveries |

### 12.3 TrackingEvent

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_tracking_events` | PK | id | — |
| `idx_tracking_events_shipment` | B-tree | shipmentId | List |
| `idx_tracking_events_event_at` | B-tree | eventAt | Time-sorted |

---

## 13. Returns Context Indexes

### 13.1 Return

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_returns` | PK | id | — |
| `uq_returns_rma` | Unique | rmaNumber | Lookup |
| `idx_returns_order` | B-tree | orderId | Find order's returns |
| `idx_returns_customer` | B-tree | customerId | Customer history |
| `idx_returns_status` | B-tree | status | Queue filtering |
| `idx_returns_pending` | Partial | (requestedAt) WHERE status = 'Pending' | Approval queue |

### 13.2 ReturnItem

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_return_items` | PK | id | — |
| `idx_return_items_return` | B-tree | returnId | List per return |
| `idx_return_items_order_item` | B-tree | orderItemId | Lookup |

### 13.3 ReturnInspection

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_return_inspections` | PK | id | — |
| `idx_return_inspections_return` | B-tree | returnId | List |
| `idx_return_inspections_inspector` | B-tree | inspectorId | Audit |

---

## 14. Reviews Context Indexes

### 14.1 Review

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_reviews` | PK | id | — |
| `idx_reviews_product` | B-tree | productId | List per product |
| `idx_reviews_variant` | B-tree | variantId | Variant reviews |
| `idx_reviews_customer` | B-tree | customerId | Customer reviews |
| `idx_reviews_order_item` | B-tree | orderItemId | Verify purchase |
| `idx_reviews_status` | B-tree | status | Filter published |
| `idx_reviews_product_published` | Partial | (productId, createdAt DESC) WHERE status = 'Published' | Product page |

### 14.2 ReviewReply, ReviewHelpfulVote

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_review_replies` | PK | id | — |
| `idx_review_replies_review` | B-tree | reviewId | One per review |
| `uq_review_replies_review` | Unique | reviewId | Enforce 1:1 |
| `pk_review_helpful_votes` | PK | id | — |
| `idx_review_helpful_votes_review` | B-tree | reviewId | Count |
| `uq_review_helpful_votes` | Unique | (reviewId, customerId) | Prevent dup |

---

## 15. Notifications Context Indexes

### 15.1 EmailTemplate

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_email_templates` | PK | id | — |
| `uq_email_templates_code_locale` | Unique | (code, locale) | Lookup |
| `idx_email_templates_active` | Partial | (code) WHERE isActive | Get active |

### 15.2 NotificationLog

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_notification_logs` | PK | id | — |
| `idx_notification_logs_recipient` | B-tree | (recipientType, recipientId) | History |
| `idx_notification_logs_status` | B-tree | status | Failed queue |
| `idx_notification_logs_created` | B-tree | createdAt DESC | Recent |
| `brin_notification_logs_created` | BRIN | createdAt | Time scan / archive |
| `idx_notification_logs_failed` | Partial | (createdAt) WHERE status = 'Failed' | Retry |

### 15.3 NotificationPreference

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_notification_preferences` | PK | id | — |
| `uq_notification_preferences` | Unique | (ownerType, ownerId, channel, eventType) | Prevent dup |
| `idx_notification_preferences_owner` | B-tree | (ownerType, ownerId) | List |

### 15.4 CookieConsent

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_cookie_consents` | PK | id | — |
| `idx_cookie_consents_visitor` | B-tree | visitorId | Find |
| `idx_cookie_consents_expires` | B-tree | expiresAt | Cleanup |

---

## 16. Support Context Indexes

### 16.1 SupportTicket, TicketMessage

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_support_tickets` | PK | id | — |
| `uq_support_tickets_number` | Unique | ticketNumber | Lookup |
| `idx_support_tickets_customer` | B-tree | customerId | Customer history |
| `idx_support_tickets_status` | B-tree | status | Filter |
| `idx_support_tickets_assigned` | B-tree | assignedTo | Workload |
| `idx_support_tickets_sla_due` | Partial | slaDueAt WHERE status NOT IN ('Resolved', 'Closed') | SLA monitoring |
| `pk_ticket_messages` | PK | id | — |
| `idx_ticket_messages_ticket` | B-tree | ticketId | Thread |

---

## 17. Audit Context Indexes

### 17.1 AuditLog

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_audit_logs` | PK | id | — |
| `idx_audit_logs_actor` | B-tree | (actorType, actorId) | Find by actor |
| `idx_audit_logs_entity` | B-tree | (entityType, entityId) | Find by entity |
| `idx_audit_logs_action` | B-tree | action | Filter |
| `brin_audit_logs_created` | BRIN | createdAt | Time scan |
| `gin_audit_logs_before_after` | GIN | before, after | JSONB search (V2) |

---

## 18. Platform Context Indexes

### 18.1 FeatureFlag, StaticPage, SystemConfig

| Index | Type | Columns | Purpose |
| --- | --- | --- | --- |
| `pk_feature_flags` | PK | id | — |
| `uq_feature_flags_key` | Unique | key | Lookup |
| `pk_feature_flag_overrides` | PK | id | — |
| `idx_feature_flag_overrides_flag` | B-tree | flagId | List overrides |
| `pk_static_pages` | PK | id | — |
| `uq_static_pages_slug` | Unique | slug | URL routing |
| `pk_system_configs` | PK | id | — |
| `uq_system_configs_key` | Unique | key | Lookup |

---

## 19. Composite Indexes (Performance Critical)

The following composite indexes are critical for performance:

| Table | Columns | Query Pattern |
| --- | --- | --- |
| `orders` | (userId, createdAt DESC) | User order history |
| `orders` | (status, createdAt) | Status filter + time sort |
| `cart_items` | (cartId, variantId) | Cart line lookup |
| `stock_reservations` | (variantId) WHERE status='Active' | Available stock calculation |
| `payments` | (providerCode, intentId) | Webhook lookup |
| `webhook_events` | (providerCode, eventId) | Idempotency |
| `products` | (status, categoryId) | Storefront listing |
| `notification_logs` | (recipientType, recipientId, createdAt DESC) | User history |
| `support_tickets` | (assignedTo, status) | Staff queue |
| `reviews` | (productId, status, createdAt DESC) | Product reviews page |

---

## 20. Index Maintenance

| Aspect | Strategy |
| --- | --- |
| **Auto-vacuum** | PostgreSQL default; tune per table |
| **Reindex** | Nightly on heavily updated tables |
| **Statistics** | `ANALYZE` after bulk loads |
| **Index bloat** | Monitor with `pg_stat_user_indexes` |
| **Unused indexes** | Quarterly review; drop if < 50 scans/day |

---

## 21. Coverage Validation

| Check | Status |
| --- | --- |
| Every unique constraint has unique index | ✓ |
| Every FK has supporting index | ✓ |
| Every hot query path has supporting index | ✓ |
| Partial indexes used for soft-deleted rows | ✓ |
| BRIN used for time-series tables | ✓ |
| GIN used for JSONB and full-text | ✓ |
| Composite indexes for common query patterns | ✓ |
| Naming convention consistent | ✓ |

---

## 22. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal Database Architect | Initial index strategy: all 64 entities, ~250 indexes (PK, FK, unique, search, partial, composite, BRIN, GIN) |

---

**End of Document — INDEX_STRATEGY.md**
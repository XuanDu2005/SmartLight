# 11 — Performance Optimization

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04
**Author:** Principal Database Architect

---

## 1. Purpose

This document defines the **performance strategy** for SmartLight's database layer:

- Hot-path latency targets
- N+1 prevention rules
- Denormalization policy
- Caching boundaries (DB → app)
- Query patterns for catalog, checkout, reporting
- Anti-patterns to avoid

---

## 2. Latency Targets

| Operation | Target (p95) | Critical |
|---|---|---|
| Product list (browse, 24 items) | < 50 ms | YES |
| Product detail page | < 40 ms | YES |
| Search by slug | < 10 ms | YES |
| Cart get/fetch | < 30 ms | YES |
| Add to cart | < 100 ms | YES |
| Checkout completion (entire txn) | < 200 ms | YES |
| Order detail (admin) | < 80 ms | YES |
| Admin product list (paginated) | < 100 ms | NO |
| Audit log search (admin) | < 200 ms | NO |

Connection target: 50 queries per dashboard load.

---

## 3. N+1 Prevention

### 3.1 The Rule

**Always use `include` or `select` to fetch related rows in one query.** Prisma generates efficient SQL with JOINs/IN-clauses.

### 3.2 Anti-Patterns

```ts
// BAD
for (const product of products) {
  product.images = await prisma.productImage.findMany({ where: { productId: product.id } });
}

// GOOD
const products = await prisma.product.findMany({
  include: { images: true, brand: true, category: true },
});
```

### 3.3 Pagination Discipline

Cursor-based pagination is preferred over offset for hot listings:

```ts
await prisma.product.findMany({
  take: 24,
  cursor: lastId ? { id: lastId } : undefined,
  skip: lastId ? 1 : 0,
  where: { ...filters, deletedAt: null },
  orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
});
```

Offset pagination for admin only (smaller data volume).

### 3.4 Dataloader for Hot Reads

For list views where each row needs nested fetches (e.g., cart with items with product variants with images), a dataloader-style strategy collapses to a small number of queries:

```ts
const items = await prisma.cartItem.findMany({ where: { cartId }, include: { variant: { include: { product: { include: { images: true } } } } } });
```

This is 1 query (with multiple joins), not N+1.

### 3.5 Counting Discipline

- Use **Prisma's `_count` relation counts** rather than separate queries.
- For dashboard totals, prefer materialized views or cron-built summary tables (V1.5).

---

## 4. Catalog Path — The Hottest Read

### 4.1 Query Patterns

```sql
-- Category browse
SELECT id, slug, name, "basePrice", "compareAtPrice", status
FROM product
WHERE category_id = :catId
  AND status = 'PUBLISHED'
  AND deleted_at IS NULL
  AND (published_at <= now())
ORDER BY published_at DESC
LIMIT 24;

-- Featured rail (composite)
SELECT * FROM product
WHERE is_featured = TRUE
  AND status = 'PUBLISHED'
  AND deleted_at IS NULL
ORDER BY published_at DESC
LIMIT 12;

-- Slug lookup
SELECT * FROM product WHERE slug = :slug AND deleted_at IS NULL LIMIT 1;
```

Index used:

- `idx_product_category_status_published` (composite)
- `idx_product_is_featured_status` (partial)
- `part_product_slug_active` (partial unique)

### 4.2 Postgres Tuning

```sql
-- Snapshot settings for low-latency
ALTER SYSTEM SET shared_buffers = '256MB';     -- Neon-managed
ALTER SYSTEM SET work_mem = '64MB';            -- session-level for hot queries
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET random_page_cost = 1.1;       -- SSD-based hosting
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET default_statistics_target = 200;
```

### 4.3 Search Strategy (V1 → V1.1)

| Stage | Strategy |
|---|---|
| V1 | `WHERE name ILIKE '%:q%' OR short_description ILIKE '%:q%'` with `pg_trgm` GIN |
| V1.5 | Hybrid: GIN trigram + (full-text via `tsvector` GIN) |
| V2 | External (Algolia / OpenSearch) |

Catalog search uses `pg_trgm` GIN. Migration:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_product_search_trgm ON product
  USING gin (name gin_trgm_ops, short_description gin_trgm_ops)
  WHERE deleted_at IS NULL AND status = 'PUBLISHED';
```

---

## 5. Checkout Path — Critical Writes

### 5.1 Sequence (Serial Transaction)

```
1. Validate cart, fetch items
2. SELECT FOR UPDATE inventory rows
3. Validate coupons
4. INSERT INTO "order" + OrderItem + OrderAddress + OrderStatusHistory
5. UPDATE cart; UPDATE reservations; UPDATE inventory
6. INSERT stock_movement rows
7. UPDATE coupon.usage_count
8. INSERT voucher_usage
9. INSERT outbox_message rows
10. COMMIT
```

Target ≤ 200 ms for: cart with 5 items.

### 5.2 Connection Pool

Use Neon's pooler; set `connection_limit = 20` in Prisma's `DATABASE_URL`. App-level queueing via `pg_advisory_lock` if needed.

### 5.3 Stock Reservation SQL

```sql
UPDATE inventory
SET reserved = reserved + $1,
    available = available - $1
WHERE product_variant_id = $2
  AND available >= $1;
```

If `RETURNING` shows 0 rows, raise `OUT_OF_STOCK`.

---

## 6. Inventory Path — Concurrency Safety

### 6.1 Optimistic Update

```sql
UPDATE inventory
SET on_hand = on_hand - $1,
    available = available - $1
WHERE product_variant_id = $2
  AND on_hand >= $1
RETURNING on_hand, available;
```

### 6.2 Pessimistic Locking Alternative

```sql
BEGIN;
SELECT * FROM inventory WHERE product_variant_id = $1 FOR UPDATE;
-- validate and update
UPDATE inventory SET ...;
INSERT INTO stock_movement ...;
COMMIT;
```

### 6.3 Stock Movement Invariant

Every write to `inventory.on_hand` MUST be paired with a `stock_movement` insert in the same transaction.

`available = on_hand - reserved` is recomputed in the same UPDATE statement (computed in WHERE/SET, then `CHECK` constraint enforces).

---

## 7. Denormalization Policy

We keep 3NF and **only denormalize** for:

| Denormalized field | Why |
|---|---|
| `Product.ratingAvg`, `Product.ratingCount` | Avoids join + avg at runtime; updated on Review publish |
| `OrderItem.skuSnapshot`, `productNameSnapshot`, `unitPrice`, `taxRatePercent` | Order immutability |
| `OrderAddress.*` | Order immutability |
| `OrderItem.productSlugSnapshot` | Customer-facing email link |
| `Category.path` (materialized path) | Avoids recursive CTE on every tree query |
| `Category.level` | Avoids recursive CTE |
| `Cart.subtotal`, `Cart.taxTotal`, `Cart.grandTotal` | Read-heavy cart UI |

### 7.1 When NOT to Denormalize

- Hot aggregates computed infrequently (use cron-rebuilt summary)
- Cross-context fields (avoid; recalculate on read)
- Things that change often (will skew)

---

## 8. Caching Layers

| Cache | Tool | Invalidation |
|---|---|---|
| Response cache (catalog, session) | Redis (Upstash) | TTL + event-driven invalidation |
| Query cache (small lookups) | Redis | TTL only |
| Application in-process | node-lru | TTL |
| CDN cache (static, public) | Cloudflare | Cache-Control headers |

**Cache invalidation triggers** (cache bus bus, see `06_TRANSACTION_DESIGN.md`):

| Event | Invalidates |
|---|---|
| `OrderPaid` | Customer order cache |
| `StockChanged` | Product detail + listing cache |
| `ProductPublished` | Category tree cache |
| `CouponApplied` | Cart cache |

In MVP we keep it simple: **TTL-first** (5–60 s on hot pages) with active invalidation on critical events.

---

## 9. Hot Path Queries (Reference SQL)

### 9.1 Product Listing

```sql
EXPLAIN ANALYZE
SELECT p.id, p.slug, p.name, p."basePrice", p."compareAtPrice", b.name AS brand, c.name AS category
FROM product p
JOIN brand b ON p.brand_id = b.id
JOIN category c ON p.category_id = c.id
WHERE p.category_id = $1
  AND p.status = 'PUBLISHED'
  AND p.deleted_at IS NULL
ORDER BY p.published_at DESC
LIMIT 24;
```

Expected plan: **Index Scan Backward** using `idx_product_category_status_published`, then nested-loop brand/category lookups (PK).

### 9.2 Order Detail

```sql
SELECT
  o.id, o.order_number, o.status, o.subtotal, o."taxTotal", o."grandTotal",
  oi.id, oi."skuSnapshot", oi.quantity, oi."unitPrice", oi."lineTotal",
  p.id AS payment_id, p.status, p.amount
FROM "order" o
LEFT JOIN order_item oi ON oi.order_id = o.id
LEFT JOIN payment p ON p.order_id = o.id
WHERE o.user_id = $1 AND o.id = $2;
```

Plan: PK lookup orders → left joins; payment/order_item indexed on `order_id`.

### 9.3 Inventory Hot Read

```sql
SELECT i."onHand", i.reserved, i.available
FROM inventory i
WHERE i.product_variant_id = $1;
```

Plan: PK lookup.

---

## 10. Connection & Pool Sizing

| Env | Pool | Notes |
|---|---|---|
| Dev | 5 | Small footprint |
| Preview | 10 | On Neon |
| Staging | 20 | Test load |
| Production | 20–50 | Tuned per Neon tier |

Use `pgbouncer` for connection multiplexing in V1.5+.

---

## 11. Maintenance Windows

| Task | When | Method |
|---|---|---|
| `ANALYZE` heavy tables | After bulk import | `VACUUM ANALYZE` |
| Index rebuild | Quarterly | `REINDEX CONCURRENTLY` |
| Stats refresh | After schema change | `ANALYZE` |
| Hot index re-creation | After heavy schema change | Concurrent |

All during off-peak (02:00 ICT).

---

## 12. Anti-Patterns

| Anti-pattern | Why bad | Mitigation |
|---|---|---|
| `SELECT *` | Hits unused columns | Field selection |
| `LIKE '%text%'` without index | Full scan | GIN trigram |
| Implicit transactions | Slow drift | `$transaction(...)` |
| Fetching all cart items in client loop | N+1 | `include` |
| SELECT COUNT(*) on big tables for dashboard | Lock | Approximation or summary tables |
| ORM `update` then read in two queries | Inconsistency | Read-modify-write in transaction |
| Counting via post-query aggregation | Slow | `_count` relation |
| Multiple separate queries that should be `JOIN` | N+1 | Single query with `include` |

---

## 13. SLOs

| SLO | Target |
|---|---|
| Catalog browse p95 latency | < 50 ms |
| Checkout p95 latency | < 200 ms |
| Cart add p95 latency | < 100 ms |
| Order admin list p95 latency | < 100 ms |
| DB connections idle | < 5 |
| Lock waits per minute | < 10 |

These are surfaced in Grafana dashboards (see `05-software-architecture/16_OBSERVABILITY.md`).

---

## 14. Future Optimizations (V1.5+)

| Future | Benefit |
|---|---|
| Materialized views for sales reports | Cheap dashboards |
| Read-replica + catalog offload | Reduced primary load |
| `pg_partman` for time-series partitioning (audit, stock_movement, notification_log) | Performance + retention |
| Covering indexes for hot list queries | Index-only scans |
| Precomputed `OrderSummary` table | Avoid joins in reporting |
| `tsvector` GIN | Rich search |

---

## 15. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial performance strategy |

---

**End of 11_PERFORMANCE_OPTIMIZATION.md**

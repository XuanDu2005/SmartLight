# 08 — Soft Delete Strategy

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04
**Author:** Principal Database Architect

---

## 1. Purpose

This document defines Soft Delete strategy for SmartLight:

- How soft delete is represented (column, index, query patterns)
- How uniqueness survives soft delete
- How code reads/writes against soft-deleted rows
- How soft-deleted data is purged
- Edge cases and exceptions

---

## 2. The Convention

Every business entity includes:

```
deletedAt: DateTime? @map("deleted_at") @db.Timestamptz(6)
```

- **NULL** ⇒ row is active.
- **Non-NULL** ⇒ row is soft-deleted at that timestamp.

A row is never physically deleted via application code except through the documented **Hard Purge** job.

---

## 3. Where Soft Delete Applies

Applies to **business entities**: anything business users can list, edit, or refer to.

| Soft-deleted | Reason |
|---|---|
| `User` | Closed accounts; PDPD retention window |
| `AdminUser` | Offboarding; audit log retains trace |
| `Address` | Customer removes an address |
| `Category` | Catalog cleanup; preserve historic order |
| `Brand` | Brand wind-down |
| `Product` | Catalog cleanup |
| `ProductVariant` | Discontinue SKU |
| `ProductAttribute` | Dictionary cleanup |
| `Inventory` | No — `Inventory` lives/dies with variant via CASCADE |
| `Cart` | Hard-expired carts are deleted, not soft-deleted |
| `CartItem` | Cascade with Cart |
| `CheckoutSession` | Hard delete after expiry |
| `Coupon` | Removed from public; history preserved |
| `Promotion` | Removed but referenced by orders |
| `Order` | **NOT soft-deleted** — immutable + retained for tax |
| `Payment` | **NOT soft-deleted** — retain for 7 years |
| `Shipment` | **NOT soft-deleted** — retained |
| `Refund` | **NOT soft-deleted** — retained |
| `Return` | Soft delete to admin-close |
| `Review` | Customer can remove or admin hide |
| `ReviewReply` | Admin can remove |
| `EmailTemplate` | Old versions retained, not active |
| `NotificationLog` | **Hard delete after retention** |
| `NotificationPreference` | Cascade with user |
| `SupportTicket` | Soft delete only after anonymization window |
| `AuditLog` | **Append-only, never deleted/soft** |
| `FeatureFlag` / `Override` | Soft delete in V1.1; hard in V2 |
| `StaticPage` | Soft delete to retain history |
| `TaxRate`, `TaxExemption` | Soft delete inactive |

---

## 4. Query Patterns

### 4.1 Default: Active Only

**Service-layer convention:** all read methods filter `deletedAt: null` unless explicitly "includeDeleted" flag is set.

```ts
// Example
const categories = await prisma.category.findMany({
  where: { deletedAt: null, status: 'ACTIVE' },
});
```

### 4.2 With Prisma Middleware

A Prisma middleware can transparently add the filter:

```ts
prisma.$use(async (params, next) => {
  if (params.model && SOFT_DELETED_MODELS.includes(params.model)) {
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      params.args.where = { ...params.args.where, deletedAt: null };
    }
    if (['findMany', 'count', 'aggregate', 'groupBy'].includes(params.action)) {
      if (!params.args) params.args = {};
      params.args.where = { ...(params.args.where ?? {}), deletedAt: null };
    }
  }
  return next(params);
});
```

This is **opt-in** in V1 (with bypass available). Default behavior is filtered.

### 4.3 Soft Delete Itself

```ts
await prisma.product.update({
  where: { id: productId },
  data: { deletedAt: new Date(), updatedAt: new Date() },
});
```

### 4.4 Restore

```ts
await prisma.product.update({
  where: { id: productId },
  data: { deletedAt: null, updatedAt: new Date() },
});
```

(Available for admin use in V1.1.)

---

## 5. Unique Constraint Compliance

### 5.1 The Problem

If `product.slug` has `@@unique` and a product is soft-deleted, you cannot insert a new product with the same `slug` — even though the slug is "free."

### 5.2 The Solution (Migration Step in V1.1)

Replace plain unique indexes with **partial unique indexes**:

```sql
-- Replace
CREATE UNIQUE INDEX product_slug_key ON product (slug);

-- With
CREATE UNIQUE INDEX part_product_slug_active ON product (slug)
  WHERE deleted_at IS NULL AND status = 'PUBLISHED';
```

Prisma syntax does not directly support partial unique indexes, so this is added via raw SQL migration in V1.1:

```sql
-- Drop existing
DROP INDEX product_slug_key;
-- Create partial
CREATE UNIQUE INDEX part_product_slug_active
  ON product (slug)
  WHERE deleted_at IS NULL;
```

### 5.3 Tables Affected (Partial Unique Migration List)

| Table | Column(s) | Partial where |
|---|---|---|
| `category` | `slug` | `deleted_at IS NULL` |
| `brand` | `slug` | `deleted_at IS NULL` |
| `product` | `slug` | `deleted_at IS NULL` |
| `product_variant` | `sku` | `deleted_at IS NULL` |
| `static_page` | `slug` | `deleted_at IS NULL` |
| `coupon` | `code` | `deleted_at IS NULL` |
| `tax_rate` | `code` | `deleted_at IS NULL` |
| `system_config` | `key` | `deleted_at IS NULL` (not always soft-deletable; decision below) |
| `feature_flag` | `key` | `deleted_at IS NULL` |

> `system_config.key` and `feature_flag.key` retained as plain unique (no soft delete).

---

## 6. Indexes with Soft-Delete Awareness

For hot tables, every soft-delete-aware index reuses `WHERE deleted_at IS NULL`:

```sql
CREATE INDEX idx_product_category_status_published
  ON product (category_id, status, published_at DESC)
  WHERE deleted_at IS NULL;
```

This reduces index size significantly (active products only) and keeps catalog listings sub-50 ms even at 1 M+ products.

In V1.1 the partial indexes are added via a hot migration script during off-peak maintenance.

---

## 7. Audit Logging on Soft Delete

Every soft delete inserts an `audit_log` row with category `DATA_DELETE`:

```sql
INSERT INTO audit_log (category, action, entity_type, entity_id, actor_type, after_json)
VALUES ('DATA_DELETE','SOFT_DELETE', 'product', :id, 'ADMIN_USER', jsonb_build_object('deleted_at', :ts));
```

This preserves the trail even after the row is hard-deleted.

---

## 8. Performance Impact

| Aspect | Mitigation |
|---|---|
| Larger table disk footprint | Hard purge job weekly cleans entities past retention; ~10–15% bloat at steady state |
| Index size | Partial indexes reduce effective size by ~40–60% |
| Query slowdown from `deleted_at IS NULL` predicate | Partial indexes cover it; planner can ignore the predicate when irrelevant |
| Cold reads for admin (e.g., "show soft-deleted") | Bypass middleware via explicit flag; uses non-partial indexes |

---

## 9. Edge Cases

### 9.1 Foreign Key Cascade on Soft-Deleted Parent

If a parent (e.g., `Product`) is soft-deleted but children exist, **no DB cascade is triggered** (soft delete = `UPDATE`). Application logic must respect that.

**Mitigation:**

- Cart checks `Product.status = 'PUBLISHED'` and `deletedAt IS NULL` before allowing add.
- Order history references soft-deleted products normally (snapshots capture the data).

### 9.2 Re-Insertion Race

Re-inserting a row with the same unique key when an old soft-deleted row exists:

- Partial unique index (`WHERE deleted_at IS NULL`) allows it.
- Ensure migration of partial unique indexes precedes any reuse case.

### 9.3 Bulk Operations

`prisma.product.deleteMany({ where: { deletedAt: { not: null }, deletedAt: { lt: subDays(now(), 365) } } })` is the purge job.

---

## 10. Prisma Implementation Note

Prisma's `@map` on the column name (`deleted_at`) plus the in-code `deletedAt` field name is consistent across all models. There is no need for a separate "trashed" model.

> **Anti-pattern check:** do not create a `ProductArchive` table mirror. Keep `deleted_at` and use partial indexes.

---

## 11. When NOT to Use Soft Delete

| Entity | Reason to hard-delete |
|---|---|
| `OutboxMessage` (`DISPATCHED` + aged) | Append-only; safe to drop |
| `WebhookEvent` (archived + aged) | Idempotency kept; archived content dropped |
| `IdempotencyRecord` (expired) | Replay protection window passed |
| `RefreshToken` (expired) | No value retained |
| `NotificationLog` (aged) | Reduce storage |
| `TrackingEvent` (aged) | Ops dashboard no longer needs |

These tables **do not** include `deletedAt`.

---

## 12. Hard Delete Policy

| Action | Trigger | Auth |
|---|---|---|
| Restore soft-deleted row | Admin support tool | `super_admin` only |
| Hard delete a soft-deletable row | N/A in MVP — only purge job | System only |
| Hard delete NON-soft-deletable row | N/A | n/a |

> Restoration is audited in `audit_log`. Hard delete is **never** allowed via API.

---

## 13. Sequence Diagram

```
Customer ──DELETE /v1/users/me──▶ Service ──▶ UPDATE users SET deleted_at=now()
                                                          │
                                                          ▼
                                                   INSERT audit_log
                                                          │
                                                          ▼
                                                   Return 204
```

---

## 14. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial soft delete strategy |

---

**End of 08_SOFT_DELETE_STRATEGY.md**

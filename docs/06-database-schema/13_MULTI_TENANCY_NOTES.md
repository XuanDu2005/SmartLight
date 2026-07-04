# 13 — Multi-Tenancy Notes (Future-Ready)

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04
**Author:** Principal Database Architect

---

## 1. Purpose

SmartLight is currently **single-vendor** (one SmartLight account sells all products). However, the schema is designed to be **future-multi-tenant-ready** so that adding:

- Multiple sellers (marketplace)
- Multiple vendors
- Multiple business units

does NOT require a schema rewrite. This document captures:

- The single-tenant baseline
- Design decisions that future-proof multi-tenancy
- Migration roadmap

---

## 2. Current State — Single Vendor

### 2.1 Today

```
SmartLight (1 tenant)
├── Users
├── Products (all owned by SmartLight)
├── Orders (all from this single vendor)
├── Payments (to SmartLight)
├── Refunds (issued by SmartLight)
└── AuditLog
```

No `tenantId` column on any business entity. All `Product` rows implicitly belong to SmartLight.

### 2.2 Why This Is OK for MVP

- Smallest schema.
- One pricing strategy.
- One payouts process.
- One tax/VAT registration.
- Cleaner ops.

---

## 3. The Multi-Tenancy Decision Point

| Approach | Description | Trade-off |
|---|---|---|
| Schema-per-tenant | One DB schema per tenant | Strong isolation; expensive at scale |
| DB-per-tenant | One DB per tenant | Compliance-friendly; complex ops |
| Row-level (`tenantId`) | Shared schema, `tenantId` on every row | Cheapest; needs RLS in V2 |
| Service-per-tenant | Microservices per tenant | Final V2+V3 design |

**Decision:** V2 will likely use **shared schema with `tenant_id` column + Row-Level Security** because:

- Single-vendor → market place is a natural transition.
- Cost-efficient.
- Compliance achievable with RLS.

The current MVP schema does not require `tenant_id` columns because the architecture is single-tenant by design. The extensions below describe the **minimum-impact** upgrade path.

---

## 4. Schema Pre-Adaptation Patterns

These are **design choices in this schema** that make multi-tenant adoption easier:

### 4.1 String IDs Everywhere

`cuid()` IDs are tenant-agnostic. When multi-tenant arrives, ID generation doesn't change. UUIDs for distributed services keep working.

### 4.2 No Cross-Tenant Implicit FKs

- All aggregates are **tenant-coherent**: a `Product` belongs to one vendor; an `OrderItem` references one Product. No place where data crosses tenant boundaries implicitly.
- Adding a `tenant_id` column on root aggregates does not force a cascade of foreign keys.

### 4.3 Snake-case Names

Standardized names (`status`, `created_at`) ease adding columns like `tenant_id`.

### 4.4 Inventory Lives with Variant

Inventory already abstracts warehouse (`warehouseCode` field). When multi-warehouse-per-seller arrives, we just add rows.

### 4.5 Order is Self-Contained

Order is fully snapshotted (lines, addresses, taxes). Per-tenant orders remain a natural cut.

### 4.6 Audit Log Polymorphic

`AuditLog.actorAdminId / actorUserId` is tenant-agnostic; switching to multi-tenant only adds `tenantId` for filtering.

### 4.7 RBAC Is Per-Admin

`AdminUser.role` is global per current design. In multi-tenant V2 we'd add `tenant_id` to `AdminUser` (or create `TenantAdmin` separator). Simplest path: add a `TenantMembership` table.

### 4.8 Static Pages Already Per-Slug

Switching to per-tenant static pages: add `tenant_id` column.

---

## 5. Multi-Tenant Migration Roadmap (V2+)

### 5.1 Phase 1 — Schema Augmentation (V2 prep)

Migration script:

```sql
ALTER TABLE product ADD COLUMN tenant_id VARCHAR(64);
ALTER TABLE "order" ADD COLUMN tenant_id VARCHAR(64);
ALTER TABLE payment ADD COLUMN tenant_id VARCHAR(64);
ALTER TABLE user ADD COLUMN tenant_id VARCHAR(64) NULL; -- shared across tenants for buyer cross-tenant
-- Set all existing rows to a sentinel tenant
UPDATE product SET tenant_id = 'smartlight-primary';
-- ...
```

Indexes added:
- `CREATE INDEX idx_product_tenant_status ON product(tenant_id, status);`

### 5.2 Phase 2 — Tenant Membership (V2)

New tables:

```
tenant (id, code, name, status, created_at, ...)
tenant_membership (id, tenant_id, user_id, role_in_tenant, ...)
tenant_admin_membership (id, tenant_id, admin_user_id, role_code, ...)
```

Adds the concept of:

- **Buyer users** who can shop at multiple tenants (still one global email).
- **Vendor admins** who are scoped to one tenant.

### 5.3 Phase 3 — Vendor Profile (V2 marketplace)

```
vendor_profile (id, tenant_id, display_name, banner, payout_account_id, ...)
product ADD COLUMN vendor_id VARCHAR(64) → reference vendor_profile(id)
```

Each `Product` gets a `vendor_id`. Vendors can ship from their own warehouse.

### 5.4 Phase 4 — Payouts (V2+)

```
payout (id, vendor_id, period, gross_amount, fees, net_amount, status, ...)
payout_item (payout_id, order_id, amount, fee, ...)
```

Payments split per vendor; payout calculated by cron.

### 5.5 Phase 5 — Row-Level Security (V3)

Enable RLS for tenant isolation:

```sql
ALTER TABLE product ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_tenant_isolation ON product
  USING (tenant_id = current_setting('app.tenant_id')::varchar);
```

App enforces `SET LOCAL app.tenant_id = :tenantId` per request.

---

## 6. What Stays the Same Across the V2 Cut

| Element | Same? |
|---|---|
| Schema names | ✅ |
| All other tables | ✅ |
| All enums | ✅ |
| Existing IDs | ✅ |
| Audit | ✅ (added `tenant_id`) |
| Auth (JWT) | ✅ (added `tenant_id` claim) |

Adding `tenant_id` columns is **additive**. The migration is safe during cutover (V2 starts multi-tenant, MVP continues as one logical tenant).

---

## 7. Single-Vendor Active Mode Today

In V1 we still enforce that all writes map to a single tenant. The application maintains a sentinel:

```ts
const TENANT_ID = 'smartlight-primary';
// All repository methods use this as a filter
```

Future-readiness point: **start wrapping repository methods with a `tenantContext` parameter today** even if it only carries the sentinel.

---

## 8. Inter-Tenant Data Sharing (V2+)

Some entities cross tenants intentionally:

| Entity | Sharing strategy |
|---|---|
| `User` (buyer) | Shared across tenants; one email is one person |
| `Review` | Visible product-level, not tenant-level |
| `Category` | Shared catalog taxonomy |
| `Brand` | Shared |
| `TaxRate` | Shared |

The `User` global email becomes a deliberate decision point. If a user shops at multiple tenants on a marketplace platform, one `User.id` works. If tenants require isolation, split into `BuyerProfile` per tenant (V3+).

---

## 9. Storage Cost Estimate (Future-Proofed)

The schema today doesn't add cost. Future `tenant_id` column adds 8 bytes per row; index adds ~10 bytes per row.

At scale (~10M `product` rows in V2):

- 10M × 8 bytes = ~80 MB additional in column storage.
- 10M × ~10 bytes (index) = ~100 MB.

Negligible.

---

## 10. Documentation Pointers

- **Vendor / Marketplace** design: see `docs/05-software-architecture/21_MICROSERVICE_MIGRATION_PLAN.md` and BA features `SF-MKT-XXX` (V2 backlog).
- **Multi-tenant pricing** is a separate `TAX_RATE` per tenant; the existing schema supports it via `tax_rate.is_default` flag.

---

## 11. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial multi-tenancy notes |

---

**End of 13_MULTI_TENANCY_NOTES.md**

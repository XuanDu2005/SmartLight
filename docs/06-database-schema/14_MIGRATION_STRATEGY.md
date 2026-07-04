# 14 — Migration Strategy

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04
**Author:** Principal Database Architect

---

## 1. Purpose

This document defines **how the SmartLight database is migrated**:

- Forward-only, no destructive on-rollback changes
- Online-safe migrations
- Prisma Migrate workflow
- Per-phase migrations for V1.0 → V1.5
- Backout procedures (only where feasible)
- Locked and offline migrations vs. online

The intent is **database migrations never block deploys** while preserving production integrity.

---

## 2. Principles

| # | Rule | Reason |
|---|---|---|
| M-1 | Forward-only | Avoid destructive commit rollback |
| M-2 | Additive changes by default | New tables / new nullable columns |
| M-3 | Renames = additive + backfill + deprecate | Old cols preserved until V2 |
| M-4 | Drop tables only after 2 minor versions of disuse | Buffer against broken apps |
| M-5 | Heavy indexes added via `CONCURRENTLY` | Lock-free |
| M-6 | Long DDLs executed during off-peak window | IO impact contained |
| M-7 | Database migrations reviewed by a 2nd engineer | Avoid mistakes |
| M-8 | Migrations tested in `staging` first | Catch drift early |
| M-9 | Migration sha recorded in `prisma_migrations` | Audit trail |
| M-10 | Every migration includes rollback notes | Knowledge retention |

---

## 3. Migration Tooling

- **Tool:** Prisma Migrate (`prisma migrate dev` / `prisma migrate deploy`).
- **Migration file location:** `apps/api/prisma/migrations/`.
- **Naming:** `<timestamp>_<name>` (auto-generated).
- **Raw SQL:** allowed via SQL files (`migration.sql`); paired with a comment block at the top describing intent.

---

## 4. Phased Migration Strategy

### 4.1 Phase V1 — Initial Setup

| Step | Action |
|---|---|
| 1 | Apply base schema (already defined in `01_PRISMA_SCHEMA.prisma`). |
| 2 | Seed minimal data (admin user, role table). |
| 3 | Verify all constraints (FK, UNIQUE). |
| 4 | Connect App / Migrate / Backup roles. |

Expected migration count: 1 (base schema).

### 4.2 Phase V1.1 — Hardening

| Migration | Description | Risk |
|---|---|---|
| `m_002_add_check_constraints` | Add CHECK constraints per `05_CONSTRAINTS_AND_RULES.md` | Medium |
| `m_003_partial_unique_indexes` | Add partial unique indexes per `08_SOFT_DELETE_STRATEGY.md` | Low (concurrent) |
| `m_004_updated_at_triggers` | Add `updated_at` trigger for every table | Low |
| `m_005_audit_log_protect` | DB role denies UPDATE/DELETE on `audit_log` | Medium |
| `m_006_inventory_available_trigger` | Auto-recompute `available = on_hand - reserved` | Medium |
| `m_007_immutable_paid_order_trigger` | Block UPDATE on `order` after `paid_at` | Medium |
| `m_008_outbox_status_index` | Drop & recreate outbox status index as partial | Low |
| `m_009_pg_trgm` | Enable `pg_trgm` and product search index | Low (concurrent) |
| `m_010_db_roles` | Create least-privilege roles | Medium |

Each migration is **online** (uses `CREATE INDEX CONCURRENTLY` etc.).

### 4.3 Phase V1.5 — Performance & Search

| Migration | Description |
|---|---|
| `m_011_pg_trgm_search_activation` | Add full-text index on product name |
| `m_012_materialized_views` | Create `mv_daily_orders`, `mv_top_products` |
| `m_013_partitioning_prep` | Range-partition `audit_log`, `stock_movement` by month |
| `m_014_read_replica_wiring` | Configure replica routing (Prisma `replicaUrl`) |
| `m_015_vnd_currency_full` | Multi-currency fields added (future) |

### 4.4 Phase V2 — Marketplace (Multi-Tenant)

| Migration | Description |
|---|---|
| `m_016_tenant_id_columns` | Add `tenant_id` to all business tables |
| `m_017_tenant_index` | Composite index `(tenant_id, …)` |
| `m_018_tenant_membership` | New tables `tenant`, `tenant_membership`, `vendor_profile` |
| `m_019_rls_enable` | Enable RLS policies |

---

## 5. Online Migration Cookbook

### 5.1 Add Nullable Column (Safe)

```sql
ALTER TABLE product ADD COLUMN meta_description VARCHAR(500);
```
- Instant in PostgreSQL — only metadata update.

### 5.2 Add Non-Null Column with Default

```sql
ALTER TABLE product ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE;
```
- Postgres 11+ doesn't rewrite table for constant defaults.

### 5.3 Add Index (Online)

```sql
CREATE INDEX CONCURRENTLY idx_product_new_field ON product (new_field);
```

### 5.4 Add Backfill Step

```sql
-- 1. Add nullable
ALTER TABLE order ADD COLUMN legacy_id VARCHAR(40);
-- 2. Backfill
UPDATE order SET legacy_id = 'SM-' || created_at::date || '-' || id WHERE legacy_id IS NULL;
-- 3. Constrain
CREATE UNIQUE INDEX uq_order_legacy_id_active ON order (legacy_id) WHERE deleted_at IS NULL;
ALTER TABLE order ALTER COLUMN legacy_id SET NOT NULL;
```

### 5.5 Rename Column (Multi-Step)

1. Add new column `full_name_v2`.
2. Backfill from `full_name` via `UPDATE`.
3. Use app to write to `full_name_v2`.
4. Backfill previous reads from `full_name_v2` until app confirmed.
5. Drop `full_name` after app confirms no usage (two minor versions later).

### 5.6 Drop Table (Phased)

| Step | Description |
|---|---|
| 1 | Mark table deprecated in API (return 410). |
| 2 | Run a 2-minor-version grace period (V1.5 → V2). |
| 3 | After 6 months, drop in V2 with online `DROP TABLE`. |

### 5.7 Long Mutations

- Operations like `UPDATE … WHERE …` of millions of rows are batched:

```sql
UPDATE order SET paid_at = confirmed_at
WHERE id IN (
  SELECT id FROM order WHERE paid_at IS NULL AND status = 'CONFIRMED' LIMIT 10000
);
```

- Loop with progress check (background job).

---

## 6. Lock-and-Lockout Triggers

Some migrations must **block all writes** for a short window. These include:

- Switching enum values in app-dictated columns.
- Adding NOT NULL with default (none required if PG11+).
- Adding unique constraints to populated column.

Such migrations are scheduled **02:00 ICT on weekends** with a maintenance window banner. PG statement_timeout is set globally to abort oversized queries.

---

## 7. Migration Backout Policy

| Migration type | Backout supported |
|---|---|
| Add nullable column / index | Yes (DROP) |
| Add NOT NULL column (no default) | No (data loss); only forward |
| Backfill data | Yes (revert with inverse SQL) |
| Drop table | **No** (after V1.5 cutover). Pre-V1.5: via Neon snapshot restore |
| DDL rename | Yes only within same migration; otherwise multi-step (see §5.5) |

For all reversible migrations, a `m_<id>_down.sql` companion exists but is **not auto-applied**. Backout is manual via DBA decision.

---

## 8. CI / CD Integration

### 8.1 Pipeline

```
PR Opened
   └─ prisma format validation
      └─ prisma lint
         └─ prisma migrate dev (dry-run with shadow DB)
            └─ schema-snapshot compare
               └─ generated SQL diff reviewed
                  └─ approval gate
                     └─ merge
                        └─ main → CI:
                           ├─ lint
                           ├─ typecheck
                           ├─ unit tests
                           ├─ integration tests
                           └─ migration tests
```

### 8.2 Staging Deploy

```
git push main → CI ✅
   └─ Deploy API to staging
      └─ Run `prisma migrate deploy`
         └─ Smoke test
            └─ Tag staging successful
```

### 8.3 Production Deploy

```
Approval gate (Tech Lead)
   └─ Trigger release job (manual)
      └─ `prisma migrate deploy`
         └─ healthcheck (`/health/db`)
            └─ success / rollback announcement
```

### 8.4 Migration Approval

- Migration SQL must be reviewed by at least **one** experienced engineer + 1 DBA reviewer.
- Migration that touches more than 5 tables requires Architecture Board review.

---

## 9. Schema Drift Detection

| Tool | Purpose |
|---|---|
| `prisma migrate status` | Detect pending migrations |
| `prisma migrate verify` | Detect drift |
| `prisma db pull` | Compare live DB to schema (warn-only) |

Daily check from CI:

```bash
prisma migrate status
prisma migrate verify
```

Alerts on mismatch.

---

## 10. Backups & Restore During Migration

| Migration | Pre-backup |
|---|---|
| All non-destructive | Neon auto-snapshot |
| Heavy mutations | Manual snapshot via `pg_dump` |
| Drop table | Full backup + PITR enabled |

Restore procedure: see `05-software-architecture/18_DEPLOYMENT_ARCHITECTURE.md`.

---

## 11. Multi-Database Strategy (Future)

| Branch | Database |
|---|---|
| `main` | Production |
| `staging` | Staging |
| `feature/*` | Per-developer Neon branch (7-day TTL) |
| `PR-*` | Per-PR ephemeral Neon branch |

All use Prisma migrations idempotently.

---

## 12. Online vs. Offline

| Operation | Online | Offline | Window |
|---|---|---|---|
| Index create | ✅ | — | n/a |
| Check constraints not validating | ✅ (use `NOT VALID`) | — | n/a |
| Default change | ✅ | — | n/a |
| Enum value add | ✅ | — | n/a |
| Drop index/column | ✅ | — | Off-peak |
| Type change (text → varchar) | n/a | ✅ | 02:00 ICT weekend |
| Heavy data backfill | ✅ batched | — | Off-peak |

---

## 13. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial migration strategy |

---

**End of 14_MIGRATION_STRATEGY.md**

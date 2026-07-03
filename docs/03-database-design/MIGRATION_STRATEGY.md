# MIGRATION_STRATEGY.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal Database Architect

---

## 1. Purpose

This document defines SmartLight's **database migration strategy**:
- Forward-only migration principle
- Rollback policy
- Seed strategy
- Reference data
- Versioning

This is **design only** — no actual migration code is generated.

---

## 2. Migration Tool

**Tool:** Prisma Migrate (declarative, versioned SQL migrations)

**Workflow:**
```
1. Update schema.prisma (future phase)
2. prisma migrate dev --name <description>
3. Review generated SQL
4. prisma migrate deploy (production)
```

> **V1:** Migration tooling is configured but not used in design phase.

---

## 3. Migration Principles

### 3.1 Forward-Only Migrations

> **Migrations are forward-only. There are no automatic rollbacks.**

Rationale:
- Database evolves with the application
- Reversing data (e.g., delete column) loses data
- Forward-only is industry best practice (PostgreSQL, MySQL communities)

### 3.2 Compatibility Windows

Each migration is designed to:
- Be **backward-compatible** with the previous app version (zero-downtime deploy)
- **Forward-compatible** with the next app version (allow new app to read old schema)

**Example pattern:**
```
Phase 1: Add new column (nullable)
Phase 2: Backfill data
Phase 3: App starts writing to new column
Phase 4: Old column becomes deprecated (but kept)
Phase 5: (Later migration) Drop old column
```

> **Reason:** While app servers are being rolled, both old and new code must work.

### 3.3 Migration Categories

| Type | Examples | Risk |
| --- | --- | --- |
| **DDL-Create** | New table | Low |
| **DDL-Add column** | New nullable column | Low |
| **DDL-Drop column** | Remove unused | Medium (data loss) |
| **DDL-Rename** | Column rename | High (breaks app) |
| **DDL-Alter type** | Change column type | High |
| **DML-Data backfill** | Populate new column | Medium |
| **DDL-Index** | Create index (CONCURRENTLY) | Low |
| **DDL-Constraint** | Add CHECK or FK | Medium |
| **DDL-Partition** | Convert to partitioned | Very High |

### 3.4 High-Risk Operations

For high-risk operations, use multi-phase migrations:

| Operation | Multi-Phase Strategy |
| --- | --- |
| Rename column | 1) Add new column. 2) Dual-write. 3) Backfill. 4) Read from new. 5) Drop old. |
| Change column type | 1) Add new column with new type. 2) Dual-write. 3) Backfill. 4) Drop old. |
| Add NOT NULL | 1) Add nullable. 2) Backfill. 3) Set NOT NULL. |
| Drop column | 1) Stop reading. 2) Stop writing. 3) Wait (1 release). 4) Drop. |
| Add FK | 1) Add NOT VALID. 2) Validate in background. |
| Create index | `CREATE INDEX CONCURRENTLY` (no lock) |

---

## 4. Rollback Policy

### 4.1 Rollback Approach

**Manual rollback** via reverse migration when needed:

```
Migrations are FORWARD-ONLY by design.
Rollback is an explicit reverse migration with manual data preservation considerations.
```

### 4.2 When to Rollback

Rollback ONLY when:
- Migration failed in production (immediate)
- App incompatibility discovered (urgent)
- Critical data integrity issue

Do NOT rollback for:
- Minor issues
- Convention disagreement
- Convenience

### 4.3 Rollback Procedure

1. **Identify migration** to revert (e.g., `20260703_create_orders`)
2. **Write reverse migration** (manually):
   - Drop new tables/columns
   - Restore renamed objects (if data was preserved)
   - Remove added indexes
3. **Test in staging**
4. **Apply to production** with downtime (or zero-downtime if compatible)
5. **Audit** and document post-mortem

### 4.4 Forward-Fix Preferred

In most cases, prefer **forward-fix** over rollback:
- Write a new migration that corrects the issue
- Forward-only remains true

---

## 5. Migration Naming

### 5.1 Format

`<YYYYMMDDHHMMSS>_<description>`

| Example | Description |
| --- | --- |
| `20260703120000_initial_schema` | First migration |
| `20260815090000_add_inventory_module` | Adds inventory tables |
| `20260901100000_split_shipping_address` | Refactor |
| `20270115120000_partition_orders` | Partitioning migration |

### 5.2 Description Conventions

- Lowercase
- Snake_case
- Verb-led (`add`, `create`, `alter`, `drop`, `partition`, `backfill`)
- Object-scoped (`_<entity>`)
- Migration order preserved by timestamp

---

## 6. Migration Environments

### 6.1 Environments

| Environment | Database | Migration Source |
| --- | --- | --- |
| Local | Docker PostgreSQL | Auto-applied via `prisma migrate dev` |
| CI | Ephemeral DB | Auto-applied for testing |
| Staging | Neon branch | Deployed from main |
| Preview | Neon PR branch | Per-PR |
| Production | Neon primary | Manually deployed (or auto via CI/CD) |

### 6.2 Promotion

```
Local → CI → Staging → Production
```

Each promotion is logged with:
- Migration timestamp
- Migration description
- Operator (or CI run)
- Before/after DB size (informational)

---

## 7. Seed Strategy

### 7.1 Reference Data

The following must be seeded:

| Data | Description | Seed Method |
| --- | --- | --- |
| System roles | Admin, CatalogManager, etc. | Migration-time seed |
| System permissions | Permission catalog | Migration-time seed |
| Default tax rate | Vietnam VAT 10% | Migration-time seed |
| Default shipping zones | Vietnam regions | Migration-time seed |
| Email templates | Initial templates (vi-VN) | Application-time seed |
| Feature flags (default) | Initial flag set | Application-time seed |
| Static pages | Terms, Privacy, About | Application-time seed |
| System configs | VAT rate, payment providers | Migration-time seed |

### 7.2 Seed Layers

**Layer 1: Migration-time (idempotent)**
- Roles, permissions, tax rates — must exist before app starts
- Inserted via SQL in migration file
- Wrapped in `ON CONFLICT DO NOTHING`

**Layer 2: Application-time (manual or scripted)**
- Email templates, static pages — can be modified via admin
- Loaded via `npm run seed` or admin tool
- Idempotent with upser logic

**Layer 3: Demo data (dev/staging only)**
- Sample products, customers, orders
- Run via `npm run seed:demo` (NEVER production)

### 7.3 Idempotency

All seed scripts MUST be idempotent:
- `INSERT ... ON CONFLICT (unique_key) DO NOTHING`
- Or `INSERT ... ON CONFLICT (unique_key) DO UPDATE SET ...`

---

## 8. Reference Data

### 8.1 Reference Data Tables

| Table | Type | Seeded |
| --- | --- | --- |
| `role` | Reference | Yes (system roles only) |
| `permission` | Reference | Yes (all permissions) |
| `admin_user_role` | Reference | No (admin-managed) |
| `role_permission` | Reference | Yes (default mappings) |
| `tax_rate` | Reference | Yes (default 10%) |
| `shipping_zone` | Reference | Yes (Vietnam regions) |
| `shipping_rate` | Reference | Yes (carrier defaults) |
| `system_config` | Reference | Yes (initial values) |
| `email_template` | Reference | Partially (system templates) |
| `static_page` | Reference | Partially (initial pages) |
| `feature_flag` | Reference | Partially (initial flags) |

### 8.2 Reference Data Versioning

Reference data with versions:
- `email_template.version` — increment on update
- `tax_rate.effective_from` / `effective_to` — time-bound
- `shipping_rate` — replaced by new rate, not edited

---

## 9. Migration Testing

### 9.1 Pre-Production Checks

Every migration must:
- [ ] Apply cleanly on empty DB
- [ ] Apply cleanly on previous production snapshot
- [ ] Rollback forward-fix tested
- [ ] No DDL during business hours (or low-traffic window) for high-risk ops
- [ ] Pass CI integration tests

### 9.2 CI Pipeline

| Step | Action |
| --- | --- |
| 1 | `prisma migrate dev` against fresh DB |
| 2 | Run unit tests |
| 3 | Seed reference data |
| 4 | Run integration tests |
| 5 | Validate schema matches expectations |

### 9.3 Staging Validation

Before production:
- Run migration on staging (clone of prod structure)
- Run smoke test suite
- Check timing (long migrations should be split)

---

## 10. Zero-Downtime Migration Patterns

### 10.1 Add Column (Safe)

```
Step 1: Migration: ADD COLUMN x INT NULL
Step 2: Code deploy: write to x (when present)
Step 3: Migration: Backfill x from older values (if needed)
Step 4: Migration: SET NOT NULL on x (after app is fully rolled)
Step 5: Future: drop any old column referencing x
```

### 10.2 Drop Column (Safe)

```
Step 1: Code deploy: stop reading the column
Step 2: Code deploy: stop writing to column
Step 3: Wait for full app rollout (or 24 hours)
Step 4: Migration: DROP COLUMN
```

### 10.3 Rename Column (Multi-Phase)

```
Step 1: Migration: ADD COLUMN new_name
Step 2: Code deploy: dual-write (write to both old_name and new_name)
Step 3: Migration: Backfill new_name from old_name
Step 4: Code deploy: read from new_name
Step 5: Code deploy: stop writing to old_name
Step 6: Migration: DROP COLUMN old_name
```

### 10.4 Create Index Without Lock

Use `CREATE INDEX CONCURRENTLY`:

```
-- Migration
CREATE INDEX CONCURRENTLY idx_x_y ON table (column);
```

> Requires manual migration (not auto-generated by Prisma).

### 10.5 Add NOT NULL

```
Step 1: Migration: ADD COLUMN x INT NULL
Step 2: Code deploy: write to x (instead of old column)
Step 3: Migration: Backfill x from existing data
Step 4: Migration: SET NOT NULL on x
Step 5: Migration: (later) Drop old column
```

### 10.6 Add Foreign Key

```
Step 1: Migration: ADD CONSTRAINT fk_x FOREIGN KEY (y_id) REFERENCES z(id) NOT VALID
Step 2: Migration: ALTER TABLE x VALIDATE CONSTRAINT fk_x (in background)
```

---

## 11. Backfill Strategies

| Scenario | Strategy |
| --- | --- |
| New mandatory field for existing data | Backfill in migration; idempotent |
| New optional field | No backfill needed |
| Data format change | Transform via SQL update; preserve original |
| Large backfill | Background job (BullMQ); chunked |

---

## 12. Migration Logging

### 12.1 Migration Audit

Each migration creates a row in `_prisma_migrations` (Prisma internal table) with:
- Migration timestamp
- Name
- Applied time
- Checksum

### 12.2 Application-Level Audit

For significant migrations, an `AuditLog` entry:
- `action: "schema.migrated"`
- `metadata: { migration, version, before_rows, after_rows }`

---

## 13. Disaster Recovery During Migration

### 13.1 Pre-Migration

- Snapshot DB (Neon PITR backup before migration)
- Verify last successful backup

### 13.2 Migration Failure

| Failure Mode | Action |
| --- | --- |
| DDL syntax error | Fix migration; do not re-run failed version |
| Constraint violation | Inspect data; either fix data or update migration |
| Timeout | Increase timeout; consider splitting |
| Disk full | Increase storage; retry |

### 13.3 Post-Migration

- Verify schema matches expected
- Run critical queries
- Validate application health
- Notify team

---

## 14. Migration Review Process

| Aspect | Reviewer |
| --- | --- |
| Routine migration | Tech Lead |
| High-risk migration | Principal Engineer + DBA |
| Data backfill | Data Engineer |
| Critical state changes | Engineering Manager |

### 14.1 PR Template Sections

For migration PRs:
- [ ] Description
- [ ] Migration file list
- [ ] Backward compatibility statement
- [ ] Rollback strategy (forward-fix vs reverse migration)
- [ ] Backfill approach (if any)
- [ ] Index strategy (CONCURRENTLY if needed)
- [ ] CI test results
- [ ] Staging validation timing

---

## 15. Migration Anti-Patterns (Forbidden)

| Anti-Pattern | Why Forbidden |
| --- | --- |
| **Editing applied migration** | Causes checksum mismatch; rollback required |
| **Skipping migration in dev** | Causes diff between dev and prod |
| **RENAME in production without dual-write** | Breaks running app |
| **DROP COLUMN with active reads** | Breaks running app |
| **ALTER TABLE without CONCURRENTLY for large tables** | Locks table |
| **Foreign keys WITHOUT NOT VALID** | Locks table on existing rows |
| **Mixing DDL and DML without transaction** | Inconsistent state on failure |
| **Adding tables/changes without updating permissions** | App fails to access new tables |

---

## 16. Future Migration Considerations (V1.5+)

### 16.1 Partitioning

When partitioning `order` or `audit_log`:

```
Phase 1: Create partitioned table (_new)
Phase 2: Create trigger to dual-write
Phase 3: Backfill historical data
Phase 4: Switch app to read from _new
Phase 5: Drop old non-partitioned table
```

### 16.2 Microservice Split

When extracting microservice:
- New service gets its own database
- Replication of owned data
- Cutover via dual-writes
- Old data archived

### 16.3 Multi-Region

- Logical replication between regions
- Schema applied to each region
- Coordinated migrations

---

## 17. Coverage Validation

| Check | Status |
| --- | --- |
| Forward-only principle stated | ✓ |
| Rollback policy defined | ✓ |
| Naming convention defined | ✓ |
| Compatibility windows defined | ✓ |
| Multi-phase patterns documented | ✓ |
| Reference data seed strategy defined | ✓ |
| Testing strategy defined | ✓ |
| Anti-patterns listed | ✓ |

---

## 18. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal Database Architect | Initial migration strategy: forward-only, backward-compatible patterns, seed strategy, reference data, anti-patterns |

---

**End of Document — MIGRATION_STRATEGY.md**
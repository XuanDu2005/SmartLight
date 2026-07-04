# SmartLight — Database Schema Design

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Owner:** Principal Database Architect
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04

---

## 1. Purpose

This folder (`docs/06-database-schema/`) contains the **complete Database Schema Design** for SmartLight:

- The Prisma schema file (`.prisma`)
- Entity-relationship documentation
- Indexing strategy
- Constraints and business rules implementation
- Transaction design
- Data lifecycle and soft-delete strategy
- Audit-field standards
- Enums and constants
- Performance optimization
- Security and data protection
- Multi-tenancy notes (future-ready)
- Migration, seeding, traceability, and review checklist

This phase is **database schema design only**. **No application code, NestJS modules, API controllers, or frontend logic is produced.**

---

## 2. Scope of This Phase

| Produces | Does NOT Produce |
|---|---|
| ✅ Prisma `schema.prisma` (declarative) | ❌ NestJS code |
| ✅ ER explanation | ❌ API controllers / DTOs |
| ✅ Indexing strategy | ❌ Frontend code |
| ✅ Constraint definitions | ❌ Business logic |
| ✅ Transaction patterns | ❌ Tailwind UI / React |
| ✅ Lifecycle and audit trail design | ❌ Dockerfiles (separate phase) |
| ✅ Migration strategy | ❌ Seed scripts (see §3) |

---

## 3. Inputs (Source of Truth)

The schema design follows (in priority order):

1. `docs/05-software-architecture/` (highest authority)
2. `docs/02-system-analysis/`
3. `docs/01-business-analysis/`
4. `docs/00-governance/`

Earlier-phase design reference (already approved, immutable inputs):

- `docs/03-database-design/` — the previous design phase that pre-staged 64 MVP entities
- `docs/04-api-design/` — REST contract defines what fields must be addressable

> **Conflict Resolution:** Software Architecture > System Analysis > Business Analysis > Governance.

---

## 4. Document Map

| # | File | Purpose |
|---|---|---|
| 00 | `README.md` (this file) | Folder index |
| 01 | `01_PRISMA_SCHEMA.prisma` | Declarative Prisma schema (sole source of truth for the model) |
| 02 | `02_DATABASE_DESIGN_OVERVIEW.md` | High-level goals, principles, target state |
| 03 | `03_ENTITY_RELATIONSHIP_EXPLANATION.md` | ER walkthrough by context |
| 04 | `04_INDEXING_STRATEGY.md` | Indexes, B-tree / GIN / partial, performance tests |
| 05 | `05_CONSTRAINTS_AND_RULES.md` | FK / UNIQUE / CHECK / cascading |
| 06 | `06_TRANSACTION_DESIGN.md` | Transactional patterns (checkout, stock, payment) |
| 07 | `07_DATA_LIFECYCLE.md` | Creation → retention → archival → purge |
| 08 | `08_SOFT_DELETE_STRATEGY.md` | Soft delete conventions, edge cases |
| 09 | `09_AUDIT_FIELDS_STANDARD.md` | `createdAt` / `updatedAt` / `createdBy` / `updatedBy` rules |
| 10 | `10_ENUMS_AND_CONSTANTS.md` | Enum catalogue, allowed value tables |
| 11 | `11_PERFORMANCE_OPTIMIZATION.md` | N+1 prevention, hot-path design, denormalization rules |
| 12 | `12_SECURITY_AND_DATA_PROTECTION.md` | PII / encryption at rest / DB user least privilege |
| 13 | `13_MULTI_TENANCY_NOTES.md` | Single-vendor now; multi-tenant ready |
| 14 | `14_MIGRATION_STRATEGY.md` | Migration workflow, forward-only, online migrations |
| 15 | `15_SEED_DATA_DESIGN.md` | Test/dev seed data shape (no actual code generated) |
| 16 | `16_DATABASE_TRACEABILITY.md` | BA → API → Entity traceability |
| 17 | `17_DATABASE_REVIEW_CHECKLIST.md` | Final validation checklist |

---

## 5. Schema at a Glance

| Metric | Target |
|---|---|
| Bounded contexts (DDD) | 16 |
| Models in schema | 64 + 14 enums |
| Money type | `Decimal` (PostgreSQL) |
| ID strategy | `String @id @default(cuid())` (UUID v7 in V2 via `pgcrypto` for microservice portability) |
| Soft delete | `deletedAt DateTime?` per business entity |
| Audit fields | `createdAt`, `updatedAt`, `createdBy`, `updatedAt` (consistent) |
| Primary keys | Always `String @id`; UUID v7-shaped strings |
| Timestamps | `DateTime` (UTC) |

---

## 6. Architectural Principles Applied

1. **Startup First, Enterprise Ready** — 3NF normal; selective denormalization for hot paths.
2. **Clean Architecture / DDD** — model per bounded context, no cross-table joins enforced at design time.
3. **Microservice Ready** — IDs global, soft-delete + audit fields everywhere, no cross-context direct FKs unless explicitly justified.
4. **Performance First** — short indexes on hot paths (product slug, order status, coupon code, etc.).
5. **Money is integer** — `Decimal(20,4)` stored; never `Float`. Money is in VND × 1 (no minor unit).
6. **Soft Delete First** — never physically delete business rows; use `deletedAt`.
7. **Append-Only Audit** — events, status history, stock movement are never updated.
8. **Vietnamese Market** — locale defaults (`vi-VN`), CITEXT for emails / codes.

---

## 7. Constraints Conformance

| Requirement | Conformance |
|---|---|
| UUID primary keys | ✅ Via `cuid()` (string ID with collision-safe ordering); UUID v7 in V2 service-extract |
| Soft delete (`deletedAt`) | ✅ On all business entities |
| `createdAt` / `updatedAt` | ✅ Standard `AuditFields` convention |
| Indexing strategy | ✅ See `04_INDEXING_STRATEGY.md` |
| Foreign key constraints | ✅ All relationships declared; cascade rules explicit |
| Unique constraints | ✅ `@@unique` on slug / email / code / (variantId, warehouseId) / etc. |
| Enums for status fields | ✅ All status / type fields enum-typed |
| `Decimal` for price | ✅ `Decimal @db.Decimal(20,4)` |
| Inventory concurrency | ✅ `available` is a derived column documented for atomic decrement via SQL function in V1.1 |
| Order immutability post-payment | ✅ Enforced via app checks; DB constraint set in V1.1 |
| Idempotent payments | ✅ `WebhookEvent.idempotencyKey` UNIQUE |
| Cart expiry | ✅ `expiresAt` field |
| Coupon usage limit | ✅ `usageLimit` + `usageCount` atomically updated |
| Audit log immutability | ✅ No update / delete path; DB role enforced |

---

## 8. Risks Acknowledged

| Risk | Mitigation |
|---|---|
| Soft delete + unique constraint conflict | Use partial unique indexes with `WHERE deleted_at IS NULL` (Prisma `@@index` + migration `CREATE UNIQUE INDEX … WHERE deleted_at IS NULL`) |
| Money rounding errors | All money in `Decimal(20,4)`; rounding only at presentation layer |
| Inventory race condition | `available` tracked via `UPDATE … WHERE available >= $qty`; row lock |
| Slow admin search | Indexed `email`, `phone`, `createdAt`; GIN trigram for fuzzy (V1.1) |
| Migration drift | Strict Prisma migrate pipeline; see `14_MIGRATION_STRATEGY.md` |
| Cascade delete surprises | Cascade rules explicit; tested; no `ON DELETE CASCADE` on audit / order |

---

## 9. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial schema design (64 entities, 14 enums) |

---

**End of README.md**

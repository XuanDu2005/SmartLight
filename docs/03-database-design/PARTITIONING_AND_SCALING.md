# PARTITIONING_AND_SCALING.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal Database Architect

---

## 1. Purpose

This document describes **future scalability** strategies for SmartLight's database. It addresses:
- Order partitioning
- Audit log archival
- Media separation
- Read replicas
- Sharding considerations

This is **design only** — no SQL or implementation is generated in V1.

---

## 2. Scaling Strategy Tiers

| Stage | When | Action |
| --- | --- | --- |
| V1 (current) | 0-100K orders/month | Single Postgres + Neon auto-scale + Redis |
| V1.5 | 100K-500K orders/month | Add read replicas + extended partitioning |
| V2 | 500K+ orders/month | Per-service databases + sharding + archive tier |

---

## 3. Vertical Scaling (V1)

### 3.1 Neon Compute

Neon provides **auto-scaling compute**:
- Min: 0.25 vCPU (cost optimization for dev)
- Max: 8 vCPU (peak load)
- Auto-scale based on connection load

### 3.2 When to Scale Up

| Symptom | Action |
| --- | --- |
| CPU > 70% sustained | Upgrade Neon compute tier |
| Connections > 80% of limit | Add PgBouncer pooling |
| Slow queries > 1s | Index review + query optimization |
| Lock contention | Application redesign for less lock use |

### 3.3 NOT Recommended for V1

- Manual partitioning (premature)
- Sharding (premature)
- Custom multi-region DB (premature)

---

## 4. Read Replicas (V1.5+)

### 4.1 Use Cases

| Use Case | Route To |
| --- | --- |
| Customer browse (catalog, reviews) | Read replica |
| Order history (when not editing) | Read replica |
| Analytics queries | Read replica |
| Order create, payment, returns | Primary (write) |
| Checkout flow | Primary (write) |

### 4.2 Replication Lag

| Metric | Acceptable |
| --- | --- |
| Lag | < 5 seconds (95p) |
| Lag for critical | < 1 second |

### 4.3 Read-After-Write

For checkout completion, customer must see updated order:
- Read after write from primary (with `read_from_primary=true`)
- OR use session-stickiness for 30 seconds

### 4.4 Tools

- **Neon Read Replicas** (native, no setup)
- **PgBouncer** for connection pooling on primary
- Application-level read routing

---

## 5. Time-Series Partitioning (V1.5+)

### 5.1 Strategy

For high-volume, time-ordered tables, use **PostgreSQL native partitioning by date range**.

### 5.2 Tables to Partition

| Table | Partition Strategy | Rationale |
| --- | --- | --- |
| `order_status_history` | Monthly | Per-order event burst |
| `stock_movement` | Monthly | Append-only; high volume |
| `notification_log` | Monthly | Append-only; high volume |
| `audit_log` | Monthly | Append-only; high volume |
| `webhook_event` | Monthly | Idempotency TTL |
| `tracking_event` | Monthly | Carrier updates |

### 5.3 Partition Function

> **Conceptual only — actual SQL deferred to V1.5 migration phase.**

Each partitioned table is split into:
- `_yYYYY_mMM` partitions per month
- `_yYYYY` partitions for older (annual) data after 1 year
- Future partitions created by `pg_partman` or scheduled job

### 5.4 Benefits

| Benefit | Impact |
| --- | --- |
| Faster time-range queries | Scan only relevant partition |
| Cheaper archival | Detach old partition; move to cold storage |
| Easier maintenance | VACUUM, REINDEX per partition |
| Faster bulk deletes | DETACH PARTITION (instant) vs DELETE (slow) |
| Better cache locality | Smaller indexes per partition |

### 5.5 Index Considerations

| Index Type | Behavior with Partitioning |
| --- | --- |
| Primary key | Must include partition key (e.g., `(id, created_at)`) |
| Foreign key | Cannot reference partitioned table natively |
| Other | Index per partition; global indexes not natively supported |

> **Trade-off:** FKeys are tricky with partitioned tables. We **avoid FKs to time-partitioned tables** (already V1 strategy).

---

## 6. Order Partitioning (V1.5+)

### 6.1 Strategy

`order` table can be partitioned by `created_at` (monthly) once volume exceeds threshold.

### 6.2 Migration Path (V1.5)

1. Create partitioned version `_new`.
2. Dual-write (write to both V1 and _new via trigger or app logic).
3. Backfill historical orders.
4. Switch reads to _new.
5. Drop V1 table.

### 6.3 Order Number Uniqueness

`order_number` is already unique. With partitioning:
- Define `(id, order_number)` as composite UNIQUE constraint
- Include partition key for full uniqueness

### 6.4 Cross-Partition Queries

| Pattern | Strategy |
| --- | --- |
| User order history (any date) | Single query across partitions |
| Single order lookup by `order_number` | Usually lands on one partition (UPI on `order_number`) |

---

## 7. Audit Log Archival (V1.5+)

### 7.1 Hot + Warm + Cold Strategy

| Tier | Storage | Retention |
| --- | --- | --- |
| Hot | PostgreSQL `audit_log` (current 1 year) | 0-1 year |
| Warm | PostgreSQL `audit_log_archive` (older partitions) | 1-7 years |
| Cold | S3 Glacier | 7+ years |

### 7.2 Migration

- After 1 year: move partitions to `audit_log_archive` schema
- After 7 years: export to S3 Glacier; remove from PostgreSQL

### 7.3 Query Across Tiers

- Hot queries: direct PostgreSQL
- Warm queries: PostgreSQL union views
- Cold queries: Athena on S3 (V2 only)

---

## 8. Notification Log Archival (V1.5+)

| Tier | Storage | Retention |
| --- | --- | --- |
| Hot | PostgreSQL | 90 days |
| Warm | PostgreSQL archive schema | 90 days - 1 year |
| Cold | Object storage | 1+ year |

> Operational data; less critical than audit.

---

## 9. Webhook Event Archival (V1.5+)

| Tier | Retention |
| --- | --- |
| PostgreSQL | 90 days (idempotency window) |
| Cold (S3) | 90 days - 1 year |
| Delete | 1 year |

> After 90 days, idempotency window expires; webhook events can be archived.

---

## 10. Media Separation (V2)

### 10.1 Current V1

Media metadata in `media_file` table; actual binaries in Cloudinary.

### 10.2 V2 Strategy

| Aspect | V1 | V2 |
| --- | --- | --- |
| Metadata | PostgreSQL `media_file` | Same |
| Storage | Cloudinary (third-party) | Same |
| Backup | Cloudinary-managed | + self-hosted backup (S3) |
| Regional CDN | Cloudinary | + regional multi-CDN |

> SmartLight never stores media binaries in PostgreSQL — only metadata.

### 10.3 Hot vs Cold Media

- **V1:** No separation
- **V2:** Frequently-accessed product images cached in Redis CDN URL; older uploads to cold storage

---

## 11. Connection Pooling

### 11.1 V1 Approach

- **PgBouncer** or Neon pooler in transaction pooling mode
- App-side connection limits per service

### 11.2 Service-Side Pools

| Service | Pool Size |
| --- | --- |
| HTTP (NestJS) | 10 connections |
| Worker (BullMQ) | 10 connections |
| Migration | On-demand |

---

## 12. Caching Strategy (Redis)

### 12.1 Cache Categories

| Data | TTL | Invalidation |
| --- | --- | --- |
| Product details | 1 hour | On product update |
| Category tree | 6 hours | On category update |
| Brand list | 24 hours | On brand update |
| Exchange rates (V2) | 1 hour | — |
| Cart calculation | 5 minutes | On cart update |
| Stock on hand | 30 seconds | On mutation (write-through) |
| Session data | 30 minutes | On activity |
| Rate limit counters | Window | Expiry |
| Resolved permissions | 5 minutes | On role change |
| Feature flags | 1 minute | On toggle |

### 12.2 Cache Patterns

| Pattern | Use Case |
| --- | --- |
| Cache-aside | Read-heavy data (products, categories) |
| Write-through | Stock counts (consistency critical) |
| Write-behind | Analytics / aggregated metrics |
| Pub/sub | Multi-instance cache invalidation |

### 12.3 Cache Stampede Prevention

For high-traffic keys (e.g., homepage product list):
- Use `SET NX` lock during regeneration
- Stale-while-revalidate pattern

---

## 13. Sharding Considerations (V2)

### 13.1 When to Shard

| Trigger | Action |
| --- | --- |
| Single DB > 500 GB | Consider sharding |
| Write throughput > 10K/sec | Consider sharding |
| Latency sensitive global serving | Multi-region |

### 13.2 Sharding Strategy (Future)

| Shard Key | Tables | Rationale |
| --- | --- | --- |
| `user_id` | order, cart, return, review | Even distribution; same user co-located |
| `region_code` | order, shipment (V2) | Regional scale |

### 13.3 Not Recommended Now

Sharding adds:
- Cross-shard query complexity
- Transaction limitations
- Operational overhead

> **V1 to V2:** Migrate to microservices first; shard only when **necessary**.

---

## 14. Multi-Region (V2+)

### 14.1 V1: Single Region

- Primary in ap-southeast-1 (Singapore)
- Single Postgres + Neon
- Cloudinary CDN (regional)

### 14.2 V2: Multi-Region Considerations

- **Vietnam:** Primary (compliance)
- **Singapore:** Read replica
- **DR:** Cross-region backup

### 14.3 Challenges

| Challenge | Mitigation |
| --- | --- |
| Latency | Read replicas in region |
| Consistency | Eventual consistency (acceptable per NFR) |
| Compliance | Data residency per PDPD |
| Cost | Justified by user base |

---

## 15. Microservices Database Split (V2)

When the monolith splits, each service gets its own database:

| Service | Database Type | Size at V2 |
| --- | --- | --- |
| IdentityService | PostgreSQL (own DB) | Small (5-10 GB) |
| CatalogService | PostgreSQL + OpenSearch | Medium (20-50 GB) |
| InventoryService | PostgreSQL (own DB) | Small (5 GB) |
| OrderService | PostgreSQL (partitioned) | Large (50-200 GB) |
| PaymentService | PostgreSQL (own DB, PCI zone) | Small (5-10 GB) |
| ShippingService | PostgreSQL (own DB) | Small (5 GB) |
| ReturnsService | PostgreSQL (own DB) | Small (5 GB) |
| ReviewService | PostgreSQL (own DB) | Medium (10-30 GB) |
| NotificationService | PostgreSQL + Redis | Medium (10-30 GB) |

### 15.1 Migration Path (Conceptual)

1. Identify stable bounded contexts (already done — see `DOMAIN_MODEL.md`)
2. Extract `IdentityService` first (lowest coupling)
3. Then `PaymentService` (separate PCI zone)
4. Continue with `CatalogService`, `InventoryService`
5. `OrderService` last (high coupling)

---

## 16. Database Performance Targets

| Operation | Target P95 |
| --- | --- |
| Product list (category) | < 200 ms |
| Product detail | < 150 ms |
| Cart calculation | < 100 ms |
| Order placement | < 1.5 s |
| Payment processing | < 5 s (provider-bound) |
| Order history load | < 300 ms |
| Admin product search | < 500 ms |
| Stock reservation | < 50 ms |
| Stock release | < 50 ms |
| Audit log query (last 30 days) | < 1 s |

---

## 17. Capacity Planning Estimates

### 17.1 V1 Estimates (Year 1)

| Metric | Estimate |
| --- | --- |
| Active products | 5,000 |
| Active customers | 50,000 |
| Orders/month (peak) | 10,000 |
| Total orders (year) | 100,000 |
| Total storage (DB) | ~5-15 GB |
| Read QPS | ~100 |
| Write QPS | ~20 |

### 17.2 V2 Estimates (Year 2-3)

| Metric | Estimate |
| --- | --- |
| Active products | 50,000 |
| Active customers | 500,000 |
| Orders/month (peak) | 100,000 |
| Total orders (cumulative) | 1M |
| Total storage (DB) | ~50-100 GB |
| Read QPS | ~1,000 |
| Write QPS | ~200 |

---

## 18. Cost Optimization

| Strategy | Description |
| --- | --- |
| **Neon auto-scale** | Pay for compute when used |
| **Redis Upstash** | Pay-per-request; idle-friendly |
| **Connection pooling** | Reduce connections (cost) |
| **Right-size compute** | Monitor and adjust |
| **Tiered storage** | Move cold data to cheap storage |
| **Index maintenance** | Drop unused indexes (storage) |
| **Archive partition** | Detach and move to cold storage |

---

## 19. Monitoring & Alerting (Database)

| Metric | Alert Threshold |
| --- | --- |
| Connection pool utilization | > 80% |
| CPU utilization | > 70% sustained |
| Replication lag | > 30 seconds |
| Disk usage | > 80% |
| Slow queries count | > 10/min |
| Deadlocks | > 5/hour |
| Failed migrations | Any |
| Backup failures | Any |

---

## 20. Coverage Validation

| Check | Status |
| --- | --- |
| Vertical scaling documented | ✓ |
| Read replicas strategy defined | ✓ |
| Time-series partitioning listed | ✓ |
| Order partitioning documented | ✓ |
| Audit log archival planned | ✓ |
| Media separation covered | ✓ |
| Connection pooling defined | ✓ |
| Caching strategy defined | ✓ |
| Sharding deferred to V2 | ✓ |
| Multi-region deferred to V2 | ✓ |
| Microservice DB split mapped | ✓ |
| Performance targets defined | ✓ |
| Capacity estimates provided | ✓ |

---

## 21. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal Database Architect | Initial partitioning/scaling strategy: V1 vertical + read replicas (V1.5), time-series partitioning, audit archival, microservice DB split, capacity estimates |

---

**End of Document — PARTITIONING_AND_SCALING.md**
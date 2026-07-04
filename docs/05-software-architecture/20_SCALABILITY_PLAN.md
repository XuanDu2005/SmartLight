# 20 — Scalability Plan

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document describes **how SmartLight scales** over time: from MVP single-instance to multi-region, multi-service. It covers vertical, horizontal, caching, and growth strategies.

---

## 2. Scalability Principles

1. **Scale stateless first** — application tier scales horizontally by default.
2. **Caching wins** — more bang for buck than adding hardware.
3. **Database is the bottleneck** — design every query as if it's hot.
4. **Asynchronous when possible** — move heavy work out of request path.
5. **Measure before scaling** — don't guess.
6. **Cost-aware** — scale what needs scaling.

---

## 3. Growth Stages

| Stage | DAU | Orders/day | API Reqs | Architecture |
|---|---|---|---|---|
| **S1 (MVP launch)** | < 1k | < 50 | < 100k | Modular monolith (1 instance) |
| **S2 (Growth)** | 1–10k | 50–1k | 100k–1M | Modular monolith (2 instances) |
| **S3 (Scale)** | 10–100k | 1k–10k | 1M–10M | Workers split; replicas 4+ |
| **S4 (Enterprise)** | 100k+ | 10k+ | 10M+ | Microservices subset (Auth, Payment, Notification extracted) |
| **S5 (Multi-region)** | 1M+ | 100k+ | 100M+ | Multi-region microservices |

---

## 4. Stage-by-Stage Plan

### 4.1 S1 — MVP Launch

**Assumptions:** Up to 1k DAU, < 100 RPS.

#### Configuration

| Component | Setup |
|---|---|
| API replicas | 1 |
| Worker | Same as API |
| Database | Neon single primary |
| Redis | Upstash single |
| CDN | Cloudinary + Vercel |

#### Headroom

- API: can handle up to 500 RPS before saturation
- DB: can handle 200 writes/sec
- Cache hit rate: target 80%+

#### Triggers for S2

- API CPU > 60% sustained
- P95 latency > 1.5s
- Cache hit rate < 70%
- DB connections > 50% of pool

### 4.2 S2 — Growth

**Assumptions:** 1–10k DAU, ~1k RPS peak.

#### Changes

- 2 API replicas behind LB
- DB read replica (V2 path: now)
- Cache hit rate target 85%+
- Workers split: email worker separate
- Sticky session disabled
- DB connection pooler (PgBouncer)

#### Capacity

| Component | Capacity |
|---|---|
| API | 1500 RPS |
| DB primary | 500 writes/sec |
| DB replica | 2000 reads/sec |
| Workers | 50 jobs/sec |

### 4.3 S3 — Scale

**Assumptions:** 10–100k DAU, 10k+ RPS.

#### Changes

- 4+ API replicas
- Workers fully split: email, webhook, image, inventory
- Multiple DB read replicas
- Cache sharded if needed
- CDN expanded (Cloudflare in front of Vercel)
- Auto-scaling enabled

#### Tuning

- DB indexes reviewed for hot queries
- Slow query log reviewed weekly
- Cache TTL tuning based on metrics
- Connection pool sized to expected load

### 4.4 S4 — Service Extraction

**Trigger:** Need to scale independently; deploy cadence hurts.

#### Extract in Order

1. **Auth Service** (Identity + Admin)
2. **Payment Service** (PCI boundary; needs own audit)
3. **Notification Service** (high volume; can be slow)
4. **Catalog Read Service** (read-heavy)
5. **Search Service** (with vector DB)

> See `21_MICROSERVICE_MIGRATION_PLAN.md` for extraction procedure.

### 4.5 S5 — Multi-Region

**Trigger:** Users in multiple countries; latency matters.

#### Approach

- Multi-region API deployment
- Per-region Redis cache
- Per-region object storage
- Single primary DB + cross-region replicas
- Latency-based DNS routing

---

## 5. Horizontal Scaling

### 5.1 Stateless App Tier

| Concern | Approach |
|---|---|
| Session storage | Redis (already) |
| File uploads | Direct to storage (no API hop) |
| WebSocket | Sticky not needed (V1.5+) |
| Database reads | Replicas |

### 5.2 Auto-Scaling

| Service | Trigger | Min | Max |
|---|---|---|---|
| API | CPU > 60% | 2 | 8 |
| Worker (email) | Queue depth | 1 | 4 |
| Worker (webhook) | Queue depth | 1 | 4 |
| Worker (image) | Queue depth | 1 | 2 |

### 5.3 Capacity Planning Buffer

Always maintain 2x headroom above peak:
- N+1 replicas for traffic spikes
- DB capacity for 3x current load

---

## 6. Vertical Scaling

Where useful:

| Component | Use |
|---|---|
| Database | Increase CPU/RAM for hot queries |
| Redis | Larger memory for cache |

Vertical scaling is **reactive**, not primary lever.

---

## 7. Caching Scaling

### 7.1 Cache Layers

| Layer | Effect | Action Threshold |
|---|---|---|
| **HTTP cache** (CDN) | 70% reduction in API hits | Cache-Control headers |
| **App cache** | 30% reduction | Local memoization |
| **Redis cache** | 80%+ API hits from DB | TTL + invalidation |
| **DB cache** | Implicit (Postgres buffer) | Index tuning |

### 7.2 Cache Hit Rate Goals

| Stage | Hit Rate Goal |
|---|---|
| S1 | 70% |
| S2 | 80% |
| S3 | 88% |
| S4 | 92% |

### 7.3 Cache Stampede Prevention

When hot key invalidated:
- Single-flight (distributed lock)
- Probabilistic early refresh
- Stale-while-revalidate

See `11_CACHING_ARCHITECTURE.md`.

---

## 8. Database Scaling

### 8.1 Read Replicas

- 1 replica in V2 (S2)
- 2–3 replicas in V3 (S3)
- Per-region replicas in V5 (S5)

### 8.2 Indexing Strategy

- B-tree indexes on most foreign keys
- Partial indexes for hot filtered subsets
- Covering indexes for common queries
- Periodic review for unused indexes

See `docs/03-database-design/INDEX_STRATEGY.md`.

### 8.3 Connection Pooling

| Stage | Pooler |
|---|---|
| S1 | Direct (App → DB) |
| S2+ | PgBouncer or Neon pooler |

### 8.4 Read/Write Split

- Writes go to primary
- Reads prefer replicas (when staleness acceptable)
- Stale tolerance varies per query

### 8.5 Sharding (Future V5)

Tables likely to need sharding first:

| Table | Reason |
|---|---|
| `order` | High write rate; rarely accessed across time |
| `audit_log` | Time-series; already partitioned |
| `notification_log` | Time-series |
| `payment_transaction` | High write rate |

Time-based sharding pattern:
- Partition recent year actively
- Archive older to cold storage

---

## 9. Queue Scaling

### 9.1 Concurrency

| Queue | S1 | S2 | S3 |
|---|---|---|---|
| Email | 5 | 10 | 20 |
| Webhook delivery | 5 | 10 | 30 |
| Image process | 5 | 10 | 20 |
| Inventory reconcile | 1 | 2 | 4 |

### 9.2 Worker Pool

Workers split and scaled per queue:
- Email worker separate
- Webhook worker separate
- Image worker separate
- Inventory worker separate

### 9.3 Dedicated Workers (V3+)

- Image worker can scale aggressively (transformation heavy)
- Webhook worker for retries (slow but many)
- Notification worker (email is slow)

---

## 10. Frontend Scaling

### 10.1 Vercel

- Auto-scales globally
- Static assets served from edge
- SSR pages cached at edge

### 10.2 Bundle Size

- Code splitting per route
- Lazy-load heavy modules (admin charts)
- Tree-shake unused code
- Compress assets

### 10.3 Image Delivery

- Cloudinary CDN with on-the-fly transforms
- `f_auto` for WebP/AVIF
- Responsive `srcset`

---

## 11. Provider / Third-Party Scaling

Each external provider has its own limits:

| Provider | Limit | Mitigation |
|---|---|---|
| VNPay | ~50 RPS | Queue; retry; circuit breaker |
| MoMo | ~30 RPS | Queue; circuit breaker |
| GHN | ~20 RPS | Queue; circuit breaker |
| Cloudinary | Quota-based | Cache transforms; lazy |
| Resend | ~100 RPS | Queue; circuit breaker |

---

## 12. Performance Budget

| Page | TTFB | FCP | LCP | TTI | Total JS |
|---|---|---|---|---|---|
| Home | 200ms | 1.2s | 2.5s | 3.5s | 300 KB |
| Category | 200ms | 1.0s | 2.0s | 3.0s | 250 KB |
| Product detail | 200ms | 1.0s | 2.0s | 3.0s | 250 KB |
| Cart | 200ms | 0.8s | 1.5s | 2.5s | 200 KB |
| Checkout | 250ms | 1.0s | 2.5s | 3.5s | 300 KB |
| Admin Dashboard | 300ms | 1.5s | 2.5s | 4.0s | 500 KB |

---

## 13. Cost Optimization

### 13.1 Strategies

| Lever | Approach |
|---|---|
| Caching | Hit rate → less DB work |
| Async work | Move to queue; smaller instances |
| Auto-scaling | Scale down at night |
| Reserved capacity | After predictable usage |
| Provider negotiation | Volume discounts at scale |

### 13.2 Cost Targets by Stage

| Stage | Monthly Infra Cost Target |
|---|---|
| S1 | < $500 |
| S2 | < $1,500 |
| S3 | < $5,000 |
| S4 | < $20,000 |

---

## 14. Scaling Anti-Patterns

| Anti-Pattern | Avoid |
|---|---|
| Stateful API instances | Always stateless |
| Synchronous external calls in request path | Queue them |
| Hot loops without cache | Cache them |
| N+1 queries | Eager load |
| Monolithic DB writes | Move to dedicated write concern |
| Memory leaks in long-lived processes | Restart cyclically |
| Single point of failure | Multiple replicas + LB |

---

## 15. Capacity Triggers

| Metric | Threshold | Action |
|---|---|---|
| API CPU > 70% | 5 min | Add replica |
| API memory > 80% | sustained | Investigate; restart cyclically |
| DB CPU > 70% | sustained | Investigate slow queries; consider replica |
| DB connections > 80% | sustained | Larger pool; rate limit |
| Redis memory > 80% | sustained | Review TTLs; larger tier |
| Cache hit rate < 70% | daily | Review TTLs |
| Queue depth > 1000 | 10 min | Add worker |
| Provider 5xx rate > 5% | per provider | Circuit breaker; investigate |

---

## 16. Coverage Validation

| Check | Status |
|---|---|
| Growth stages with thresholds | ✓ |
| Per-stage changes | ✓ |
| Horizontal scaling | ✓ |
| Vertical scaling | ✓ |
| Caching scaling | ✓ |
| Database scaling | ✓ |
| Queue scaling | ✓ |
| Frontend scaling | ✓ |
| Provider scaling | ✓ |
| Performance budget | ✓ |
| Cost optimization | ✓ |
| Anti-patterns | ✓ |
| Capacity triggers | ✓ |

---

## 17. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial scalability plan: 5 stages, horizontal/vertical, caching, cost |

---

**End of 20_SCALABILITY_PLAN.md**
# 21 — Microservice Migration Plan

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft — Future Plan
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document describes **how SmartLight evolves** from a Modular Monolith (V1) to a Microservices Architecture (V4+). The migration is **deliberate, incremental, and reversible** at each stage.

> V1 must be designed for microservice extraction from day one. This document is the plan.

---

## 2. Migration Principles

1. **Keep monolith working throughout** — never break production.
2. **Extract in priority order** — based on business need, not technical preference.
3. **Start with the easiest extractables** — high cohesion, low coupling first.
4. **Strangler pattern** — old code stays until new one replaces it.
5. **Independent deployability first**; language flexibility later.
6. **Data ownership transfers with service** — no shared DB.
7. **Communicate via API/Events** — never directly between service DBs.

---

## 3. Why Microservices (And Why Not Yet)

### 3.1 When Monolith is Right

- Team size < 5 engineers
- Single deploy cadence
- Single domain model
- Founders want to ship fast
- Y Combinator advice: "Do things that don't scale" (V1)

### 3.2 When to Evolve

- Team grows past 5–8 engineers
- Different modules need different scaling
- Different modules need different deploy cadence
- M&A / new product lines add domains
- Compliance scope (PCI, PDPD) needs isolation
- Performance bottlenecks in specific modules

### 3.3 Triggers for V1 → V4

Any of:
- API team > 5 engineers blocked on shared deploys
- Payment module alone needs 5x scaling
- Notification volume at 10x normal
- Need regional data isolation
- Multi-product expansion

---

## 4. Current State — Modular Monolith (V1)

```
┌─────────────────────────────────────────┐
│          NestJS Application             │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐     │
│  │ Id │ │ Us │ │ Cat│ │ Inv│ │ ...│     │
│  └────┘ └────┘ └────┘ └────┘ └────┘     │
│              │ (single process)         │
│              ▼                          │
│      Shared PostgreSQL                   │
└─────────────────────────────────────────┘
```

### 4.1 Properties

- Single deploy unit
- Single DB
- In-process modules communicating via DI and Events
- All transactions span multiple aggregates if needed

### 4.2 Constraints We Maintain

- **No shared state between modules** — even today
- **No DB-level joins across modules** — even today
- **Modules publish events** — even today
- **Public interface per module** — even today

This makes extraction easier.

---

## 5. Target State — Microservices (V4+)

```
                  ┌──────────┐
                  │ API GW   │
                  └──────────┘
                       │
       ┌────────┬──────┼──────┬────────┐
       ▼        ▼      ▼      ▼        ▼
   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
   │Auth  │ │Order │ │Pay   │ │Noti  │ │Cata  │
   │Svc   │ │Svc   │ │Svc   │ │Svc   │ │Svc   │
   └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘
      │        │        │        │        │
      ▼        ▼        ▼        ▼        ▼
   ┌────┐   ┌────┐   ┌────┐   ┌────┐   ┌────┐
   │Auth│   │Ord │   │Pay │   │Noti│   │Cat │
   │ DB │   │ DB │   │ DB │   │ DB │   │ DB │
   └────┘   └────┘   └────┘   └────┘   └────┘
```

Each service:
- Owns its data
- Has its own DB
- Communicates via API/events
- Independent deploy
- Independent scaling

---

## 6. Migration Stages

### 6.1 Stage 0: V1 — Current (Modular Monolith)

Status: **Active**.

Properties:
- All 18 modules in one process
- Shared DB
- In-process events via NestJS EventEmitter2 / BullMQ

### 6.2 Stage 1: V2 — Hardened Monolith (V2)

Status: **Future**. Triggers: scale or team size grows.

Changes:
- Separate worker containers (already in V1.5 plan)
- Read replicas for DB
- Cache sharding
- Stricter module isolation (already in V1)
- Performance baselines from prod

### 6.3 Stage 2: V2.5 — First Extraction Candidates Prepared

Status: **Future**.

Action: Identify which modules are most-clearly separable.

| Candidate | Score | Reason |
|---|---|---|
| Auth (Identity + Admin) | High | High cohesion; isolated; compliance boundary |
| Payment | High | PCI; independent scale; isolated DB needed |
| Notification | High | Async; can be slow; high-volume |
| Catalog (read) | Medium | Read-heavy; cache-friendly |
| Search/AI | Medium | Independent compute; vector DB |

### 6.4 Stage 3: V3 — Extract Auth Service

Status: **Future**. Trigger: Auth issues block all teams.

#### Steps

1. **Catalog required reads/writes of Auth**
   - Authentication: many modules need user identity
   - Authorization: many modules check permissions
   
2. **Migration plan**

```
Step 3.1: Define Auth Service boundary
  - User, AdminUser, RefreshToken, Session, MfaSecret, RecoveryCode
  - RBAC: Role, Permission, AdminUserRole
  - APIs: /auth/*, /admin/rbac/*

Step 3.2: Auth Service skeleton deployed
  - Separate NestJS project
  - Separate DB (or schema) — Neon DB per service
  - Internal network only
  
Step 3.3: Duplicate tables in monolith (read-through)
  - Monolith reads: own tables (fast)
  - Monolith writes: own + Auth Service via API (slower path)
  - Feature flag: enable dual-write

Step 3.4: Migrate writers
  - All user/admin writes route through Auth Service
  - Monolith delegates via API
  
Step 3.5: Migrate readers
  - Auth checks become HTTP calls
  - Cache user identity in Redis (5min TTL)
  
Step 3.6: Decommission monolith tables
  - Once all readers/writers go via Auth Service
  - Drop columns from monolith DB
```

#### How Auth Service Works

- Synchronous API for `GET /internal/users/{id}` (within network)
- Asynchronous via events for state changes
- Owns users, roles, sessions
- Issues JWTs (RS256 with JWKS)

### 6.5 Stage 4: V3.5 — Extract Notification Service

Reason: high-volume; can be slow; isolated; bounded context.

#### Boundary

- Email templates
- Notification log
- User notification preferences
- All channel adapters

#### Steps

Similar to Auth:
1. Define service interface
2. Deploy Notification Service
3. Monolith publishes events; Notification Service consumes
4. Direct API call becomes event-driven
5. Decommission monolith code

### 6.6 Stage 5: V4 — Extract Payment Service

Reason: PCI; isolated scaling; compliance; clean DDD boundary.

#### Boundary

- Payment
- PaymentTransaction
- Refund
- Webhook events
- Provider adapters

#### Steps

1. Define APIs
2. Provision isolated DB (per compliance)
3. Move provider integrations
4. Maintain API contracts with monolith (`/internal/payments/*`)
5. Decommission monolith

---

## 7. Per-Extraction Procedure

Each extraction follows the same recipe:

### Phase A: Define Boundary

- Pick module + its dependencies
- Document owned tables
- Document needed APIs
- Identify external consumers

### Phase B: Strangler

- Deploy new service alongside monolith
- Both write to DB (with caution)
- Dual-write; reconciliation
- Sync via events

### Phase C: Shadow + Promote

- New service handles all writes
- Old code reads from new service (via API or cached)
- Trailing reads removed

### Phase D: Decommission

- Remove old code from monolith
- Remove old tables (with sanity check window)
- Update docs

### Phase E: Stabilize

- Monitor for weeks
- Document lessons learned

> Each phase is a separate release train; **never** combine phases.

---

## 8. Communication Patterns Post-Migration

### 8.1 Synchronous (REST)

- Within private network
- Auth headers via service tokens
- Circuit breakers
- Timeouts

### 8.2 Asynchronous (Events)

- Same outbox pattern as V1
- Event bus becomes NATS / Kafka / RabbitMQ
- Schema registry (e.g., Confluent) for versioning

### 8.3 Service Mesh (V4+)

- Linkerd or Istio
- mTLS by default
- Retry policies
- Observability built-in

---

## 9. Data Migration Strategy

### 9.1 Per-Service DB

Each microservice owns its DB. No shared tables.

### 9.2 Initial Data Copy

When extracting:
1. Export rows from monolith DB
2. Bulk import to service DB
3. Dual-write during cutover
4. Verify counts
5. Cut reads
6. Decommission source

### 9.3 Synchronous Cutover

For high-consistency services (auth, payment):
- Maintenance window
- Read-only mode in monolith
- Migrate remaining
- Switch

### 9.4 Asynchronous Cutover

For eventually-consistent services (notification):
- No downtime
- Backfill incrementally
- Catch up via events

---

## 10. Anti-Patterns in Microservices

### 10.1 Avoid

| Anti-Pattern | Reason |
|---|---|
| Distributed monolith | Same deploy unit via network — worse than monolith |
| Shared DB | Coupling; defeats boundary |
| Synchronous chains | Cascading failures |
| Chatty services | Latency |
| Big-bang extraction | Risky |
| Premature extraction | Adds complexity without benefit |

### 10.2 Embrace

- Single-purpose services
- Loose coupling
- High cohesion
- Independent deployment
- Failure isolation

---

## 11. Tooling Choices (V4+)

| Concern | Tool |
|---|---|
| Service Mesh | Linkerd |
| Tracing | OpenTelemetry + Jaeger / Tempo |
| Metrics | Prometheus + Grafana |
| Logs | Loki / BetterStack |
| Event Bus | NATS or Kafka |
| Configuration | Vercel / Railway env + Vault (V5) |
| CI/CD | GitHub Actions + ArgoCD (V5 K8s) |
| API Gateway | Kong or NGINX |
| Schema Registry | Confluent / Apicurio |

---

## 12. Team Topology (V4+)

Aligned to microservices:

- **Auth Squad** — Identity, RBAC
- **Commerce Squad** — Catalog, Cart, Checkout, Order
- **Payments Squad** — Payment, Refund, Shipping
- **Engagement Squad** — Promotion, Review, Notification
- **Platform Squad** — Infrastructure, DevOps, Data, AI

---

## 13. Migration Triggers Summary

| Trigger | Action |
|---|---|
| Auth changes block other teams | Extract Auth |
| Notification backlog | Extract Notification |
| PCI compliance scope grows | Extract Payment |
| Read-heavy modules slow | Add replicas; consider Catalog Service |
| Cross-region latency bad | Multi-region API |
| > 8 engineers | Consider extraction |

---

## 14. Cost vs Benefit at Each Stage

| Stage | Cost | Benefit |
|---|---|---|
| V1 (monolith) | Low | Speed; fewer moving parts |
| V1.5 (hardened) | Low | Reliability; observability |
| V2 (extract auth) | Medium | Independent deploys; team isolation |
| V3 (extract notification) | Medium | Independent scale |
| V4 (extract payment) | High | PCI scope reduction; performance |
| V5 (multi-region) | High | Global; latency |

> Don't pay the cost until benefit justifies it.

---

## 15. Coverage Validation

| Check | Status |
|---|---|
| Migration principles | ✓ |
| Current state | ✓ |
| Target state | ✓ |
| Migration stages | ✓ |
| Extraction order with rationale | ✓ |
| Per-extraction procedure | ✓ |
| Communication patterns | ✓ |
| Data migration | ✓ |
| Anti-patterns | ✓ |
| Tooling | ✓ |
| Team topology | ✓ |
| Triggers summary | ✓ |
| Cost/benefit | ✓ |

---

## 16. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial microservice migration plan: monolith → auth → notification → payment |

---

**End of 21_MICROSERVICE_MIGRATION_PLAN.md**
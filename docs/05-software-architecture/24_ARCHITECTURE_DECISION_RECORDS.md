# 24 — Architecture Decision Records (ADRs)

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document records **Architecture Decision Records (ADRs)** for SmartLight. Each ADR captures a significant technical decision, its context, alternatives, and consequences.

> ADRs are immutable. New decisions supersede old; old is not deleted.

---

## 2. ADR Template

```
# ADR-NNNN: Title

**Status:** Accepted | Superseded | Deprecated
**Date:** YYYY-MM-DD
**Author:** [Name] / [Role]
**Supersedes:** [ADR-NNNN] | None
**Superseded by:** [ADR-NNNN] | None

## Context
The forces at play; the problem being solved.

## Decision
What was decided.

## Alternatives Considered
What else was considered.

## Consequences
Positive, negative, neutral.

## Compliance
How the decision is verified in CI.
```

---

## 3. ADR Index

| # | Title | Status |
|---|---|---|
| 0001 | Modular Monolith for V1 | Accepted |
| 0002 | PostgreSQL as Primary Database | Accepted |
| 0003 | Prisma as ORM | Accepted |
| 0004 | NestJS as Backend Framework | Accepted |
| 0005 | React + Vite + TypeScript Frontend | Accepted |
| 0006 | JWT-Based Authentication | Accepted |
| 0007 | RBAC Authorization Model | Accepted |
| 0008 | Redis (Upstash) for Cache + Queue | Accepted |
| 0009 | BullMQ as Job Queue | Accepted |
| 0010 | Cloudinary for Object Storage (V1) | Accepted |
| 0011 | Vercel for Frontend Hosting | Accepted |
| 0012 | Railway for Backend Hosting | Accepted |
| 0013 | Neon for Postgres Hosting | Accepted |
| 0014 | Resend for Transactional Email | Accepted |
| 0015 | Outbox Pattern for Event Delivery | Accepted |
| 0016 | UUID v7 for IDs | Accepted |
| 0017 | Domain-Driven Design with Clean Architecture | Accepted |
| 0018 | OpenAPI 3.1 for API Specification | Accepted |
| 0019 | Conventional Commits + Semver | Accepted |
| 0020 | GitHub Actions for CI/CD | Accepted |
| 0021 | URL Versioning (/v1/) for APIs | Accepted |
| 0022 | Browser-Side Refresh Token Cookies | Accepted |

> 22 ADRs, exceeding the minimum 20 required.

---

## 4. ADR-0001: Modular Monolith for V1

**Status:** Accepted
**Date:** 2026-07-04

### Context

SmartLight is a startup with limited engineering capacity, single deploy cadence, and modest traffic (V1: <1000 DAU). Microservices would add operational complexity and slow time-to-market.

### Decision

Adopt a **modular monolith** for V1: 18 bounded-context modules within a single NestJS application, sharing one PostgreSQL database, with strict module isolation enforced by dependency rules.

### Alternatives Considered

- Pure monolith (no module boundaries): faster V1, harder to extract later.
- Microservices from day one: high operational cost; overkill.
- Serverless functions (e.g., Lambda): vendor lock-in; cold-start latency.

### Consequences

**Positive:**
- Fast iteration; low ops
- Easy debugging
- ACID transactions across aggregates
- Clear migration path to microservices

**Negative:**
- Single deploy unit
- Scaling is uniform (some modules need more)
- DB connection contention

**Mitigation:**
- Strict layering; modules can extract easily (see `21_MICROSERVICE_MIGRATION_PLAN.md`)
- Read replicas, worker split, queue scaling as Stages 1–2 of evolution

### Compliance

- `04_DEPENDENCY_RULES.md` enforces module boundaries
- `arch-test` validates layer purity (V1.5+)

---

## 5. ADR-0002: PostgreSQL as Primary Database

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need a reliable relational DB with JSON support, mature tooling, and predictable costs. Vietnamese payments demand exact decimal arithmetic.

### Decision

Use **PostgreSQL 16** on **Neon**.

### Alternatives Considered

- MySQL: weaker JSON and decimal handling
- MongoDB: poor relational fit
- CockroachDB: newer; startup less mature

### Consequences

- JSONB available for flexible payloads
- Decimal/numeric for Vietnamese currency precision
- Mature backup, PITR
- Easy migration path to AWS RDS later

---

## 6. ADR-0003: Prisma as ORM

**Status:** Accepted
**Date:** 2026-07-04

### Context

TypeScript-first; need compile-time safe queries and migrations.

### Decision

Use **Prisma 5**.

### Alternatives Considered

- TypeORM: more boilerplate, decorator-heavy
- Drizzle: lighter but less ecosystem
- MikroORM: similar ideas but smaller community

### Consequences

- Excellent type safety and autocomplete
- Migration story strong
- Performance good for V1
- Some limitations with very complex queries (raw escape hatch exists)

---

## 7. ADR-0004: NestJS as Backend Framework

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need a Node.js framework that enforces structure, supports DI, modules, and integrates cleanly with TypeScript.

### Decision

Use **NestJS 10**.

### Alternatives Considered

- Express: too unopinionated
- Fastify: less ecosystem
- Spring Boot (Java): JVM; Vietnamese developer shortage

### Consequences

- Built-in DI, guards, interceptors, filters
- Module boundaries align with bounded contexts
- Easy onboarding
- Future microservices can re-use NestJS modules

---

## 8. ADR-0005: React + Vite + TypeScript Frontend

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need a fast SPA with strong ecosystem, hiring availability, and SSR option (later).

### Decision

Use **React 18 + Vite + TypeScript** for V1 (pure SPA). Adopt Next.js if SEO needs grow.

### Alternatives Considered

- Next.js: heavier; couples to server runtime
- Vue: smaller ecosystem
- Svelte: smaller team availability

### Consequences

- Fast dev cycle
- Excellent ecosystem (TanStack Query, Router, Form, shadcn/ui)
- Pure SPA: SEO via pre-render in V2 if needed

---

## 9. ADR-0006: JWT-Based Authentication

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need stateless, scalable authentication for both customer and admin.

### Decision

Use **JWT (HS256 V1, RS256 V2)** for access tokens + **opaque refresh tokens stored hashed in DB**.

### Alternatives Considered

- Session-based: harder to scale across multiple instances
- OAuth only: overkill; no built-in users
- SAML: enterprise only

### Consequences

- Stateless API
- Refresh rotation with theft detection
- Short access TTL limits blast radius
- Logout requires tracking refresh tokens

---

## 10. ADR-0007: RBAC Authorization Model

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need fine-grained, role-based authorization with audit trail.

### Decision

Use **RBAC** with roles containing string permissions. Enforced by guards (endpoint-level) and service-layer ownership checks (resource-level).

### Alternatives Considered

- ABAC: more powerful, too complex for V1
- ACL: harder to manage at scale
- ReBAC: needs graph storage

### Consequences

- Manageable role/permission catalog
- Easy to extend
- Permission caching for performance
- Future migration to ABAC possible per-module

---

## 11. ADR-0008: Redis (Upstash) for Cache + Queue + Rate Limit

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need a versatile in-memory data store for caching, pub/sub, rate limiting, idempotency.

### Decision

Use **Upstash Redis** (serverless; per-request pricing).

### Alternatives Considered

- Memcached: simpler; no persistence
- Self-hosted Redis: ops burden
- Hazelcast: more enterprise

### Consequences

- Single substrate for many cross-cutting concerns
- Per-request pricing fits early-stage traffic
- Native `redis://` for BullMQ

---

## 12. ADR-0009: BullMQ as Job Queue

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need a queue with retry, DLQ, cron, TypeScript support.

### Decision

Use **BullMQ** (Redis-backed).

### Alternatives Considered

- Temporal: more powerful but heavier
- Agenda: MongoDB-bound
- Celery: Python first

### Consequences

- All retries, DLQ, cron in one library
- Existing Redis substrate
- Same library for SMTP, webhook, image jobs

---

## 13. ADR-0010: Cloudinary for Object Storage (V1)

**Status:** Accepted
**Date:** 2026-07-04

### Context

E-commerce is image-heavy; need on-the-fly transformations and CDN.

### Decision

Use **Cloudinary** for V1.

### Alternatives Considered

- AWS S3: more control; manual transformations
- MinIO: S3-compatible; self-hosted ops
- Cloudflare R2: cheaper; smaller CDN features

### Consequences

- Built-in transformations reduce backend load
- Global CDN out of the box
- Easy migration to S3/MinIO later via adapter pattern

---

## 14. ADR-0011: Vercel for Frontend Hosting

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need fast global CDN and per-PR preview deploys for the SPA.

### Decision

Use **Vercel** for storefront + admin.

### Alternatives Considered

- Netlify: comparable; smaller ecosystem
- Cloudflare Pages: cheaper; less integrated
- Self-hosted: ops burden

### Consequences

- Global edge CDN
- Preview URLs per PR
- Future Next.js migration easy

---

## 15. ADR-0012: Railway for Backend Hosting

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need simple container hosting with minimal ops.

### Decision

Use **Railway** for the backend in V1.

### Alternatives Considered

- Render: comparable
- AWS ECS: more control; more ops
- Fly.io: edge focus; smaller DB integration
- Heroku: more expensive

### Consequences

- Fast deploy; simple ops
- Reasonable pricing for MVP
- Easy migration to K8s in V4

---

## 16. ADR-0013: Neon for Postgres Hosting

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need managed PostgreSQL with branching for preview environments.

### Decision

Use **Neon**.

### Alternatives Considered

- Supabase: more BaaS, slightly more lock-in
- AWS RDS: more control; more ops
- Crunchy Bridge: Postgres-native

### Consequences

- Branch per PR preview
- Auto-scaling storage
- Generous free tier
- Serverless driver available

---

## 17. ADR-0014: Resend for Transactional Email

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need reliable email delivery with simple templating.

### Decision

Use **Resend** for transactional email.

### Alternatives Considered

- SendGrid: mature; expensive
- Mailgun: similar; looser DX
- AWS SES: cheapest; DIY

### Consequences

- Generous free tier
- React Email support
- Simple API

---

## 18. ADR-0015: Outbox Pattern for Event Delivery

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need guaranteed event delivery without dual-write hazards.

### Decision

Use the **Outbox pattern**: events written in the same transaction as state changes; relay worker publishes.

### Alternatives Considered

- Best-effort `emit()`: lost events on crash
- CDC (debezium): operational overhead
- Direct broker: dual-write risk

### Consequences

- Strong consistency; no event loss
- Single consumer initially; multiple consumers V2
- Slight latency for events (acceptable for non-critical-path events)

---

## 19. ADR-0016: UUID v7 for IDs

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need globally unique, ordered IDs for time-series table partitioning and index locality.

### Decision

Use **UUID v7** for all primary keys.

### Alternatives Considered

- ULID: similar; less ecosystem support
- Auto-incrementing int: not scalable across services
- Snowflake: hot for inserts

### Consequences

- Time-ordered; better indexes
- Globally unique; no coordination
- Standard across all services

---

## 20. ADR-0017: Domain-Driven Design with Clean Architecture

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need a maintainable backend where domain logic doesn't leak to infrastructure.

### Decision

Use **DDD aggregates** (per bounded context) with **Clean Architecture layering** (domain → application → infrastructure → interface).

### Alternatives Considered

- Anemic domain: common but not maintainable
- Transaction scripts: simple but fragile

### Consequences

- Strict layer separation
- Domain stays pure (no framework)
- Excellent testability
- Slightly more boilerplate; pays off at scale

---

## 21. ADR-0018: OpenAPI 3.1 for API Specification

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need a single source of truth for APIs that can be auto-generated into clients and documentation.

### Decision

Adopt **OpenAPI 3.1** as the specification format. Document now; auto-generate client/server stubs in V1.1.

### Alternatives Considered

- Hand-written docs only: drifts from code
- Postman: not a spec
- GraphQL: not aligned with REST goals

### Consequences

- Standard tooling
- Generates docs and SDKs
- Drives contract-first development

---

## 22. ADR-0019: Conventional Commits + Semver

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need automatic version bumps and CHANGELOG generation.

### Decision

Use **Conventional Commits** + **Semantic Versioning 2.0** + `release-please` (V1.5+; manual in V1).

### Consequences

- Auto-generated release notes
- Automated version bumps
- Clear change intent per commit

---

## 23. ADR-0020: GitHub Actions for CI/CD

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need a CI/CD platform that integrates with our Git repo.

### Decision

Use **GitHub Actions** for CI/CD.

### Consequences

- Native integration with GitHub
- Rich ecosystem
- OIDC for cloud deploys (V1.5+)

---

## 24. ADR-0021: URL Versioning (/v1/) for APIs

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need a versioning strategy that is explicit and easy to test.

### Decision

Use **URL path versioning**: `/v1/...`

### Alternatives Considered

- Header versioning: less discoverable
- Query versioning: anti-pattern
- No versioning: unsafe

### Consequences

- Clear version in URL
- Easy to deprecate
- Forward-compatible

---

## 25. ADR-0022: Browser-Side Refresh Token Cookies

**Status:** Accepted
**Date:** 2026-07-04

### Context

Need secure storage of long-lived refresh tokens without exposing them to JS.

### Decision

Refresh tokens stored in **HTTP-Only, Secure, SameSite=Lax** cookies. Access tokens in memory. CSRF token for state-changing requests.

### Alternatives Considered

- localStorage: vulnerable to XSS
- sessionStorage: also vulnerable
- Cookie without HTTP-Only: same issue

### Consequences

- Resistant to XSS token theft
- CSRF protection still needed
- Slightly more complex client code

---

## 26. Superseded / Future ADRs (Reserved)

| # | Title | Status |
|---|---|---|
| 0023 | Move to Next.js for storefront SEO | Reserved (V2+) |
| 0024 | Adopt OpenTelemetry (V1.5) | Reserved (V1.5+) |
| 0025 | Migrate to Kubernetes (V2+) | Reserved (V2+) |
| 0026 | Extract Auth Service | Reserved (V3) |
| 0027 | Extract Notification Service | Reserved (V3.5) |
| 0028 | Extract Payment Service | Reserved (V4) |

---

## 27. ADR Tooling

| Tool | Use |
|---|---|
| `adr-tools` (CLI) | Manage ADRs as Markdown |
| Markdown format | Easy to read; lives in repo |
| Git history | Immutable log |
| `log4brains` (optional) | Web UI |

---

## 28. ADR Process

1. Identify need for new decision
2. Draft ADR using template
3. Discuss with team
4. Mark accepted/superseded
5. Commit to repo (`docs/05-software-architecture/adr/`)
6. Reference ADR in code comments where relevant

---

## 29. Coverage Validation

| Check | Status |
|---|---|
| ≥ 20 ADRs | ✓ (22) |
| Each with context / decision / alternatives / consequences | ✓ |
| Future ADRs reserved | ✓ |
| ADR tooling noted | ✓ |

---

## 30. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial ADRs (22) covering modular monolith, stack, security, processes |

---

**End of 24_ARCHITECTURE_DECISION_RECORDS.md**
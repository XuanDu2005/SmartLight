# 22 — Technology Decisions

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document records **technology decisions** for SmartLight: what was chosen, the alternatives, and the rationale. Acts as an early form of ADR reference; full ADRs live in `24_ARCHITECTURE_DECISION_RECORDS.md`.

---

## 2. Stack Summary

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL 16 (Neon) |
| ORM | Prisma |
| Cache / Queue | Redis (Upstash); BullMQ |
| Object Storage | Cloudinary |
| Container | Docker (alpine base) |
| Frontend Hosting | Vercel |
| Backend Hosting | Railway |
| Email | Resend |
| Logging | Pino + BetterStack |
| Tracing | V1.5+ OpenTelemetry |
| Validation | Zod (env) + class-validator (DTO) |
| Test | Jest / Vitest / Playwright |
| Lint | ESLint + Prettier |

---

## 3. Per-Decision Rationale

### 3.1 Why React?

**Decision:** React 18

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| Vue | Smooth DX | Smaller ecosystem |
| Svelte | Performance | Smaller team availability |
| Solid | Performance | Less mature |
| Angular | Batteries-included | Heavier, opinionated |

**Why React:**
- Largest ecosystem (TanStack Query, Router, Form, shadcn/ui)
- Hiring ease in Vietnam and globally
- Server Components / Streaming SSR available
- Time-tested, mature

### 3.2 Why TypeScript?

**Decision:** TypeScript (strict mode)

**Alternatives:**
- JavaScript (looser)
- ReScript (different paradigm)

**Why TypeScript:**
- Type safety end-to-end (also DTOs)
- Better IDE refactoring
- Tames NestJS codebases
- Industry standard

### 3.3 Why Vite (not Next.js)?

**Decision:** Vite + React (SPA) for V1

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| Next.js (App Router) | SSR; RSC | Heavier; coupling |
| Remix | Web standards | Smaller ecosystem |
| Vite + React | Fast; simple | Pure SPA |

**Why Vite for V1:**
- Faster to ship
- Cheaper to host on Vercel
- Domain (catalog, search) is mostly client-side anyway
- Can adopt RSC incrementally later via Vite plugin or move to Next

**Future:** May adopt Next.js for SEO-critical pages (category, product detail) in V2.

### 3.4 Why NestJS?

**Decision:** NestJS for backend

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| Express | Lightweight; control | Manual DI; conventions |
| Fastify | Faster | Smaller ecosystem |
| Koa | Minimal | Less batteries-included |
| Spring Boot (Java) | Mature | JVM; Vietnamese developer shortage |
| Django (Python) | Rapid | ORM friction |

**Why NestJS:**
- Built-in DI, modules, guards, interceptors
- Encourages structured code (modules / providers / controllers)
- Excellent TypeScript support
- Easy to onboard new engineers
- Well-positioned for modular monolith → microservice extraction
- Mature ecosystem (Swagger, Caching, JWT, Throttler, Terminus)

### 3.5 Why PostgreSQL?

**Decision:** PostgreSQL 16

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| MySQL | Familiar | Weaker JSON; less mature |
| SQLite | Simple | Single-machine; no scale |
| MongoDB | Schema flexibility | Different paradigm; weak joins |
| CockroachDB | Distributed SQL | Newer; less mature for SaaS |
| Vitess | MySQL sharding | Operational complexity |

**Why PostgreSQL:**
- JSON/JSONB + relational in one DB
- Excellent for Vietnamese payments (precise decimal)
- Mature tooling
- Neon offers startup-friendly hosting
- Open source; portable

### 3.6 Why Prisma?

**Decision:** Prisma 5

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| TypeORM | Decorator-based | More boilerplate |
| Drizzle | Lighter; performant | Newer ecosystem |
| Knex | Full control | Manual types |
| MikroORM | Similar patterns | Smaller community |
| Raw SQL | Performance | Manual everything |

**Why Prisma:**
- Strong TypeScript types end-to-end
- Migrations + introspection
- Excellent DX; auto-completion
- Transaction API
- Easy to onboard

### 3.7 Why Redis?

**Decision:** Redis (Upstash)

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| Memcached | Simple | No persistence; no types |
| DragonflyDB | Fast | Newer |
| Hazelcast | Distributed | Operational overhead |

**Why Redis:**
- Industry standard
- Versatile: cache + queue (BullMQ) + rate limit + idempotency
- Mature persistence options
- Upstash offers serverless model; pay-per-request

### 3.8 Why BullMQ?

**Decision:** BullMQ on Redis

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| Bull (v3) | Same author | Maintenance mode |
| Agenda | MongoDB-based | Weaker features |
| Temporal | Powerful | Heavy; new paradigm |
| Sidekiq | Ruby only | Same |
| Celery | Python first | Complex ops |

**Why BullMQ:**
- Native Redis; simple ops
- TypeScript-first
- Excellent retry / DLQ / cron support
- Battle-tested
- Author active

### 3.9 Why Docker (Alpine)?

**Decision:** Docker with Node 20-alpine base

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| Distroless | Minimal | Harder debug |
| Ubuntu | Familiar | Larger image |
| Alpine | Small | musl vs glibc quirks |

**Why Alpine:**
- Small images
- Fast deploys
- Cold-start friendly
- Industry standard for Node

> V2 hardening: distroless

### 3.10 Why Cloudinary?

**Decision:** Cloudinary for V1

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| AWS S3 | Industry standard | Higher ops |
| MinIO | S3-compatible | Self-host ops |
| Cloudflare R2 | S3-compatible; cheap | Smaller CDN |
| Imgix | Image-focused | Smaller features |
| Self-hosted Nginx | Full control | Ops burden |

**Why Cloudinary for V1:**
- Image transformations out of the box
- Built-in CDN
- Reduces backend workload
- Hot-path optimization critical for e-commerce
- Startup-friendly

### 3.11 Why Railway?

**Decision:** Railway for V1

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| Render | Simpler | Less polyglot |
| Fly.io | Global edge | Less DB integration |
| AWS ECS | Full control | Operational overhead |
| DigitalOcean App Platform | Predictable | Less mature |
| Heroku | Easy | More expensive |
| Self-hosted | Full control | Ops burden |

**Why Railway:**
- Simple DX; quick deploy
- Supports Docker + languages
- Persistent volumes
- Reasonable pricing for MVP
- Built-in rollbacks, logs
- Less ops than k8s

### 3.12 Why Vercel (Frontend)?

**Decision:** Vercel for storefront + admin

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| Netlify | Edge functions | Smaller global CDN |
| Cloudflare Pages | Cloudflare edge | Slower deploys |
| S3 + CloudFront | Standard | More ops |
| Self-hosted | Full control | Ops burden |

**Why Vercel:**
- Native Next.js integration (if we adopt Next.js later)
- Global CDN out of the box
- Preview deploys per PR
- Simple
- Very fast startup

### 3.13 Why Neon?

**Decision:** Neon for Postgres

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| Supabase | Full BaaS | Locks you in more |
| AWS RDS | Standard | More ops |
| Crunchy Bridge | Postgres-native | Smaller community |
| Self-managed Postgres | Full control | Ops burden |

**Why Neon:**
- Serverless; scale-to-zero on dev branches
- Branch-per-PR preview
- Generous free tier
- Postgres-native
- Easy migration path to RDS later

### 3.14 Why Upstash?

**Decision:** Upstash for Redis

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| Redis Labs | Standard | Connection model |
| AWS ElastiCache | AWS-native | Ops |
| Self-hosted | Full control | Ops burden |

**Why Upstash:**
- Serverless Redis; per-request pricing
- Global replication
- HTTP-friendly (good for serverless)
- Generous free tier
- Native NATS-style pub/sub

### 3.15 Why Resend?

**Decision:** Resend for transactional email

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| SendGrid | Mature | More expensive |
| Mailgun | Mature | Looser DX |
| AWS SES | Cheapest | DIY |
| SMTP generic | Open standard | Manual tracking |
| Postmark | Strong transactional | Smaller |

**Why Resend:**
- Modern API (REST + webhook)
- Generous free tier
- Simple
- Easy templating
- Open formats (React Email)

### 3.16 Why Zod?

**Decision:** Zod for env validation

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| Joi | Mature | Less ergonomic |
| class-validator | NestJS-friendly | NestJS-coupled |
| io-ts | Strong | Steep DX |
| Yup | Good | Less types |

**Why Zod:**
- Best-in-class TS inference
- Composable schemas
- Industry trend
- Easy to read

### 3.17 Why Pino?

**Decision:** Pino for logging

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| Winston | Popular | Slower; verbose |
| Bunyan | Mature | Smaller |
| console.log | Trivial | Insufficient |

**Why Pino:**
- Fastest JSON logger
- Excellent ecosystem (pino-http, nestjs-pino)
- Structured by default

### 3.18 Why Jest?

**Decision:** Jest (backend) + Vitest (frontend)

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| Mocha | Classic | Manual setup |
| Node:test | Built-in | Less ergonomic |
| Vitest | Fast; ESM native | Younger |

**Why split:**
- Jest on backend: NestJS native; mature
- Vitest on frontend: Vite-native; fast

### 3.19 Why OpenTelemetry (V1.5+)?

**Decision:** OpenTelemetry standard for tracing

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| Datadog APM | All-in-one | Vendor lock |
| New Relic | Mature | Cost |
| Jaeger | Open source | More setup |
| Zipkin | Open source | Less active |

**Why OTel:**
- Vendor-neutral
- Future-proof
- Industry standard
- Easy to switch backends

### 3.20 Why Conventional Commits?

**Decision:** Conventional Commits + Semver

**Alternatives:**
| Alternative | Pros | Cons |
|---|---|---|
| Gitmoji | Visual | Limited tooling |
| Custom | Custom | Tooling depends |

**Why Conventional:**
- Tooling: release-please, semantic-release, commitlint
- Auto CHANGELOG
- Industry standard

---

## 4. Decisions Deferred to ADRs

| Topic | ADR |
|---|---|
| Monorepo vs multi-repo | ADR-001 |
| Modular Monolith vs Microservices | ADR-002 |
| Database Access Pattern (Prisma vs raw) | ADR-003 |
| Caching library | ADR-004 |
| Authentication (JWT vs Session) | ADR-005 |
| Background job choice (BullMQ vs Temporal) | ADR-006 |
| Hosting (Railway vs Render vs AWS) | ADR-007 |
| Database (Neon vs Supabase vs RDS) | ADR-008 |
| Cache (Upstash vs ElastiCache) | ADR-009 |
| Storage (Cloudinary vs S3) | ADR-010 |

See `24_ARCHITECTURE_DECISION_RECORDS.md` for full ADRs.

---

## 5. Open Decisions

| Topic | Status |
|---|---|
| Multi-tenancy model | Deferred (single-vendor V1) |
| Search engine (PG full-text vs Algolia vs Meilisearch) | V1.1+ — see ADR |
| CDN choice (Vercel vs Cloudflare) | V1.5+ — see ADR |

---

## 6. Coverage Validation

| Check | Status |
|---|---|
| All major technology decisions documented | ✓ |
| Alternatives listed | ✓ |
| Rationale provided | ✓ |
| Deferred decisions mapped to ADRs | ✓ |
| Open decisions | ✓ |

---

## 7. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial technology decisions document |

---

**End of 22_TECHNOLOGY_DECISIONS.md**
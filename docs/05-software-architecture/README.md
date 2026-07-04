# SmartLight — Software Architecture

**Document Owner:** Chief Software Architect / Technical Director
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04

---

## 1. Purpose

This folder (`docs/05-software-architecture/`) contains the **complete software architecture** for the SmartLight project. It translates the approved Business Analysis, System Analysis, Database Design, and API Design into a concrete, buildable architecture.

---

## 2. Scope

This phase produces **architecture documentation only**:

- ✓ Component, container, deployment, and module diagrams
- ✓ Layered / Clean / DDD architecture
- ✓ Cross-cutting concerns (security, logging, caching, etc.)
- ✓ Operational concerns (Docker, CI/CD, deployment, observability)
- ✓ Forward-looking concerns (scalability, microservice migration, AI)

This phase does **NOT** produce:

- ✗ Source code (NestJS, React, Prisma)
- ✗ `docker-compose.yml` or `Dockerfile` files
- ✗ Terraform / IaC files
- ✗ SQL migrations
- ✗ Actual implementation

---

## 3. Document Map

| # | Document | Purpose |
|---|---|---|
| 00 | `README.md` (this file) | Index |
| 01 | `01_SYSTEM_ARCHITECTURE.md` | System context, containers, deployment |
| 02 | `02_MODULE_ARCHITECTURE.md` | Module responsibilities, dependencies, contracts |
| 03 | `03_LAYERED_ARCHITECTURE.md` | Clean Architecture / DDD layering |
| 04 | `04_DEPENDENCY_RULES.md` | Allowed/forbidden imports |
| 05 | `05_EVENT_DRIVEN_ARCHITECTURE.md` | Internal domain events |
| 06 | `06_SECURITY_ARCHITECTURE.md` | AuthN, secrets, headers, hardening |
| 07 | `07_AUTHORIZATION_ARCHITECTURE.md` | RBAC, permissions |
| 08 | `08_CONFIGURATION_ARCHITECTURE.md` | Env vars, config modules, secrets |
| 09 | `09_LOGGING_ARCHITECTURE.md` | Centralized logging, correlation IDs |
| 10 | `10_EXCEPTION_HANDLING.md` | Global filter, exception taxonomy |
| 11 | `11_CACHING_ARCHITECTURE.md` | Redis caching strategy |
| 12 | `12_FILE_STORAGE_ARCHITECTURE.md` | Cloudinary + future S3 |
| 13 | `13_NOTIFICATION_ARCHITECTURE.md` | Email / push / SMS / in-app |
| 14 | `14_AI_ARCHITECTURE.md` | Future AI capabilities |
| 15 | `15_BACKGROUND_JOB_ARCHITECTURE.md` | BullMQ queues, retry, DLQ |
| 16 | `16_OBSERVABILITY.md` | Health, metrics, traces |
| 17 | `17_DOCKER_ARCHITECTURE.md` | Container design |
| 18 | `18_DEPLOYMENT_ARCHITECTURE.md` | MVP deployment topology |
| 19 | `19_CI_CD_ARCHITECTURE.md` | GitHub Actions pipeline |
| 20 | `20_SCALABILITY_PLAN.md` | Scaling roadmap |
| 21 | `21_MICROSERVICE_MIGRATION_PLAN.md` | Future decomposition |
| 22 | `22_TECHNOLOGY_DECISIONS.md` | Tech stack rationale |
| 23 | `23_CODING_STANDARDS.md` | Folder, naming, commit conventions |
| 24 | `24_ARCHITECTURE_DECISION_RECORDS.md` | 20+ ADRs |
| 25 | `25_RISK_ANALYSIS.md` | Risks + mitigations |
| 26 | `26_ARCHITECTURE_TRACEABILITY.md` | BG → Module mapping |
| 27 | `27_ARCHITECTURE_REVIEW_CHECKLIST.md` | Final validation |

---

## 4. Inputs (Single Source of Truth)

| Folder | Provides |
|---|---|
| `docs/00-governance/` | Vision, NFRs, tech stack, repo structure, dev rules |
| `docs/01-business-analysis/` | Features, use cases, business rules, RTM |
| `docs/02-system-analysis/` | UML diagrams, state machines, permission matrix |
| `docs/03-database-design/` | ERD, entity catalog, data dictionary |
| `docs/04-api-design/` | REST endpoints, contracts, conventions |

> **Important:** These inputs MUST NOT be modified by this phase.

---

## 5. Architecture Principles

The SmartLight architecture is governed by the following principles:

1. **Startup First, Enterprise Ready** — ship lean; design for evolution.
2. **Clean Architecture / DDD** — domain at the center; infrastructure at the edges.
3. **SOLID** — single responsibility, open/closed, Liskov, interface segregation, dependency inversion.
4. **KISS / YAGNI / DRY** — no over-engineering; no premature features.
5. **Modular Monolith → Microservices** — bounded contexts today; deployable services tomorrow.
6. **API First** — APIs defined before implementation.
7. **Security by Default** — auth, RBAC, audit, encryption as platform features.
8. **Observability Built-in** — logs, metrics, traces from day one.
9. **Vietnamese Market** — Vietnamese defaults; PDPD compliant; VND accounting.
10. **Cloud-Agnostic Where Possible** — easy migration from Railway/Neon/Upstash to self-hosted.

---

## 6. Bounded Contexts at a Glance

The backend is organized around 18 bounded contexts:

```
Identity, User, Address,
Catalog, Inventory,
Cart, Checkout, Order,
Payment, Shipping, Refund,
Promotion, Review,
Notification, Media,
Support, Audit, Platform
```

Each bounded context is **independently deployable** in V2 (microservice era) and lives as a NestJS module in V1 (modular monolith).

---

## 7. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Client Layer                                  │
│   ┌──────────────────┐                ┌──────────────────┐             │
│   │ Storefront (SPA) │                │ Admin Portal     │             │
│   │  React + Vite    │                │  React + Vite    │             │
│   └──────────────────┘                └──────────────────┘             │
└────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         API Gateway (V1.5+)                            │
│   ┌──────────────────────────────────────────────────────────┐         │
│   │  Vercel Edge / Cloudflare  →  NestJS (Railway/Render)   │         │
│   │  REST + JWT + RBAC + Rate Limit + Idempotency            │         │
│   └──────────────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Backend (NestJS Modular Monolith)                 │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│   │Identity │ │ Catalog │ │ Cart    │ │ Order   │ │ Payment │          │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│   │Shipping │ │Promotion│ │ Review  │ │Notify   │ │  Admin  │          │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                                        │
│   Event Bus (BullMQ / in-memory / Redis Streams)                       │
└────────────────────────────────────────────────────────────────────────┘
          │             │              │              │
          ▼             ▼              ▼              ▼
   ┌───────────┐  ┌──────────┐  ┌───────────┐  ┌─────────────┐
   │PostgreSQL │  │ Redis    │  │ Cloudinary│  │  External   │
   │  (Neon)   │  │ (Upstash)│  │  (S3/MinIO│  │  Providers  │
   └───────────┘  └──────────┘  │   future) │  │ (VNPay etc.)│
                                └───────────┘  └─────────────┘
```

---

## 8. Approval Status

This phase concludes with the validation in `27_ARCHITECTURE_REVIEW_CHECKLIST.md`.

**Final Status:** `Approved for Implementation Preparation`

---

## 9. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial architecture documentation set (27 docs) |

---

**End of README.md**
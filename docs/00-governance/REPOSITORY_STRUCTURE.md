# SmartLight — Repository Structure

| Field | Value |
| --- | --- |
| **Document ID** | `GOV-REPOSTRUCT-001` |
| **Document Owner** | Principal Software Architect |
| **Status** | Approved — v1.0 |
| **Effective Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2027-01-02 |
| **Classification** | Project Governance — Source of Truth |
| **Audience** | Engineering, DevOps, AI Agents |

---

## 1. Purpose

This document defines the **canonical repository layout** for SmartLight. Its purpose is to ensure:

1. Every engineer and AI agent knows exactly where to place new code.
2. Bounded contexts are physically expressed in the file system.
3. Future extraction into microservices is a **move-and-rename**, not a rewrite.
4. Shared concerns (types, configs) are centralized and versioned.
5. Documentation and governance artifacts are first-class citizens.

Any deviation requires an Architecture Decision Record (ADR).

---

## 2. Repository Strategy

| Decision | Value | Rationale |
| --- | --- | --- |
| **Strategy** | **Single monorepo** | Coordinated changes across frontend, backend, contracts |
| **Tool** | **pnpm workspaces** + **Turborepo** | Fast installs, deterministic, cached pipelines |
| **Visibility** | Private | Phase 1; may open-source tooling later |
| **Default Branch** | `main` | Always deployable |
| **Working Branches** | `feat/*`, `fix/*`, `chore/*`, `docs/*`, `release/*` | Trunk-based, short-lived |

---

## 3. Top-Level Layout

```
smartlight/
├── .github/
│   ├── workflows/
│   │   ├── ci-frontend.yml
│   │   ├── ci-backend.yml
│   │   ├── ci-shared.yml
│   │   ├── codeql.yml
│   │   └── release.yml
│   ├── CODEOWNERS
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── apps/
│   ├── storefront/                # Customer-facing web (React + TS)
│   ├── admin/                     # Internal admin panel (React + TS)
│   └── api/                       # Backend (NestJS)
│
├── packages/
│   ├── contracts/                 # Shared TS types & Zod schemas
│   ├── eslint-config/             # Shared ESLint flat config
│   ├── tsconfig/                  # Shared TypeScript configurations
│   ├── ui/                        # Optional shared React UI primitives
│   └── logger/                    # Shared logging utilities (Pino config)
│
├── infra/
│   ├── terraform/                 # Optional: IaC for cloud resources
│   ├── render/                    # Render/Railway service definitions
│   └── scripts/                   # Operational scripts (non-prod safe)
│
├── docs/
│   ├── 00-governance/             # Project governance (THIS directory)
│   ├── 10-architecture/           # ADRs, diagrams, integration maps
│   ├── 20-product/                # PRDs, user stories, acceptance
│   ├── 30-operations/             # Runbooks, incident playbooks
│   ├── 40-security/               # Threat models, security reviews
│   └── 90-changelog/              # Release notes archive
│
├── .changeset/                    # Changesets entries
├── .editorconfig
├── .gitignore
├── .gitattributes
├── .nvmrc
├── .npmrc
├── .prettierrc.json
├── .prettierignore
├── eslint.config.mjs              # Root ESLint flat config (composition)
├── package.json                   # Root package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── README.md
└── LICENSE
```

---

## 4. Documentation Layout (`docs/`)

```
docs/
├── 00-governance/                 # Authoritative governance
│   ├── PROJECT_BLUEPRINT.md
│   ├── TECH_STACK.md
│   ├── REPOSITORY_STRUCTURE.md
│   ├── DEVELOPMENT_RULES.md
│   ├── CODING_STANDARDS.md
│   ├── GIT_WORKFLOW.md
│   ├── VERSIONING_STRATEGY.md
│   ├── ROADMAP.md
│   ├── DEFINITION_OF_DONE.md
│   └── AI_DEVELOPMENT_RULES.md
│
├── 10-architecture/
│   ├── adr/                       # Architecture Decision Records
│   │   ├── 0001-record-architecture-decisions.md
│   │   ├── 0002-choose-modular-monolith.md
│   │   └── 0003-choose-prisma-orm.md
│   ├── diagrams/                  # C4 diagrams, sequence diagrams
│   └── integration-map.md
│
├── 20-product/
│   ├── prd/                       # Product Requirement Documents
│   ├── user-stories/
│   └── acceptance/
│
├── 30-operations/
│   ├── runbooks/
│   ├── incident-playbooks/
│   └── on-call/
│
├── 40-security/
│   ├── threat-models/
│   ├── data-classification.md
│   └── secrets-handling.md
│
└── 90-changelog/
    ├── CHANGELOG.md
    └── releases/
```

**Rule:** Documentation is **versioned with code**. Updates to governance docs follow the same review process as code.

---

## 5. Storefront App (`apps/storefront/`)

```
apps/storefront/
├── public/                        # Static assets, favicon, robots.txt
├── src/
│   ├── main.tsx                   # Entry point
│   ├── App.tsx
│   ├── routes/                    # Route definitions (React Router)
│   ├── pages/                     # Route components
│   │   ├── HomePage/
│   │   ├── ProductListPage/
│   │   ├── ProductDetailPage/
│   │   ├── CartPage/
│   │   ├── CheckoutPage/
│   │   └── AccountPage/
│   ├── features/                  # Feature-based modules
│   │   ├── catalog/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── auth/
│   │   └── account/
│   ├── components/                # Cross-feature UI primitives
│   ├── hooks/                     # Cross-feature hooks
│   ├── lib/                       # API client, helpers
│   ├── stores/                    # Zustand stores (UI state only)
│   ├── styles/                    # Tailwind entry, global CSS
│   ├── i18n/                      # i18next setup, locales/
│   └── types/                     # Frontend-specific types
├── tests/
│   ├── unit/
│   ├── component/
│   └── e2e/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.cjs
├── tsconfig.json
├── package.json
└── README.md
```

### 5.1 Frontend Module Convention (`src/features/<feature>/`)

```
features/catalog/
├── api/                           # TanStack Query hooks
├── components/                    # Feature-scoped components
├── hooks/                         # Feature-scoped hooks
├── types.ts                       # Local types (re-export contracts where possible)
└── index.ts                       # Public surface of the feature
```

Each feature exposes a **public surface** via `index.ts`. Cross-feature imports must use that surface only.

---

## 6. Admin App (`apps/admin/`)

Same layout as storefront, but with feature folders focused on operations:

```
apps/admin/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   ├── features/
│   │   ├── catalog-admin/
│   │   ├── order-admin/
│   │   ├── user-admin/
│   │   ├── inventory-admin/
│   │   └── analytics/
│   ├── components/
│   ├── lib/
│   └── i18n/
├── tests/
├── vite.config.ts
└── package.json
```

Admin and storefront may share **types and contracts** from `@smartlight/contracts` but **must not share UI implementation** unless explicitly moved to `@smartlight/ui`.

---

## 7. Backend App (`apps/api/`)

```
apps/api/
├── prisma/
│   ├── schema.prisma              # Single source of truth for DB schema
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── main.ts                    # NestJS bootstrap
│   ├── app.module.ts              # Root module (composes domain modules)
│   ├── common/                    # Cross-cutting concerns
│   │   ├── decorators/
│   │   ├── filters/               # Global exception filters
│   │   ├── interceptors/          # Logging, request id, timing
│   │   ├── guards/                # Auth, RBAC, throttling
│   │   ├── pipes/                 # Validation, transformation
│   │   ├── middleware/
│   │   ├── dto/                   # Shared DTOs
│   │   ├── errors/                # Domain error types
│   │   └── utils/
│   ├── config/                    # Typed config modules
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── auth.config.ts
│   ├── modules/                   # Bounded contexts (one folder each)
│   │   ├── identity/
│   │   ├── catalog/
│   │   ├── pricing/
│   │   ├── inventory/
│   │   ├── cart/
│   │   ├── ordering/
│   │   ├── payments/
│   │   ├── shipping/
│   │   ├── reviews/
│   │   ├── notifications/
│   │   ├── media/
│   │   ├── analytics/
│   │   └── admin/
│   ├── infra/                     # Infrastructure adapters
│   │   ├── database/              # Prisma client wrapper, transaction helper
│   │   ├── redis/                 # BullMQ, cache client
│   │   ├── mail/                  # Email provider adapter
│   │   ├── storage/               # Cloudinary adapter
│   │   └── observability/         # Logger, metrics, tracing
│   ├── health/                    # /health endpoints
│   └── openapi/                   # OpenAPI generation pipeline
├── test/
│   ├── jest-e2e.json
│   ├── unit/
│   └── integration/
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── package.json
└── README.md
```

### 7.1 Module Convention (`src/modules/<bounded-context>/`)

```
modules/catalog/
├── catalog.module.ts              # NestJS module definition
├── controllers/                   # HTTP entrypoints (thin)
├── services/                      # Use cases / domain services
├── repositories/                  # Data access (Prisma queries)
├── entities/                      # Domain entity types
├── dto/                           # Request/response DTOs (Zod)
├── mappers/                       # Entity ↔ DTO mapping
├── events/                        # Domain events emitted
├── listeners/                     # Domain event handlers
├── jobs/                          # Background jobs owned by this module
├── catalog.openapi.ts             # Module-specific OpenAPI fragments
└── index.ts                       # Public surface (exports)
```

### 7.2 Module Dependency Rules

- A module **may** depend on `common/`, `config/`, `infra/`, and `contracts`.
- A module **may** depend on another module **only through its public surface** (`index.ts`).
- A module **must not** import another module's `controllers/`, `services/`, or `repositories/` directly.
- A module **must not** join across module-owned tables in a single Prisma query (no cross-module joins).
- Inter-module communication preferred via **domain events** or **explicit service calls**.

---

## 8. Shared Packages (`packages/`)

### 8.1 `@smartlight/contracts`

- Contains shared TypeScript types and **Zod** schemas.
- Source of truth for API contracts.
- Imported by both frontend apps and backend.
- Versioned via changesets.

```
packages/contracts/
├── src/
│   ├── catalog/
│   ├── cart/
│   ├── order/
│   ├── user/
│   ├── common/
│   └── index.ts
├── package.json
└── tsconfig.json
```

### 8.2 `@smartlight/eslint-config`

- Flat config export consumed by all workspaces.
- Provides `frontend`, `backend`, `node`, `react` presets.

### 8.3 `@smartlight/tsconfig`

- `base.json` — strict, ES2022.
- `frontend.json` — extends base with DOM lib.
- `backend.json` — extends base with Node lib.
- `node.json` — extends base with Node lib (for scripts).

### 8.4 `@smartlight/ui` (Optional, Later)

- Cross-app React UI primitives.
- Only added after a concrete reuse pattern emerges (rule of three).

### 8.5 `@smartlight/logger`

- Centralized Pino configuration.
- Re-exports typed logger for frontend (browser config) and backend (node config).

---

## 9. Configuration Files (Root)

| File | Purpose |
| --- | --- |
| `.editorconfig` | Editor-agnostic defaults |
| `.gitattributes` | Line endings, diff drivers |
| `.gitignore` | Excludes build outputs, secrets, node_modules |
| `.nvmrc` | Pins Node.js 20 LTS |
| `.npmrc` | `save-exact=true`, registry config |
| `.prettierrc.json` | Formatting rules |
| `.prettierignore` | Excluded paths |
| `eslint.config.mjs` | Root ESLint flat config composition |
| `tsconfig.base.json` | Shared compiler options |
| `pnpm-workspace.yaml` | Workspace package globs |
| `turbo.json` | Task pipelines and caching |
| `package.json` | Root scripts: `dev`, `build`, `lint`, `test`, `typecheck` |
| `README.md` | Project entry point for humans and agents |
| `LICENSE` | Proprietary license |

---

## 10. Naming Conventions

| Element | Convention | Example |
| --- | --- | --- |
| **Folders** | `kebab-case` | `apps/storefront`, `modules/order` |
| **TS files** | `kebab-case.ts` | `order.service.ts` |
| **Components** | `PascalCase.tsx` | `ProductCard.tsx` |
| **Classes/Services** | `PascalCase` | `OrderService` |
| **Interfaces/Types** | `PascalCase` | `OrderSummary` |
| **Functions/Variables** | `camelCase` | `computeTotal` |
| **Constants** | `UPPER_SNAKE_CASE` | `MAX_CART_ITEMS` |
| **DB tables** | `snake_case`, plural | `orders`, `order_items` |
| **DB columns** | `snake_case` | `created_at` |
| **Env variables** | `UPPER_SNAKE_CASE` | `DATABASE_URL` |
| **Branches** | `feat/`, `fix/`, `chore/`, `docs/`, `release/` | `feat/cart-add-to-cart` |

---

## 11. What Goes Where (Decision Rules)

| Need | Location |
| --- | --- |
| New bounded context | `apps/api/src/modules/<name>/` |
| Cross-module shared type | `packages/contracts/src/<area>/` |
| React component used by one app | Inside that app's `components/` or `features/` |
| React component reused by ≥ 3 places across apps | `packages/ui/` |
| New ADR | `docs/10-architecture/adr/NNNN-title.md` |
| New runbook | `docs/30-operations/runbooks/` |
| New threat model | `docs/40-security/threat-models/` |
| Background job | Inside the owning module's `jobs/` |
| Email template | Inside `modules/notifications/templates/` |
| Migration | `apps/api/prisma/migrations/` |
| Seed data | `apps/api/prisma/seed.ts` and fixtures |

---

## 12. Forbidden Locations

| Forbidden | Reason |
| --- | --- |
| Code in repo root | Everything must live in `apps/`, `packages/`, `infra/`, or `docs/` |
| Cross-module imports bypassing `index.ts` | Breaks module boundaries |
| Shared mutable state across modules | Couples modules |
| Untyped `any` escaping across module boundaries | Defeats type safety guarantees |
| Secrets in repo | Security policy violation |

---

## 13. Migration and Microservice Extraction

When a module is promoted to a microservice:

1. Move `apps/api/src/modules/<x>/` to `apps/<x>-service/src/`.
2. Replace NestJS in-process calls with HTTP/gRPC using the existing OpenAPI contract.
3. Move its Prisma models into a dedicated `prisma/schema.prisma`.
4. Update consumers to use `@smartlight/contracts` only.
5. No business logic rewrite — only transport change.

---

## 14. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-02 | Principal Architect | Initial governance baseline |

---

**End of Document — REPOSITORY_STRUCTURE.md**
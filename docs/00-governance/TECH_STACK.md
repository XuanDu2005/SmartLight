# SmartLight — Technology Stack

| Field | Value |
| --- | --- |
| **Document ID** | `GOV-TECHSTACK-001` |
| **Document Owner** | Principal Software Architect |
| **Status** | Approved — v1.0 |
| **Effective Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2027-01-02 |
| **Classification** | Project Governance — Source of Truth |
| **Audience** | Engineering, DevOps, AI Agents |

---

## 1. Purpose

This document is the **single source of truth** for all technology decisions in the SmartLight project. It defines:

- **Mandated technologies** that must be used.
- **Forbidden technologies** that must not be introduced.
- **Selection criteria** for any new technology additions.
- **Hosting and infrastructure** choices for Phase 1.

Any deviation requires a written Architecture Decision Record (ADR) approved by the Principal Architect.

---

## 2. Stack at a Glance

| Layer | Technology | Role |
| --- | --- | --- |
| **Frontend Framework** | React 18+ with TypeScript | Storefront & Admin UI |
| **Backend Framework** | NestJS (Node.js 20 LTS) with TypeScript | Modular monolith API |
| **Database** | PostgreSQL 16 | Primary transactional store |
| **ORM** | Prisma | Type-safe data access |
| **Cache & Queue** | Redis (Upstash) | Sessions, cache, background jobs |
| **Media** | Cloudinary | Upload, transformation, CDN |
| **Frontend Hosting** | Vercel | CDN, edge, serverless-friendly deploy |
| **Backend Hosting** | Render or Railway | Containerized Node service |
| **Payments** | Vietnamese providers (TBD: VNPay, MoMo, ZaloPay) | Checkout, webhooks |
| **Shipping** | Vietnamese carriers (TBD: GHN, GHTK, Viettel Post) | Rates, tracking |
| **Email** | Provider TBD | Transactional email |
| **Observability** | Provider TBD | Logs, metrics, errors |
| **CI/CD** | GitHub Actions | Lint, test, build, deploy |

---

## 3. Frontend Stack

### 3.1 Core

| Tool | Version Target | Rationale |
| --- | --- | --- |
| **React** | 18+ | Industry standard, large ecosystem |
| **TypeScript** | 5.x (strict) | Type safety, better DX |
| **Vite** | 5.x | Fast dev server, modern build |
| **React Router** | 6.x | Client-side routing |
| **TanStack Query** | 5.x | Server-state caching, retries, invalidation |

### 3.2 UI, Styling, and State

| Tool | Version Target | Rationale |
| --- | --- | --- |
| **Tailwind CSS** | 3.x | Utility-first, fast iteration |
| **shadcn/ui** (Radix-based) | latest | Accessible, customizable primitives |
| **Zustand** | 4.x | Lightweight client-state for UI only |
| **React Hook Form** | 7.x + **Zod** | Forms + shared schema validation |

### 3.3 Internationalization

| Tool | Version Target | Rationale |
| --- | --- | --- |
| **i18next** + `react-i18next` | 23+ / 14+ | Mature i18n for Vietnamese-first |

### 3.4 Testing

| Tool | Target |
| --- | --- |
| **Vitest** | Unit/component tests |
| **React Testing Library** | Component behavior tests |
| **Playwright** | E2E tests |

### 3.5 Quality Tooling

| Tool | Purpose |
| --- | --- |
| **ESLint** (flat config) | Linting |
| **Prettier** | Formatting |
| **TypeScript** strict mode | Type safety |
| **Husky + lint-staged** | Pre-commit quality gates |
| **Commitlint** | Commit message linting |

---

## 4. Backend Stack

### 4.1 Core

| Tool | Version Target | Rationale |
| --- | --- | --- |
| **Node.js** | 20 LTS | Stable, supported, performant |
| **NestJS** | 10.x | Opinionated modular architecture, DI, DI-driven boundaries |
| **TypeScript** | 5.x strict | Same language as frontend; shared types via package |
| **pnpm** | workspace | Monorepo package management |
| **NestJS Modules** | native | Each bounded context = one NestJS module |

### 4.2 Data and Persistence

| Tool | Version Target | Rationale |
| --- | --- | --- |
| **PostgreSQL** | 16 | Strong relational semantics, JSONB, FTS |
| **Prisma** | 5.x | Type-safe, predictable schema-first ORM |
| **Redis (Upstash)** | 7-compatible | Cache, session, BullMQ queues |
| **BullMQ** | 5.x | Job queues on Redis |

### 4.3 API and Validation

| Tool | Version Target | Rationale |
| --- | --- | --- |
| **OpenAPI 3.1** | via `@nestjs/swagger` | Contract-first documentation |
| **Zod** | 3.x | Runtime schema validation |
| **class-validator** | 0.14.x | DTO validation in NestJS |
| **Passport.js** | latest | Authentication strategies |

### 4.4 Security and Auth

| Tool | Purpose |
| --- | --- |
| **Argon2** (preferred) or **bcrypt** | Password hashing |
| **JWT** (short-lived) + **Refresh Token** (httpOnly cookie) | Auth tokens |
| **Helmet** | HTTP security headers |
| **rate-limiter-flexible** | Throttling per IP / user / route |
| **CSRF tokens** | State-changing endpoints for web clients |

### 4.5 Testing

| Tool | Target |
| --- | --- |
| **Jest** | Unit & integration tests |
| **Supertest** | HTTP endpoint tests |
| **Testcontainers (Postgres/Redis)** | Isolated integration tests |
| **Playwright (shared)** | E2E coverage against running stack |

### 4.6 Background Processing

| Tool | Purpose |
| --- | --- |
| **BullMQ** | Email, webhooks, image post-processing, reports |
| **Cron (NestJS Schedule)** | Scheduled jobs (e.g., nightly aggregations) |

### 4.7 Observability

| Concern | Tool |
| --- | --- |
| **Logging** | Pino (structured JSON) |
| **Metrics** | prom-client + provider |
| **Tracing** | OpenTelemetry SDK |
| **Errors** | Sentry or equivalent |

---

## 5. Monorepo Tooling

| Tool | Purpose |
| --- | --- |
| **pnpm workspaces** | Package management, hoisting |
| **Turborepo** | Build & task orchestration, caching |
| **Changesets** | Versioning and changelog of internal packages |
| **TypeScript project references** | Incremental builds, shared types |

### 5.1 Workspace Packages (Initial Plan)

- `@smartlight/contracts` — shared TS types and Zod schemas.
- `@smartlight/eslint-config` — shared ESLint configuration.
- `@smartlight/tsconfig` — shared TypeScript configurations.
- `@smartlight/ui` — shared React components (optional, later).

---

## 6. Infrastructure and Hosting

### 6.1 Phase 1 Hosting

| Component | Provider | Notes |
| --- | --- | --- |
| Frontend | **Vercel** | Auto deploys from main; preview per PR |
| Backend | **Render** or **Railway** | Containerized Node service; autoscaling |
| Database | **Neon** (managed Postgres) | Branching for previews |
| Cache / Queue | **Upstash Redis** | Serverless-friendly Redis |
| Media | **Cloudinary** | Image transformation + CDN |

### 6.2 Environment Strategy

| Environment | Purpose | Data |
| --- | --- | --- |
| **local** | Developer machine | Seeded fixtures |
| **dev** | Shared developer environment | Synthetic data |
| **preview** | Per-PR isolated stack | Synthetic data |
| **staging** | Pre-production | Anonymized production-like data |
| **production** | Live traffic | Real customer data (PII protected) |

### 6.3 Configuration and Secrets

- All secrets in **environment variables**; never in repo.
- Local secrets via `.env.local` (gitignored) or Doppler/1Password CLI.
- Production secrets managed by hosting provider's secret store.
- `.env.example` documents **required keys only**, never values.

---

## 7. External Integrations

### 7.1 Payments (Vietnam)

- Must be PCI-DSS scope minimized.
- Must support VND.
- Must provide webhooks for status reconciliation.
- Selection candidates: **VNPay**, **MoMo**, **ZaloPay**.
- Final selection recorded in ADR before implementation.

### 7.2 Shipping (Vietnam)

- Must support nationwide coverage.
- Must provide tracking webhooks or polling API.
- Selection candidates: **GHN**, **GHTK**, **Viettel Post**.

### 7.3 Email and Notifications

- Transactional email with templates, open/click tracking optional.
- Vietnamese-character support required.
- SMS provider optional in V1 (deferred to V1.5).

### 7.4 Media (Cloudinary)

- Upload via signed upload preset.
- Store Cloudinary public_id; never trust client-supplied URLs.
- Use responsive URLs (`f_auto`, `q_auto`) generated server-side.

---

## 8. Testing Strategy Stack

| Level | Tool | Scope |
| --- | --- | --- |
| **Unit** | Vitest / Jest | Pure functions, utilities, services |
| **Component** | RTL | UI behavior |
| **Integration** | Jest + Supertest | API endpoints with DB |
| **Contract** | OpenAPI validation | Request/response adherence |
| **E2E** | Playwright | Critical user journeys |
| **Visual** | Playwright snapshots (later) | Visual regression |

Coverage gate: **80%+** for `apps/backend/src/modules/**` critical paths.

---

## 9. CI/CD Stack

| Stage | Tool | Checks |
| --- | --- | --- |
| **Pre-commit** | Husky + lint-staged | ESLint, Prettier, type-check (changed files) |
| **PR Pipeline** | GitHub Actions | Lint, type-check, unit, integration, build |
| **Preview Deploy** | Vercel + Render preview | Auto per PR |
| **Main Pipeline** | GitHub Actions | Full test suite, security scan, migration dry-run |
| **Release** | Changesets + manual approval | Version bump, changelog, deploy to staging → prod |

Required checks before merge: **lint, type-check, tests, build**.

---

## 10. Observability Stack

| Concern | Tool | Notes |
| --- | --- | --- |
| **Logs** | Pino → central log provider | JSON structured, request id correlation |
| **Metrics** | prom-client → provider | RED metrics per route |
| **Tracing** | OpenTelemetry | Cross-process traces |
| **Errors** | Sentry | Frontend & backend |
| **Uptime** | External uptime checker | Synthetic checks on key routes |

All services must emit **request id** and **user id** (when authenticated) in logs.

---

## 11. Security Stack

| Layer | Tool / Practice |
| --- | --- |
| **Transport** | TLS 1.2+ enforced (HSTS) |
| **Headers** | Helmet |
| **Auth** | JWT (short-lived) + refresh tokens |
| **Password Hashing** | Argon2id |
| **Secrets** | Provider secret store, never in repo |
| **Dependency Scanning** | `npm audit` / `pnpm audit` + Snyk (later) |
| **Code Scanning** | CodeQL in CI |
| **Threat Modeling** | Per major feature, recorded as ADR |

---

## 12. Database Tooling

| Tool | Purpose |
| --- | --- |
| **Prisma Migrate** | Schema migrations |
| **Prisma Studio** | Local DB inspection (dev only) |
| **pgcli / psql** | Manual queries |
| **Seed scripts** | Deterministic local data |

---

## 13. Version Pinning and Upgrade Policy

- All direct dependencies pinned to **exact versions** in `package.json`.
- Renovate / Dependabot enabled for automated PRs.
- Upgrades categorized:
  - **Patch:** auto-merge after CI green.
  - **Minor:** review and merge within sprint.
  - **Major:** ADR + dedicated upgrade branch + migration window.

---

## 14. Browser and Runtime Support

| Surface | Support |
| --- | --- |
| **Browsers** | Last 2 versions of Chrome, Edge, Firefox, Safari (iOS + macOS) |
| **Node** | 20 LTS (backend), 20 (frontend tooling) |
| **Mobile web** | Same browser baseline |

---

## 15. Forbidden Technologies

The following are **explicitly forbidden** unless an ADR approves an exception:

| Category | Forbidden | Reason |
| --- | --- | --- |
| **JS Framework** | Angular, Vue, Svelte | React is mandated |
| **Backend Framework** | Express, Fastify, Koa standalone | NestJS is mandated |
| **Database** | MySQL, MongoDB, SQLite (prod) | PostgreSQL is mandated |
| **ORM** | TypeORM, Sequelize, raw SQL except justified cases | Prisma is mandated |
| **CSS** | Styled-components, Emotion (new usage) | Tailwind is mandated |
| **State (client)** | Redux Toolkit (new usage) | Zustand + TanStack Query is mandated |
| **Runtime** | Deno, Bun (production) | Node.js LTS is mandated |
| **Package Manager** | npm, yarn (for project workspaces) | pnpm is mandated |
| **CSS-in-JS new code** | — | Tailwind utility classes preferred |

---

## 16. Decision Records (ADR)

Any new technology added to the project must be accompanied by an ADR containing:

1. Context (problem and constraints).
2. Options considered.
3. Decision.
4. Consequences (positive, negative, neutral).
5. Date and author.

ADRs are stored under `docs/10-architecture/adr/`.

---

## 17. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-02 | Principal Architect | Initial governance baseline |

---

**End of Document — TECH_STACK.md**
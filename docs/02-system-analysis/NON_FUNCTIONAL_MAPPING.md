# NON_FUNCTIONAL_MAPPING.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal System Analyst

This document maps each **Non-Functional Requirement** (NFR) from `SRS.md` to its corresponding **architecture**, **system component**, **business rule**, **acceptance criteria**, and **validation method**.

---

## 1. NFR Source

All NFRs originate from `docs/01-business-analysis/SRS.md §7`. They are mapped here to the components that realize them in the System Analysis layer.

---

## 2. Performance NFRs

### 2.1 NFR-PERF-001 — Storefront TTFB (cached) < 200 ms p95

| Aspect | Detail |
| --- | --- |
| **Architecture** | CDN edge cache (Vercel); Redis caching; Cloudinary CDN for media |
| **System Component** | M-PLT (CDN integration), M-CAT (cached product pages), M-MED (CDN URLs) |
| **Business Rule** | BR-PLT-002 (Cloudinary), BR-PLT-008 (cookie consent) |
| **Acceptance Criteria** | AC-NFR-001 (Performance scenario) |
| **Validation Method** | Load test: 1000 RPS, measure TTFB; k6/Locust script in CI |

### 2.2 NFR-PERF-002 — Storefront TTFB (uncached) < 600 ms p95

| Aspect | Detail |
| --- | --- |
| **Architecture** | SSR with Vite + React Router; database query optimization |
| **System Component** | M-CAT, M-CRT, M-INV (real-time stock) |
| **Business Rule** | BR-INV-002 (reservation), BR-CAT-001 (catalog) |
| **Acceptance Criteria** | AC-NFR-001 |
| **Validation Method** | Load test: bypass CDN, measure TTFB |

### 2.3 NFR-PERF-003 — API read response < 250 ms p95

| Aspect | Detail |
| --- | --- |
| **Architecture** | NestJS controllers; PostgreSQL with indexes; Redis caching |
| **System Component** | All read endpoints |
| **Business Rule** | BR-X-001 (no floats), BR-TAX-005 (rounding) |
| **Acceptance Criteria** | AC-NFR-001 |
| **Validation Method** | API load test (k6); APM metrics (prom-client) |

### 2.4 NFR-PERF-004 — API write response < 500 ms p95

| Aspect | Detail |
| --- | --- |
| **Architecture** | Single-statement writes; deferred heavy work to BullMQ |
| **System Component** | M-ORD (order creation), M-PAY (intent), M-INV (reservation) |
| **Business Rule** | BR-INV-001 (decrement), BR-PAY-006 (intent) |
| **Acceptance Criteria** | AC-NFR-001 |
| **Validation Method** | Write load test; APM metrics |

### 2.5 NFR-PERF-005 — Largest Contentful Paint < 2.5 s on 4G

| Aspect | Detail |
| --- | --- |
| **Architecture** | Image optimization (M-MED), SSR, code splitting, lazy loading |
| **System Component** | M-MED (variants), M-PLT (CDN) |
| **Business Rule** | BR-MED-002 (auto-variants) |
| **Acceptance Criteria** | AC-NFR-001 |
| **Validation Method** | Lighthouse CI in pipeline; WebPageTest |

### 2.6 NFR-PERF-006 — Time to Interactive < 4 s on 4G

| Aspect | Detail |
| --- | --- |
| **Architecture** | Bundle splitting, Vite, route-level code splitting |
| **System Component** | Frontend build pipeline |
| **Business Rule** | (Coding standards) |
| **Acceptance Criteria** | AC-NFR-001 |
| **Validation Method** | Lighthouse CI |

### 2.7 NFR-PERF-007 — Catalog search response < 500 ms p95

| Aspect | Detail |
| --- | --- |
| **Architecture** | PostgreSQL full-text search (or Meilisearch in V1.5) |
| **System Component** | M-CAT (search service) |
| **Business Rule** | BR-CAT-002 (search) |
| **Acceptance Criteria** | AC-AC-002 (Search scenario) |
| **Validation Method** | Search-specific load test |

### 2.8 NFR-PERF-008 — Admin dashboard load < 1.5 s p95

| Aspect | Detail |
| --- | --- |
| **Architecture** | Server-side aggregation; indexed queries; React virtualization |
| **System Component** | M-ADM, M-ANL |
| **Business Rule** | BR-ADM-001 |
| **Acceptance Criteria** | AC-NFR-001 |
| **Validation Method** | Admin load test |

---

## 3. Availability and Reliability NFRs

### 3.1 NFR-AVAIL-001 — Monthly uptime ≥ 99.5%

| Aspect | Detail |
| --- | --- |
| **Architecture** | Multi-instance backend (Vercel/Render auto-scale); managed DB (Neon); managed Redis (Upstash) |
| **System Component** | M-PLT (health), all modules |
| **Business Rule** | BR-PLT-001 |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Synthetic uptime monitoring (Pingdom/UptimeRobot); SLA dashboards |

### 3.2 NFR-AVAIL-002 — RTO ≤ 4 hours

| Aspect | Detail |
| --- | --- |
| **Architecture** | Documented runbooks; CI/CD for fast redeploy; database backups |
| **System Component** | M-PLT, M-ADM |
| **Business Rule** | BR-X-005 (retention) |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | DR drill (quarterly); measure restore time |

### 3.3 NFR-AVAIL-003 — RPO ≤ 1 hour

| Aspect | Detail |
| --- | --- |
| **Architecture** | Daily automated DB backups (Neon point-in-time recovery) |
| **System Component** | Infrastructure layer |
| **Business Rule** | BR-X-005 |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Backup integrity tests; restore verification |

### 3.4 NFR-AVAIL-004 — Daily automated backups, 30-day retention

| Aspect | Detail |
| --- | --- |
| **Architecture** | Neon built-in PITR; cold storage for older backups |
| **System Component** | Infrastructure |
| **Business Rule** | BR-X-005 |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Backup verification job; retention audit |

### 3.5 NFR-AVAIL-005 — Zero-downtime deploys (frontend); best-effort backend

| Aspect | Detail |
| --- | --- |
| **Architecture** | Vercel atomic deploys; Render rolling deploys |
| **System Component** | M-PLT |
| **Business Rule** | BR-PLT-005 (feature flags for safe rollout) |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Deploy test in staging; measure downtime |

---

## 4. Security NFRs

### 4.1 NFR-SEC-001 — TLS 1.2+ enforced

| Aspect | Detail |
| --- | --- |
| **Architecture** | TLS termination at Vercel/Render; HSTS header |
| **System Component** | M-PLT (security headers) |
| **Business Rule** | BR-SEC-007 (security headers via Helmet) |
| **Acceptance Criteria** | AC-NFR-003 (Security) |
| **Validation Method** | SSL Labs A+ scan in CI; security audit |

### 4.2 NFR-SEC-002 — HSTS enabled

| Aspect | Detail |
| --- | --- |
| **Architecture** | HTTP Strict Transport Security header set at edge |
| **System Component** | M-PLT |
| **Business Rule** | BR-SEC-007 |
| **Acceptance Criteria** | AC-NFR-003 |
| **Validation Method** | Header check in CI |

### 4.3 NFR-SEC-003 — OWASP Top 10 baseline

| Aspect | Detail |
| --- | --- |
| **Architecture** | CodeQL scan, dependency audit, input validation |
| **System Component** | All modules |
| **Business Rule** | BR-SEC-001..015 |
| **Acceptance Criteria** | AC-NFR-003 |
| **Validation Method** | Quarterly security audit; penetration test (V1.1) |

### 4.4 NFR-SEC-004 — Secrets in env vars

| Aspect | Detail |
| --- | --- |
| **Architecture** | Vercel/Render env vars; never in source |
| **System Component** | Infrastructure |
| **Business Rule** | BR-SEC-006 |
| **Acceptance Criteria** | AC-NFR-003 |
| **Validation Method** | gitleaks pre-commit + CI scan |

### 4.5 NFR-SEC-005 — Passwords hashed with Argon2id

| Aspect | Detail |
| --- | --- |
| **Architecture** | M-ID uses argon2 library with secure parameters |
| **System Component** | M-ID |
| **Business Rule** | BR-ID-002 |
| **Acceptance Criteria** | AC-NFR-003 |
| **Validation Method** | Unit test verifies Argon2id; code review |

### 4.6 NFR-SEC-006 — RBAC server-side

| Aspect | Detail |
| --- | --- |
| **Architecture** | NestJS guards + decorators; permission check middleware |
| **System Component** | All admin endpoints |
| **Business Rule** | BR-ID-012 (RBAC), BR-ADM-009 |
| **Acceptance Criteria** | AC-NFR-003 |
| **Validation Method** | Authorization tests; penetration test |

### 4.7 NFR-SEC-007 — Audit log for sensitive operations

| Aspect | Detail |
| --- | --- |
| **Architecture** | M-ADM audit service; append-only log |
| **System Component** | M-ADM |
| **Business Rule** | BR-ADM-002 |
| **Acceptance Criteria** | AC-AC-068 (Audit Log scenario) |
| **Validation Method** | Audit log query tests |

### 4.8 NFR-SEC-008 — PCI-DSS scope minimized

| Aspect | Detail |
| --- | --- |
| **Architecture** | Tokenized payments via VNPay/MoMo/ZaloPay; no PAN storage |
| **System Component** | M-PAY |
| **Business Rule** | BR-PAY-001 (PCI Scope Minimization) |
| **Acceptance Criteria** | AC-NFR-003 |
| **Validation Method** | PCI scoping review; pen test |

### 4.9 NFR-SEC-009 — Rate limiting on auth, checkout, public

| Aspect | Detail |
| --- | --- |
| **Architecture** | `rate-limiter-flexible`; Redis-backed |
| **System Component** | M-ID, M-CHK, M-PLT |
| **Business Rule** | BR-ID-013, BR-SEC-009 |
| **Acceptance Criteria** | AC-NFR-003 |
| **Validation Method** | Load test simulating burst |

### 4.10 NFR-SEC-010 — CSRF protection on state-changing endpoints

| Aspect | Detail |
| --- | --- |
| **Architecture** | CSRF tokens on cookie-based sessions; SameSite=Strict |
| **System Component** | M-ID, M-CHK, all admin POST/PUT/DELETE |
| **Business Rule** | BR-SEC-010 |
| **Acceptance Criteria** | AC-NFR-003 |
| **Validation Method** | Security test |

### 4.11 NFR-SEC-011 — Account lockout after 5 failed logins

| Aspect | Detail |
| --- | --- |
| **Architecture** | Failed login counter in DB |
| **System Component** | M-ID |
| **Business Rule** | BR-ID-013 |
| **Acceptance Criteria** | AC-NFR-003 |
| **Validation Method** | Integration test |

### 4.12 NFR-SEC-012 — MFA required for all admin accounts

| Aspect | Detail |
| --- | --- |
| **Architecture** | TOTP enforcement in admin auth flow |
| **System Component** | M-ID |
| **Business Rule** | BR-MFA-001 |
| **Acceptance Criteria** | AC-MFA-001 |
| **Validation Method** | Auth flow test |

### 4.13 NFR-SEC-013 — Dependency scanning in CI; critical CVEs block deploy

| Aspect | Detail |
| --- | --- |
| **Architecture** | GitHub Dependabot + `npm audit --audit-level=critical` |
| **System Component** | CI/CD pipeline |
| **Business Rule** | (Coding standards) |
| **Acceptance Criteria** | AC-NFR-003 |
| **Validation Method** | CI gate |

### 4.14 NFR-SEC-014 — CodeQL scanning on PR and main

| Aspect | Detail |
| --- | --- |
| **Architecture** | GitHub CodeQL workflow |
| **System Component** | CI/CD pipeline |
| **Business Rule** | (Coding standards) |
| **Acceptance Criteria** | AC-NFR-003 |
| **Validation Method** | CI gate |

### 4.15 NFR-SEC-015 — Security headers via Helmet

| Aspect | Detail |
| --- | --- |
| **Architecture** | Helmet middleware with CSP, X-Frame-Options, etc. |
| **System Component** | M-PLT |
| **Business Rule** | BR-SEC-007 |
| **Acceptance Criteria** | AC-NFR-003 |
| **Validation Method** | Header check |

---

## 5. Scalability NFRs

### 5.1 NFR-SCALE-001 — Stateless app tier supports horizontal scaling

| Aspect | Detail |
| --- | --- |
| **Architecture** | NestJS app deployed to Render; no local state; all state in DB/Redis |
| **System Component** | All modules |
| **Business Rule** | (Architecture decision) |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Scale test; measure throughput at N instances |

### 5.2 NFR-SCALE-002 — DB connection pooling enabled

| Aspect | Detail |
| --- | --- |
| **Architecture** | Prisma + Neon pooler; PgBouncer if needed |
| **System Component** | Infrastructure |
| **Business Rule** | (Architecture) |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | DB connection metrics |

### 5.3 NFR-SCALE-003 — Cache (Redis) supports 10x baseline

| Aspect | Detail |
| --- | --- |
| **Architecture** | Upstash Redis; 10x headroom in plan |
| **System Component** | M-PLT, M-INV (reservations) |
| **Business Rule** | BR-INV-002 (reservation TTL) |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Load test |

### 5.4 NFR-SCALE-004 — Background jobs via queue

| Aspect | Detail |
| --- | --- |
| **Architecture** | BullMQ on Upstash Redis |
| **System Component** | M-NOT, M-PAY, M-INV (cron) |
| **Business Rule** | BR-NOT-004 (retry) |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Queue throughput test |

### 5.5 NFR-SCALE-005 — 500 concurrent active users (Phase 1)

| Aspect | Detail |
| --- | --- |
| **Architecture** | Load tested at 500 concurrent |
| **System Component** | All |
| **Business Rule** | — |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Load test (k6, 500 VU) |

---

## 6. Maintainability NFRs

### 6.1 NFR-MAINT-001 — Modular monolith with clear module boundaries

| Aspect | Detail |
| --- | --- |
| **Architecture** | See `MODULE_INTERACTION.md` |
| **System Component** | All modules |
| **Business Rule** | (Architecture decision per GOVERNANCE) |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Architecture review; module dependency check |

### 6.2 NFR-MAINT-002 — TypeScript strict mode everywhere

| Aspect | Detail |
| --- | --- |
| **Architecture** | `tsconfig.json` with strict: true |
| **System Component** | All code |
| **Business Rule** | (Coding standards) |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | CI type-check; lint |

### 6.3 NFR-MAINT-003 — Test coverage > 70% business logic

| Aspect | Detail |
| --- | --- |
| **Architecture** | Jest unit + integration tests; Supertest E2E |
| **System Component** | Backend services |
| **Business Rule** | (DoD) |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Coverage report gate in CI |

### 6.4 NFR-MAINT-004 — OpenAPI documentation auto-generated

| Aspect | Detail |
| --- | --- |
| **Architecture** | NestJS Swagger |
| **System Component** | All API endpoints |
| **Business Rule** | — |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Swagger endpoint available |

---

## 7. Observability NFRs

### 7.1 NFR-OBS-001 — Structured JSON logging

| Aspect | Detail |
| --- | --- |
| **Architecture** | Pino logger |
| **System Component** | All modules |
| **Business Rule** | BR-X-002 (timestamps UTC) |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Log format check |

### 7.2 NFR-OBS-002 — Request ID propagated

| Aspect | Detail |
| --- | --- |
| **Architecture** | Middleware sets `X-Request-Id`; passes through async context |
| **System Component** | All modules |
| **Business Rule** | BR-X-002 |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Trace test |

### 7.3 NFR-OBS-003 — Application metrics (request rate, error, latency)

| Aspect | Detail |
| --- | --- |
| **Architecture** | prom-client; Prometheus scrape |
| **System Component** | All modules |
| **Business Rule** | — |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Metrics endpoint test |

### 7.4 NFR-OBS-004 — Centralized error tracking

| Aspect | Detail |
| --- | --- |
| **Architecture** | Sentry SDK |
| **System Component** | All modules |
| **Business Rule** | — |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Sentry test event |

### 7.5 NFR-OBS-005 — Uptime monitoring on key endpoints

| Aspect | Detail |
| --- | --- |
| **Architecture** | Pingdom/UptimeRobot pings `/health` |
| **System Component** | M-PLT |
| **Business Rule** | BR-PLT-001 |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Dashboard check |

### 7.6 NFR-OBS-006 — Alerts on Sev-1 conditions

| Aspect | Detail |
| --- | --- |
| **Architecture** | Alertmanager → PagerDuty/Slack |
| **System Component** | Monitoring stack |
| **Business Rule** | (Operations) |
| **Acceptance Criteria** | AC-NFR-002 |
| **Validation Method** | Alert test |

---

## 8. Usability NFRs

### 8.1 NFR-USE-001 — WCAG 2.1 AA

| Aspect | Detail |
| --- | --- |
| **Architecture** | Semantic HTML; ARIA labels; focus management |
| **System Component** | All UI |
| **Business Rule** | (Coding standards) |
| **Acceptance Criteria** | AC-NFR-004 |
| **Validation Method** | axe-core in CI; manual audit |

### 8.2 NFR-USE-002 — Keyboard accessible

| Aspect | Detail |
| --- | --- |
| **Architecture** | shadcn/ui (Radix primitives) keyboard support |
| **System Component** | UI components |
| **Business Rule** | — |
| **Acceptance Criteria** | AC-NFR-004 |
| **Validation Method** | axe-core; manual keyboard test |

### 8.3 NFR-USE-003 — Color contrast ≥ 4.5:1

| Aspect | Detail |
| --- | --- |
| **Architecture** | Tailwind theme tokens; CI check |
| **System Component** | UI |
| **Business Rule** | — |
| **Acceptance Criteria** | AC-NFR-004 |
| **Validation Method** | axe-core |

### 8.4 NFR-USE-004 — Semantic HTML

| Aspect | Detail |
| --- | --- |
| **Architecture** | React + shadcn/ui |
| **System Component** | UI |
| **Business Rule** | — |
| **Acceptance Criteria** | AC-NFR-004 |
| **Validation Method** | HTML validator |

### 8.5 NFR-USE-005 — Validation messages in Vietnamese

| Aspect | Detail |
| --- | --- |
| **Architecture** | Zod schemas with Vietnamese messages; i18n |
| **System Component** | M-CHK, M-ID, all forms |
| **Business Rule** | BR-I18-001 |
| **Acceptance Criteria** | AC-NFR-004 |
| **Validation Method** | Manual review |

### 8.6 NFR-USE-006 — Mobile-responsive

| Aspect | Detail |
| --- | --- |
| **Architecture** | Tailwind responsive utilities |
| **System Component** | UI |
| **Business Rule** | — |
| **Acceptance Criteria** | AC-NFR-004 |
| **Validation Method** | BrowserStack; Lighthouse mobile |

---

## 9. Compatibility NFRs

| NFR ID | Mapping |
| --- | --- |
| **NFR-COMPAT-001** Browsers | Tested in CI (Playwright) on Chrome/Edge/Firefox/Safari last 2 versions |
| **NFR-COMPAT-002** iOS Safari 16+, Android Chrome | Mobile E2E tests (BrowserStack) |
| **NFR-COMPAT-003** Node.js 20 LTS | Enforced in CI; engines field in package.json |

---

## 10. Compliance NFRs

### 10.1 NFR-COMP-001 — Vietnamese PDPD compliance

| Aspect | Detail |
| --- | --- |
| **Architecture** | Consent management; PII access logging; data retention |
| **System Component** | M-ID, M-ADM, M-NOT |
| **Business Rule** | BR-COMP-001, BR-X-004, BR-X-005 |
| **Acceptance Criteria** | AC-AC-013 (Compliance scenario) |
| **Validation Method** | Privacy impact assessment; legal review |

### 10.2 NFR-COMP-002 — Vietnamese e-commerce regulations

| Aspect | Detail |
| --- | --- |
| **Architecture** | Public terms; return policy; contact info |
| **System Component** | M-PLT (static pages) |
| **Business Rule** | BR-COMP-005 |
| **Acceptance Criteria** | AC-AC-013 |
| **Validation Method** | Legal review |

### 10.3 NFR-COMP-003 — Vietnamese tax and invoicing

| Aspect | Detail |
| --- | --- |
| **Architecture** | VAT computation per BR-TAX-001..005; invoice PDF |
| **System Component** | M-TAX, M-ORD |
| **Business Rule** | BR-TAX-001..005 |
| **Acceptance Criteria** | AC-TAX-001, AC-TAX-002 |
| **Validation Method** | Tax advisor review |

### 10.4 NFR-COMP-004 — Cookie consent banner

| Aspect | Detail |
| --- | --- |
| **Architecture** | Cookie consent middleware; banner UI |
| **System Component** | M-PLT |
| **Business Rule** | BR-PLT-008 |
| **Acceptance Criteria** | AC-AC-071g |
| **Validation Method** | Manual + automated check |

### 10.5 NFR-COMP-005 — Honest advertising

| Aspect | Detail |
| --- | --- |
| **Architecture** | Clear pricing, no hidden fees |
| **System Component** | M-CHK, M-PRM |
| **Business Rule** | BR-PRM-011 (display original + discounted) |
| **Acceptance Criteria** | AC-AC-013 |
| **Validation Method** | Manual review |

---

## 11. Internationalization NFRs

| NFR ID | Mapping |
| --- | --- |
| **NFR-I18-001** Strings externalized | i18next configuration; all UI text in JSON files |
| **NFR-I18-002** Locale-extensible | Modular translation file structure |
| **NFR-I18-003** vi-VN formatting | Intl.DateTimeFormat, Intl.NumberFormat |
| **NFR-I18-004** UTC storage, Asia/Ho_Chi_Minh display | All DB timestamps UTC; conversion at presentation |

---

## 12. NFR Summary Matrix

| Category | Count | Realization |
| --- | --- | --- |
| Performance | 8 | Caching, optimization, CDN |
| Availability | 5 | Backups, auto-scaling |
| Security | 15 | Argon2id, MFA, RBAC, audit |
| Scalability | 5 | Stateless, pool, queue |
| Maintainability | 4 | TypeScript, tests, OpenAPI |
| Observability | 6 | Logs, metrics, Sentry |
| Usability | 6 | WCAG, responsive |
| Compatibility | 3 | Browser support |
| Compliance | 5 | PDPD, VAT |
| Internationalization | 4 | i18n, formatting |
| **Total** | **61** | All mapped to architecture |

---

## 13. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal System Analyst | Initial NFR mapping: 61 NFRs mapped to architecture, components, BRs, ACs, and validation methods |

---

**End of Document — NON_FUNCTIONAL_MAPPING.md**
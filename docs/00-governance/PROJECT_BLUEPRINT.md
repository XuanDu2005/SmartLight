# SmartLight — Project Blueprint

| Field | Value |
| --- | --- |
| **Document ID** | `GOV-BLUEPRINT-001` |
| **Document Owner** | Principal Software Architect |
| **Status** | Approved — v1.0 |
| **Effective Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2027-01-02 |
| **Classification** | Project Governance — Source of Truth |
| **Audience** | Engineering, Product, Operations, AI Agents |

---

## 1. Executive Summary

SmartLight is a **single-vendor e-commerce platform** specializing in the design, retail, and distribution of **lighting products** in the Vietnamese market. The platform exists to provide a premium, trustworthy, and well-curated online shopping experience for residential, commercial, and architectural lighting solutions.

The business model is intentionally **single-vendor** in Version 1 to preserve brand identity, quality control, pricing discipline, and operational simplicity. A controlled expansion to a **multi-seller marketplace** is reserved for **Version 2**, after the platform, catalog, and operational systems have demonstrated stability at scale.

SmartLight is engineered for **long-term growth**. The architecture begins as a **Modular Monolith** to maximize delivery velocity and reduce operational overhead in the early stages, while every module is designed with clear bounded contexts so it can later be **extracted into independent Microservices** without a rewrite.

---

## 2. Vision, Mission, and Strategic Objectives

### 2.1 Vision

To become the **most trusted Vietnamese e-commerce brand for lighting**, recognized for curated product quality, transparent pricing, and an exceptional customer experience.

### 2.2 Mission

Deliver a fast, reliable, and beautifully designed online store where customers can confidently discover, evaluate, purchase, and receive premium lighting products, supported by intelligent after-sales service.

### 2.3 Strategic Objectives (12-Month Horizon)

| # | Objective | Key Result (Outcome) |
| --- | --- | --- |
| SO-01 | Launch a production-ready storefront | Public availability with stable checkout |
| SO-02 | Establish reliable order fulfillment | ≥ 98% successful order dispatch rate |
| SO-03 | Build a scalable data foundation | All core entities modeled in PostgreSQL |
| SO-04 | Deliver operational dashboards | Admin KPIs: orders, revenue, AOV, returns |
| SO-05 | Establish engineering governance | Full governance, CI, and Definition of Done enforced |
| SO-06 | Lay the foundation for AI capabilities | Data and integration surfaces ready for AI features |

---

## 3. Business Model

### 3.1 Model Definition

| Attribute | Specification |
| --- | --- |
| **Type** | Single-Vendor E-Commerce |
| **Vendor** | SmartLight (the platform owner) |
| **Inventory Ownership** | Owned and managed by SmartLight |
| **Pricing Control** | Full control by SmartLight |
| **Catalog Curation** | In-house merchandising team |
| **Customer Relationship** | Direct (SmartLight ↔ Customer) |

### 3.2 Revenue Streams (Phase 1)

1. **Direct Product Sales** — primary revenue driver.
2. **Shipping Fees** — flat or tiered, surfaced transparently.
3. **Accessories & Consumables** — bulbs, drivers, replacement parts.

### 3.3 Revenue Streams (Future)

- Marketplace commissions (V2).
- Subscription bundles (B2B, future).
- AI-powered design services (future).

### 3.4 In-Scope Capabilities (V1)

- Product catalog (categories, variants, attributes).
- Cart, checkout, order management.
- Customer accounts and authentication.
- Payment integration (Vietnamese providers).
- Shipping integration (Vietnamese carriers).
- Admin panel for catalog and order operations.
- Email transactional notifications.
- Analytics and reporting.

### 3.5 Out-of-Scope (V1)

- Multi-seller onboarding.
- Auction or bidding flows.
- Cryptocurrency payments.
- International shipping.
- Mobile native apps (planned for V1.5+).

---

## 4. Target Market and Customer Segmentation

### 4.1 Geographic Market

- **Primary Market:** Vietnam.
- **Currency:** Vietnamese Đồng (VND).
- **Language:** Vietnamese (primary), with future multi-language expansion.

### 4.2 Customer Segments

| Segment | Description | Priority |
| --- | --- | --- |
| **B2C — Residential** | Homeowners, renters, interior enthusiasts | High |
| **B2C — Commercial** | Retail stores, cafes, restaurants, offices | Medium |
| **B2B — Project** | Interior designers, architects, contractors | Medium |
| **B2B — Wholesale** | Bulk buyers, resellers (future) | Low |

### 4.3 Personas (High-Level)

1. **Anh Minh** — 32, homeowner in HCMC, decorating a new apartment.
2. **Chị Lan** — 40, runs a small café chain needing consistent lighting.
3. **Architect Hùng** — 38, specifies lighting for residential projects.

---

## 5. Product Scope

### 5.1 Product Taxonomy (Initial)

- **Indoor Lighting** — ceiling lights, wall lights, table lamps, floor lamps.
- **Outdoor Lighting** — garden, façade, pathway.
- **Smart Lighting** — Wi-Fi, Zigbee, dimmable, tunable white.
- **Commercial Lighting** — panels, track, downlights.
- **Bulbs & Accessories** — LED bulbs, drivers, controllers, spare parts.
- **Décor Lighting** — designer, statement, ambient.

### 5.2 Product Attributes (V1 Must-Support)

- SKU, model number, barcode.
- Category and sub-category.
- Brand (single brand in V1).
- Price (VND), promotional price, tax handling.
- Stock by warehouse.
- Multiple images, video.
- Variant axes (color, size, wattage, color temperature).
- Technical specifications (power, lumen, CRI, IP rating, voltage).
- Warranty terms.
- Compatibility notes (smart ecosystem, dimmer types).

---

## 6. Solution Architecture (Overview)

### 6.1 Architectural Principles

1. **Modularity first** — every domain lives in a clearly bounded module.
2. **Boring tech, well-applied** — proven stacks over novelty.
3. **Explicit boundaries** — modules communicate through well-defined contracts.
4. **Cloud-native by default** — stateless, horizontally scalable where needed.
5. **Observability from day one** — logs, metrics, traces.
6. **Security and privacy by design** — least privilege, data minimization.

### 6.2 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
│  ┌──────────────────────────┐   ┌──────────────────────────┐   │
│  │  Storefront (React + TS)  │   │  Admin Panel (React + TS)│   │
│  └──────────────────────────┘   └──────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
                          │ HTTPS / JSON
                          ▼
┌────────────────────────────────────────────────────────────────┐
│                     API Gateway (NestJS)                        │
│         Auth · Rate Limit · Request Validation · Logging       │
└────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│           Application Layer — Modular Monolith (NestJS)        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Catalog  │ │  Cart    │ │ Ordering │ │ Identity │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Payments │ │ Shipping │ │  Media   │ │  Admin   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│                       Data & Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ PostgreSQL   │  │ Redis        │  │ Cloudinary   │          │
│  │ (Neon)       │  │ (Upstash)    │  │ (Media CDN)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│                External Integrations (Vietnam)                  │
│   Payment Gateway   ·   Shipping Carriers   ·   Email/SMS       │
└────────────────────────────────────────────────────────────────┘
```

### 6.3 Target Deployment Topology (Phase 1)

| Concern | Provider |
| --- | --- |
| Frontend Hosting | Vercel |
| Backend Hosting | Render or Railway |
| Primary Database | Neon (PostgreSQL) |
| Cache & Queue | Upstash (Redis) |
| Media Storage & CDN | Cloudinary |
| Email | Provider TBD (e.g., SendGrid / Resend / MailerSend) |
| Monitoring | Provider TBD (e.g., Sentry / Logtail / Better Stack) |

### 6.4 Migration Path to Microservices

Every domain module will be designed with:

- A **public interface** (controllers + DTOs).
- A **private implementation** (services + repositories).
- A **data ownership boundary** (schema and migrations per module).
- **No cross-module database joins** (modules own their data).
- A **documented public API contract** (OpenAPI).

When extraction is justified (scale, team size, independent deployability), the module is moved behind its own API gateway as a separate service. **No rewrite** is required.

---

## 7. Functional Domains (Bounded Contexts)

| Domain | Responsibility | Critical Entities |
| --- | --- | --- |
| **Identity** | Users, roles, sessions, addresses | User, Role, Address |
| **Catalog** | Products, categories, brands, attributes | Product, Category, Attribute, Variant |
| **Pricing** | Prices, taxes, promotional rules | PriceList, Promotion, TaxRule |
| **Inventory** | Stock levels, warehouses, reservations | StockItem, Warehouse, Reservation |
| **Cart** | Active carts, line items, totals | Cart, CartItem |
| **Ordering** | Orders, lifecycle, status history | Order, OrderItem, OrderEvent |
| **Payments** | Payment intents, transactions, refunds | Payment, Transaction, Refund |
| **Shipping** | Rates, shipments, tracking | Shipment, Carrier, Tracking |
| **Reviews** | Customer reviews and ratings | Review, Rating |
| **Notifications** | Email/SMS templates and dispatch | Notification, Template |
| **Media** | Upload, transformation, references | MediaAsset |
| **Analytics** | Aggregations, dashboards, exports | Metric, Report |
| **Admin** | Internal operations and configuration | AdminUser, AuditLog |

---

## 8. Non-Functional Requirements (NFRs)

### 8.1 Performance

| Metric | Target |
| --- | --- |
| Storefront TTFB (cached) | < 200 ms (p95) |
| Storefront TTFB (uncached) | < 600 ms (p95) |
| API response (read) | < 250 ms (p95) |
| API response (write) | < 500 ms (p95) |
| Largest Contentful Paint | < 2.5 s on 4G |
| Time to Interactive | < 4 s on 4G |

### 8.2 Availability and Reliability

| Metric | Target |
| --- | --- |
| Monthly Uptime | ≥ 99.5% (Phase 1) |
| Recovery Time Objective (RTO) | ≤ 4 hours |
| Recovery Point Objective (RPO) | ≤ 1 hour |
| Backups | Daily automated, 30-day retention |

### 8.3 Security

- TLS 1.2+ enforced everywhere.
- OWASP Top 10 baseline compliance.
- All secrets in environment variables, never in repo.
- Role-based access control (RBAC) for admin functions.
- Audit log for sensitive admin operations.
- PCI-DSS scope minimization (tokenized payments).
- GDPR-style principles applied to Vietnamese data protection law.

### 8.4 Scalability

- Stateless application tier (horizontal scale on Render/Railway).
- Read replicas considered when read load justifies cost.
- Background jobs processed via queue (Redis-based).

### 8.5 Maintainability

- Strict TypeScript on both frontend and backend.
- Module dependency rules enforced by tooling.
- 80%+ test coverage on critical paths.
- Automated CI pipeline (lint, type-check, test, build).

### 8.6 Observability

- Centralized structured logging (JSON).
- Application metrics (request rate, error rate, latency).
- Distributed tracing for cross-service calls.
- Error tracking with stack traces and context.

### 8.7 Internationalization and Localization

- All user-facing strings externalized.
- All currency displayed in VND.
- All dates, numbers formatted for `vi-VN`.
- Architecture ready for additional languages without refactor.

### 8.8 Accessibility

- WCAG 2.1 Level AA target for storefront.
- Keyboard navigability.
- Sufficient color contrast.
- Screen-reader friendly semantic HTML.

---

## 9. Compliance, Legal, and Data Protection

| Area | Requirement |
| --- | --- |
| **Personal Data** | Compliance with Vietnamese PDPD (where applicable) |
| **Consumer Rights** | Honest advertising, clear return/warranty policy |
| **Invoicing** | Compliant e-invoice integration (future) |
| **Tax** | VAT handling consistent with Vietnamese regulations |
| **Payment** | Use only licensed Vietnamese payment providers |
| **Cookies** | Consent banner; minimal, non-intrusive defaults |
| **Data Retention** | Defined retention periods per data category |

---

## 10. Stakeholders and Roles

| Role | Responsibility | Example |
| --- | --- | --- |
| **Product Owner** | Vision, prioritization, acceptance | CEO / Head of Product |
| **Principal Architect** | Technical direction, governance | This document's author |
| **Tech Lead (Frontend)** | React/TS quality, UX alignment | — |
| **Tech Lead (Backend)** | NestJS, data, integrations | — |
| **DevOps / SRE** | CI/CD, observability, infra | — |
| **QA Lead** | Test strategy, DoD enforcement | — |
| **Security Champion** | Security review, threat modeling | — |
| **AI Engineering Lead** | AI features, prompt governance | Future |

---

## 11. Risk Register (Initial)

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R-01 | Vendor lock-in (Vercel/Render/Neon) | Medium | Medium | Abstract access behind interfaces; document exit paths |
| R-02 | Payment provider instability | Medium | High | Multi-provider abstraction; failover design |
| R-03 | Scope creep into marketplace before V1 stability | High | High | Strict roadmap discipline; explicit go/no-go gates |
| R-04 | Data loss in early production | Low | Critical | Daily backups, restore drills, PITR where possible |
| R-05 | AI features generating misleading content | Medium | High | AI governance rules, human-in-the-loop, confidence thresholds |
| R-06 | Vietnamese market regulatory change | Medium | Medium | Legal review per quarter; flexible compliance layer |

---

## 12. Success Metrics (Business)

| Metric | Definition | Target (Year 1) |
| --- | --- | --- |
| **GMV** | Gross Merchandise Value | Growth trajectory defined quarterly |
| **AOV** | Average Order Value | Trending upward |
| **Conversion Rate** | Orders / Sessions | ≥ 1.5% |
| **Cart Abandonment** | Abandoned / Created | ≤ 70% |
| **Repeat Purchase Rate** | Returning customers / total | ≥ 20% |
| **NPS** | Net Promoter Score | ≥ 40 |
| **Support Ticket Rate** | Tickets / Orders | ≤ 5% |

---

## 13. Governance and Document Hierarchy

This blueprint is the **highest-level governance artifact**. Other governance documents are derived from and aligned with it:

```
00-governance/
├── PROJECT_BLUEPRINT.md       ← (this document)
├── TECH_STACK.md
├── REPOSITORY_STRUCTURE.md
├── DEVELOPMENT_RULES.md
├── CODING_STANDARDS.md
├── GIT_WORKFLOW.md
├── VERSIONING_STRATEGY.md
├── ROADMAP.md
├── DEFINITION_OF_DONE.md
└── AI_DEVELOPMENT_RULES.md
```

Any change to **business model, target market, or core architecture** requires updating this document first.

---

## 14. Glossary

| Term | Meaning |
| --- | --- |
| **Bounded Context** | A coherent domain boundary with its own model |
| **DoD** | Definition of Done |
| **GMV** | Gross Merchandise Value |
| **Modular Monolith** | A single deployable application composed of independent modules |
| **NFR** | Non-Functional Requirement |
| **PDPD** | Vietnam's Personal Data Protection Decree |
| **RPO** | Recovery Point Objective |
| **RTO** | Recovery Time Objective |
| **SKU** | Stock Keeping Unit |
| **V1 / V2** | Major business versions (single-vendor → marketplace) |

---

## 15. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-02 | Principal Architect | Initial governance baseline |

---

**End of Document — PROJECT_BLUEPRINT.md**
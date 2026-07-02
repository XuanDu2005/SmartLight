# SmartLight — Roadmap

| Field | Value |
| --- | --- |
| **Document ID** | `GOV-ROADMAP-001` |
| **Document Owner** | Principal Software Architect |
| **Status** | Approved — v1.0 |
| **Effective Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2026-10-02 (quarterly) |
| **Classification** | Project Governance — Source of Truth |
| **Audience** | Engineering, Product, Operations, Stakeholders, AI Agents |

---

## 1. Purpose

This Roadmap defines the **planned evolution of SmartLight** across business versions, releases, and capability tracks. It serves as:

1. A **strategic alignment tool** between business, product, and engineering.
2. A **delivery planning anchor** for sprints, quarters, and releases.
3. A **risk and dependency surface** to identify sequencing issues early.
4. A **public-facing commitment** (when shared externally) of what is planned.

This document is reviewed **quarterly** and updated when strategic direction changes.

---

## 2. Strategic Themes

The roadmap is organized around five strategic themes that run continuously:

| ID | Theme | Description |
| --- | --- | --- |
| T1 | **Customer Experience** | Make shopping delightful, fast, and trustworthy |
| T2 | **Operational Excellence** | Reliable order fulfillment and admin efficiency |
| T3 | **Data & Insight** | Capture, organize, and act on quality data |
| T4 | **Platform Extensibility** | Lay foundations for marketplace and AI |
| T5 | **Security & Compliance** | Protect customers, data, and the business |

---

## 3. Version Strategy Overview

| Version | Codename | Theme | Target |
| --- | --- | --- | --- |
| **0.1 — Alpha** | *Foundations* | Internal platform readiness | Q3 2026 |
| **0.5 — Beta** | *Pilot* | Closed customer pilot | Q4 2026 |
| **1.0 — GA** | *Light* | Public single-vendor launch | Q1 2027 |
| **1.x — Growth** | *Bright* | Single-vendor expansion | 2027 |
| **2.0 — Marketplace** | *Spectrum* | Multi-seller marketplace | 2028 |

---

## 4. Phase 0 — Foundations (Q3 2026)

**Goal:** Establish governance, infrastructure, and core platform.

### 4.1 Engineering Capabilities

| ID | Capability | Theme | Status |
| --- | --- | --- | --- |
| EN-001 | Monorepo bootstrap (pnpm + Turborepo) | T1 | Planned |
| EN-002 | CI/CD pipelines (GitHub Actions) | T1 | Planned |
| EN-003 | Observability baseline (logs, metrics, errors) | T2 | Planned |
| EN-004 | Authentication foundation (identity module) | T5 | Planned |
| EN-005 | Database schema baseline (Prisma) | T3 | Planned |
| EN-006 | API contract package (`@smartlight/contracts`) | T4 | Planned |
| EN-007 | Admin panel skeleton | T2 | Planned |
| EN-008 | Storefront skeleton | T1 | Planned |
| EN-009 | Error handling and global filters | T5 | Planned |
| EN-010 | Feature flag framework | T4 | Planned |

### 4.2 Operational Capabilities

| ID | Capability | Theme | Status |
| --- | --- | --- | --- |
| OP-001 | Project governance documents finalized | T5 | Planned |
| OP-002 | ADR process established | T4 | Planned |
| OP-003 | On-call rotation defined | T2 | Planned |
| OP-004 | Incident response playbooks drafted | T2 | Planned |

### 4.3 Exit Criteria

- All governance documents published and acknowledged by team.
- CI pipeline green for an empty baseline.
- Identity module implemented end-to-end (signup, login, refresh).
- Health and version endpoints operational.

---

## 5. Phase 0.5 — Internal Alpha (Late Q3 2026)

**Goal:** Functional internal end-to-end shopping flow.

### 5.1 Scope

| ID | Capability | Theme |
| --- | --- | --- |
| EN-011 | Catalog module (products, categories, variants) | T1 |
| EN-012 | Inventory module (stock, reservations) | T2 |
| EN-013 | Cart module (add, update, remove) | T1 |
| EN-014 | Ordering module (create order, status flow) | T2 |
| EN-015 | Payments module with Vietnamese provider (Phase 1) | T2 |
| EN-016 | Shipping module with Vietnamese carrier (Phase 1) | T2 |
| EN-017 | Notifications module (email transactional) | T2 |
| EN-018 | Media module (Cloudinary integration) | T1 |
| EN-019 | Admin: catalog management | T2 |
| EN-020 | Admin: order management | T2 |
| EN-021 | Storefront: product listing and detail | T1 |
| EN-022 | Storefront: cart and checkout | T1 |
| EN-023 | Storefront: order confirmation | T1 |

### 5.2 Exit Criteria

- Internal demo flow: browse → cart → checkout → order → admin confirms → email sent.
- All modules meet Definition of Done.
- No Sev-1 bugs open.

---

## 6. Phase 1 — Closed Beta (Q4 2026)

**Goal:** Real customers in a controlled pilot.

### 6.1 Scope

| ID | Capability | Theme |
| --- | --- | --- |
| EN-024 | Customer accounts, addresses, order history | T1 |
| EN-025 | Reviews and ratings | T3 |
| EN-026 | Search and filtering (basic) | T1 |
| EN-027 | Promotions module (basic discount engine) | T1 |
| EN-028 | Shipping zones and rate calculation | T2 |
| EN-029 | Returns and RMA module | T2 |
| EN-030 | Admin: customer support tools | T2 |
| EN-031 | Analytics module (KPIs for admin) | T3 |
| EN-032 | Performance optimization pass | T1 |
| EN-033 | Security hardening pass | T5 |
| EN-034 | Accessibility audit and remediation | T5 |
| EN-035 | i18n foundation (Vietnamese only) | T1 |

### 6.2 Beta Program

- 50–200 invited customers.
- Limited catalog (top 100 SKUs).
- Single payment provider, single shipping carrier.
- Daily feedback collection.

### 6.3 Exit Criteria

- Stable operation for ≥ 30 consecutive days.
- NPS ≥ 30.
- Conversion rate ≥ 1.0%.
- No Sev-1 incidents unresolved > 24h.

---

## 7. Phase 1.0 — Public GA (Q1 2027)

**Goal:** Public launch of single-vendor e-commerce.

### 7.1 Launch Readiness

| ID | Capability | Theme |
| --- | --- | --- |
| EN-036 | Full catalog (≥ 500 SKUs) | T1 |
| EN-037 | Multiple payment providers (2+) | T2 |
| EN-038 | Multiple shipping carriers (2+) | T2 |
| EN-039 | SEO foundation (metadata, sitemap, structured data) | T1 |
| EN-040 | Marketing pages (CMS-lite or static MDX) | T1 |
| EN-041 | Email marketing integration (provider TBD) | T1 |
| EN-042 | Production observability and alerting | T2 |
| EN-043 | Backup and restore drills completed | T5 |
| EN-044 | Compliance review (Vietnamese regulations) | T5 |
| EN-045 | Disaster recovery runbook validated | T5 |
| EN-046 | SLA published | T5 |

### 7.2 Launch Gates

- All Sev-1 bugs closed.
- Performance targets met for 7 consecutive days.
- Backup restore drill successful.
- Security scan clean (no high/critical).
- Product Owner and Principal Architect sign-off.

### 7.3 Public Release

- Release tag: `v1.0.0`.
- Public changelog and announcement.
- Marketing site updated.

---

## 8. Phase 1.x — Growth (2027)

**Goal:** Expand single-vendor platform capabilities.

### 8.1 Quarterly Themes

| Quarter | Theme | Highlights |
| --- | --- | --- |
| Q2 2027 | Conversion Optimization | A/B testing framework, checkout improvements |
| Q3 2027 | Customer Loyalty | Loyalty points, referral program |
| Q4 2027 | Operational Efficiency | Bulk admin tools, automation of routine ops |

### 8.2 Capabilities (Indicative)

- Wishlists and saved carts.
- Product comparison.
- Advanced promotions engine (BOGO, tiered).
- Customer segmentation and personalized emails.
- Advanced analytics and dashboards.
- Admin workflow automation.
- Vendor integrations (accounting, ERP).

---

## 9. Phase 1.5 — Mobile and AI Foundation (Mid 2027)

**Goal:** Introduce mobile app and lay AI groundwork.

### 9.1 Mobile App (Phase 1.5)

| ID | Capability | Theme |
| --- | --- | --- |
| MB-001 | Mobile architecture decision (native vs RN vs PWA-first) | T1 |
| MB-002 | Shared API contracts validated for mobile use | T4 |
| MB-003 | Push notifications foundation | T1 |

**Initial decision:** extend the storefront into a PWA first, then evaluate native vs React Native.

### 9.2 AI Foundation

| ID | Capability | Theme |
| --- | --- | --- |
| AI-001 | Data catalog and quality audit | T3 |
| AI-002 | AI gateway and prompt governance baseline | T5 |
| AI-003 | Internal experimentation environment | T4 |
| AI-004 | Knowledge base structure for product content | T3 |

---

## 10. Phase 2 — Marketplace (2028)

**Goal:** Transform SmartLight into a multi-seller marketplace.

### 10.1 Strategic Pillars

1. **Seller onboarding and lifecycle.**
2. **Seller portal and self-service.**
3. **Commission and payout engine.**
4. **Marketplace-wide catalog federation.**
5. **Dispute resolution and trust systems.**

### 10.2 Capability Tracks (Indicative)

| Track | Highlights |
| --- | --- |
| **Seller Identity** | Seller accounts, KYC, roles |
| **Seller Catalog** | Seller-owned products, approval workflow |
| **Order Routing** | Split cart by seller, multi-shipment orchestration |
| **Payments & Payouts** | Hold-and-release escrow, settlement, refunds |
| **Trust & Safety** | Reviews aggregation, dispute workflow, fraud signals |
| **Marketplace Admin** | Seller approval, commission config, dispute console |

### 10.3 Migration Considerations

- Existing single-vendor modules must be **forked into marketplace-aware versions**.
- A vendor abstraction layer becomes mandatory in domain modules.
- Some modules extracted as microservices to handle marketplace load.

### 10.4 Phase 2 Entry Gate

- ≥ 12 months of stable 1.x operation.
- Marketplace business case validated.
- Funding and team capacity confirmed.

---

## 11. Cross-Cutting Initiatives

### 11.1 Multi-language (Future)

- Architecture already supports multi-language via i18next.
- English, Korean, Japanese are candidate languages.
- Triggered by traffic and demand data.

### 11.2 AI Sales Assistant

- Phase 1.5+: conversation surface on storefront.
- Backed by product catalog + policy knowledge base.
- Human escalation path always available.

### 11.3 AI Customer Support

- Phase 1.5+: ticket triage and suggested replies.
- Integration with existing support tooling.
- Confidence threshold + human review.

### 11.4 Observability Maturity

- Phase 1.0: structured logs, errors, basic metrics.
- Phase 1.x: tracing, SLO dashboards, anomaly detection.
- Phase 2: AIOps-assisted incident response.

---

## 12. Capability Dependency Map

```
Governance (Phase 0)
  └─► CI/CD (Phase 0)
        └─► Modules (Phase 0.5)
              ├─► Admin (Phase 0.5)
              ├─► Storefront (Phase 0.5)
              └─► Integrations (Phase 0.5)
                    └─► Beta (Phase 1)
                          └─► GA (Phase 1.0)
                                ├─► Growth (Phase 1.x)
                                ├─► Mobile (Phase 1.5)
                                └─► Marketplace (Phase 2)
```

---

## 13. Risk-Adjusted Roadmap View

| Phase | Best Case | Likely Case | Worst Case |
| --- | --- | --- | --- |
| Phase 0 | Complete in 6 weeks | Complete in 8 weeks | Slip to 10 weeks |
| Phase 0.5 | Complete in 8 weeks | Complete in 10 weeks | Slip to 14 weeks |
| Phase 1 (Beta) | 6-week pilot | 8-week pilot | 12-week pilot |
| Phase 1.0 GA | Q1 2027 | Q1 2027 | Q2 2027 |
| Phase 2 | Q1 2028 | Q2 2028 | Q4 2028 |

---

## 14. Decision Gates

Each phase ends with an explicit **Go / No-Go gate**:

| Gate | Decision Makers | Criteria |
| --- | --- | --- |
| 0 → 0.5 | Tech Lead | Governance signed, CI green, identity module demoed |
| 0.5 → 1 | Tech Lead + Product | Internal flow demoed, all DoD met |
| 1 → 1.0 | Principal Architect + Product + QA | Beta KPIs met, security clean, perf met |
| 1.0 → 1.5 | Principal Architect + Product | 1.x stability, mobile case validated |
| 1.x → 2 | Executive Sponsor + Principal Architect | Business case, funding, capacity |

---

## 15. Out-of-Scope (Explicitly Deferred)

- International shipping (post-2.0).
- Cryptocurrency payments (no plans).
- Auction / bidding flows (no plans).
- Social commerce features (TBD).
- AR/VR product previews (TBD).

---

## 16. Roadmap Review Cadence

- **Quarterly:** Roadmap formally reviewed and updated.
- **Monthly:** Status review at engineering all-hands.
- **Per Release:** Release retrospective updates next release plan.

---

## 17. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-02 | Principal Architect | Initial governance baseline |

---

**End of Document — ROADMAP.md**
# SmartLight — Assumptions

| Field | Value |
| --- | --- |
| **Document ID** | `BA-ASSUMPTIONS-001` |
| **Document Owner** | Principal Business Analyst |
| **Status** | Draft — v0.1 |
| **Created Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2026-08-01 |
| **Classification** | Business Analysis — Authoritative |
| **Audience** | Engineering, Product, QA, Stakeholders, AI Agents |

> **Source of Truth:** This document captures every assumption made while defining SmartLight Version 1. Each assumption includes its **reason**, **risk**, and **impact** so stakeholders can validate or challenge it.

---

## 1. Purpose

This document records the **assumptions** that underpin SmartLight requirements and design. Assumptions:

1. Are **believed true** but not yet **proven**.
2. Must be **validated** before the affected features ship.
3. If invalid, may require changes to requirements or scope.
4. Each carries an explicit **risk** and **impact**.

This is a **living document**. New assumptions are added when discovered; invalid assumptions are retired and the related requirements are revisited.

---

## 2. Assumption Categories

| Code | Category |
| --- | --- |
| A-MKT | Market and Business |
| A-REG | Regulatory and Compliance |
| A-TECH | Technical and Infrastructure |
| A-OPS | Operational and Organizational |
| A-INT | Integration and Vendor |
| A-USR | User Behavior and Adoption |
| A-FIN | Financial and Pricing |

---

## 3. Severity Scale

| Level | Meaning | Response |
| --- | --- | --- |
| **Critical** | Could block V1 launch if false | Validate before development |
| **High** | Major rework if false | Validate before Phase 1 GA |
| **Medium** | Moderate rework if false | Validate before minor releases |
| **Low** | Minor impact if false | Validate opportunistically |

---

## 4. Market and Business Assumptions

### A-MKT-001 — Single Vendor Sufficient for V1

| Field | Value |
| --- | --- |
| **Assumption** | The single-vendor business model is sufficient for V1 in Vietnam; marketplace expansion is deferred to V2. |
| **Reason** | Single-vendor simplifies operations, pricing control, brand consistency, and time-to-market. |
| **Risk** | Customer demand for multi-seller breadth may be higher than anticipated, limiting growth. |
| **Impact** | If false: faster pivot to V2 marketplace may be needed; revenue ceiling lower. |
| **Severity** | Medium |
| **Validation Method** | Quarterly market analysis; competitive benchmarking. |

### A-MKT-002 — Vietnam Lighting Market Accepts Online Purchases

| Field | Value |
| --- | --- |
| **Assumption** | Vietnamese consumers are willing to purchase lighting products online with confidence. |
| **Reason** | Vietnam e-commerce has matured; lighting is a candidate for online purchase due to standard SKUs. |
| **Risk** | Customers may prefer in-store viewing for lighting aesthetics and quality verification. |
| **Impact** | If false: lower conversion; need for showroom partnerships or AR/visualization features. |
| **Severity** | High |
| **Validation Method** | Closed beta metrics; survey feedback. |

### A-MKT-003 — Initial Catalog of ~500 SKUs is Sufficient

| Field | Value |
| --- | --- |
| **Assumption** | Launching with approximately 500 curated SKUs is sufficient to validate demand. |
| **Reason** | Lighting retail typically operates on a curated assortment; over-extension dilutes quality. |
| **Risk** | Customers cannot find desired products, leading to bounce. |
| **Impact** | If false: accelerate SKU onboarding in early months. |
| **Severity** | Medium |
| **Validation Method** | Search log analysis; out-of-stock demand tracking. |

### A-MKT-004 — Brand Acceptance of SmartLight Name

| Field | Value |
| --- | --- |
| **Assumption** | Customers will accept "SmartLight" as the brand of lighting products sold on the platform. |
| **Reason** | Single-vendor branding strategy aligns with curated assortment. |
| **Risk** | Customers may expect recognized international brands. |
| **Impact** | If false: brand strategy pivot or white-label approach needed. |
| **Severity** | Medium |
| **Validation Method** | Brand perception survey; conversion comparison. |

### A-MKT-005 — VND as Sole Currency

| Field | Value |
| --- | --- |
| **Assumption** | VND is the only required currency in V1. |
| **Reason** | Vietnam-only market per governance; simplifies all financial logic. |
| **Risk** | Demand from non-VND customers (e.g., expats, gift purchases) may be missed. |
| **Impact** | If false: defer multi-currency to V1.5+ with low impact. |
| **Severity** | Low |
| **Validation Method** | Traffic analysis by locale. |

---

## 5. Regulatory and Compliance Assumptions

### A-REG-001 — PDPD Compliance Achievable with Default Architecture

| Field | Value |
| --- | --- |
| **Assumption** | The default architecture and governance support PDPD (Vietnam Personal Data Protection Decree) compliance. |
| **Reason** | Default practices (TLS, encryption at rest, audit logs, consent) align with PDPD principles. |
| **Risk** | Specific PDPD requirements may mandate features beyond defaults. |
| **Impact** | If false: add explicit consent management, data residency, DPO designation. |
| **Severity** | High |
| **Validation Method** | Legal review before GA. |

### A-REG-002 — PDF Invoices Suffice for Tax Compliance in V1

| Field | Value |
| --- | --- |
| **Assumption** | PDF invoices meet Vietnamese tax compliance in V1. |
| **Reason** | E-invoice integration with tax authority is complex and provider-dependent. |
| **Risk** | Tax authority may mandate e-invoices from launch. |
| **Impact** | If false: integrate with e-invoice provider before GA. |
| **Severity** | High |
| **Validation Method** | Tax advisor consultation. |

### A-REG-003 — Cookie Consent Banner Sufficient for PDPD

| Field | Value |
| --- | --- |
| **Assumption** | A simple cookie consent banner meets PDPD consent requirements in V1. |
| **Reason** | PDPD allows reasonable consent mechanisms; no specific UI mandated. |
| **Risk** | Stricter interpretations may require granular per-purpose consent. |
| **Impact** | If false: implement granular consent in V1.x. |
| **Severity** | Medium |
| **Validation Method** | Legal review; monitor regulatory guidance. |

### A-REG-004 — Marketing Communications Allowed with Opt-In

| Field | Value |
| --- | --- |
| **Assumption** | Marketing emails may be sent to customers who explicitly opt in. |
| **Reason** | Standard practice; aligns with PDPD and global norms. |
| **Risk** | Strict interpretations may require double opt-in or additional disclosures. |
| **Impact** | If false: add double opt-in flow in V1.x. |
| **Severity** | Low |
| **Validation Method** | Legal review. |

---

## 6. Technical and Infrastructure Assumptions

### A-TECH-001 — Vercel + Render/Railway Sufficient for Phase 1 Load

| Field | Value |
| --- | --- |
| **Assumption** | The proposed hosting (Vercel frontend, Render/Railway backend) handles Phase 1 load. |
| **Reason** | Cloud providers offer autoscaling and managed infrastructure. |
| **Risk** | Specific load patterns (e.g., flash sale spikes) may exceed platform limits. |
| **Impact** | If false: tune autoscaling, add queue-based decoupling, consider dedicated hosting. |
| **Severity** | Medium |
| **Validation Method** | Load testing during closed beta. |

### A-TECH-002 — Neon Postgres Meets Performance Requirements

| Field | Value |
| --- | --- |
| **Assumption** | Neon (serverless Postgres) delivers acceptable performance for Phase 1. |
| **Reason** | Neon offers Postgres compatibility with branching features. |
| **Risk** | Cold-start latency or compute limits may affect performance. |
| **Impact** | If false: tune connection pooling, add caching layer, consider migration to dedicated Postgres. |
| **Severity** | Medium |
| **Validation Method** | Performance benchmarks; production load. |

### A-TECH-003 — Upstash Redis Adequate for Cache and Queues

| Field | Value |
| --- | --- |
| **Assumption** | Upstash Redis provides adequate cache and queue capacity. |
| **Reason** | Upstash is serverless-friendly; BullMQ supports Redis-based queues. |
| **Risk** | Cost spikes or latency under high load. |
| **Impact** | If false: review Redis usage patterns, optimize, consider alternative. |
| **Severity** | Low |
| **Validation Method** | Production monitoring. |

### A-TECH-004 — Cloudinary Meets Media Performance

| Field | Value |
| --- | --- |
| **Assumption** | Cloudinary's CDN and transformation API meet performance and cost targets. |
| **Reason** | Cloudinary is industry standard for e-commerce media. |
| **Risk** | High traffic or transformations may increase cost. |
| **Impact** | If false: review caching, optimize image variants. |
| **Severity** | Low |
| **Validation Method** | Monthly cost review. |

### A-TECH-005 — Modular Monolith Performs Adequately

| Field | Value |
| --- | --- |
| **Assumption** | A modular monolith on NestJS performs adequately for V1 without microservice decomposition. |
| **Reason** | Phase 1 traffic (≤ 100 orders/day) is well within a single application's capacity. |
| **Risk** | Premature optimization risk is low; performance is generally bounded by DB. |
| **Impact** | If false: extract hot modules later as designed. |
| **Severity** | Low |
| **Validation Method** | Load testing; production traffic analysis. |

### A-TECH-006 — PostgreSQL Full-Text Search Sufficient

| Field | Value |
| --- | --- |
| **Assumption** | Postgres full-text search meets product search needs in V1. |
| **Reason** | Postgres FTS is mature and avoids external search services in Phase 1. |
| **Risk** | Search quality may not match dedicated engines (e.g., Elasticsearch, Algolia). |
| **Impact** | If false: integrate dedicated search in V1.x or V2. |
| **Severity** | Medium |
| **Validation Method** | Search quality analytics; user feedback. |

### A-TECH-007 — React + TypeScript + Vite Stack is Stable

| Field | Value |
| --- | --- |
| **Assumption** | The React + TypeScript + Vite stack is stable for production use. |
| **Reason** | All three are mature, well-supported technologies. |
| **Risk** | Specific library churn could affect build stability. |
| **Impact** | If false: dependency upgrades scheduled per governance. |
| **Severity** | Low |
| **Validation Method** | Dependency monitoring. |

### A-TECH-008 — NestJS Module Boundaries are Maintainable

| Field | Value |
| --- | --- |
| **Assumption** | NestJS module structure with enforced boundaries supports clean evolution to microservices. |
| **Reason** | NestJS DI and module isolation map naturally to bounded contexts. |
| **Risk** | Tight coupling may sneak in despite boundaries. |
| **Impact** | If false: tooling-based enforcement (dependency-cruiser) plus periodic audits. |
| **Severity** | Medium |
| **Validation Method** | Architecture reviews; module dependency analysis. |

---

## 7. Operational and Organizational Assumptions

### A-OPS-001 — Small Team Can Launch and Operate V1

| Field | Value |
| --- | --- |
| **Assumption** | A small team (≤ 6 people) can launch and operate V1 with automation. |
| **Reason** | Managed services, CI/CD, and automation reduce operational load. |
| **Risk** | Operational incidents may overwhelm a small team. |
| **Impact** | If false: prioritize automation; consider external operations support. |
| **Severity** | Medium |
| **Validation Method** | On-call load measurement during closed beta. |

### A-OPS-002 — Admin Staff Trainable in 2 Weeks

| Field | Value |
| --- | --- |
| **Assumption** | Admin staff can be trained to use the admin panel within 2 weeks. |
| **Reason** | Standard e-commerce operations; UI designed for clarity. |
| **Risk** | Complex catalog or order flows may extend training. |
| **Impact** | If false: extend training; provide contextual help. |
| **Severity** | Low |
| **Validation Method** | Training feedback. |

### A-OPS-003 — 24-Hour Order Fulfillment Achievable

| Field | Value |
| --- | --- |
| **Assumption** | Orders can be picked, packed, and handed to carrier within 24 hours. |
| **Reason** | Standard for Vietnamese e-commerce; single warehouse in V1. |
| **Risk** | Higher-than-expected volume or stock issues may slow fulfillment. |
| **Impact** | If false: add staffing, automation, or multiple warehouses in V1.x. |
| **Severity** | Medium |
| **Validation Method** | Fulfillment KPIs during beta. |

### A-OPS-004 — Customer Support Coverage Achievable

| Field | Value |
| --- | --- |
| **Assumption** | Customer support can be staffed to meet 4-hour first-response SLA. |
| **Reason** | Initial volume manageable; tooling reduces manual effort. |
| **Risk** | Support volume spikes may breach SLA. |
| **Impact** | If false: add staff or AI-assisted triage in V1.5+. |
| **Severity** | Medium |
| **Validation Method** | Support KPIs. |

### A-OPS-005 — Single Warehouse Sufficient for V1

| Field | Value |
| --- | --- |
| **Assumption** | A single warehouse can serve all Vietnamese orders in V1. |
| **Reason** | Vietnam is geographically compact relative to expected V1 volume. |
| **Risk** | Delivery time to distant provinces may suffer. |
| **Impact** | If false: add regional warehouses in V1.x. |
| **Severity** | Low |
| **Validation Method** | Shipping time analytics. |

---

## 8. Integration and Vendor Assumptions

### A-INT-001 — At Least One Vietnamese Payment Provider Available

| Field | Value |
| --- | --- |
| **Assumption** | At least one Vietnamese payment provider (VNPay, MoMo, ZaloPay) can be integrated. |
| **Reason** | Multiple licensed providers operate in Vietnam. |
| **Risk** | Provider onboarding delays; API limitations. |
| **Impact** | If false: phase payment provider integration; potentially delay GA. |
| **Severity** | Critical |
| **Validation Method** | Provider contracting and sandbox testing before development. |

### A-INT-002 — At Least One Vietnamese Shipping Carrier Available

| Field | Value |
| --- | --- |
| **Assumption** | At least one Vietnamese shipping carrier (GHN, GHTK, Viettel Post) can be integrated. |
| **Reason** | Major carriers offer APIs. |
| **Risk** | Carrier API instability; rate calculation accuracy. |
| **Impact** | If false: implement carrier-agnostic abstraction; consider manual fallback. |
| **Severity** | Critical |
| **Validation Method** | Carrier integration testing during Alpha. |

### A-INT-003 — Email Provider Supports Vietnamese Characters

| Field | Value |
| --- | --- |
| **Assumption** | Selected email provider fully supports Vietnamese diacritics and UTF-8. |
| **Reason** | Standard feature for modern email providers. |
| **Risk** | Specific provider encoding issues. |
| **Impact** | If false: switch provider; minimal cost. |
| **Severity** | Low |
| **Validation Method** | Email template testing. |

### A-INT-004 — Vietnamese Domain Registration Available

| Field | Value |
| --- | --- |
| **Assumption** | A Vietnamese `.vn` domain can be registered and managed. |
| **Reason** | Standard domain registration. |
| **Risk** | Registration delays; administrative requirements. |
| **Impact** | If false: use `.com.vn` or alternative. |
| **Severity** | Low |
| **Validation Method** | Domain registration check. |

### A-INT-005 — Cloudinary Free/Low-Tier Adequate Initially

| Field | Value |
| --- | --- |
| **Assumption** | Cloudinary's free or low-tier plan supports initial traffic. |
| **Reason** | Phase 1 volume is moderate. |
| **Risk** | Plan limits exceeded with media growth. |
| **Impact** | If false: upgrade Cloudinary plan; budget impact. |
| **Severity** | Low |
| **Validation Method** | Monthly usage review. |

### A-INT-006 — Provider Webhooks are Reliable

| Field | Value |
| --- | --- |
| **Assumption** | Webhooks from payment and shipping providers arrive reliably. |
| **Reason** | Standard provider behavior; webhooks include retries. |
| **Risk** | Lost or delayed webhooks cause stale state. |
| **Impact** | If false: implement reconciliation polling and idempotent handlers. |
| **Severity** | High |
| **Validation Method** | Webhook delivery tests; reconciliation audits. |

---

## 9. User Behavior and Adoption Assumptions

### A-USR-001 — Customers Accept Email/Password Auth

| Field | Value |
| --- | --- |
| **Assumption** | Vietnamese customers accept email/password authentication. |
| **Reason** | Standard in Vietnam; social login is secondary. |
| **Risk** | Friction from password management. |
| **Impact** | If false: add social login in V1.x. |
| **Severity** | Low |
| **Validation Method** | Registration funnel analytics. |

### A-USR-002 — Guest Checkout Preferred for First Purchases

| Field | Value |
| --- | --- |
| **Assumption** | First-time buyers prefer guest checkout over forced registration. |
| **Reason** | Industry standard; reduces friction. |
| **Risk** | Lower customer retention if account not created. |
| **Impact** | If false: add post-purchase account creation prompts. |
| **Severity** | Low |
| **Validation Method** | Checkout abandonment analysis. |

### A-USR-003 — Phone-Based Communication is Common

| Field | Value |
| --- | --- |
| **Assumption** | Vietnamese customers prefer phone-based contact for support escalation. |
| **Reason** | Phone-based support is common in Vietnam. |
| **Risk** | Phone support load may exceed capacity. |
| **Impact** | If false: rely on ticketing; possibly add SMS notifications. |
| **Severity** | Low |
| **Validation Method** | Support ticket channel analysis. |

### A-USR-004 — Mobile Browsing is Significant

| Field | Value |
| --- | --- |
| **Assumption** | A significant portion of traffic comes from mobile devices. |
| **Reason** | Vietnam has high mobile penetration. |
| **Risk** | Poor mobile experience hurts conversion. |
| **Impact** | If false: prioritize mobile UX quality. |
| **Severity** | Medium |
| **Validation Method** | Analytics from closed beta. |

### A-USR-005 — Reviews Influence Purchase Decisions

| Field | Value |
| --- | --- |
| **Assumption** | Customer reviews significantly influence lighting purchase decisions. |
| **Reason** | Standard e-commerce behavior. |
| **Risk** | Low review volume or quality. |
| **Impact** | If false: incentivize reviews via post-purchase prompts. |
| **Severity** | Low |
| **Validation Method** | Correlation analysis between reviews and conversion. |

---

## 10. Financial and Pricing Assumptions

### A-FIN-001 — VAT Handling Achievable with Existing Patterns

| Field | Value |
| --- | --- |
| **Assumption** | VAT can be calculated and shown per Vietnamese tax rules using existing tech. |
| **Reason** | Tax rules are stable and computable. |
| **Risk** | Complex B2B scenarios require VAT-inclusive vs VAT-exclusive pricing. |
| **Impact** | If false: add B2B pricing module in V1.x. |
| **Severity** | Medium |
| **Validation Method** | Tax advisor review. |

### A-FIN-002 — Payment Provider Settlement Acceptable

| Field | Value |
| --- | --- |
| **Assumption** | Vietnamese payment providers settle funds within acceptable timeframes. |
| **Reason** | Industry standard T+1 to T+3 settlement. |
| **Risk** | Settlement delays affect cash flow. |
| **Impact** | If false: renegotiate terms or add providers. |
| **Severity** | Low |
| **Validation Method** | Settlement tracking. |

### A-FIN-003 — Free Shipping Threshold Drives AOV

| Field | Value |
| --- | --- |
| **Assumption** | A free shipping threshold (e.g., 500,000 VND) increases average order value. |
| **Reason** | Common e-commerce pattern. |
| **Risk** | Threshold too low hurts margin; too high does not motivate. |
| **Impact** | If false: tune threshold; consider alternatives. |
| **Severity** | Low |
| **Validation Method** | AOV experiment. |

### A-FIN-004 — Refund Volume Within Operational Capacity

| Field | Value |
| --- | --- |
| **Assumption** | Refund volume is manageable with current staffing. |
| **Reason** | Returns are typically < 10% of orders. |
| **Risk** | Higher defect rate or fraud spikes. |
| **Impact** | If false: add tooling or staff. |
| **Severity** | Low |
| **Validation Method** | Refund rate monitoring. |

---

## 11. Architecture and Module Assumptions

### A-ARCH-001 — Module Boundaries will Hold in Practice

| Field | Value |
| --- | --- |
| **Assumption** | Engineering discipline keeps modules from leaking into each other. |
| **Reason** | Governance enforces boundaries; tooling detects violations. |
| **Risk** | Time pressure may encourage shortcuts. |
| **Impact** | If false: stronger enforcement; refactoring as needed. |
| **Severity** | Medium |
| **Validation Method** | Architecture reviews; dependency-cruiser in CI. |

### A-ARCH-002 — Bounded Contexts Align with Domain Reality

| Field | Value |
| --- | --- |
| **Assumption** | The 16 identified bounded contexts match real business boundaries. |
| **Reason** | Drawn from domain analysis. |
| **Risk** | Real-world needs may surface missing contexts or splits. |
| **Impact** | If false: refactor module structure. |
| **Severity** | Medium |
| **Validation Method** | Production evolution; retrospectives. |

### A-ARCH-003 — Future Microservice Extraction Viable

| Field | Value |
| --- | --- |
| **Assumption** | V2 microservice extraction is feasible without rewrite. |
| **Reason** | Modules designed with public surfaces and data ownership. |
| **Risk** | Hidden coupling may complicate extraction. |
| **Impact** | If false: V2 may require additional refactoring before extraction. |
| **Severity** | Low |
| **Validation Method** | Periodic architecture reviews. |

---

## 12. Risk and Severity Summary

| Severity | Count |
| --- | --- |
| Critical | 2 |
| High | 4 |
| Medium | 16 |
| Low | 19 |
| **TOTAL** | **41** |

### Critical Assumptions (Must Validate Before Development)

| ID | Assumption |
| --- | --- |
| A-INT-001 | At least one Vietnamese payment provider can be integrated |
| A-INT-002 | At least one Vietnamese shipping carrier can be integrated |

### High-Severity Assumptions (Must Validate Before GA)

| ID | Assumption |
| --- | --- |
| A-REG-001 | PDPD compliance achievable with default architecture |
| A-REG-002 | PDF invoices suffice for tax compliance in V1 |
| A-INT-006 | Provider webhooks are reliable |
| A-MKT-002 | Vietnam lighting market accepts online purchases |

---

## 13. Assumption Validation Schedule

| Phase | Validation Activities |
| --- | --- |
| Pre-Development | A-INT-001, A-INT-002 (vendor contracts and sandbox tests) |
| Phase 0 (Foundations) | A-TECH-001..008, A-ARCH-001..003 |
| Phase 0.5 (Alpha) | A-MKT-003, A-USR-004, A-OPS-001 |
| Phase 1 (Beta) | A-MKT-002, A-USR-005, A-FIN-001, A-REG-001 |
| Pre-GA | A-REG-002, A-INT-006, A-OPS-003, A-OPS-004 |
| Quarterly | A-MKT-001, A-MKT-004, A-FIN-003 |

---

## 14. Assumption Review Process

1. **Discovery:** Any team member may propose a new assumption.
2. **Triage:** BA Lead classifies and assigns severity.
3. **Validation:** Owner defines and executes validation method.
4. **Resolution:** Assumption confirmed, modified, or retired.
5. **Communication:** Status changes broadcast to stakeholders.

---

## 15. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 0.1 | 2026-07-02 | Principal Business Analyst | Initial draft with 41 assumptions across 8 categories |

---

**End of Document — ASSUMPTIONS.md**
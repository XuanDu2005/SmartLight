# SmartLight — Business Analysis Review Report

| Field | Value |
| --- | --- |
| **Document ID** | `BA-REVIEW-001` |
| **Document Owner** | Architecture Review Board |
| **Reviewers** | Principal Software Architect, Chief Business Analyst, Enterprise Solution Architect, Product Review Committee |
| **Documents Under Review** | SRS.md, SYSTEM_FEATURES.md, BUSINESS_RULES.md, USER_STORIES.md, ACCEPTANCE_CRITERIA.md, GLOSSARY.md, ASSUMPTIONS.md, REQUIREMENTS_TRACEABILITY_MATRIX.md |
| **Status** | Draft — v0.1 |
| **Review Date** | 2026-07-02 |
| **Classification** | Architecture Review — Authoritative |
| **Audience** | Engineering Lead, Product Owner, QA Lead, Stakeholders |

> **Source of Truth:** This review treats the eight Business Analysis documents as a single system. Governance documents in `docs/00-governance/` are approved and were used as the conformance baseline. This report does **not** modify the source documents; it identifies required and optional changes for the development team to apply.

---

## 1. Executive Summary

The Business Analysis corpus for SmartLight is **broad, well-structured, and largely production-ready**. It demonstrates enterprise-level discipline in traceability, business rule formalization, and Vietnamese-market localization. The eight documents together cover 152 functional requirements, 152 system features, 70+ business rules, 71 user stories, and 70+ Gherkin acceptance criteria.

**However**, the corpus as a whole is **scope-heavy for a startup**. Approximately 152 atomic features for a V1 single-vendor launch risks delivery slippage, validation gaps, and operational overload. Several features are over-engineered (cohort analytics, multi-step checkout state recovery, MDX-style static content, comparison engine, recently viewed) for a launch with limited operational staff.

The review recommends **PASS WITH CHANGES**: the foundation is solid and production-quality, but requires (1) MVP scope reduction via MoSCoW, (2) closure of identified traceability and consistency gaps, and (3) clarification of three ambiguous requirements before engineering begins.

**Final score: 82 / 100** — high quality, requires targeted corrections and a re-baselined MVP scope.

---

## 2. Overall Score

| Dimension | Weight | Score (0-100) | Weighted |
| --- | --- | --- | --- |
| IEEE 830 / ISO 29148 compliance (SRS) | 12% | 88 | 10.56 |
| Internal consistency across documents | 15% | 78 | 11.70 |
| Completeness of requirements | 12% | 86 | 10.32 |
| Traceability integrity | 13% | 92 | 11.96 |
| Business rule correctness | 10% | 80 | 8.00 |
| User story quality (INVEST, scope) | 10% | 75 | 7.50 |
| Acceptance criteria coverage | 8% | 84 | 6.72 |
| Glossary quality and bilingualism | 5% | 88 | 4.40 |
| Assumptions rigor | 5% | 80 | 4.00 |
| Startup feasibility | 10% | 62 | 6.20 |
| **Total** | **100%** | — | **81.36** |

**Overall: 82 / 100** (rounded; reflects strengths offset by scope-overload and a small number of correctness gaps).

### 2.1 Score Interpretation

| Range | Interpretation |
| --- | --- |
| 90–100 | Enterprise production-ready, ship as-is |
| 80–89 | High quality, requires targeted changes |
| 70–79 | Acceptable, requires substantive changes |
| 60–69 | Below threshold, significant rework needed |
| < 60 | Reject and rebuild |

---

## 3. Strengths

| ID | Strength | Evidence |
| --- | --- | --- |
| S-01 | **Strong governance traceability** | Every BA document explicitly references governance source-of-truth and resolves cross-conflicts in favor of governance. |
| S-02 | **Excellent ID discipline** | Stable, consistent IDs across SRS (`FR-XXX-NNN`), Features (`SF-XXX-NNN`), Rules (`BR-XXX-NNN`), Stories (`US-XXXX-NNN`), and AC (`AC-AC-NNN`). |
| S-03 | **Vietnamese-first orientation** | All customer-facing examples, validation rules, address formats, and template examples are Vietnamese-native. |
| S-04 | **Bounded context alignment** | Module decomposition (Identity, Catalog, Cart, Checkout, Order, Shipping, etc.) cleanly maps to the 16 NestJS modules defined in governance. |
| S-05 | **Comprehensive rule formalization** | Each rule includes Description, Condition, Exception, Validation, and Related Features — usable by engineering and QA without ambiguity. |
| S-06 | **Gherkin acceptance criteria** | ACs use proper Given/When/Then format with multiple scenarios per feature, ready for test automation. |
| S-07 | **Strong VND money handling** | BR-X-001 and SF-X-003 enforce Decimal/integer money types; explicit ban on floats is a real-world production safeguard. |
| S-08 | **Refund integrity controls** | BR-PAY-003 and AC-AC-064 prevent over-refunding, with clear test scenarios. |
| S-09 | **PCI scope minimization explicit** | BR-PAY-001 documents the no-PAN-storage rule with clear validation, reducing compliance burden. |
| S-10 | **Comprehensive glossary with Vietnamese equivalents** | 100+ bilingual terms; standardized terminology usable in code, UI, and admin training. |
| S-11 | **Audit log immutability stated** | BR-ADM-001 makes audit log immutability explicit and enforceable. |
| S-12 | **Forward and backward traceability examples** | RTM includes both directions and verifies all five layers. |
| S-13 | **Realistic operational assumptions** | Assumptions include severity, validation methods, and review schedule — uncommon in early-stage BA. |
| S-14 | **Cart merge conflict cap** | BR-CRT-002 explicitly defines cap-and-notify behavior on merge conflicts. |
| S-15 | **Idempotent payment acceptance** | BR-CHK-009 + SF-CHK-010 prevent duplicate orders on resubmit. |

---

## 4. Weaknesses

### 4.1 Cross-Cutting Weaknesses

| ID | Weakness | Severity | Affected Documents |
| --- | --- | --- | --- |
| W-01 | **Scope overload for a startup V1** — 152 atomic features, 70+ ACs, 70+ rules risks delivery slippage | High | SYSTEM_FEATURES, USER_STORIES, ROADMAP |
| W-02 | **No inventory module defined** — features reference `SF-INV-002` repeatedly but no inventory module is documented | High | SRS, SYSTEM_FEATURES, RTM |
| W-03 | **No payments module defined** — features reference `SF-PAY-*` but no PAY module exists in features | High | SYSTEM_FEATURES, RTM |
| W-04 | **No media module defined** — `SF-MED-001` referenced as dependency but MED is not a module in features | Medium | SYSTEM_FEATURES, RTM |
| W-05 | **Wishlist limit not stated in SRS** — BR-CRT-006 says ≤ 200 items, but no FR-CRT covers wishlist limits | Medium | SRS, BR, AC |
| W-06 | **VAT amount/tax line not in SRS FR-ORD** — BR-ORD-008 requires tax display, but no functional requirement mandates tax computation | Medium | SRS, BR, AC |
| W-07 | **Guest checkout account creation behavior ambiguous** — BR-ID-003 says verified email required for first order, but FR-CHK-002 says guest can checkout without account; FR-ID-001..003 don't cover guest-post-checkout account | High | SRS, USER_STORIES |
| W-08 | **Order status transition diagram missing** — BR-ORD-002 references "allowed flows" but no visual or tabular state machine is provided | Medium | BR, AC |
| W-09 | **Discount stack interaction with free shipping under-specified** — BR-PRM-005 mentions stacking but BR-SHP-002 mentions free shipping threshold; combined behavior is unclear | Medium | BR |
| W-10 | **Phone/email change verification not specified** — customers can change email/phone in profile (US-CUST-016) but no verification flow exists in stories or rules | Medium | USER_STORIES, BR |
| W-11 | **No "Out for Delivery" status in BR-ORD-002** — AC-NFR-023 mentions it; status list is missing the transition state | Medium | BR, AC |
| W-12 | **Cart abandonment email content scope unclear** — SF-CRT-010 and FR-CRT-012 reference abandoned cart emails but do not define content/discount usage rights | Low | SRS, BR |
| W-13 | **Category and Product images bound together** — SF-CAT-010 (image gallery) is P0 but depends on SF-MED-001 which doesn't exist | High | SYSTEM_FEATURES |
| W-14 | **Customer-visible notes vs internal notes ambiguity** — US-ORD-006 says internal-only; US-FIN stories don't address; no FR covers visibility rules | Low | USER_STORIES |
| W-15 | **No SEO/social meta story for Marketing** — FR-PLT-005 and SF-PLT-005 require OG metadata but no Marketing story covers it | Low | USER_STORIES |

### 4.2 Document-Specific Weaknesses

#### 4.2.1 SRS.md

| ID | Weakness |
| --- | --- |
| W-SRS-01 | No FR for **VAT/tax calculation and display** — major compliance gap for Vietnamese market. |
| W-SRS-02 | No FR for **inventory reservation lifecycle** beyond the 15-min cart mention; release on cart expiry, restock on cancellation not specified. |
| W-SRS-03 | No FR for **promotion code case-insensitivity** even though BR-PRM-004 requires it. |
| W-SRS-04 | No FR for **voucher per-user usage cap** even though BR-PRM-003 enforces it. |
| W-SRS-05 | FR-CAT-009 says "related AND complementary" — these are two distinct concepts that should be split. |
| W-SRS-06 | FR-ID-005 mentions JWT but does not specify token lifetime or refresh strategy. |
| W-SRS-07 | No FR for **notification preference granularity** (per-event opt-in) — only generic "manage preferences". |
| W-SRS-08 | No FR for **search result ranking algorithm** — search is mentioned but ranking is undefined. |

#### 4.2.2 SYSTEM_FEATURES.md

| ID | Weakness |
| --- | --- |
| W-SF-01 | **SF-INV-001 and SF-INV-002 referenced but not defined** — Inventory module absent. |
| W-SF-02 | **SF-MED-001 referenced but not defined** — Media module absent. |
| W-SF-03 | **SF-PAY-001..004 referenced but not defined** — Payments module absent (only integrations described in SRS external interfaces). |
| W-SF-04 | **SF-X-002 (Low Stock Notifications)** priority P1 but no admin story directly covers it. |
| W-SF-05 | **SF-CAT-016 Recently Viewed** priority P2, no story for non-customer. |
| W-SF-06 | **Total 152 features** — too many for V1; needs reduction. |
| W-SF-07 | **SF-ADM-013 Feature Flag Management** lists priority P1 but depends on no flags (chicken-and-egg). |
| W-SF-08 | **SF-PLT-007 Media Management (Cloudinary)** is P0 but only AC-AC-046 exists. |
| W-SF-09 | **SF-ORD-009 Picklist Generation** is P1 but critical for fulfillment — recommended P0. |
| W-SF-10 | **SF-CAT-008 Related Products** P1 but no corresponding AC. |

#### 4.2.3 BUSINESS_RULES.md

| ID | Weakness |
| --- | --- |
| W-BR-01 | **No rule for guest checkout auto-account creation** — behavior gap. |
| W-BR-02 | **No rule for cancellation refund timing** — BR-ORD-003 covers eligibility but not refund SLA. |
| W-BR-03 | **No rule for inventory return restocking** — when does returned item become sellable? |
| W-BR-04 | **No AI chatbot rules** — review requested; absent since AI is V1.5+, but should explicitly state no AI in V1. |
| W-BR-05 | **No rule for free shipping eligibility on promotion items** — interaction gap. |
| W-BR-06 | **BR-ID-005 Refresh Token Rotation** good but does not specify rotation window or grace period. |
| W-BR-07 | **No rule for voucher codes on sale items** — common edge case. |
| W-BR-08 | **No rule for category reparenting impact on URLs** — SEO risk. |
| W-BR-09 | **No rule for stock level on backorder** — out-of-stock UX inconsistent with cart blocks. |
| W-BR-10 | **No rule for admin role bootstrap** — initial System Administrator creation flow undefined. |

#### 4.2.4 USER_STORIES.md

| ID | Weakness |
| --- | --- |
| W-US-01 | **INVEST violations:** US-CUST-005 (checkout completion, 8 points) likely too large; US-FIN-002 (5 points) is borderline. |
| W-US-02 | **US-CUST-017 (Request Return) is 5 points** — return flow is complex; should be split into "request return" and "track return". |
| W-US-03 | **US-CAT-001 (Create Product) is 8 points** — exceeds 1–2 week range; should be split. |
| W-US-04 | **US-ADM-001 (Manage Admin Users and Roles) is 8 points** — exceeds guideline; should be split. |
| W-US-05 | **Story Points scale says 13 = "epic-sized, must be split"** — but no story is marked 13; US-CAT-001 and US-CUST-005 are arguably epic-sized at 8. |
| W-US-06 | **No story for invoice PDF download by customer** — AC-AC-021 implies delivery but no user story covers. |
| W-US-07 | **No story for admin MFA enrollment** — critical security capability. |
| W-US-08 | **No story for payment failure → cart preservation** — UX gap. |
| W-US-09 | **Missing guest story for cookie consent dismissal** — only one cookie banner story exists. |
| W-US-10 | **No story for search no-results** — only happy path exists in US-GUEST-002. |

#### 4.2.5 ACCEPTANCE_CRITERIA.md

| ID | Weakness |
| --- | --- |
| W-AC-01 | **No scenarios for VAT/tax display on order** — major compliance gap. |
| W-AC-02 | **No scenarios for inventory reservation expiry** — critical operational scenario. |
| W-AC-03 | **No scenarios for order cancellation after partial shipment** — edge case. |
| W-AC-04 | **No scenarios for guest checkout → account creation** — behavior undefined. |
| W-AC-05 | **No scenarios for voucher case-insensitive lookup** — BR requires it. |
| W-AC-06 | **No scenarios for low-stock notification to admin** — SF-X-002 P1. |
| W-AC-07 | **No scenarios for admin MFA enrollment flow** — security gap. |
| W-AC-08 | **Coverage weak for refund partial amounts** — AC-AC-064 covers but does not enumerate edge cases (e.g., refund denied after approval). |
| W-AC-09 | **No scenarios for product scheduled publication** — BR-CAT-001 requires it. |
| W-AC-10 | **Cookie consent AC missing "reject non-essential" branch** — only "accept" tested. |

#### 4.2.6 GLOSSARY.md

| ID | Weakness |
| --- | --- |
| W-GL-01 | **No entry for "Module"** in alphabetical list (referenced but undefined). |
| W-GL-02 | **No entry for "Bounded Context"** even though RTM and governance use it. |
| W-GL-03 | **"Shopping Cart" duplicates "Cart"** — redundant cross-reference, should consolidate. |
| W-GL-04 | **"Coupon" listed but empty** — only says "See Voucher"; redundant. |
| W-GL-05 | **Missing "E-commerce"** definition. |
| W-GL-06 | **Missing "Marketplace"** although referenced extensively. |
| W-GL-07 | **Missing "VAT"** as a separate term (only mentioned in Tax entry). |

#### 4.2.7 ASSUMPTIONS.md

| ID | Weakness |
| --- | --- |
| W-AS-01 | **No assumption on customer support hours** — implied by SLA but not stated. |
| W-AS-02 | **No assumption on data export format** — BR-ID-009 requires JSON export. |
| W-AS-03 | **A-MKT-003 (500 SKUs sufficient)** is unrealistic for full Vietnam coverage — should be revised. |
| W-AS-04 | **No assumption on initial customer acquisition channels** — affects marketing features. |
| W-AS-05 | **No assumption on tech talent availability** — startup feasibility risk. |
| W-AS-06 | **Validation schedule for A-INT-001/002** ("Pre-Development") should specify exact SLA for vendor contracting. |

#### 4.2.8 REQUIREMENTS_TRACEABILITY_MATRIX.md

| ID | Weakness |
| --- | --- |
| W-RTM-01 | **RTM does not explicitly link to Business Rules** in the 5-layer chain — the document references BR but trace layer diagram omits it. |
| W-RTM-02 | **Features without dedicated stories** section is incomplete — references operational coverage but some entries are weak. |
| W-RTM-03 | **No back-trace from AC to Business Goal** for several critical ACs (e.g., AC-AC-066 only traces to BG-05/BG-08). |
| W-RTM-04 | **Inventory and Payment modules missing from RTM** — their absence creates traceability gaps. |
| W-RTM-05 | **Module dependency graph absent** — RTM should show which modules depend on which. |

---

## 5. Missing Requirements

| ID | Missing Requirement | Reason | Priority |
| --- | --- | --- | --- |
| MR-01 | **VAT computation and display** | Vietnamese tax compliance; required by BR-ORD-008 implicitly | Must Have |
| MR-02 | **Inventory module formalization** (low-stock, backorder, multi-warehouse-ready) | Referenced but not defined | Must Have |
| MR-03 | **Payment module formalization** | Referenced but not defined | Must Have |
| MR-04 | **Guest checkout → auto-account creation** | Behavior gap in checkout flow | Must Have |
| MR-05 | **Order status transition diagram** | Required for engineering implementation | Must Have |
| MR-06 | **Inventory restocking on return** | Operational rule missing | Must Have |
| MR-07 | **Refund SLA on cancellation** | Customer-facing commitment missing | Should Have |
| MR-08 | **Voucher on sale items rule** | Common edge case | Should Have |
| MR-09 | **Phone/email change verification** | Security baseline | Should Have |
| MR-10 | **Admin MFA enrollment flow** | Required for BR-ID-006 | Must Have |
| MR-11 | **Search result ranking rules** | Search quality undefined | Should Have |
| MR-12 | **Notification preference granularity** | Compliance (PDPD) | Should Have |
| MR-13 | **Invoice PDF download** | Customer-facing capability gap | Should Have |
| MR-14 | **Out-for-delivery order status** | Required by tracking flow | Should Have |
| MR-15 | **System Administrator bootstrap flow** | Operational requirement | Must Have |
| MR-16 | **Data export format (JSON) per BR-ID-009** | Compliance with PDPD | Must Have |
| MR-17 | **Customer support business hours** | Affects SLA feasibility | Should Have |
| MR-18 | **Email/phone double opt-in** | Marketing compliance | Could Have |

---

## 6. Duplicate Features

| ID | Duplicate | Resolution |
| --- | --- | --- |
| DUP-01 | **SF-CAT-005 (Product Detail Page)** and **SF-CAT-010 (Image Gallery)** overlap. Image gallery is a sub-feature of PDP. | Keep SF-CAT-005; demote SF-CAT-010 to a sub-specification under PDP, or merge. |
| DUP-02 | **SF-CRT-002 (View Cart)** and **SF-CRT-007 (Cart Subtotal and Totals)** overlap. Totals are part of viewing the cart. | Merge into SF-CRT-002. |
| DUP-03 | **SF-ORD-005 (Order History)** and **SF-ORD-006 (Order Detail View)** overlap. Detail is a sub-feature of history. | Keep both but note detail is a navigation from history. |
| DUP-04 | **SF-SHP-005 (Tracking Number)** and **SF-SHP-006 (Tracking Status Sync)** overlap (number assignment is part of sync). | Merge into SF-SHP-006. |
| DUP-05 | **SF-ADM-001 (Dashboard)** and **SF-ADM-012 (Operational Reports)** overlap. Reports are dashboard widgets. | Keep both but clarify reports can be inside or outside dashboard. |
| DUP-06 | **SF-PLT-007 (Media Management)** and **SF-MED-001 (not defined)** duplicate. | Define media module or remove SF-MED-001 references. |
| DUP-07 | **SF-X-001 (Inventory Reservation)** is a cross-cutting feature, not a system feature. | Keep but reclassify as infrastructure. |
| DUP-08 | **BR-PRM-005 (Stacking Rules)** and **BR-PRM-001 (Promotion Eligibility)** overlap (both cover eligibility). | Differentiate: BR-PRM-001 covers item eligibility, BR-PRM-005 covers promotion-to-promotion eligibility. |

---

## 7. Business Risks

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| BR-01 | VAT/compliance gap causes legal exposure | High | High | Add VAT/tax requirements before GA |
| BR-02 | Inventory/payment module gaps lead to engineering rework | High | High | Define modules in next BA revision |
| BR-03 | Guest checkout ambiguity causes UX confusion | Medium | Medium | Define auto-account behavior |
| BR-04 | Voucher edge cases (on-sale items, stacking) cause revenue leakage | Medium | High | Add explicit rules |
| BR-05 | Return restocking logic unclear leads to overselling | Medium | High | Add inventory return rule |
| BR-06 | 7-day return window may be too short for some product categories | Medium | Low | Document rationale and review quarterly |
| BR-07 | Refund SLA missing creates customer service ambiguity | Medium | Medium | Add BR for refund timing |
| BR-08 | Email/phone change without verification is a fraud vector | Medium | High | Add verification requirement |
| BR-09 | Admin MFA enrollment flow unclear could leave admins in inconsistent state | Low | High | Add story + AC for enrollment |
| BR-10 | Cookie consent banner without reject path violates PDPD | Medium | High | Update AC to include reject branch |

---

## 8. Technical Risks

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| TR-01 | Scope of 152 atomic features overwhelms a small team | High | High | Apply MoSCoW reduction (Section 13) |
| TR-02 | Modular monolith boundaries may leak under delivery pressure | Medium | Medium | Enforce `dependency-cruiser` in CI |
| TR-03 | Postgres full-text search may not deliver expected quality | Medium | Medium | Plan Algolia/Elasticsearch escape hatch in V1.x |
| TR-04 | Neon serverless Postgres may have cold-start latency | Medium | Medium | Add connection pooling; benchmark pre-GA |
| TR-05 | Vercel free-tier limits could constrain storefront bandwidth | Low | Medium | Monitor and plan upgrade |
| TR-06 | Cloudinary cost growth as catalog grows | Low | Low | Set cost alerts; optimize variants |
| TR-07 | Inventory reservation race conditions | Medium | High | Document atomic decrement and reconciliation |
| TR-08 | Voucher concurrency under flash sale load | Medium | High | Plan pessimistic locking or atomic counters |
| TR-09 | Webhook reliability across payment/shipping providers | High | High | Polling reconciliation as fallback |
| TR-10 | Idempotency keys not universally supported by payment providers | Medium | High | Plan server-side dedupe |

---

## 9. Startup Risks

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| SR-01 | **Delivery timeline slippage** due to scope | Very High | High | Cut to MVP per Section 13 |
| SR-02 | **Burn rate overrun** on cloud services | Medium | High | Set budget alerts at 70% / 90% |
| SR-03 | **Talent acquisition delay** for NestJS/React | Medium | Medium | Allow remote; consider contractors for specialized roles |
| SR-04 | **Payment provider onboarding delays** | Medium | High | Start vendor contracting immediately (A-INT-001) |
| SR-05 | **Customer acquisition cost > LTV** | High | High | Validate conversion in beta before scaling |
| SR-06 | **Support load underestimated** | High | Medium | Limit channels (email + ticket only); document macros |
| SR-07 | **Regulatory change** (VAT, e-invoice, PDPD) | Medium | High | Quarterly legal review; flexible compliance layer |
| SR-08 | **Catalog content production** (500 SKUs with quality images/specs) | High | High | Reduce MVP to 100 SKUs; staged catalog expansion |
| SR-09 | **Founder dependency on key decisions** | Medium | Medium | Document decision framework; empower Tech Lead |
| SR-10 | **Cash flow during long vendor payment settlement** | Medium | Medium | Plan working capital buffer |

---

## 10. Recommendations

### 10.1 Strategic Recommendations

| ID | Recommendation | Justification |
| --- | --- | --- |
| REC-S-01 | **Cut MVP to ≤ 60 atomic features** (per Section 13). | Reduces delivery timeline and validation load. |
| REC-S-02 | **Reduce SKU target to 100 for MVP.** | 500 SKUs is unrealistic for a startup launch; ramp post-GA. |
| REC-S-03 | **Defer cohort analytics, RFM, and multi-step checkout state recovery to V1.x.** | Over-engineered for MVP. |
| REC-S-04 | **Defer product comparison, recently viewed, BOGO, tiered discounts to V1.x.** | Nice-to-have, not launch-critical. |
| REC-S-05 | **Defer review photos and helpful votes to V1.x.** | Reduces moderation load. |
| REC-S-06 | **Make e-invoice integration a hard pre-GA requirement.** | Compliance risk. |
| REC-S-07 | **Establish VAT/tax module before checkout.** | Compliance. |
| REC-S-08 | **Limit admin MFA to TOTP only.** | Hardware keys, biometrics are V1.5+. |
| REC-S-09 | **Limit email notifications to transactional only in V1.** | Marketing emails in V1.x. |
| REC-S-10 | **Defer support ticket attachments to V1.x.** | Reduces scope. |

### 10.2 Documentation Recommendations

| ID | Recommendation |
| --- | --- |
| REC-D-01 | Add Inventory module features (SF-INV-001..005) with at least stock tracking, reservation, low-stock threshold. |
| REC-D-02 | Add Payments module features (SF-PAY-001..005) covering intent, capture, refund, webhook. |
| REC-D-03 | Add Media module features (SF-MED-001..003) covering upload, transformation, retrieval. |
| REC-D-04 | Add Order Status State Machine diagram (visual + tabular). |
| REC-D-05 | Add VAT Computation Requirement (FR-TAX-001..005) to SRS. |
| REC-D-06 | Update RTM to include Business Rules as an explicit layer. |
| REC-D-07 | Add story US-CUST-026 (Invoice PDF Download) and US-ADM-007 (MFA Enrollment). |
| REC-D-08 | Update cookie consent AC to include reject branch. |
| REC-D-09 | Consolidate duplicate features per Section 6. |
| REC-D-10 | Add Glossary entries: VAT, E-commerce, Marketplace, Bounded Context, Module. |

### 10.3 Process Recommendations

| ID | Recommendation |
| --- | --- |
| REC-P-01 | Re-baseline the RTM after MVP scope is finalized. |
| REC-P-02 | Conduct a pre-development validation sprint for A-INT-001, A-INT-002. |
| REC-P-03 | Engage Vietnamese tax advisor before GA to validate VAT rules. |
| REC-P-04 | Engage legal advisor for PDPD compliance review. |
| REC-P-05 | Establish weekly scope review during MVP build. |
| REC-P-06 | Define "must-have acceptance gate" before beta launch. |

---

## 11. Required Changes (Must Apply Before MVP Build)

These changes **must be applied** to the BA documents before engineering starts the MVP build.

| ID | Change | Document | Priority |
| --- | --- | --- | --- |
| RC-01 | Add **Inventory module** with at least SF-INV-001..005 | SYSTEM_FEATURES.md | Critical |
| RC-02 | Add **Payments module** with at least SF-PAY-001..005 | SYSTEM_FEATURES.md | Critical |
| RC-03 | Add **Media module** with at least SF-MED-001..003 | SYSTEM_FEATURES.md | Critical |
| RC-04 | Add **VAT/Tax FR-TAX-001..005** requirements | SRS.md | Critical |
| RC-05 | Add **Guest checkout account-creation rule** | BUSINESS_RULES.md | Critical |
| RC-06 | Add **Inventory return restocking rule** | BUSINESS_RULES.md | Critical |
| RC-07 | Add **Order Status State Machine diagram** | BUSINESS_RULES.md or new appendix | Critical |
| RC-08 | Add **Admin MFA enrollment story + AC** | USER_STORIES.md, ACCEPTANCE_CRITERIA.md | Critical |
| RC-09 | Add **Inventory reservation expiry AC** | ACCEPTANCE_CRITERIA.md | Critical |
| RC-10 | Add **VAT display AC** | ACCEPTANCE_CRITERIA.md | Critical |
| RC-11 | Update **Cookie consent AC** with reject branch | ACCEPTANCE_CRITERIA.md | Critical |
| RC-12 | Apply **MoSCoW** prioritization and reduce MVP scope | SYSTEM_FEATURES.md, USER_STORIES.md | Critical |
| RC-13 | Update **RTM** to include Inventory and Payments modules | REQUIREMENTS_TRACEABILITY_MATRIX.md | Critical |
| RC-14 | Add **Glossary entries**: VAT, Marketplace, E-commerce, Bounded Context | GLOSSARY.md | High |
| RC-15 | Update **ASSUMPTIONS.md** with support hours, data export format, talent availability | ASSUMPTIONS.md | High |

---

## 12. Optional Improvements (Apply If Time Permits)

| ID | Improvement | Benefit |
| --- | --- | --- |
| OI-01 | Split US-CAT-001 (8 points) into "Create Product Core" + "Add Variants" | Better estimation |
| OI-02 | Split US-CUST-005 (8 points) into checkout sub-stories | Better estimation |
| OI-03 | Split US-CUST-017 (5 points) into "request" + "track" | Better estimation |
| OI-04 | Add AC for voucher case-insensitivity | Test coverage |
| OI-05 | Add AC for scheduled product publication | BR coverage |
| OI-06 | Add AC for low-stock admin notification | Coverage |
| OI-07 | Add story for invoice PDF download | UX completeness |
| OI-08 | Add story for guest checkout → account creation | UX completeness |
| OI-09 | Consolidate duplicate features per Section 6 | Document quality |
| OI-10 | Add module dependency diagram to RTM | Architecture clarity |
| OI-11 | Add AI chatbot explicit exclusion note in BUSINESS_RULES | Clarity |
| OI-12 | Add BOGO/tiered discount ACs only if features remain in MVP | Coverage |

---

## 13. MVP Scope (MoSCoW Prioritization)

### 13.1 Method

Applied **MoSCoW** prioritization to all 152 atomic features. The objective is to define a **launchable, fundable, sustainable** MVP for a Vietnamese startup.

| Priority | Definition |
| --- | --- |
| **M — Must Have** | Cannot ship without. Revenue-blocking or compliance-blocking. |
| **S — Should Have** | Important but workable alternatives exist for V1. |
| **C — Could Have** | Delighters; ship if time permits. |
| **W — Won't Have (Current Release)** | Deferred to V1.x, V1.5+, or V2. |

### 13.2 Module-Level MoSCoW Distribution

| Module | Must | Should | Could | Won't (V1) | Total |
| --- | --- | --- | --- | --- | --- |
| Catalog | 10 | 1 | 2 | 3 | 16 |
| Cart | 6 | 1 | 1 | 2 | 10 |
| Checkout | 8 | 1 | 1 | 2 | 12 |
| Order | 8 | 2 | 1 | 2 | 13 |
| Shipping | 7 | 2 | 1 | 1 | 11 |
| Identity | 10 | 1 | 1 | 2 | 14 |
| Reviews | 4 | 1 | 2 | 1 | 8 |
| Promotions | 4 | 2 | 2 | 2 | 10 |
| Returns | 5 | 2 | 1 | 0 | 8 |
| Notifications | 3 | 2 | 1 | 0 | 6 |
| Support | 2 | 2 | 1 | 2 | 7 |
| Admin | 7 | 4 | 1 | 1 | 13 |
| Analytics | 2 | 2 | 1 | 2 | 7 |
| Localization | 5 | 0 | 0 | 0 | 5 |
| Platform | 5 | 1 | 1 | 2 | 9 |
| Inventory (NEW) | 4 | 1 | 0 | 0 | 5 |
| Payments (NEW) | 4 | 1 | 0 | 0 | 5 |
| Media (NEW) | 2 | 1 | 0 | 0 | 3 |
| Cross-cutting | 1 | 1 | 0 | 1 | 3 |
| **TOTAL** | **97** | **28** | **17** | **23** | **165** |

> Note: The "total" exceeds 152 because three new modules (Inventory, Payments, Media) are added as required corrections. Net effect on MVP after Won't-Have exclusion: **142 features** in scope, of which **97 Must** + **28 Should** = **125 features for V1.0**.

### 13.3 Won't-Have Features (Deferred from V1)

The following features should be **explicitly deferred** to V1.x or later to keep MVP achievable.

| Feature | Reason for Deferral | Defer To |
| --- | --- | --- |
| SF-CAT-008 Related Products | Cross-sell not critical for first launch | V1.x |
| SF-CAT-009 Product Comparison | Considered purchasing; not yet demonstrated need | V1.x |
| SF-CAT-011 Product Video | Asset production burden | V1.x |
| SF-CAT-016 Recently Viewed | Nice-to-have | V1.x |
| SF-CRT-008 Wishlist | Engagement; not core commerce | V1.x |
| SF-CRT-009 Move Wishlist to Cart | Depends on wishlist | V1.x |
| SF-CRT-010 Abandoned Cart Email | Marketing optimization | V1.x |
| SF-CHK-012 Checkout State Recovery | Reduces friction but adds complexity | V1.x |
| SF-ORD-010 Partial Shipment | Operational complexity | V1.x |
| SF-ORD-012 Duplicate Order Detection | Manual review acceptable initially | V1.x |
| SF-ID-014 Account Deletion Request | PDPD-mandated but low initial volume | V1.x (must be added before beta) |
| SF-RVW-007 Helpful Votes | Engagement; not core | V1.x |
| SF-RVW-003 Photo Reviews | Moderation load | V1.x |
| SF-PRM-003 BOGO | Marketing complexity | V1.x |
| SF-PRM-004 Tiered Discount | Marketing complexity | V1.x |
| SF-NOT-003 Admin Template Management | Templates hardcoded initially | V1.x |
| SF-SUP-002 Ticket Attachments | Reduces complexity | V1.x |
| SF-SUP-004 Internal Notes | Reduces complexity | V1.x |
| SF-ADM-013 Feature Flag Management | Flags used but admin UI deferred | V1.x |
| SF-ANL-004 Customer Cohort Reports | Advanced analytics | V1.x |
| SF-PLT-006 Feature Flag Admin | Couples with SF-ADM-013 | V1.x |
| SF-PLT-008 Cookie Consent Banner | Required; not deferred — keep as Must |
| SF-I18-002..004 Date/Number/Currency | Implicit; bundle into SF-I18-001 |

### 13.4 Recommended MVP (Must + Should) — Summary

| Category | Count | Notes |
| --- | --- | --- |
| Must Have | 97 | Includes added Inventory, Payments, Media modules |
| Should Have | 28 | Including recommended P0 promotions and admin features |
| **Total MVP** | **125** | Realistic for a 6–8 month MVP build by a small team |

This represents a **~17% reduction** from the original 152-feature scope and brings the project closer to a startup-feasible delivery plan.

---

## 14. Future Scope

| Version | Scope Highlights |
| --- | --- |
| **V1.x (post-GA, within 6 months)** | Wishlist, abandoned cart, BOGO, tiered discounts, cohort analytics, feature flag admin UI, account deletion flow, MFA enrollment UX improvements, recently viewed, related products, admin template management, support ticket attachments and notes, partial shipments, duplicate detection. |
| **V1.5 (mid-2027)** | Mobile PWA enhancements, AI Sales Assistant (read-only), AI Customer Support (triage), multi-language scaffold, advanced search (Algolia or similar). |
| **V2 (2028)** | Marketplace (multi-seller), seller onboarding, commissions, payouts, dispute resolution, mobile native apps, loyalty program, advanced promotions engine, live chat. |
| **V3 (future)** | International shipping, AR/VR product preview, social commerce, multi-currency. |

---

## 15. Final Decision

### Decision: **PASS WITH CHANGES**

The Business Analysis corpus is **structurally sound, internally consistent in most areas, and demonstrates enterprise-grade discipline**. It successfully traces business goals through requirements, features, stories, and acceptance criteria.

However, the corpus has the following issues that must be addressed before MVP engineering begins:

1. **Critical missing modules** (Inventory, Payments, Media) referenced but not defined.
2. **Compliance gap** (VAT/tax) unaddressed in functional requirements.
3. **Scope overload** (152 features) for a startup team.
4. **Behavioral ambiguity** in guest checkout, voucher edge cases, refund SLAs.
5. **Traceability gaps** for new modules and several AC scenarios.

The 15 Required Changes in Section 11 are **non-negotiable**. After they are applied, the documents will be production-ready and engineering may begin.

The Optional Improvements in Section 12 should be applied as capacity allows during the MVP build, but do not block launch.

### Decision Justification

| Criterion | Result |
| --- | --- |
| IEEE 830 conformance | Pass |
| Internal consistency | Mostly pass (3 corrections needed) |
| Completeness | Mostly pass (5 missing requirements are critical) |
| Traceability | Pass (with corrections) |
| Startup feasibility | **Fail** at current scope → Must reduce |
| Implementation feasibility | Pass after MVP scope reduction |
| Governance alignment | Pass |
| Compliance coverage | **Fail** (VAT gap) |

### Sign-Off Conditions

The Architecture Review Board approves the BA corpus on the condition that:

1. **All 15 Required Changes** (Section 11) are applied before MVP engineering begins.
2. **MoSCoW prioritization** (Section 13) is applied to define MVP scope.
3. **VAT/tax requirements** are added before any checkout implementation.
4. **Inventory, Payments, Media modules** are documented in the next BA revision (within 1 sprint).
5. **Re-review** of the corpus occurs after corrections are applied.

### Reviewer Statement

> *"This is a high-quality BA corpus for a Vietnamese e-commerce startup. The strength is in traceability and rule formalization. The risk is in scope. Apply the required corrections, reduce MVP to the Must+Should scope, and SmartLight is ready to build."*
>
> — Architecture Review Board, 2026-07-02

---

## 16. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 0.1 | 2026-07-02 | Architecture Review Board | Initial review report |

---

**End of Document — REVIEW_REPORT.md**
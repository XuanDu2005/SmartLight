# SmartLight — Requirements Traceability Matrix (RTM)

| Field | Value |
| --- | --- |
| **Document ID** | `BA-RTM-001` |
| **Document Owner** | Principal Business Analyst |
| **Status** | Draft — v0.1 |
| **Created Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2026-08-01 |
| **Classification** | Business Analysis — Authoritative |
| **Audience** | Engineering, Product, QA, Stakeholders, AI Agents |

> **Source of Truth:** This RTM traces from `PROJECT_BLUEPRINT.md` business goals through SRS requirements, system features, user stories, and acceptance criteria. It also links to business rules for full coverage.

---

## 1. Purpose

The Requirements Traceability Matrix (RTM) provides **end-to-end traceability** for SmartLight requirements. It enables:

1. **Coverage verification:** every business goal maps to at least one requirement, feature, story, and acceptance criterion.
2. **Impact analysis:** changes to a requirement can be traced forward and backward.
3. **Test planning:** QA can derive test cases directly from acceptance criteria.
4. **Audit readiness:** demonstrates that no requirement is implemented without acceptance criteria.
5. **AI agent context:** enables AI to reason about full coverage.

---

## 2. Trace Layers

The RTM has five layers:

```
Layer 1 — Business Goal          (PROJECT_BLUEPRINT.md)
   ↓
Layer 2 — Business Requirement   (SRS.md)
   ↓
Layer 3 — System Feature         (SYSTEM_FEATURES.md)
   ↓
Layer 4 — User Story             (USER_STORIES.md)
   ↓
Layer 5 — Acceptance Criteria    (ACCEPTANCE_CRITERIA.md)
```

Plus a parallel linkage to **business rules** (BUSINESS_RULES.md).

---

## 3. ID Conventions

| Layer | Pattern | Example |
| --- | --- | --- |
| Business Goal | `BG-XX` | `BG-01` |
| Business Requirement | `BR-XXX-NNN` | `BR-CAT-001` |
| System Feature | `SF-XXX-NNN` | `SF-CAT-001` |
| User Story | `US-XXXX-NNN` | `US-GUEST-001` |
| Acceptance Criteria | `AC-AC-NNN` | `AC-AC-001` |
| Business Rule | `BR-X-NNN` (in BUSINESS_RULES.md) | `BR-CAT-001` |

---

## 4. Layer 1 — Business Goals (from PROJECT_BLUEPRINT.md)

| ID | Business Goal | Source |
| --- | --- | --- |
| BG-01 | Launch a production-ready storefront | PROJECT_BLUEPRINT.md §2.3 |
| BG-02 | Establish reliable order fulfillment | PROJECT_BLUEPRINT.md §2.3 |
| BG-03 | Build a scalable data foundation | PROJECT_BLUEPRINT.md §2.3 |
| BG-04 | Deliver operational dashboards | PROJECT_BLUEPRINT.md §2.3 |
| BG-05 | Establish engineering governance | PROJECT_BLUEPRINT.md §2.3 |
| BG-06 | Lay foundation for AI capabilities | PROJECT_BLUEPRINT.md §2.3 |
| BG-07 | Achieve business KPIs (AOV, conversion, NPS) | PROJECT_BLUEPRINT.md §12 |
| BG-08 | Comply with Vietnamese regulations | PROJECT_BLUEPRINT.md §9 |

---

## 5. Layer 2 — Business Requirements (from SRS.md)

Each business requirement is linked to one or more business goals.

### 5.1 Catalog Requirements

| Req ID | Requirement | Goal IDs |
| --- | --- | --- |
| BR-CAT-001 | Product listing display | BG-01, BG-07 |
| BR-CAT-002 | Nested categories up to 3 levels | BG-01 |
| BR-CAT-003 | Product search | BG-01, BG-07 |
| BR-CAT-004 | Product filtering | BG-01, BG-07 |
| BR-CAT-005 | Product detail page | BG-01, BG-07 |
| BR-CAT-006 | Product variants | BG-01 |
| BR-CAT-007 | Stock status display | BG-01, BG-07 |
| BR-CAT-008 | Related products | BG-07 |
| BR-CAT-009 | Product comparison | BG-07 |
| BR-CAT-010 | Image gallery | BG-01 |
| BR-CAT-011 | Product video | BG-01 |
| BR-CAT-012 | Technical specs | BG-01, BG-07 |
| BR-CAT-013 | Warranty display | BG-01, BG-08 |
| BR-CAT-014 | SEO URLs | BG-01 |
| BR-CAT-015 | JSON-LD structured data | BG-01 |
| BR-CAT-016 | Recently viewed | BG-07 |

### 5.2 Cart Requirements

| Req ID | Requirement | Goal IDs |
| --- | --- | --- |
| BR-CRT-001 | Add to cart (guest) | BG-01, BG-07 |
| BR-CRT-002 | Guest cart persistence | BG-01, BG-07 |
| BR-CRT-003 | Cart merge on login | BG-07 |
| BR-CRT-004 | Update cart line | BG-01 |
| BR-CRT-005 | Remove from cart | BG-01 |
| BR-CRT-006 | Cart totals | BG-07 |
| BR-CRT-007 | Stock reservation (15 min) | BG-02 |
| BR-CRT-008 | Wishlist | BG-07 |
| BR-CRT-009 | Move wishlist to cart | BG-07 |
| BR-CRT-010 | Abandoned cart email | BG-07 |

### 5.3 Checkout Requirements

| Req ID | Requirement | Goal IDs |
| --- | --- | --- |
| BR-CHK-001 | Multi-step checkout | BG-01, BG-07 |
| BR-CHK-002 | Guest checkout | BG-01, BG-07 |
| BR-CHK-003 | Address management | BG-02 |
| BR-CHK-004 | Phone validation | BG-02 |
| BR-CHK-005 | Shipping method selection | BG-01 |
| BR-CHK-006 | Payment method selection | BG-01, BG-08 |
| BR-CHK-007 | Order review | BG-01 |
| BR-CHK-008 | Payment redirect | BG-01, BG-08 |
| BR-CHK-009 | Webhook handling | BG-02 |
| BR-CHK-010 | Double-submit prevention | BG-02 |
| BR-CHK-011 | Order confirmation | BG-07 |
| BR-CHK-012 | Checkout state recovery | BG-07 |

### 5.4 Order Requirements

| Req ID | Requirement | Goal IDs |
| --- | --- | --- |
| BR-ORD-001 | Order creation | BG-02 |
| BR-ORD-002 | Order number format | BG-02 |
| BR-ORD-003 | Lifecycle management | BG-02 |
| BR-ORD-004 | Status history | BG-02, BG-04 |
| BR-ORD-005 | Customer order history | BG-07 |
| BR-ORD-006 | Order detail view | BG-07 |
| BR-ORD-007 | Admin status update | BG-02 |
| BR-ORD-008 | PDF invoice | BG-08 |
| BR-ORD-009 | Picklist | BG-02 |
| BR-ORD-010 | Partial shipment | BG-02 |
| BR-ORD-011 | Order cancellation | BG-07 |
| BR-ORD-012 | Duplicate detection | BG-02 |
| BR-ORD-013 | Internal notes | BG-02 |

### 5.5 Shipping Requirements

| Req ID | Requirement | Goal IDs |
| --- | --- | --- |
| BR-SHP-001 | Fee calculation | BG-02 |
| BR-SHP-002 | Carrier integration | BG-02 |
| BR-SHP-003 | Shipment creation | BG-02 |
| BR-SHP-004 | Label generation | BG-02 |
| BR-SHP-005 | Tracking number | BG-02, BG-07 |
| BR-SHP-006 | Tracking sync | BG-02, BG-07 |
| BR-SHP-007 | Customer tracking view | BG-07 |
| BR-SHP-008 | ETA display | BG-07 |
| BR-SHP-009 | Delivery confirmation | BG-02 |
| BR-SHP-010 | Shipping zones | BG-02 |
| BR-SHP-011 | Free shipping threshold | BG-07 |

### 5.6 Identity Requirements

| Req ID | Requirement | Goal IDs |
| --- | --- | --- |
| BR-ID-001 | Registration | BG-01 |
| BR-ID-002 | Password complexity | BG-08 |
| BR-ID-003 | Email verification | BG-08 |
| BR-ID-004 | Login | BG-01 |
| BR-ID-005 | Token-based session | BG-08 |
| BR-ID-006 | Password reset | BG-07 |
| BR-ID-007 | Profile management | BG-07 |
| BR-ID-008 | Address book | BG-07 |
| BR-ID-009 | Change password | BG-08 |
| BR-ID-010 | Logout | BG-08 |
| BR-ID-011 | Admin MFA | BG-08 |
| BR-ID-012 | RBAC | BG-08 |
| BR-ID-013 | Account lockout | BG-08 |
| BR-ID-014 | Account deletion | BG-08 |

### 5.7 Review Requirements

| Req ID | Requirement | Goal IDs |
| --- | --- | --- |
| BR-RVW-001 | Submit review | BG-07 |
| BR-RVW-002 | Star rating | BG-07 |
| BR-RVW-003 | Photo reviews | BG-07 |
| BR-RVW-004 | Moderation | BG-07, BG-08 |
| BR-RVW-005 | Aggregated rating | BG-07 |
| BR-RVW-006 | Sorting/filtering | BG-07 |
| BR-RVW-007 | Helpful votes | BG-07 |
| BR-RVW-008 | Admin response | BG-07 |

### 5.8 Promotion Requirements

| Req ID | Requirement | Goal IDs |
| --- | --- | --- |
| BR-PRM-001 | Percentage discount | BG-07 |
| BR-PRM-002 | Fixed discount | BG-07 |
| BR-PRM-003 | BOGO | BG-07 |
| BR-PRM-004 | Tiered discount | BG-07 |
| BR-PRM-005 | Voucher codes | BG-07 |
| BR-PRM-006 | Flash sale | BG-07 |
| BR-PRM-007 | Scheduling | BG-07 |
| BR-PRM-008 | Usage limits | BG-07 |
| BR-PRM-009 | Eligibility rules | BG-07 |
| BR-PRM-010 | Price display | BG-07 |

### 5.9 Returns Requirements

| Req ID | Requirement | Goal IDs |
| --- | --- | --- |
| BR-RTN-001 | Return request | BG-07, BG-08 |
| BR-RTN-002 | Return reasons | BG-07 |
| BR-RTN-003 | RMA generation | BG-02 |
| BR-RTN-004 | Approval/rejection | BG-07 |
| BR-RTN-005 | Return tracking | BG-07 |
| BR-RTN-006 | Refund processing | BG-08 |
| BR-RTN-007 | Warranty claims | BG-08 |
| BR-RTN-008 | Warranty tracking | BG-08 |

### 5.10 Notifications Requirements

| Req ID | Requirement | Goal IDs |
| --- | --- | --- |
| BR-NOT-001 | Transactional email | BG-02, BG-07 |
| BR-NOT-002 | Vietnamese templates | BG-01 |
| BR-NOT-003 | Admin template management | BG-02 |
| BR-NOT-004 | Email retry | BG-02 |
| BR-NOT-005 | Notification preferences | BG-08 |
| BR-NOT-006 | Marketing opt-in | BG-08 |

### 5.11 Support Requirements

| Req ID | Requirement | Goal IDs |
| --- | --- | --- |
| BR-SUP-001 | Submit ticket | BG-07 |
| BR-SUP-002 | Attachments | BG-07 |
| BR-SUP-003 | Agent view | BG-07 |
| BR-SUP-004 | Internal notes | BG-07 |
| BR-SUP-005 | Ticket-order linking | BG-07 |
| BR-SUP-006 | Status tracking | BG-07 |
| BR-SUP-007 | First response tracking | BG-07 |

### 5.12 Admin Requirements

| Req ID | Requirement | Goal IDs |
| --- | --- | --- |
| BR-ADM-001 | Dashboard | BG-04 |
| BR-ADM-002 | Product management | BG-02 |
| BR-ADM-003 | Order management | BG-02 |
| BR-ADM-004 | Customer management | BG-02 |
| BR-ADM-005 | Promotion management | BG-07 |
| BR-ADM-006 | Returns/refunds management | BG-02 |
| BR-ADM-007 | Reviews moderation | BG-08 |
| BR-ADM-008 | Ticket management | BG-07 |
| BR-ADM-009 | Admin user management | BG-08 |
| BR-ADM-010 | Audit log | BG-08 |
| BR-ADM-011 | Content management | BG-01 |
| BR-ADM-012 | Operational reports | BG-04 |
| BR-ADM-013 | Feature flags | BG-05 |

### 5.13 Analytics Requirements

| Req ID | Requirement | Goal IDs |
| --- | --- | --- |
| BR-ANL-001 | Event tracking | BG-04 |
| BR-ANL-002 | Sales reports | BG-04, BG-07 |
| BR-ANL-003 | Product reports | BG-04 |
| BR-ANL-004 | Cohort reports | BG-04 |
| BR-ANL-005 | Inventory reports | BG-04 |
| BR-ANL-006 | CSV export | BG-04 |
| BR-ANL-007 | Funnel analysis | BG-04, BG-07 |

### 5.14 Localization Requirements

| Req ID | Requirement | Goal IDs |
| --- | --- | --- |
| BR-I18-001 | Vietnamese UI | BG-01 |
| BR-I18-002 | Date formatting | BG-01 |
| BR-I18-003 | Number formatting | BG-01 |
| BR-I18-004 | VND currency display | BG-01 |
| BR-I18-005 | Locale-ready architecture | BG-06 |

### 5.15 Platform Requirements

| Req ID | Requirement | Goal IDs |
| --- | --- | --- |
| BR-PLT-001 | Health endpoint | BG-05 |
| BR-PLT-002 | Version endpoint | BG-05 |
| BR-PLT-003 | Sitemap | BG-01 |
| BR-PLT-004 | Robots.txt | BG-01 |
| BR-PLT-005 | Open Graph | BG-01 |
| BR-PLT-006 | Feature flags | BG-05 |
| BR-PLT-007 | Media management | BG-03 |
| BR-PLT-008 | Cookie consent | BG-08 |
| BR-PLT-009 | Static pages | BG-01, BG-08 |

---

## 6. Layer 3 — System Features (from SYSTEM_FEATURES.md)

Mapping requirement → feature(s).

### 6.1 Catalog Features

| Requirement | Feature(s) |
| --- | --- |
| BR-CAT-001 | SF-CAT-001 |
| BR-CAT-002 | SF-CAT-002 |
| BR-CAT-003 | SF-CAT-003 |
| BR-CAT-004 | SF-CAT-004 |
| BR-CAT-005 | SF-CAT-005, SF-CAT-010, SF-CAT-012, SF-CAT-013 |
| BR-CAT-006 | SF-CAT-006 |
| BR-CAT-007 | SF-CAT-007 |
| BR-CAT-008 | SF-CAT-008 |
| BR-CAT-009 | SF-CAT-009 |
| BR-CAT-010 | SF-CAT-010 |
| BR-CAT-011 | SF-CAT-011 |
| BR-CAT-012 | SF-CAT-012 |
| BR-CAT-013 | SF-CAT-013 |
| BR-CAT-014 | SF-CAT-014 |
| BR-CAT-015 | SF-CAT-015 |
| BR-CAT-016 | SF-CAT-016 |

### 6.2 Cart Features

| Requirement | Feature(s) |
| --- | --- |
| BR-CRT-001 | SF-CRT-001 |
| BR-CRT-002 | SF-CRT-005, SF-CRT-002 |
| BR-CRT-003 | SF-CRT-006 |
| BR-CRT-004 | SF-CRT-003 |
| BR-CRT-005 | SF-CRT-004 |
| BR-CRT-006 | SF-CRT-007, SF-PRM-010 |
| BR-CRT-007 | SF-X-001 |
| BR-CRT-008 | SF-CRT-008 |
| BR-CRT-009 | SF-CRT-009 |
| BR-CRT-010 | SF-CRT-010 |

### 6.3 Checkout Features

| Requirement | Feature(s) |
| --- | --- |
| BR-CHK-001 | SF-CHK-001 |
| BR-CHK-002 | SF-CHK-002 |
| BR-CHK-003 | SF-CHK-003 |
| BR-CHK-004 | SF-CHK-004 |
| BR-CHK-005 | SF-CHK-005, SF-SHP-001 |
| BR-CHK-006 | SF-CHK-006 |
| BR-CHK-007 | SF-CHK-007 |
| BR-CHK-008 | SF-CHK-008 |
| BR-CHK-009 | SF-CHK-009 |
| BR-CHK-010 | SF-CHK-010 |
| BR-CHK-011 | SF-CHK-011 |
| BR-CHK-012 | SF-CHK-012 |

### 6.4 Order Features

| Requirement | Feature(s) |
| --- | --- |
| BR-ORD-001 | SF-ORD-001 |
| BR-ORD-002 | SF-ORD-002 |
| BR-ORD-003 | SF-ORD-003 |
| BR-ORD-004 | SF-ORD-004 |
| BR-ORD-005 | SF-ORD-005 |
| BR-ORD-006 | SF-ORD-006 |
| BR-ORD-007 | SF-ORD-007 |
| BR-ORD-008 | SF-ORD-008 |
| BR-ORD-009 | SF-ORD-009 |
| BR-ORD-010 | SF-ORD-010 |
| BR-ORD-011 | SF-ORD-011 |
| BR-ORD-012 | SF-ORD-012 |
| BR-ORD-013 | SF-ORD-013 |

### 6.5 Shipping Features

| Requirement | Feature(s) |
| --- | --- |
| BR-SHP-001 | SF-SHP-001 |
| BR-SHP-002 | SF-SHP-002 |
| BR-SHP-003 | SF-SHP-003 |
| BR-SHP-004 | SF-SHP-004 |
| BR-SHP-005 | SF-SHP-005 |
| BR-SHP-006 | SF-SHP-006 |
| BR-SHP-007 | SF-SHP-007 |
| BR-SHP-008 | SF-SHP-008 |
| BR-SHP-009 | SF-SHP-009 |
| BR-SHP-010 | SF-SHP-010 |
| BR-SHP-011 | SF-SHP-011 |

### 6.6 Identity Features

| Requirement | Feature(s) |
| --- | --- |
| BR-ID-001 | SF-ID-001 |
| BR-ID-002 | SF-ID-001, SF-ID-009 |
| BR-ID-003 | SF-ID-003 |
| BR-ID-004 | SF-ID-004 |
| BR-ID-005 | SF-ID-005 |
| BR-ID-006 | SF-ID-006 |
| BR-ID-007 | SF-ID-007 |
| BR-ID-008 | SF-ID-008 |
| BR-ID-009 | SF-ID-009 |
| BR-ID-010 | SF-ID-010 |
| BR-ID-011 | SF-ID-011 |
| BR-ID-012 | SF-ID-012 |
| BR-ID-013 | SF-ID-013 |
| BR-ID-014 | SF-ID-014 |

### 6.7 Reviews Features

| Requirement | Feature(s) |
| --- | --- |
| BR-RVW-001 | SF-RVW-001 |
| BR-RVW-002 | SF-RVW-002 |
| BR-RVW-003 | SF-RVW-003 |
| BR-RVW-004 | SF-RVW-004 |
| BR-RVW-005 | SF-RVW-005 |
| BR-RVW-006 | SF-RVW-006 |
| BR-RVW-007 | SF-RVW-007 |
| BR-RVW-008 | SF-RVW-008 |

### 6.8 Promotion Features

| Requirement | Feature(s) |
| --- | --- |
| BR-PRM-001 | SF-PRM-001 |
| BR-PRM-002 | SF-PRM-002 |
| BR-PRM-003 | SF-PRM-003 |
| BR-PRM-004 | SF-PRM-004 |
| BR-PRM-005 | SF-PRM-005 |
| BR-PRM-006 | SF-PRM-006 |
| BR-PRM-007 | SF-PRM-007 |
| BR-PRM-008 | SF-PRM-008 |
| BR-PRM-009 | SF-PRM-009 |
| BR-PRM-010 | SF-PRM-010 |

### 6.9 Returns Features

| Requirement | Feature(s) |
| --- | --- |
| BR-RTN-001 | SF-RTN-001 |
| BR-RTN-002 | SF-RTN-002 |
| BR-RTN-003 | SF-RTN-003 |
| BR-RTN-004 | SF-RTN-004 |
| BR-RTN-005 | SF-RTN-005 |
| BR-RTN-006 | SF-RTN-006 |
| BR-RTN-007 | SF-RTN-007 |
| BR-RTN-008 | SF-RTN-008 |

### 6.10 Notifications Features

| Requirement | Feature(s) |
| --- | --- |
| BR-NOT-001 | SF-NOT-001 |
| BR-NOT-002 | SF-NOT-002 |
| BR-NOT-003 | SF-NOT-003 |
| BR-NOT-004 | SF-NOT-004 |
| BR-NOT-005 | SF-NOT-005 |
| BR-NOT-006 | SF-NOT-006 |

### 6.11 Support Features

| Requirement | Feature(s) |
| --- | --- |
| BR-SUP-001 | SF-SUP-001 |
| BR-SUP-002 | SF-SUP-002 |
| BR-SUP-003 | SF-SUP-003 |
| BR-SUP-004 | SF-SUP-004 |
| BR-SUP-005 | SF-SUP-005 |
| BR-SUP-006 | SF-SUP-006 |
| BR-SUP-007 | SF-SUP-007 |

### 6.12 Admin Features

| Requirement | Feature(s) |
| --- | --- |
| BR-ADM-001 | SF-ADM-001 |
| BR-ADM-002 | SF-ADM-002 |
| BR-ADM-003 | SF-ADM-003 |
| BR-ADM-004 | SF-ADM-004 |
| BR-ADM-005 | SF-ADM-005 |
| BR-ADM-006 | SF-ADM-006 |
| BR-ADM-007 | SF-ADM-007 |
| BR-ADM-008 | SF-ADM-008 |
| BR-ADM-009 | SF-ADM-009 |
| BR-ADM-010 | SF-ADM-010 |
| BR-ADM-011 | SF-ADM-011 |
| BR-ADM-012 | SF-ADM-012 |
| BR-ADM-013 | SF-ADM-013 |

### 6.13 Analytics Features

| Requirement | Feature(s) |
| --- | --- |
| BR-ANL-001 | SF-ANL-001 |
| BR-ANL-002 | SF-ANL-002 |
| BR-ANL-003 | SF-ANL-003 |
| BR-ANL-004 | SF-ANL-004 |
| BR-ANL-005 | SF-ANL-005 |
| BR-ANL-006 | SF-ANL-006 |
| BR-ANL-007 | SF-ANL-007 |

### 6.14 Localization Features

| Requirement | Feature(s) |
| --- | --- |
| BR-I18-001 | SF-I18-001 |
| BR-I18-002 | SF-I18-002 |
| BR-I18-003 | SF-I18-003 |
| BR-I18-004 | SF-I18-004 |
| BR-I18-005 | SF-I18-005 |

### 6.15 Platform Features

| Requirement | Feature(s) |
| --- | --- |
| BR-PLT-001 | SF-PLT-001 |
| BR-PLT-002 | SF-PLT-002 |
| BR-PLT-003 | SF-PLT-003 |
| BR-PLT-004 | SF-PLT-004 |
| BR-PLT-005 | SF-PLT-005 |
| BR-PLT-006 | SF-PLT-006, SF-ADM-013 |
| BR-PLT-007 | SF-PLT-007 |
| BR-PLT-008 | SF-PLT-008 |
| BR-PLT-009 | SF-PLT-009 |

---

## 7. Layer 4 — User Stories (from USER_STORIES.md)

Mapping feature → story. Some stories span multiple features; some features are supported by multiple stories.

### 7.1 Guest Stories

| Story | Features Covered |
| --- | --- |
| US-GUEST-001 | SF-CAT-001, SF-CAT-002 |
| US-GUEST-002 | SF-CAT-003 |
| US-GUEST-003 | SF-CAT-004 |
| US-GUEST-004 | SF-CAT-005, SF-CAT-010, SF-CAT-012, SF-CAT-013 |
| US-GUEST-005 | SF-CAT-006 |
| US-GUEST-006 | SF-CAT-007 |
| US-GUEST-007 | SF-RVW-005 |
| US-GUEST-008 | SF-CRT-001, SF-X-001 |
| US-GUEST-009 | SF-CRT-002, SF-CRT-003, SF-CRT-004 |
| US-GUEST-010 | SF-ID-001, SF-ID-002, SF-ID-003 |
| US-GUEST-011 | SF-ID-006 |
| US-GUEST-012 | SF-PLT-009 |
| US-GUEST-013 | SF-PLT-008 |

### 7.2 Customer Stories

| Story | Features Covered |
| --- | --- |
| US-CUST-001 | SF-ID-004, SF-ID-005 |
| US-CUST-002 | SF-CRT-006 |
| US-CUST-003 | SF-CRT-008 |
| US-CUST-004 | SF-CRT-009 |
| US-CUST-005 | SF-CHK-001, SF-CHK-003, SF-CHK-005, SF-CHK-006, SF-CHK-007 |
| US-CUST-006 | SF-CHK-002 |
| US-CUST-007 | SF-CHK-006, SF-CHK-008, SF-CHK-009 |
| US-CUST-008 | SF-CHK-011, SF-NOT-001 |
| US-CUST-009 | SF-ORD-005, SF-ORD-006 |
| US-CUST-010 | SF-SHP-005, SF-SHP-006, SF-SHP-007 |
| US-CUST-011 | SF-ORD-011 |
| US-CUST-012 | SF-RVW-001, SF-RVW-002, SF-RVW-003 |
| US-CUST-013 | SF-PRM-005 |
| US-CUST-014 | SF-ID-008 |
| US-CUST-015 | SF-ID-009 |
| US-CUST-016 | SF-ID-007 |
| US-CUST-017 | SF-RTN-001, SF-RTN-002, SF-RTN-003 |
| US-CUST-018 | SF-RTN-005 |
| US-CUST-019 | SF-RTN-006 |
| US-CUST-020 | SF-SUP-001, SF-SUP-002 |
| US-CUST-021 | SF-NOT-005, SF-NOT-006 |
| US-CUST-022 | SF-ID-014 |
| US-CUST-023 | SF-ID-010 |
| US-CUST-024 | SF-CAT-009 |
| US-CUST-025 | SF-CAT-016 |
| US-CUST-026 | SF-RVW-007 |

### 7.3 Commercial Customer Stories

| Story | Features Covered |
| --- | --- |
| US-COM-001 | SF-CRT-002 (extension) |
| US-COM-002 | SF-CRT-001 (extension) |
| US-COM-003 | SF-CAT-012 (extension) |

### 7.4 Admin Stories

| Story | Features Covered |
| --- | --- |
| US-CAT-001 | SF-ADM-002, SF-CAT-005, SF-CAT-006 |
| US-CAT-002 | SF-ADM-002 |
| US-CAT-003 | SF-ADM-002, SF-CAT-002 |
| US-CAT-004 | SF-CAT-010, SF-PLT-007 |
| US-CAT-005 | SF-X-002 |
| US-ORD-001 | SF-ADM-003, SF-ORD-007 |
| US-ORD-002 | SF-ORD-007 |
| US-ORD-003 | SF-ORD-009 |
| US-ORD-004 | SF-SHP-003, SF-SHP-004, SF-SHP-005 |
| US-ORD-005 | SF-ORD-011 |
| US-ORD-006 | SF-ORD-013 |
| US-MKT-001 | SF-PRM-001, SF-PRM-002, SF-ADM-005 |
| US-MKT-002 | SF-PRM-005, SF-ADM-005 |
| US-MKT-003 | SF-PRM-006, SF-PRM-007 |
| US-MKT-004 | SF-ADM-011, SF-PLT-009 |
| US-SUP-001 | SF-ADM-004 |
| US-SUP-002 | SF-SUP-003, SF-ADM-008 |
| US-SUP-003 | SF-SUP-004 |
| US-SUP-004 | SF-RTN-004, SF-ADM-006 |
| US-SUP-005 | SF-RVW-004, SF-ADM-007 |
| US-FIN-001 | SF-ANL-002, SF-ADM-012 |
| US-FIN-002 | SF-RTN-006, SF-ADM-006 |
| US-FIN-003 | SF-ANL-006 |
| US-ADM-001 | SF-ADM-009, SF-ID-012 |
| US-ADM-002 | SF-PLT-006, SF-ADM-013 |
| US-ADM-003 | SF-ADM-010 |
| US-ADM-004 | SF-SHP-010 |
| US-ADM-005 | SF-NOT-003 |
| US-ADM-006 | SF-ADM-001, SF-PLT-001 |

---

## 8. Layer 5 — Acceptance Criteria (from ACCEPTANCE_CRITERIA.md)

Mapping story → acceptance criteria.

### 8.1 Catalog ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-GUEST-001 | AC-AC-001 |
| US-GUEST-002 | AC-AC-002 |
| US-GUEST-003 | AC-AC-003 |
| US-GUEST-004 | AC-AC-004 |
| US-GUEST-005 | AC-AC-005 |
| US-GUEST-006 | AC-AC-006 |
| US-GUEST-007 | AC-AC-007 |

### 8.2 Cart ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-GUEST-008 | AC-AC-008 |
| US-GUEST-009 | AC-AC-009 |

### 8.3 Identity ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-GUEST-010 | AC-AC-010 |
| US-GUEST-011 | AC-AC-011 |
| US-CUST-001 | AC-AC-014 |
| US-CUST-002 | AC-AC-015 |
| US-CUST-014 | AC-AC-027 |
| US-CUST-015 | AC-AC-028 |
| US-CUST-016 | AC-AC-029 |
| US-CUST-022 | AC-AC-035 |
| US-CUST-023 | AC-AC-036 |

### 8.4 Wishlist ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-CUST-003 | AC-AC-016 |
| US-CUST-004 | AC-AC-017 |

### 8.5 Checkout ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-CUST-005 | AC-AC-018 |
| US-CUST-006 | AC-AC-019 |
| US-CUST-007 | AC-AC-020 |

### 8.6 Order ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-CUST-008 | AC-AC-021 |
| US-CUST-009 | AC-AC-022 |
| US-CUST-010 | AC-AC-023 |
| US-CUST-011 | AC-AC-024 |

### 8.7 Reviews ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-CUST-012 | AC-AC-025 |

### 8.8 Promotions ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-CUST-013 | AC-AC-026 |

### 8.9 Returns ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-CUST-017 | AC-AC-030 |
| US-CUST-018 | AC-AC-031 |
| US-CUST-019 | AC-AC-032 |

### 8.10 Support ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-CUST-020 | AC-AC-033 |
| US-CUST-021 | AC-AC-034 |

### 8.11 Engagement ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-CUST-024 | AC-AC-037 |
| US-CUST-025 | AC-AC-038 |
| US-CUST-026 | AC-AC-039 |

### 8.12 Commercial ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-COM-001 | AC-AC-040 |
| US-COM-002 | AC-AC-041 |
| US-COM-003 | AC-AC-042 |

### 8.13 Admin Catalog ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-CAT-001 | AC-AC-043 |
| US-CAT-002 | AC-AC-044 |
| US-CAT-003 | AC-AC-045 |
| US-CAT-004 | AC-AC-046 |
| US-CAT-005 | AC-AC-047 |

### 8.14 Admin Order ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-ORD-001 | AC-AC-048 |
| US-ORD-002 | AC-AC-049 |
| US-ORD-003 | AC-AC-050 |
| US-ORD-004 | AC-AC-051 |
| US-ORD-005 | AC-AC-052 |
| US-ORD-006 | AC-AC-053 |

### 8.15 Admin Marketing ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-MKT-001 | AC-AC-054 |
| US-MKT-002 | AC-AC-055 |
| US-MKT-003 | AC-AC-056 |
| US-MKT-004 | AC-AC-057 |

### 8.16 Admin Support ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-SUP-001 | AC-AC-058 |
| US-SUP-002 | AC-AC-059 |
| US-SUP-003 | AC-AC-060 |
| US-SUP-004 | AC-AC-061 |
| US-SUP-005 | AC-AC-062 |

### 8.17 Admin Finance ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-FIN-001 | AC-AC-063 |
| US-FIN-002 | AC-AC-064 |
| US-FIN-003 | AC-AC-065 |

### 8.18 Admin System ACs

| Story | Acceptance Criteria |
| --- | --- |
| US-ADM-001 | AC-AC-066 |
| US-ADM-002 | AC-AC-067 |
| US-ADM-003 | AC-AC-068 |
| US-ADM-004 | AC-AC-069 |
| US-ADM-005 | AC-AC-070 |
| US-ADM-006 | AC-AC-071 |

---

## 9. Business Goals → Requirements → Features → Stories → AC Roll-Up

This condensed table demonstrates full trace coverage.

| Goal | Requirements | Features | Stories | AC |
| --- | --- | --- | --- | --- |
| BG-01 Launch storefront | BR-CAT-001..016, BR-CRT-001, BR-CHK-001, BR-CHK-002, BR-CHK-005..008, BR-ID-001, BR-ID-004, BR-NOT-002, BR-I18-001..005, BR-PLT-003..005, BR-PLT-009 | SF-CAT-001..016, SF-CRT-001, SF-CHK-001, SF-CHK-002, SF-CHK-005..008, SF-ID-001, SF-ID-004, SF-NOT-002, SF-I18-001..005, SF-PLT-003..005, SF-PLT-009 | US-GUEST-001..013, US-CUST-005..008 | AC-AC-001..013 |
| BG-02 Reliable fulfillment | BR-CRT-007, BR-CHK-003..004, BR-CHK-009..010, BR-ORD-001..013, BR-RTN-003, BR-SHP-001..011, BR-NOT-001, BR-NOT-003..004, BR-ADM-002..004, BR-ADM-006 | SF-ORD-001..013, SF-SHP-001..011, SF-RTN-003, SF-NOT-001, SF-NOT-003, SF-NOT-004, SF-ADM-002, SF-ADM-003, SF-ADM-006 | US-ORD-001..006, US-CUST-007, US-CUST-008, US-CUST-010 | AC-AC-020, AC-AC-021, AC-AC-023, AC-AC-048..053 |
| BG-03 Data foundation | BR-PLT-007 | SF-PLT-007 | US-CAT-004 | AC-AC-046 |
| BG-04 Dashboards | BR-ORD-004, BR-ADM-001, BR-ADM-012, BR-ANL-001..007 | SF-ORD-004, SF-ADM-001, SF-ADM-012, SF-ANL-001..007 | US-FIN-001, US-FIN-003, US-ADM-006 | AC-AC-063, AC-AC-065, AC-AC-071 |
| BG-05 Governance | BR-PLT-001, BR-PLT-002, BR-PLT-006, BR-ADM-013 | SF-PLT-001, SF-PLT-002, SF-PLT-006, SF-ADM-013 | US-ADM-002 | AC-AC-067 |
| BG-06 AI readiness | BR-I18-005 | SF-I18-005 | (none in V1) | — |
| BG-07 KPIs | BR-CAT-001, BR-CAT-003..005, BR-CAT-007..009, BR-CAT-016, BR-CRT-001..010, BR-CHK-001, BR-CHK-002, BR-CHK-011, BR-CHK-012, BR-ORD-005..006, BR-ORD-011, BR-SHP-005..008, BR-SHP-011, BR-ID-006..008, BR-ID-014, BR-RVW-001..008, BR-PRM-001..010, BR-RTN-001..008, BR-NOT-001, BR-NOT-005, BR-SUP-001..007, BR-ADM-005, BR-ANL-002, BR-ANL-007 | All engagement features | US-GUEST-001..013, US-CUST-001..026, US-COM-001..003 | AC-AC-001..042 |
| BG-08 Compliance | BR-CAT-013, BR-CHK-006, BR-CHK-008, BR-ID-002..003, BR-ID-005, BR-ID-009..014, BR-NOT-005..006, BR-ORD-008, BR-RTN-001, BR-RTN-006..008, BR-PLT-008, BR-PLT-009, BR-ADM-007, BR-ADM-009, BR-ADM-010, BR-RVW-004 | Compliance-related features | US-CUST-021, US-CUST-022, US-ADM-001, US-ADM-003 | AC-AC-034, AC-AC-035, AC-AC-066, AC-AC-068 |

---

## 10. Forward Traceability Sample (Goal → AC)

### Goal BG-01 → AC-AC-005 (Variant Selection)

```
BG-01 (Launch a production-ready storefront)
  → BR-CAT-006 (Product variants)
    → SF-CAT-006 (View Product Variants)
      → US-GUEST-005 (View Product Variants)
        → AC-AC-005 (Gherkin scenarios)
```

### Goal BG-02 → AC-AC-049 (Order Status Update)

```
BG-02 (Reliable order fulfillment)
  → BR-ORD-007 (Admin status update)
    → SF-ORD-007 (Order Status Update by Admin)
      → US-ORD-002 (Update Order Status)
        → AC-AC-049 (Gherkin scenarios)
```

### Goal BG-07 → AC-AC-026 (Voucher Application)

```
BG-07 (Achieve business KPIs)
  → BR-PRM-005 (Voucher codes)
    → SF-PRM-005 (Voucher Codes)
      → US-CUST-013 (Apply Voucher Code)
        → AC-AC-026 (Gherkin scenarios)
```

---

## 11. Backward Traceability Sample (AC → Goal)

### AC-AC-032 (Refund Received)

```
AC-AC-032 (Receive Refund)
  → US-CUST-019 (Receive Refund)
    → SF-RTN-006 (Refund Processing)
      → BR-RTN-006 (Refund processing)
        → BG-08 (Compliance — refund obligations)
        → BG-07 (Customer satisfaction KPI)
```

### AC-AC-066 (Admin User Management)

```
AC-AC-066 (Manage Admin Users and Roles)
  → US-ADM-001 (Manage Admin Users and Roles)
    → SF-ADM-009 (Admin User Management)
    → SF-ID-012 (RBAC)
      → BR-ADM-009 (Admin user management)
      → BR-ID-012 (RBAC)
        → BG-08 (Compliance — operational security)
        → BG-05 (Governance)
```

---

## 12. Coverage Summary

| Layer | Count |
| --- | --- |
| Business Goals | 8 |
| Business Requirements | 152 |
| System Features | 152 |
| User Stories | 71 |
| Acceptance Criteria scenarios | 70+ |
| Business Rules | 70+ |

### 12.1 Coverage Verification

| Check | Result |
| --- | --- |
| Every Business Goal has at least one Requirement | ✓ Pass |
| Every Requirement has at least one Feature | ✓ Pass |
| Every Feature has at least one User Story | ✓ Pass (most features) |
| Every Story has at least one Acceptance Criterion | ✓ Pass |
| Every Story references at least one Feature | ✓ Pass |
| Every Story references at least one Business Rule (where applicable) | ✓ Pass |
| No orphan Requirements (unimplemented) | ✓ Pass |
| No orphan Stories (untraced) | ✓ Pass |
| No orphan AC (untraced) | ✓ Pass |

### 12.2 Features Without Dedicated Stories

A small set of platform/operational features are not customer-facing and are tracked under operational/admin stories rather than end-user stories:

| Feature | Operational Coverage |
| --- | --- |
| SF-PLT-001 Health endpoint | US-ADM-006 |
| SF-PLT-002 Version endpoint | US-ADM-006 |
| SF-PLT-003 Sitemap | SEO covered by product pages |
| SF-PLT-004 Robots.txt | SEO covered by product pages |
| SF-PLT-006 Feature flags | US-ADM-002 |
| SF-I18-002..005 | Covered by US-GUEST-001..013 implicitly |
| SF-PLT-008 Cookie consent | US-GUEST-013 |
| SF-PLT-009 Static pages | US-GUEST-012, US-MKT-004 |
| SF-ORD-012 Duplicate detection | Operational concern |
| SF-ORD-013 Internal notes | US-ORD-006 |
| SF-X-001 Inventory reservation | BR-CRT-007 |
| SF-X-002 Low stock notifications | US-CAT-005 |

---

## 13. Cross-Cutting Concern Coverage

| Concern | NFR ID | Features | Stories | AC |
| --- | --- | --- | --- | --- |
| Performance | NFR-PERF-* | NFR-NFR (load tests) | — | AC-NFR-001 |
| Availability | NFR-AVAIL-* | SF-PLT-001 | US-ADM-006 | AC-NFR-002 |
| Security | NFR-SEC-* | SF-ID-011..013 | US-ADM-001 | AC-NFR-003 |
| Accessibility | NFR-USE-* | All UI features | — | AC-NFR-004 |
| Compliance | NFR-COMP-* | SF-PLT-008, SF-PLT-009 | US-GUEST-012, US-GUEST-013 | AC-AC-013 |
| Money integrity | BR-X-001 | SF-X-003 | Cross-feature | AC-AC-071c |
| UTC timestamps | BR-X-002 | All timestamped features | — | AC-AC-071e |

---

## 14. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 0.1 | 2026-07-02 | Principal Business Analyst | Initial draft mapping 8 goals → 152 requirements → 152 features → 71 stories → 70+ AC |

---

**End of Document — REQUIREMENTS_TRACEABILITY_MATRIX.md**
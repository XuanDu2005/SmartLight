# 26 — Architecture Traceability

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document provides **end-to-end traceability** for SmartLight: from Business Goals to Architecture Modules to future Code Modules. It validates that **every business need is implemented** and **every architectural module is justified**.

---

## 2. Traceability Chain

```
Business Goal (BG-XXX)
   ↓
Requirement (REQ-XXX)
   ↓
Feature (SF-XXX)
   ↓
Use Case (UC-XXX)
   ↓
Entity / Aggregate (ENT-XXX)
   ↓
API Endpoint (EP-XXX)
   ↓
Architecture Module (MOD-XXX)
   ↓
Future Code Module (CODE-XXX)
```

Each level references the level above.

---

## 3. Business Goal → Module Map

### 3.1 Business Goal Catalog

| BG | Goal |
|---|---|
| BG-01 | Enable customers to discover and purchase lighting products online |
| BG-02 | Provide a secure, frictionless checkout experience |
| BG-03 | Support Vietnamese payment methods (VNPay, MoMo, ZaloPay, PayPal) |
| BG-04 | Provide reliable shipping across Vietnam |
| BG-05 | Build trust via verified reviews and ratings |
| BG-06 | Enable admins to manage catalog, orders, and operations |
| BG-07 | Ensure PDPD / Vietnamese compliance |
| BG-08 | Drive revenue through promotions and loyalty |
| BG-09 | Operate a scalable, reliable platform |
| BG-10 | Deliver value quickly without over-engineering |

### 3.2 Goal → Module Map

| Business Goal | Architecture Modules |
|---|---|
| BG-01 | Catalog, Media, Search/V1.5 (Catalog read + Vector), Frontend Storefront |
| BG-02 | Cart, Checkout, Order, Payment, Frontend Storefront |
| BG-03 | Payment, Identity, Order |
| BG-04 | Shipping, Order, Address |
| BG-05 | Review, Order (verification), Notification |
| BG-06 | Admin (RBAC), Catalog, Inventory, Order, Payment, Audit, Frontend Admin |
| BG-07 | User, Identity, Notification, Audit |
| BG-08 | Promotion, Notification, Review |
| BG-09 | Platform, Observability, all modules |
| BG-10 | (Cross-cutting concern; principle applied to all docs) |

---

## 4. Module → API / Code Map

| Module (MOD) | Module Name | API Endpoints | Future Code Path |
|---|---|---|---|
| MOD-01 | Platform | `/v1/admin/feature-flags/*`, `/v1/admin/system-config/*`, `/v1/public/static-pages/*` | `apps/api/src/modules/platform/` |
| MOD-02 | Identity | `/v1/auth/*`, `/v1/admin/auth/*`, `/v1/oauth/*` | `apps/api/src/modules/identity/` |
| MOD-03 | User | `/v1/users/me/*`, `/v1/users/me/addresses/*`, `/v1/users/me/preferences/*` | `apps/api/src/modules/user/` |
| MOD-04 | Catalog | `/v1/catalog/categories/*`, `/v1/catalog/brands/*`, `/v1/catalog/products/*` + admin versions | `apps/api/src/modules/catalog/` |
| MOD-05 | Inventory | `/v1/inventory/*`, `/v1/admin/inventory/*` | `apps/api/src/modules/inventory/` |
| MOD-06 | Cart | `/v1/cart/*` | `apps/api/src/modules/cart/` |
| MOD-07 | Checkout | `/v1/checkout/*` | `apps/api/src/modules/checkout/` |
| MOD-08 | Order | `/v1/orders/*`, `/v1/admin/orders/*`, `/v1/returns/*` | `apps/api/src/modules/order/` |
| MOD-09 | Payment | `/v1/payments/*`, `/v1/refunds/*`, `/v1/admin/payments/*`, `/v1/webhooks/payment/*` | `apps/api/src/modules/payment/` |
| MOD-10 | Shipping | `/v1/shipping/*`, `/v1/admin/shipping/*`, `/v1/webhooks/shipping/*` | `apps/api/src/modules/shipping/` |
| MOD-11 | Promotion | `/v1/promotions/*`, `/v1/vouchers/*`, `/v1/admin/promotions/*`, `/v1/admin/tax/*` | `apps/api/src/modules/promotion/` |
| MOD-12 | Review | `/v1/reviews/*`, `/v1/admin/reviews/*` | `apps/api/src/modules/review/` |
| MOD-13 | Notification | `/v1/users/me/notification-preferences/*`, `/v1/consent/*`, `/v1/admin/email-templates/*`, `/v1/admin/notifications/*` | `apps/api/src/modules/notification/` |
| MOD-14 | Media | `/v1/media/*` | `apps/api/src/modules/media/` |
| MOD-15 | Support | `/v1/support/tickets/*`, `/v1/admin/support/tickets/*` | `apps/api/src/modules/support/` |
| MOD-16 | Admin (RBAC) | `/v1/admin/roles/*`, `/v1/admin/permissions/*`, `/v1/admin/admin-users/*` | `apps/api/src/modules/admin/` |
| MOD-17 | Audit | `/v1/admin/audit-logs/*`, `/v1/admin/webhook-events/*` | `apps/api/src/modules/audit/` |
| MOD-18 | Health | `/health/*` | `apps/api/src/common/health/` |

---

## 5. Cross-Cutting Concern → Module Mapping

| Concern | Module(s) |
|---|---|
| Authentication | MOD-02 (Identity), MOD-16 (Admin MFA) |
| Authorization | MOD-16 (RBAC) |
| Configuration | MOD-01 (Platform) |
| Logging | All (Pino) |
| Exception Handling | All (Global Filter) |
| Caching | Platform; per-module cache keys |
| File Storage | MOD-14 (Media) |
| Notification | MOD-13 (Notification) |
| Background Jobs | Platform (`src/platform/jobs/`) |
| Observability | Platform (`src/platform/observability/`) |
| Multi-tenancy | (Not V1; future) |
| AI | (Future; V2+) |

---

## 6. Database → API → Module Traceability

| Entity (DB) | Aggregate (Domain) | Module | API Endpoints |
|---|---|---|---|
| `user` | `User` | Identity | `/v1/auth/register`, `/v1/auth/login`, etc. |
| `address` | `Address` | User | `/v1/users/me/addresses` |
| `product` | `Product` | Catalog | `/v1/catalog/products/*` |
| `product_variant` | `ProductVariant` | Catalog | (within product) |
| `inventory` | `Inventory` | Inventory | `/v1/inventory/*` |
| `cart` | `Cart` | Cart | `/v1/cart/*` |
| `order` | `Order` | Order | `/v1/orders/*` |
| `payment` | `Payment` | Payment | `/v1/payments/*` |
| `refund` | `Refund` | Payment | `/v1/refunds/*` |
| `shipment` | `Shipment` | Shipping | `/v1/shipping/*` |
| `promotion`, `voucher` | `Promotion`, `Voucher` | Promotion | `/v1/promotions/*` |
| `review` | `Review` | Review | `/v1/reviews/*` |
| `media_file` | `MediaFile` | Media | `/v1/media/*` |
| `support_ticket` | `SupportTicket` | Support | `/v1/support/tickets/*` |
| `role`, `permission` | `Role`, `Permission` | Admin | `/v1/admin/roles/*` |
| `audit_log` | (event sink) | Audit | `/v1/admin/audit-logs` |

---

## 7. Lifecycle Coverage

Every business-critical lifecycle flow is traceable end-to-end:

| Lifecycle | Coverage |
|---|---|
| User Registration | UC → API → Module → Entity ✓ |
| Email Verification | UC → API → Module → Entity ✓ |
| Product Browsing | UC → API → Module → Entity ✓ |
| Product Search | UC → API → Module → Entity ✓ (V1 simple; V1.5+ AI) |
| Cart Management | UC → API → Module → Entity ✓ |
| Checkout | UC → API → Module → Entity ✓ |
| Payment (VNPay/MoMo/ZaloPay/PayPal) | UC → API → Module → Entity ✓ + Webhook |
| Order Fulfillment | UC → API → Module → Entity ✓ |
| Shipment Tracking | UC → API → Module → Entity ✓ |
| Return Flow | UC → API → Module → Entity ✓ |
| Review Submission | UC → API → Module → Entity ✓ |
| Admin Catalog CRUD | UC → API → Module → Entity ✓ |
| Admin Order Management | UC → API → Module → Entity ✓ |
| Admin Refund | UC → API → Module → Entity ✓ |
| Promotions | UC → API → Module → Entity ✓ |
| Notifications | UC → API → Module → Entity ✓ (email only V1) |
| Audit Logging | UC → API → Module → Entity ✓ |

---

## 8. Coverage Statistics

| Layer | Count | Source |
|---|---|---|
| Business Goals | 10 | BA |
| Requirements | 100+ | BA |
| System Features | 40–60 | BA (after MoSCoW) |
| Use Cases | 100+ | System Analysis |
| Entities | 100+ | Database Design |
| API Endpoints | ~283 | API Design |
| Architecture Modules | 18 (+ common) | This doc |
| ADRs | 22 | This doc |
| Risks | 40+ | This doc |

All business goals have ≥1 architecture module responsible.

---

## 9. Forward Traceability (Goal → Code)

| Goal | Module | Future Code |
|---|---|---|
| BG-01 (discover/purchase) | Catalog, Cart, Checkout, Order | `apps/api/src/modules/{catalog,cart,checkout,order}` + `apps/storefront/src/pages/{products,checkout,account}` |
| BG-03 (payment) | Payment | `apps/api/src/modules/payment` (adapters) + `apps/storefront/src/pages/checkout/PaymentMethod*.tsx` |
| BG-04 (shipping) | Shipping, Address | `apps/api/src/modules/{shipping,user/address}` + GHN/GHTK adapters |
| BG-06 (admin) | Admin + 12 modules | `apps/admin/src/pages/{catalog,orders,customers,...}` |

---

## 10. Backward Traceability (Code → Goal)

| Code Path | Module | Purpose | Business Goal |
|---|---|---|---|
| `apps/api/src/modules/order` | Order | Order lifecycle | BG-02 (checkout) |
| `apps/api/src/modules/payment` | Payment | Process payments | BG-03 (payment) |
| `apps/api/src/modules/catalog` | Catalog | Product display | BG-01 (discover) |
| `apps/admin/src/pages` | Admin | Internal ops | BG-06 (admin) |
| `apps/api/src/modules/identity` | Identity | Auth | BG-07 (compliance) |

> **Every code module should map to at least one business goal.** If not, it's over-engineered.

---

## 11. Gap Analysis

| Area | Status | Notes |
|---|---|---|
| BG-01 → Catalog Module | Mapped | ✓ |
| BG-02 → Cart/Checkout/Order | Mapped | ✓ |
| BG-03 → Payment (4 providers) | Mapped | ✓ |
| BG-04 → Shipping (3 carriers) | Mapped | V1: GHN, GHTK; V1.1+ Viettel Post |
| BG-05 → Review | Mapped | ✓ |
| BG-06 → Admin | Mapped | ✓ |
| BG-07 → Identity/User/Notification/Audit | Mapped | ✓ |
| BG-08 → Promotion | Mapped | ✓ |
| BG-09 → Cross-cutting | Mapped | ✓ |
| BG-10 → Principle | Applied throughout | ✓ |

**No gaps detected.** All business goals have owner modules.

---

## 12. Orphan Architecture Modules

| Module | Status |
|---|---|
| Platform | Required (config) |
| Audit | Required (compliance) |
| Health | Required (ops) |
| Support | Required (BA SF-SUP-001) |
| Cart, Checkout | Required (BA core) |
| Promotion | Required (BG-08) |
| Media | Required (product images) |

**No orphans.** Every module maps to ≥ 1 business goal or cross-cutting concern.

---

## 13. Future Code Path (Just for Reference)

> Architecture documentation references this; **not** generated in this phase.

```
apps/
├── api/
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── common/
│       ├── platform/
│       └── modules/
│           ├── identity/
│           ├── user/
│           ├── catalog/
│           ├── inventory/
│           ├── cart/
│           ├── checkout/
│           ├── order/
│           ├── payment/
│           ├── shipping/
│           ├── promotion/
│           ├── review/
│           ├── notification/
│           ├── media/
│           ├── support/
│           ├── admin/
│           └── audit/
├── storefront/
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── api/
│       └── ...
├── admin/
│   └── src/
│       ├── pages/
│       └── ...
└── worker/ (V1.5+)
    └── src/
        └── workers/
```

---

## 14. Traceability Validation

| Check | Status |
|---|---|
| Business goal → module mapped | ✓ |
| Module → API endpoints mapped | ✓ |
| Entity → module mapped | ✓ |
| Lifecycle coverage | ✓ |
| Coverage statistics | ✓ |
| Forward traceability | ✓ |
| Backward traceability | ✓ |
| Gap analysis | ✓ (no gaps) |
| Orphan modules | ✓ (no orphans) |
| Future code paths described | ✓ |

---

## 15. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial architecture traceability: BG → module → future code |

---

**End of 26_ARCHITECTURE_TRACEABILITY.md**
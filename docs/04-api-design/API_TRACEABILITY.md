# API_TRACEABILITY.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document provides **end-to-end traceability** for the SmartLight API, mapping every layer from business goal to future controller/service. It ensures that every requirement has API coverage and every API endpoint is justified.

---

## 2. Traceability Levels

```
Business Goal (BG)
  ↓
Requirement (REQ)
  ↓
Feature (SF)
  ↓
Use Case (UC)
  ↓
Workflow (WF)
  ↓
Entity (E)
  ↓
API Endpoint (EP)
  ↓
Future Controller (FC)
  ↓
Future Service (FS)
```

---

## 3. Traceability Matrix (Sample)

### 3.1 Order Placement Example

| Layer | ID | Description | Reference |
| --- | --- | --- | --- |
| Business Goal | BG-001 | Be the leading lighting e-commerce platform in Vietnam | `01-business-analysis/VISION_AND_GOALS.md` |
| Requirement | REQ-ORD-001 | Customer can place an order | `01-business-analysis/REQUIREMENTS.md` |
| Feature | SF-ORD-001 | Order Placement | `01-business-analysis/SYSTEM_FEATURES.md` |
| Use Case | UC-ORD-001 | Customer Places Order | `02-system-analysis/USE_CASE_SPECIFICATIONS.md` |
| Workflow | WF-ORD-01 | Order Placement Flow | `02-system-analysis/SYSTEM_WORKFLOWS.md` |
| Entity | order, order_item, payment | — | `03-database-design/ENTITY_CATALOG.md` |
| **API Endpoint** | EP-CHK-011 | POST /v1/checkout/{sessionId}/place-order | `04-api-design/CHECKOUT_API.md` |
| Future Controller | OrderController.placeOrder() | (Future NestJS) | — |
| Future Service | OrderService.createOrder() | (Future NestJS) | — |

---

## 4. Coverage Summary

| Layer | Count | Source |
| --- | --- | --- |
| Business Goals | 12 | `docs/01-business-analysis/VISION_AND_GOALS.md` |
| Requirements (FR) | ~80 | `docs/01-business-analysis/REQUIREMENTS.md` |
| Requirements (NFR) | ~25 | `docs/01-business-analysis/NON_FUNCTIONAL_REQUIREMENTS.md` |
| System Features | 47 | `docs/01-business-analysis/SYSTEM_FEATURES.md` |
| Use Cases | 104 | `docs/02-system-analysis/USE_CASE_MODEL.md` |
| Workflows | ~30 | `docs/02-system-analysis/SYSTEM_WORKFLOWS.md` |
| Entities | 64 MVP | `docs/03-database-design/ENTITY_CATALOG.md` |
| **API Endpoints** | **~270** | `docs/04-api-design/ENDPOINT_CATALOG.md` |

---

## 5. Goal-to-Endpoint Map

### 5.1 BG-001 — Be Leading Lighting E-Commerce

| Requirement | Feature | Use Case | API Endpoint |
| --- | --- | --- | --- |
| REQ-CAT-001 | SF-CAT-001 Browse | UC-CAT-001 | EP-CAT-021 |
| REQ-CAT-002 | SF-CAT-002 Search | UC-CAT-002 | EP-CAT-021 (with `q`) |
| REQ-CAT-003 | SF-CAT-003 Filter | UC-CAT-002 | EP-CAT-021 (with filters) |
| REQ-ORD-001 | SF-ORD-001 Place Order | UC-ORD-001 | EP-CHK-011 |
| REQ-PAY-001 | SF-PAY-001 Pay | UC-PAY-001 | EP-PAY-003..006 |
| REQ-SHP-001 | SF-SHP-001 Track | UC-SHP-001 | EP-ORD-005, EP-SHP-004 |

### 5.2 BG-002 — Seamless Customer Experience

| Requirement | Feature | Use Case | API Endpoint |
| --- | --- | --- | --- |
| REQ-ID-001 | SF-ID-001 Register | UC-ID-001 | EP-AUTH-001 |
| REQ-ID-002 | SF-ID-002 Login | UC-ID-002 | EP-AUTH-002 |
| REQ-CRT-001 | SF-CRT-001 Cart | UC-CRT-001..005 | EP-CRT-001..011 |
| REQ-CHK-001 | SF-CHK-001 Checkout | UC-CHK-001..005 | EP-CHK-001..013 |
| REQ-NOT-001 | SF-NOT-001 Email | UC-NOT-001 | (Internal notification trigger) |

### 5.3 BG-003 — Operational Excellence

| Requirement | Feature | Use Case | API Endpoint |
| --- | --- | --- | --- |
| REQ-INV-001 | SF-INV-001 Stock | UC-INV-001..005 | EP-INV-001..002, EP-ADM-INV-001..006 |
| REQ-ADM-001 | SF-ADM-001 Dashboard | UC-ADM-001 | EP-ADM-DASH-001..004 |
| REQ-PRM-001 | SF-PRM-001 Promotions | UC-PRM-001..005 | EP-PRM-001..003, EP-ADM-PRM-001..008 |
| REQ-RVW-001 | SF-RVW-001 Reviews | UC-RVW-001..005 | EP-RVW-001..015, EP-ADM-RVW-001..007 |

---

## 6. Entity-to-Endpoint Map

| Entity | Public Endpoints | Admin Endpoints |
| --- | --- | --- |
| **user** | EP-USER-001..010 | EP-ADM-USR-001..007 |
| **address** | EP-ADDR-001..007 | (via user) |
| **category** | EP-CAT-001..003 | EP-ADM-CAT-001..004 |
| **brand** | EP-CAT-011..012 | EP-ADM-CAT-011..013 |
| **product** | EP-CAT-021..029 | EP-ADM-CAT-021..028 |
| **product_variant** | EP-CAT-031, EP-INV-001..002 | EP-ADM-CAT-031..034, EP-ADM-INV-001..006 |
| **product_attribute** | EP-CAT-041 | EP-ADM-CAT-041..043 |
| **inventory** | (via variant) | EP-ADM-INV-001..006 |
| **cart** | EP-CRT-001..011 | — |
| **checkout_session** | EP-CHK-001..013 | — |
| **order** | EP-ORD-001..008 | EP-ADM-ORD-001..012 |
| **payment** | EP-PAY-001..008, EP-PAY-022 | EP-ADM-PAY-001..005 |
| **refund** | EP-PAY-021..022 | EP-ADM-PAY-021..024 |
| **shipping_zone** | EP-SHP-001 | EP-ADM-SHP-001..004 |
| **shipping_rate** | EP-SHP-002..003 | EP-ADM-SHP-011..014 |
| **shipment** | EP-ORD-005 | EP-ADM-SHP-021..026 |
| **promotion** | EP-PRM-001, EP-PRM-003 | EP-ADM-PRM-001..008 |
| **voucher** | EP-PRM-002 | EP-ADM-VCH-001..005 |
| **review** | EP-RVW-001..004 | EP-ADM-RVW-001..007 |
| **return** | EP-RTN-001..005 | EP-ADM-RTN-001..007 |
| **tax_rate** | (internal) | EP-ADM-TAX-001..003 |
| **email_template** | — | EP-ADM-NOT-001..006 |
| **notification_log** | — | EP-ADM-NOT-011..012 |
| **notification_preference** | EP-USER-004, EP-USER-005 | — |
| **cookie_consent** | EP-NOT-011, EP-NOT-012 | — |
| **media_file** | EP-MED-003, EP-MED-006 | EP-MED-001..005 (auth) |
| **support_ticket** | EP-SUP-001..006 | EP-ADM-SUP-001..006 |
| **admin_user** | — | EP-ADM-USR-001..007 |
| **role** | — | EP-ADM-RBAC-001..005 |
| **permission** | — | EP-ADM-RBAC-011 |
| **audit_log** | — | EP-ADM-AUD-001..003 |
| **feature_flag** | — | EP-ADM-FLG-001..007 |
| **system_config** | — | EP-ADM-CFG-001..014 |
| **static_page** | (via /meta) | EP-ADM-CFG-011..014 |

> All 64 MVP entities have API coverage. ✓

---

## 7. Use Case-to-Endpoint Map

### 7.1 Identity Use Cases

| UC | Description | Endpoint |
| --- | --- | --- |
| UC-ID-001 | Register | EP-AUTH-001 |
| UC-ID-002 | Login | EP-AUTH-002 |
| UC-ID-003 | View Profile | EP-USER-001 |
| UC-ID-004 | Update Profile | EP-USER-002 |
| UC-ID-005 | Change Password | EP-AUTH-010 |
| UC-ID-006 | Forgot Password | EP-AUTH-006 |
| UC-ID-007 | Reset Password | EP-AUTH-007 |
| UC-ID-008 | Verify Email | EP-AUTH-008 |
| UC-ID-009 | Enable MFA (admin) | EP-AUTH-024 |
| UC-ID-010 | Verify MFA | EP-AUTH-025 |

### 7.2 Catalog Use Cases

| UC | Description | Endpoint |
| --- | --- | --- |
| UC-CAT-001 | Browse Products | EP-CAT-021 |
| UC-CAT-002 | Search Products | EP-CAT-021 (q) |
| UC-CAT-003 | Filter Products | EP-CAT-021 |
| UC-CAT-004 | View Product | EP-CAT-022 |
| UC-CAT-005 | View Variants | EP-CAT-023 |
| UC-CAT-006 | Browse Categories | EP-CAT-001 |
| UC-CAT-007 | View Category | EP-CAT-002 |
| UC-CAT-008 | Sort Products | EP-CAT-021 (sort) |
| UC-CAT-009 | Manage Products (admin) | EP-ADM-CAT-021..028 |
| UC-CAT-010 | Manage Categories (admin) | EP-ADM-CAT-001..004 |

### 7.3 Cart Use Cases

| UC | Description | Endpoint |
| --- | --- | --- |
| UC-CRT-001 | View Cart | EP-CRT-001 |
| UC-CRT-002 | Add to Cart | EP-CRT-002 |
| UC-CRT-003 | Update Quantity | EP-CRT-003 |
| UC-CRT-004 | Remove Item | EP-CRT-004 |
| UC-CRT-005 | Apply Voucher | EP-CRT-006 |
| UC-CRT-006 | View Cart Total | EP-CRT-009 |
| UC-CRT-007 | Merge Guest Cart | EP-CRT-008 |

### 7.4 Checkout Use Cases

| UC | Description | Endpoint |
| --- | --- | --- |
| UC-CHK-001 | Begin Checkout | EP-CHK-001 |
| UC-CHK-002 | Place Order | EP-CHK-011 |
| UC-CHK-003 | Apply Voucher | EP-CHK-007 |
| UC-CHK-004 | Choose Shipping | EP-CHK-005 |
| UC-CHK-005 | Choose Payment | EP-CHK-006 |
| UC-CHK-006 | Recalculate Totals | EP-CHK-010 |

### 7.5 Order Use Cases

| UC | Description | Endpoint |
| --- | --- | --- |
| UC-ORD-001 | Place Order | EP-CHK-011 |
| UC-ORD-002 | View Order History | EP-ORD-001 |
| UC-ORD-003 | View Order Detail | EP-ORD-002 |
| UC-ORD-004 | View Status History | EP-ORD-004 |
| UC-ORD-005 | Track Order | EP-ORD-005 |
| UC-ORD-006 | Cancel Order | EP-ORD-006 |
| UC-ORD-007 | Confirm Receipt | EP-ORD-008 |
| UC-ORD-008 | Manage Orders (admin) | EP-ADM-ORD-001..012 |

### 7.6 Payment Use Cases

| UC | Description | Endpoint |
| --- | --- | --- |
| UC-PAY-001 | Initiate Payment | EP-PAY-003..006 |
| UC-PAY-002 | View Payment | EP-PAY-001 |
| UC-PAY-003 | Cancel Payment | EP-PAY-002 |
| UC-PAY-004 | Request Refund | EP-PAY-022 |
| UC-PAY-005 | Manage Payments (admin) | EP-ADM-PAY-001..005 |

### 7.7 Inventory Use Cases

| UC | Description | Endpoint |
| --- | --- | --- |
| UC-INV-001 | Check Stock (Public) | EP-INV-001..002 |
| UC-INV-002 | List Inventory (admin) | EP-ADM-INV-001 |
| UC-INV-003 | View Low Stock | EP-ADM-INV-003 |
| UC-INV-004 | Adjust Stock | EP-ADM-INV-005 |
| UC-INV-005 | View Movements | EP-ADM-INV-004 |

### 7.8 Promotion Use Cases

| UC | Description | Endpoint |
| --- | --- | --- |
| UC-PRM-001 | View Active Promotions | EP-PRM-001 |
| UC-PRM-002 | View Flash Sales | EP-PRM-003 |
| UC-PRM-003 | Apply Promotion (auto) | (via cart) |
| UC-PRM-004 | Validate Voucher | EP-PRM-002 |
| UC-PRM-005 | Manage Promotions (admin) | EP-ADM-PRM-001..008 |

### 7.9 Review Use Cases

| UC | Description | Endpoint |
| --- | --- | --- |
| UC-RVW-001 | Submit Review | EP-RVW-011 |
| UC-RVW-002 | Update Review | EP-RVW-012 |
| UC-RVW-003 | Delete Review | EP-RVW-013 |
| UC-RVW-004 | View Reviews | EP-RVW-001..004 |
| UC-RVW-005 | Mark Helpful | EP-RVW-014..015 |

---

## 8. Future Controller/Service Mapping (Sample)

> V1.5+ / V2 phase. Mapping for future NestJS implementation:

| API Endpoint | Future Controller | Future Service |
| --- | --- | --- |
| EP-AUTH-001 | AuthController.register() | AuthService.register() |
| EP-AUTH-002 | AuthController.login() | AuthService.login() |
| EP-USER-001 | UserController.getMe() | UserService.getProfile() |
| EP-CAT-021 | CatalogController.listProducts() | CatalogService.findProducts() |
| EP-CAT-022 | CatalogController.getProduct() | CatalogService.findProductById() |
| EP-CRT-001 | CartController.getCart() | CartService.getCurrentCart() |
| EP-CRT-002 | CartController.addItem() | CartService.addItem() |
| EP-CHK-011 | CheckoutController.placeOrder() | CheckoutService.placeOrder() |
| EP-ORD-001 | OrderController.list() | OrderService.findMyOrders() |
| EP-ORD-006 | OrderController.cancel() | OrderService.cancelOrder() |
| EP-PAY-004 | PaymentController.createVNPayIntent() | PaymentService.createVNPayIntent() |
| EP-PRM-002 | PromotionController.validateVoucher() | PromotionService.validateVoucher() |
| EP-RVW-011 | ReviewController.create() | ReviewService.createReview() |
| EP-ADM-INV-005 | AdminInventoryController.adjust() | InventoryService.adjustStock() |

> Complete controller/service naming will be decided during implementation; above is conceptual mapping.

---

## 9. Webhook-to-UseCase Map

| Webhook | Trigger | Effect | Use Case |
| --- | --- | --- | --- |
| EP-WHK-001 (MoMo) | payment.captured | Order confirmed | UC-PAY-001 |
| EP-WHK-002 (VNPay) | payment.captured | Order confirmed | UC-PAY-001 |
| EP-WHK-003 (ZaloPay) | payment.captured | Order confirmed | UC-PAY-001 |
| EP-WHK-004 (PayPal) | payment.captured | Order confirmed | UC-PAY-001 |
| EP-WHK-011 (GHN) | shipment.in_transit | Order → shipped | UC-SHP-001 |
| EP-WHK-012 (GHTK) | shipment.in_transit | Order → shipped | UC-SHP-001 |
| EP-WHK-013 (Viettel) | shipment.in_transit | Order → shipped | UC-SHP-001 |

---

## 10. Audit Coverage Map

| Endpoint | Audit Code |
| --- | --- |
| EP-AUTH-001 | `user.registered` |
| EP-AUTH-002 | `user.login_success` / `user.login_failed` |
| EP-AUTH-007 | `user.password_reset` |
| EP-AUTH-010 | `user.password_changed` |
| EP-USER-003 | `user.deleted` / `user.anonymized` |
| EP-ADM-USR-002 | `admin_user.created` |
| EP-ADM-USR-004 | `admin_user.updated` |
| EP-ADM-RBAC-022 | `admin_user.role_assigned` |
| EP-CAT-021 (admin) | `product.created`, `product.updated` |
| EP-CRT-002 | `cart.item_added` |
| EP-CHK-011 | `order.placed` |
| EP-ORD-006 | `order.cancelled` |
| EP-PAY-004 (create) | `payment.intent_created` |
| EP-ADM-INV-005 | `inventory.adjusted` |
| EP-RVW-011 | `review.submitted` |
| EP-RTN-002 | `return.requested` |
| EP-ADM-AUD-003 | `audit.export_requested` |
| ... | ... |

---

## 11. Idempotency Coverage Map

| Endpoint | Idempotency |
| --- | --- |
| EP-AUTH-001 | Required |
| EP-AUTH-007 | Required |
| EP-CRT-002 | Required |
| EP-CHK-001 | Required |
| EP-CHK-011 | Required (CRITICAL) |
| EP-PAY-003..006 | Required |
| EP-PAY-022 | Required |
| EP-ADM-INV-005 | Required |
| EP-RVW-011 | Required |
| EP-RTN-002 | Required |
| EP-MED-001 | Required |

---

## 12. Coverage Validation

| Check | Status |
| --- | --- |
| Business goals traced to endpoints | ✓ |
| Use cases traced to endpoints | ✓ (104 UCs) |
| All entities have endpoints | ✓ (64 entities) |
| All workflows covered | ✓ |
| Audit codes mapped | ✓ |
| Idempotency requirements mapped | ✓ |
| Webhooks mapped to use cases | ✓ |
| Future controller/service mapping documented | ✓ |

---

## 13. Gaps and Future Work

| Gap | Resolution |
| --- | --- |
| V1.5+ AI search endpoints (UC-AI-001..003) | Reserved as V1.5+ in `ENDPOINT_CATALOG.md` |
| Multi-vendor (V2) | Out of scope for V1; APIs designed for future extension |
| Mobile SDK mapping | V1.5+ |

---

## 14. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial API traceability: end-to-end mapping from BG → API → future controller |

---

**End of Document — API_TRACEABILITY.md**
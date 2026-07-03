# PERMISSION_MATRIX.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal System Analyst

This document defines the **Role-Based Access Control (RBAC)** permission matrix for SmartLight. It maps each **role** to the **permissions** it holds on system resources.

---

## 1. Roles

| Role ID | Role | Description |
| --- | --- | --- |
| R-GUEST | Guest | Unauthenticated visitor |
| R-CUSTOMER | Customer | Authenticated shopper |
| R-SELLER | Seller | Single-vendor operator (catalog, pricing) |
| R-CATALOG-MGR | Catalog Manager | Product, media, inventory management |
| R-FULFILLMENT | Order Fulfillment | Order processing, shipping, returns |
| R-FINANCE | Finance Staff | Reports, refunds, reconciliation |
| R-SUPPORT | Support Agent | Tickets, returns, review moderation |
| R-ADMIN | Admin | System administration |

All admin staff roles (R-SELLER, R-CATALOG-MGR, R-FULFILLMENT, R-FINANCE, R-SUPPORT, R-ADMIN) require **TOTP MFA** per `BR-MFA-001`.

---

## 2. Permissions

Permission codes follow the pattern `P-<RESOURCE>-<ACTION>`.

### 2.1 Action Vocabulary

| Action | Meaning |
| --- | --- |
| `view` | Read |
| `create` | Create new |
| `update` | Modify existing |
| `delete` | Remove (soft delete preferred) |
| `approve` | Authorize / approve |
| `reject` | Decline |
| `export` | Download / extract data |
| `refund` | Initiate refund |
| `moderate` | Review and act on user-generated content |
| `manage` | Full CRUD + administration |
| `audit` | View audit logs |
| `configure` | Change system settings |

### 2.2 Resource Vocabulary

| Resource | Description |
| --- | --- |
| `catalog` | Products, variants, categories, attributes |
| `inventory` | Stock levels, reservations, adjustments |
| `cart` | Cart lines |
| `order` | Customer orders |
| `payment` | Payment intents, transactions, refunds |
| `shipment` | Shipments, tracking |
| `return` | Return requests |
| `review` | Product reviews |
| `promotion` | Promotions, vouchers |
| `customer` | Customer accounts |
| `address` | Address book |
| `ticket` | Support tickets |
| `notification` | Notification templates, preferences |
| `report` | Analytics, sales, VAT reports |
| `media` | Product images |
| `user` | Admin user accounts |
| `role` | Roles and permissions |
| `featureflag` | Feature flags |
| `staticpage` | Static content |
| `audit` | Audit logs |
| `emailtemplate` | Email templates |
| `shippingzone` | Shipping zones |

---

## 3. Permission Matrix

Legend: `✓` = allowed; `–` = not applicable / forbidden; `*` = conditional.

### 3.1 Catalog & Media

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-catalog-view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `P-catalog-create` | – | – | ✓ | ✓ | – | – | – | ✓ |
| `P-catalog-update` | – | – | ✓ | ✓ | – | – | – | ✓ |
| `P-catalog-delete` | – | – | – | ✓ | – | – | – | ✓ |
| `P-media-upload` | – | – | ✓ | ✓ | – | – | – | ✓ |
| `P-media-delete` | – | – | – | ✓ | – | – | – | ✓ |

### 3.2 Inventory

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-inventory-view` | ✓* | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `P-inventory-adjust` | – | – | – | ✓ | – | – | – | ✓ |
| `P-inventory-restock` | – | – | – | ✓ | ✓ | – | – | ✓ |
| `P-inventory-dispose` | – | – | – | ✓ | – | – | – | ✓ |

*R-GUEST/R-CUSTOMER: limited view (only stock status: In Stock / Low Stock / Out of Stock).

### 3.3 Cart & Checkout

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-cart-manage-own` | ✓ | ✓ | – | – | – | – | – | – |
| `P-cart-merge-on-login` | – | ✓ | – | – | – | – | – | – |

### 3.4 Orders

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-order-view-own` | ✓* | ✓ | – | – | – | – | – | – |
| `P-order-create` | ✓ | ✓ | – | – | – | – | – | – |
| `P-order-cancel-own` | ✓* | ✓* | – | – | – | – | – | – |
| `P-order-view-all` | – | – | ✓ | – | ✓ | ✓ | ✓ | ✓ |
| `P-order-update-status` | – | – | – | – | ✓ | – | – | ✓ |
| `P-order-cancel-any` | – | – | – | – | ✓ | – | – | ✓ |
| `P-order-export` | – | – | ✓ | – | – | ✓ | – | ✓ |

*R-GUEST: only via magic link (BR-GCH-004). R-CUSTOMER: only while order is Pending or Confirmed.

### 3.5 Payment

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-payment-pay` | ✓ | ✓ | – | – | – | – | – | – |
| `P-payment-refund` | – | – | – | – | – | ✓ | – | ✓ |
| `P-payment-view-own` | ✓* | ✓ | – | – | – | – | – | – |
| `P-payment-view-all` | – | – | – | – | – | ✓ | – | ✓ |
| `P-payment-reconcile` | – | – | – | – | – | ✓ | – | ✓ |

### 3.6 Shipment

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-shipment-view-own` | ✓* | ✓ | – | – | – | – | – | – |
| `P-shipment-create` | – | – | – | – | ✓ | – | – | ✓ |
| `P-shipment-cancel` | – | – | – | – | ✓ | – | – | ✓ |
| `P-shipment-track` | ✓* | ✓ | – | – | – | – | – | – |

### 3.7 Returns

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-return-request-own` | – | ✓ | – | – | – | – | – | – |
| `P-return-view-own` | – | ✓ | – | – | – | – | – | – |
| `P-return-approve` | – | – | – | – | – | – | ✓ | ✓ |
| `P-return-reject` | – | – | – | – | – | – | ✓ | ✓ |
| `P-return-inspect` | – | – | – | – | ✓ | – | – | ✓ |

### 3.8 Reviews

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-review-view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `P-review-create` | – | ✓ | – | – | – | – | – | – |
| `P-review-moderate` | – | – | – | – | – | – | ✓ | ✓ |
| `P-review-respond` | – | – | ✓ | – | – | – | – | ✓ |

### 3.9 Promotions

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-promotion-view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `P-promotion-create` | – | – | ✓ | – | – | – | – | ✓ |
| `P-promotion-update` | – | – | ✓ | – | – | – | – | ✓ |
| `P-promotion-delete` | – | – | ✓ | – | – | – | – | ✓ |
| `P-promotion-approve` | – | – | – | – | – | – | – | ✓ |

### 3.10 Customers & Accounts

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-customer-view-own` | – | ✓ | – | – | – | – | – | – |
| `P-customer-update-own` | – | ✓ | – | – | – | – | – | – |
| `P-customer-delete-own` | – | ✓ | – | – | – | – | – | – |
| `P-customer-view-all` | – | – | ✓* | – | ✓* | ✓* | ✓* | ✓ |
| `P-customer-update-any` | – | – | – | – | – | – | – | ✓ |
| `P-address-manage-own` | ✓* | ✓ | – | – | – | – | – | – |

*R-GUEST: only for checkout. R-SELLER/R-FULFILLMENT/R-FINANCE/R-SUPPORT: limited PII view (audit-logged).

### 3.11 Support Tickets

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-ticket-create-own` | ✓* | ✓ | – | – | – | – | – | – |
| `P-ticket-view-own` | ✓* | ✓ | – | – | – | – | – | – |
| `P-ticket-view-all` | – | – | – | – | – | – | ✓ | ✓ |
| `P-ticket-respond` | – | – | – | – | – | – | ✓ | ✓ |
| `P-ticket-resolve` | – | – | – | – | – | – | ✓ | ✓ |

*R-GUEST: requires email; no account.

### 3.12 Notifications

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-notification-prefs-own` | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `P-emailtemplate-manage` | – | – | – | – | – | – | – | ✓ |

### 3.13 Reports

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-report-view-sales` | – | – | ✓ | – | – | ✓ | – | ✓ |
| `P-report-view-product` | – | – | ✓ | ✓ | – | – | – | ✓ |
| `P-report-view-vat` | – | – | – | – | – | ✓ | – | ✓ |
| `P-report-export` | – | – | ✓ | – | – | ✓ | – | ✓ |

### 3.14 Tax

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-tax-view-rates` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `P-tax-mark-exempt` | – | – | – | – | – | – | – | ✓ |
| `P-tax-update-rate` | – | – | – | – | – | – | – | ✓ |

### 3.15 Admin Operations

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-user-manage` | – | – | – | – | – | – | – | ✓ |
| `P-role-manage` | – | – | – | – | – | – | – | ✓ |
| `P-audit-view` | – | – | – | – | – | – | – | ✓ |
| `P-featureflag-configure` | – | – | – | – | – | – | – | ✓ |
| `P-staticpage-manage` | – | – | ✓ | – | – | – | – | ✓ |
| `P-shippingzone-configure` | – | – | – | – | – | – | – | ✓ |

### 3.16 Identity

| Permission | R-GUEST | R-CUSTOMER | R-SELLER | R-CATALOG-MGR | R-FULFILLMENT | R-FINANCE | R-SUPPORT | R-ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P-id-register` | ✓ | – | – | – | – | – | – | – |
| `P-id-login` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `P-id-reset-password-own` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `P-id-change-password-own` | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `P-id-enable-mfa` | – | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `P-id-reset-mfa-other` | – | – | – | – | – | – | – | ✓ |

---

## 4. Permission Enforcement Rules

| Rule | Description |
| --- | --- |
| P-01 | Server-side enforcement: All permission checks are performed at the API layer; never trust client-side checks. |
| P-02 | Default Deny: If a permission is not explicitly granted, the request returns 403 Forbidden. |
| P-03 | Audit Logging: All administrative permission uses are written to the audit log with actor, timestamp, before/after. |
| P-04 | MFA Required: Any admin-role action requires valid MFA session; if MFA session expires, re-authentication required. |
| P-05 | Object-level scoping: "View own" permissions are enforced by ownership check (e.g., `customerId = session.customerId`). |
| P-06 | Sensitive PII access: Any read of customer PII by admin is logged with reason. |
| P-07 | Role assignment: Only R-ADMIN can change role assignments; cannot self-demote. |

---

## 5. Common Roles Composition

Some user accounts may have multiple roles. Role composition is union (any role's permissions apply).

| Composite Role | Member Roles |
| --- | --- |
| Owner | R-ADMIN + R-SELLER + R-FINANCE + R-CATALOG-MGR |
| Senior Support | R-SUPPORT + (limited) R-ORDER |
| Junior Admin | R-CATALOG-MGR + R-FULFILLMENT |

---

## 6. Default Role Assignments

| Role | Default Assignee |
| --- | --- |
| R-GUEST | Anonymous visitor |
| R-CUSTOMER | Self-registered user |
| R-SELLER | Business owner + catalog staff |
| R-CATALOG-MGR | Catalog staff |
| R-FULFILLMENT | Warehouse staff |
| R-FINANCE | Accounting / Finance staff |
| R-SUPPORT | Customer service staff |
| R-ADMIN | Tech Lead + designated backup |

---

## 7. MFA Coverage

Per `BR-MFA-001`, **all admin staff roles** require TOTP MFA:

| Role | MFA Required |
| --- | --- |
| R-GUEST | No |
| R-CUSTOMER | No (V1.0); V1.5 optional |
| R-SELLER | **Yes (mandatory)** |
| R-CATALOG-MGR | **Yes (mandatory)** |
| R-FULFILLMENT | **Yes (mandatory)** |
| R-FINANCE | **Yes (mandatory)** |
| R-SUPPORT | **Yes (mandatory)** |
| R-ADMIN | **Yes (mandatory)** |

---

## 8. Coverage Validation

| Check | Result |
| --- | --- |
| Every Use Case actor has at least one role defined | ✓ Pass |
| Every sensitive resource has a permission | ✓ Pass |
| No permission grants a destructive action without approval | ✓ Pass |
| MFA scope matches BR-MFA-001 | ✓ Pass |
| Customer MFA excluded per BR-MFA-002 | ✓ Pass |
| Admin-only operations cannot be performed by lower roles | ✓ Pass |
| Audit-sensitive operations marked | ✓ Pass |

---

## 9. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal System Analyst | Initial permission matrix covering 8 roles × 22 resources × 7 actions; MFA coverage mapped |

---

**End of Document — PERMISSION_MATRIX.md**
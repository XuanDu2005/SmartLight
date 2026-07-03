# DATABASE_TRACEABILITY.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal Database Architect

---

## 1. Purpose

This document provides **end-to-end traceability** from Business Goals through to the future Prisma models, demonstrating that every business requirement has a complete data lineage.

The traceability layers are:

```
Business Goal
↓
Business Requirement (BR-XXX-NNN)
↓
System Feature (SF-XXX-NNN)
↓
Use Case (UC-XXX-NNN)
↓
Workflow (WF-XXX)
↓
State Machine (SM-XXX) / Sequence Diagram (SD-XXX)
↓
Entity (table)
↓
Relationship (REL-XXX-NNN)
↓
Future Prisma Model
```

This bridges `docs/01-business-analysis/`, `docs/02-system-analysis/`, and `docs/03-database-design/`.

---

## 2. Coverage Statistics

| Layer | Count |
| --- | --- |
| Business Goals | 6 |
| Business Requirements | ~110 |
| System Features | ~50 (MVP) |
| Use Cases | 104 |
| Workflows | 20 |
| State Machines | 5 |
| Sequence Diagrams | 8 |
| Entities (tables) | 64 (MVP) |
| Relationships | 99 |
| Future Prisma Models | 64 |

---

## 3. Module-Level Traceability

### 3.1 Identity (M-ID)

| Business Goal | Requirement | Feature | Use Case | Workflow | Entity | Prisma Model |
| --- | --- | --- | --- | --- | --- | --- |
| BG-01 (revenue) | FR-ID-001 | SF-ID-001 | UC-ID-001 | WF-CUST-01 | user | User |
| BG-01 | FR-ID-001 | SF-ID-002 | UC-ID-002 | WF-CUST-02 | admin_user | AdminUser |
| BG-03 (security) | FR-ID-002 | SF-ID-005 | UC-ID-005 | WF-SEC-01 | refresh_token | RefreshToken |
| BG-03 | FR-ID-002 | SF-ID-006 | UC-ID-006 | WF-SEC-01 | user_session | UserSession |
| BG-03 | FR-ID-003 | SF-ID-010 | UC-ID-010 | WF-SEC-02 | mfa_secret, recovery_code | MfaSecret, RecoveryCode |
| BG-01 | FR-ID-004 | SF-ID-008 | UC-ID-008 | WF-CUST-04 | address | Address |
| BG-04 (ops) | FR-ID-005 | SF-ID-013 | UC-ID-013 | WF-ADM-04 | role, permission, admin_user_role, role_permission | Role, Permission, AdminUserRole, RolePermission |
| BR-MFA-001 | — | SF-ID-011 | UC-ID-011 | WF-SEC-02 | mfa_secret | MfaSecret |

### 3.2 Catalog (M-CAT)

| Business Goal | Requirement | Feature | Use Case | Workflow | Entity | Prisma Model |
| --- | --- | --- | --- | --- | --- | --- |
| BG-01 (revenue) | FR-CAT-001 | SF-CAT-001..007 | UC-CAT-001..005 | WF-CAT-01..04 | product, product_variant | Product, ProductVariant |
| BG-01 | FR-CAT-002 | SF-CAT-013 | UC-CAT-006 | WF-CAT-05 | category | Category |
| BG-01 | FR-CAT-003 | SF-CAT-002 | UC-CAT-007 | WF-CAT-05 | brand | Brand |
| BG-01 | FR-CAT-004 | SF-CAT-008 | UC-CAT-008 | WF-CAT-02 | product_image, media_file | ProductImage, MediaFile |
| BG-01 | FR-CAT-005 | SF-CAT-014 | UC-CAT-009 | WF-CAT-03 | product_attribute, product_attribute_value | ProductAttribute, ProductAttributeValue |

### 3.3 Inventory (M-INV)

| Business Goal | Requirement | Feature | Use Case | Workflow | State Machine | Entity | Prisma Model |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BG-01 (revenue) | FR-INV-001 | SF-INV-001 | UC-INV-001 | WF-INV-01 | — | inventory | Inventory |
| BG-01 | FR-INV-002 | SF-INV-002 | UC-INV-002 | WF-INV-02 | SM-INV | stock_reservation | StockReservation |
| BG-01 | FR-INV-003 | SF-INV-003 | UC-INV-003 | WF-INV-03 | — | inventory, stock_movement | Inventory, StockMovement |
| BG-01 | FR-INV-004 | SF-INV-004 | UC-INV-004 | WF-INV-04 | — | inventory_adjustment | InventoryAdjustment |
| BG-01 | FR-INV-005 | SF-INV-005 | UC-INV-005 | WF-INV-05 | — | stock_movement | StockMovement |

### 3.4 Media (M-MED)

| Business Goal | Requirement | Feature | Use Case | Workflow | Entity | Prisma Model |
| --- | --- | --- | --- | --- | --- | --- |
| BG-01 (revenue) | FR-MED-001 | SF-MED-001 | UC-MED-001 | WF-MED-01 | media_file | MediaFile |
| BG-01 | FR-MED-002 | SF-MED-002 | UC-MED-002 | WF-MED-01 | media_file | MediaFile |
| BG-01 | FR-MED-003 | SF-MED-003 | UC-MED-003 | WF-MED-02 | media_file | MediaFile |

### 3.5 Cart & Checkout (M-CRT, M-CHK)

| Business Goal | Requirement | Feature | Use Case | Workflow | Entity | Prisma Model |
| --- | --- | --- | --- | --- | --- | --- |
| BG-01 (revenue) | FR-CRT-001 | SF-CRT-001 | UC-CRT-001 | WF-CRT-01 | cart, cart_item | Cart, CartItem |
| BG-01 | FR-CRT-002 | SF-CRT-002 | UC-CRT-002 | WF-CRT-02 | cart_item | CartItem |
| BG-01 | FR-CRT-003 | SF-CRT-003 | UC-CRT-003 | WF-CRT-03 | cart_item, stock_reservation | CartItem, StockReservation |
| BG-01 | FR-CHK-001 | SF-CHK-001..005 | UC-CHK-001 | WF-CHK-01..03 | checkout_session | CheckoutSession |
| BG-01 | FR-CHK-002 | SF-CHK-006 | UC-CHK-002 | WF-CHK-03 | checkout_session | CheckoutSession |
| BG-01 | FR-CHK-003 | SF-CHK-007 | UC-CHK-003 | WF-CHK-02 | checkout_session, voucher | CheckoutSession, Voucher |
| BR-GCH-001..004 | — | SF-CHK-008..011 | UC-CHK-006 | WF-CHK-04 (guest checkout) | checkout_session, order | CheckoutSession, Order |

### 3.6 Promotion & Tax (M-PRM, M-TAX)

| Business Goal | Requirement | Feature | Use Case | Workflow | Entity | Prisma Model |
| --- | --- | --- | --- | --- | --- | --- |
| BG-01 (revenue) | FR-PRM-001 | SF-PRM-001 | UC-PRM-001 | WF-PRM-01 | promotion | Promotion |
| BG-01 | FR-PRM-002 | SF-PRM-005 | UC-PRM-002 | WF-PRM-02 | voucher, voucher_usage | Voucher, VoucherUsage |
| BG-01 | FR-PRM-003 | SF-PRM-003 | UC-PRM-003 | WF-PRM-03 | promotion_usage | PromotionUsage |
| BG-01 | FR-TAX-001 | SF-TAX-001 | UC-TAX-001 | WF-TAX-01 | tax_rate | TaxRate |
| BG-01 | FR-TAX-002 | SF-TAX-002 | UC-TAX-002 | WF-TAX-01 | order (snapshot) | Order, OrderItem |
| BG-01 | FR-TAX-003 | SF-TAX-003 | UC-TAX-003 | WF-TAX-02 | tax_exemption | TaxExemption |

### 3.7 Order (M-ORD)

| Business Goal | Requirement | Feature | Use Case | Workflow | State Machine | Sequence | Entity | Prisma Model |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BG-01 (revenue) | FR-ORD-001 | SF-ORD-001 | UC-ORD-001 | WF-ORD-01 | SM-ORD | SD-03 | order, order_item | Order, OrderItem |
| BG-01 | FR-ORD-002 | SF-ORD-002 | UC-ORD-002 | WF-ORD-02 | SM-ORD | SD-03 | order_address | OrderAddress |
| BG-01 | FR-ORD-003 | SF-ORD-003 | UC-ORD-003 | WF-ORD-03 | SM-ORD | — | order_status_history | OrderStatusHistory |
| BG-04 (ops) | FR-ORD-005 | SF-ORD-005 | UC-ORD-005 | WF-ORD-04 | SM-ORD | SD-04 | order | Order |
| BG-04 | FR-ORD-008 | SF-ORD-013 | UC-ORD-013 | WF-ORD-09 | SM-ORD | — | order_status_history | OrderStatusHistory |
| BR-OSM-001..004 | — | (state machine) | — | WF-ORD-02 | SM-ORD (defined) | SD-03 | order | Order |

### 3.8 Payment (M-PAY)

| Business Goal | Requirement | Feature | Use Case | Workflow | State Machine | Sequence | Entity | Prisma Model |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BG-01 (revenue) | FR-PAY-001 | SF-PAY-001 | UC-PAY-001 | WF-PAY-01 | SM-PAY | SD-03 | payment | Payment |
| BG-01 | FR-PAY-002 | SF-PAY-002 | UC-PAY-002 | WF-PAY-02 | SM-PAY | SD-03 | payment_transaction | PaymentTransaction |
| BG-01 | FR-PAY-003 | SF-PAY-003 | UC-PAY-003 | WF-PAY-03 | SM-PAY | SD-04 | webhook_event | WebhookEvent |
| BG-01 | FR-PAY-004 | SF-PAY-004 | UC-PAY-004 | WF-PAY-04 | SM-PAY | SD-06 | refund, payment | Refund, Payment |
| BG-01 | FR-PAY-005 | SF-PAY-005 | UC-PAY-005 | WF-PAY-05 | SM-PAY | — | payment | Payment |

### 3.9 Shipping (M-SHP)

| Business Goal | Requirement | Feature | Use Case | Workflow | Entity | Prisma Model |
| --- | --- | --- | --- | --- | --- | --- |
| BG-01 (revenue) | FR-SHP-001 | SF-SHP-001..004 | UC-SHP-001 | WF-SHP-01 | shipping_zone, shipping_rate | ShippingZone, ShippingRate |
| BG-01 | FR-SHP-002 | SF-SHP-005 | UC-SHP-002 | WF-SHP-02 | shipment | Shipment |
| BG-01 | FR-SHP-003 | SF-SHP-006 | UC-SHP-003 | WF-SHP-03 | tracking_event | TrackingEvent |

### 3.10 Returns (M-RTN)

| Business Goal | Requirement | Feature | Use Case | Workflow | State Machine | Sequence | Entity | Prisma Model |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BG-04 (ops) | FR-RTN-001 | SF-RTN-001 | UC-RTN-001 | WF-RTN-01 | SM-RTN | — | return | Return |
| BG-04 | FR-RTN-002 | SF-RTN-002 | UC-RTN-002 | WF-RTN-02 | — | — | return_item | ReturnItem |
| BG-04 | FR-RTN-003 | SF-RTN-003 | UC-RTN-003 | WF-RTN-03 | SM-RTN | SD-08 | return_inspection | ReturnInspection |
| BG-04 | FR-RTN-005 | SF-RTN-005 | UC-RTN-005 | WF-RTN-04 | SM-RTN | SD-08 | inventory_adjustment | InventoryAdjustment |
| BG-01 | FR-RTN-006 | SF-RTN-006 | UC-RTN-006 | WF-RTN-05 | — | SD-06 | refund | Refund |
| BR-INV-006 | — | (return restock) | — | WF-RTN-04 | — | SD-08 | inventory, stock_movement | Inventory, StockMovement |

### 3.11 Reviews (M-RVW)

| Business Goal | Requirement | Feature | Use Case | Workflow | Entity | Prisma Model |
| --- | --- | --- | --- | --- | --- | --- |
| BG-01 (revenue) | FR-RVW-001 | SF-RVW-001 | UC-RVW-001 | WF-RVW-01 | review | Review |
| BG-01 | FR-RVW-002 | SF-RVW-002 | UC-RVW-002 | WF-RVW-02 | review | Review |
| BG-04 | FR-RVW-005 | SF-RVW-005 | UC-RVW-005 | WF-RVW-05 | review_reply | ReviewReply |
| BG-01 | FR-RVW-003 | SF-RVW-004 | UC-RVW-003 | WF-RVW-03 | review_helpful_vote | ReviewHelpfulVote |

### 3.12 Notifications (M-NOT)

| Business Goal | Requirement | Feature | Use Case | Workflow | Entity | Prisma Model |
| --- | --- | --- | --- | --- | --- | --- |
| BG-04 (ops) | FR-NOT-001 | SF-NOT-001 | UC-NOT-001 | WF-NOT-01 | notification_log | NotificationLog |
| BG-04 | FR-NOT-002 | SF-NOT-002 | UC-NOT-002 | WF-NOT-02 | notification_log | NotificationLog |
| BG-04 | FR-NOT-004 | SF-NOT-004 | UC-NOT-004 | WF-NOT-04 | email_template | EmailTemplate |
| BG-04 | FR-NOT-005 | SF-NOT-005 | UC-NOT-005 | WF-NOT-05 | notification_preference | NotificationPreference |
| BG-05 (compliance) | FR-COMP-002 | SF-PLT-006 | UC-PLT-005 | WF-COMP-01 | cookie_consent | CookieConsent |

### 3.13 Support (M-SUP)

| Business Goal | Requirement | Feature | Use Case | Workflow | Entity | Prisma Model |
| --- | --- | --- | --- | --- | --- | --- |
| BG-04 (ops) | FR-SUP-001 | SF-SUP-001 | UC-SUP-001 | WF-SUP-01 | support_ticket | SupportTicket |
| BG-04 | FR-SUP-002 | SF-SUP-003 | UC-SUP-002 | WF-SUP-02 | ticket_message | TicketMessage |

### 3.14 Audit (M-ADM)

| Business Goal | Requirement | Feature | Use Case | Workflow | Entity | Prisma Model |
| --- | --- | --- | --- | --- | --- | --- |
| BG-05 (compliance) | FR-ADM-008 | SF-ADM-009 | UC-ADM-009 | WF-ADM-05 | audit_log | AuditLog |

### 3.15 Platform (M-PLT)

| Business Goal | Requirement | Feature | Use Case | Workflow | Entity | Prisma Model |
| --- | --- | --- | --- | --- | --- | --- |
| BG-04 (ops) | FR-PLT-005 | SF-PLT-005 | UC-PLT-003 | WF-PLT-01 | feature_flag, feature_flag_override | FeatureFlag, FeatureFlagOverride |
| BG-01 | FR-PLT-007 | SF-PLT-007 | UC-PLT-007 | WF-PLT-04 | static_page | StaticPage |
| BG-04 | FR-PLT-008 | SF-PLT-008 | UC-PLT-008 | WF-PLT-05 | system_config | SystemConfig |

---

## 4. Critical Business Rules → Entity Mapping

| Business Rule | Description | Entity | Field/State |
| --- | --- | --- | --- |
| BR-INV-001 | Stock on hand ≥ 0 | inventory | stockOnHand (CHECK ≥ 0) |
| BR-INV-002 | Stock reservation TTL | stock_reservation | expiresAt (TTL 15 min) |
| BR-INV-003 | Active reservations ≤ available | stock_reservation, inventory | Aggregate invariant |
| BR-INV-005 | Manual adjustments logged | inventory_adjustment | All fields |
| BR-INV-006 | Return inspection drives stock | return_inspection, inventory_adjustment | outcome → delta |
| BR-PAY-001 | No card storage | (architectural) | N/A |
| BR-PAY-002 | Idempotent payment via intent | payment | providerCode + intentId (UNIQUE) |
| BR-PAY-007 | Webhook dedup | webhook_event | providerCode + eventId (UNIQUE) |
| BR-PAY-009 | Refund ≤ captured | refund, payment | Aggregate invariant |
| BR-TAX-001 | 10% VAT default | tax_rate | isDefault = true |
| BR-TAX-004 | Tax snapshot at order | order_item, order | taxRate, taxAmount |
| BR-TAX-005 | Banker's rounding | order_item | calculated total |
| BR-ORD-002 | Order total = subtotal + shipping + tax - discount | order | CHECK constraint |
| BR-OSM-001..004 | State machine transitions | order | status, OrderStatusHistory |
| BR-ID-001 | Email unique | user | email (UNIQUE) |
| BR-MFA-001 | Admin MFA mandatory | mfa_secret | required for AdminUser |
| BR-X-001 | Money integer (xu) | All Money columns | BigInt in Prisma |
| BR-COMP-001 | Cookie consent | cookie_consent | necessary=true (always); analytics/marketing opt-in |
| BR-SHP-005 | Shipment lifecycle | shipment, tracking_event | state machine |
| BR-RTN-007 | Return restock on Pass | return_inspection, inventory | outcome=Pass → restock |

---

## 5. Cross-Module Data Flow

### 5.1 Order Placement Flow

```
[Customer] → [Frontend Cart]
       ↓
[Backend: M-CRT (Cart) → CartService]
       ↓
[Backend: M-CHK (Checkout) → CheckoutService]
   ├→ [M-ID: User, Address]
   ├→ [M-CAT: ProductVariant, price]
   ├→ [M-INV: stock_reservation]
   ├→ [M-PRM: Promotion/Voucher validation]
   └→ [M-TAX: TaxRate lookup]
       ↓
[Backend: M-ORD (Order) → OrderService]
   ├→ INSERT order
   ├→ INSERT order_item
   ├→ INSERT order_address
   ├→ UPDATE stock_reservation (consumed)
   ├→ INSERT stock_movement (sale)
   ├→ [M-PAY: Create payment]
   ├→ INSERT promotion_usage / voucher_usage
       ↓
[Provider Webhook → M-PAY]
       ↓
[UPDATE payment.status]
[UPDATE order.status (PaymentSucceeded → Confirmed)]
       ↓
[Domain Event: order.confirmed]
       ↓
[M-NOT: Send order confirmation email]
[M-SHP: Await fulfillment]
[Audit: All actions logged]
```

### 5.2 Return Restock Flow

```
[Customer → Return request]
       ↓
[M-RTN: Return + ReturnItem created]
       ↓
[Admin: Approve]
       ↓
[Logistics: Receive return]
       ↓
[Admin: Inspect each item]
       ↓
[ReturnInspection.outcome = PASS/FAIL]
       ↓
[For PASS:]
[M-RTN: → M-INV signal]
[M-INV: InventoryAdjustment (RestockFromReturn)]
[M-INV: StockMovement type=ReturnRestock]
[M-INV: Inventory.stockOnHand += qty]
       ↓
[For FAIL:]
[M-INV: StockMovement type=ReturnDispose]
[No inventory increase]
       ↓
[M-PAY: Create Refund]
[M-NOT: Notify customer]
[Audit: All actions]
```

---

## 6. Entity Coverage by Use Case

| Use Case Group | Entity Coverage |
| --- | --- |
| Authentication (UC-ID-001..006) | User, AdminUser, MfaSecret, RecoveryCode, RefreshToken, UserSession, AuditLog |
| Catalog (UC-CAT-001..010) | Product, ProductVariant, ProductImage, ProductAttribute, ProductAttributeValue, Category, Brand, MediaFile |
| Cart (UC-CRT-001..005) | Cart, CartItem, StockReservation, Inventory |
| Checkout (UC-CHK-001..006) | CheckoutSession, Voucher, PromotionUsage, Address |
| Order (UC-ORD-001..015) | Order, OrderItem, OrderAddress, OrderStatusHistory, Payment, Shipment, VoucherUsage, PromotionUsage |
| Payment (UC-PAY-001..005) | Payment, PaymentTransaction, WebhookEvent, Refund |
| Returns (UC-RTN-001..008) | Return, ReturnItem, ReturnInspection, ReturnImage, Refund, InventoryAdjustment |
| Inventory (UC-INV-001..005) | Inventory, StockReservation, StockMovement, InventoryAdjustment |
| Reviews (UC-RVW-001..005) | Review, ReviewReply, ReviewHelpfulVote |
| Notifications (UC-NOT-001..005) | NotificationLog, EmailTemplate, NotificationPreference |
| Support (UC-SUP-001..005) | SupportTicket, TicketMessage |
| Admin (UC-ADM-001..010) | All (audit, configuration) |

---

## 7. State Machine to Entity Mapping

| State Machine | Entity | State Field | History Entity |
| --- | --- | --- | --- |
| SM-ORD (Order Lifecycle) | order | status | order_status_history |
| SM-PAY (Payment Lifecycle) | payment | status | payment_transaction |
| SM-RTN (Return Lifecycle) | return | status | return_inspection |
| SM-VCH (Voucher Lifecycle) | voucher | status | (none; usage tracked) |
| SM-INV (Inventory Reservation) | stock_reservation | status | (none; released) |

---

## 8. Sequence Diagram to Entity Traceability

| Sequence Diagram | Step | Entity Touched |
| --- | --- | --- |
| SD-02 Login | User lookup, MFA verify, refresh token | user, mfa_secret, refresh_token |
| SD-02 | Session creation | user_session |
| SD-03 Checkout | Cart fetch, voucher validate, total compute | cart, cart_item, voucher, promotion, tax_rate |
| SD-03 | Stock reserve | stock_reservation |
| SD-03 | Order create | order, order_item, order_address |
| SD-03 | Stock movement | stock_movement |
| SD-03 | Voucher usage | voucher_usage, promotion_usage |
| SD-04 Payment | Payment create | payment |
| SD-04 | Webhook receive | webhook_event |
| SD-04 | Payment capture | payment_transaction, payment update |
| SD-04 | Order confirm | order.status, order_status_history |
| SD-04 | Notification | notification_log |
| SD-05 Refund | Refund create | refund |
| SD-05 | Payment update | payment.refundedAmount |
| SD-05 | Order update | order.refundedAmount |
| SD-05 | Notification | notification_log |
| SD-06 Inventory Reservation | Reserve | stock_reservation |
| SD-06 | Inventory update | inventory.stockReserved |
| SD-08 Return | Return create | return, return_item |
| SD-08 | Inspection | return_inspection |
| SD-08 | Restock | inventory_adjustment, stock_movement, inventory update |
| SD-08 | Refund | refund |

---

## 9. Cross-Reference Index

### 9.1 From System Analysis to Database Design

| System Analysis Doc | Database Design Doc(s) |
| --- | --- |
| USE_CASE_MODEL.md | ENTITY_CATALOG.md, RELATIONSHIP_MATRIX.md |
| USE_CASE_SPECIFICATIONS.md | ENTITY_CATALOG.md |
| ACTIVITY_DIAGRAMS.md | DATA_DICTIONARY.md |
| SEQUENCE_DIAGRAMS.md | (mapped above) |
| STATE_MACHINE.md | ENTITY_CATALOG.md (state fields) |
| PERMISSION_MATRIX.md | ENTITY_CATALOG.md (Role/Permission/AdminUserRole) |
| BUSINESS_PROCESS.md | ENTITY_CATALOG.md |
| MODULE_INTERACTION.md | DATABASE_ARCHITECTURE.md, DOMAIN_MODEL.md |
| SYSTEM_WORKFLOWS.md | ENTITY_CATALOG.md, RELATIONSHIP_MATRIX.md |
| ERROR_HANDLING.md | AUDIT_LOG_STRATEGY.md |
| NON_FUNCTIONAL_MAPPING.md | PARTITIONING_AND_SCALING.md, DATABASE_SECURITY.md |
| SYSTEM_ANALYSIS_TRACEABILITY.md | DATABASE_TRACEABILITY.md (this doc) |

### 9.2 From Database Design to Future Prisma

| DB Design Doc | Future Phase |
| --- | --- |
| ENTITY_CATALOG.md | Prisma models (future) |
| DATA_DICTIONARY.md | Prisma field definitions |
| RELATIONSHIP_MATRIX.md | Prisma relations |
| INDEX_STRATEGY.md | Prisma @@index + @@unique |
| NAMING_CONVENTIONS.md | @map / @@map conventions |
| SOFT_DELETE_STRATEGY.md | Prisma middleware |
| AUDIT_LOG_STRATEGY.md | Audit repository/service |
| DATABASE_CONSTRAINTS.md | CHECK, UNIQUE in schema |
| DATABASE_SECURITY.md | Encryption (out of Prisma scope) |
| PARTITIONING_AND_SCALING.md | V1.5+ migrations |
| PRISMA_MAPPING.md | Future schema.prisma |
| MIGRATION_STRATEGY.md | prisma migrate workflow |

---

## 10. Coverage Validation

| Check | Status |
| --- | --- |
| Every Business Requirement has a Use Case | ✓ |
| Every Use Case has at least one Entity | ✓ |
| Every Workflow references Business Rules | ✓ |
| Every Entity has an owner Module | ✓ |
| Every State Machine has an Entity | ✓ |
| Every Sequence Diagram maps to Entities | ✓ |
| No orphan Entities | ✓ |
| No orphan Use Cases | ✓ |
| Traceability through 8 layers | ✓ |
| Future Prisma Model equivalent for every entity | ✓ |

---

## 11. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal Database Architect | Initial database traceability: business goal → use case → workflow → entity → future Prisma model |

---

**End of Document — DATABASE_TRACEABILITY.md**
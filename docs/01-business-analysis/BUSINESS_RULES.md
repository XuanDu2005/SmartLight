# SmartLight — Business Rules

| Field | Value |
| --- | --- |
| **Document ID** | `BA-BIZRULES-001` |
| **Document Owner** | Principal Business Analyst |
| **Status** | Draft — v0.1 |
| **Created Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2026-08-01 |
| **Classification** | Business Analysis — Authoritative |
| **Audience** | Engineering, Product, QA, Stakeholders, AI Agents |

> **Source of Truth:** This document conforms to `docs/00-governance/PROJECT_BLUEPRINT.md`, `SRS.md`, and `SYSTEM_FEATURES.md`. Each rule is traceable to features and requirements.

---

## 1. Purpose

This document defines all **business rules** governing SmartLight operations. Business rules are **inviolable policies** that the system must enforce. They:

1. Constrain how data is created, read, updated, or deleted.
2. Define eligibility, thresholds, and exceptions.
3. Encode legal, contractual, and operational policies.
4. Are enforced by validation, workflow, or both.

Engineering translates each rule into validation logic, automated workflows, and tests. AI agents must treat these rules as binding when generating any artifact.

---

## 2. Rule ID Convention

| Pattern | Meaning |
| --- | --- |
| `BR-<MODULE>-<NUMBER>` | Business Rule ID |

Modules: `CAT`, `CRT`, `CHK`, `ORD`, `SHP`, `ID`, `RVW`, `PRM`, `RTN`, `PAY`, `NOT`, `ADM`, `PLT`.

---

## 3. Catalog Business Rules

### BR-CAT-001 — Product Visibility

| Field | Value |
| --- | --- |
| **Description** | Only products with status `active` and `published_at` not in the future are visible to customers. |
| **Condition** | Product status is queried. |
| **Exception** | Admin staff can view draft and scheduled products in admin panel. |
| **Validation** | Public catalog queries filter to `status = 'active' AND published_at <= now()`. |
| **Related Features** | SF-CAT-001, SF-CAT-005, SF-ADM-002 |

### BR-CAT-002 — Mandatory Product Attributes

| Field | Value |
| --- | --- |
| **Description** | A product cannot be published unless it has: name, category, brand, at least one image, base price, and at least one variant. |
| **Condition** | Status transitions to `active`. |
| **Exception** | None. |
| **Validation** | System blocks publish until all mandatory attributes present. |
| **Related Features** | SF-ADM-002, SF-CAT-005 |

### BR-CAT-003 — Single Brand Restriction

| Field | Value |
| --- | --- |
| **Description** | All products in V1 belong to a single brand (SmartLight's own brand label). |
| **Condition** | Product creation. |
| **Exception** | None in V1. Multi-brand support deferred. |
| **Validation** | Brand field is hidden or fixed in admin. |
| **Related Features** | SF-ADM-002 |

### BR-CAT-004 — Category Depth Limit

| Field | Value |
| --- | --- |
| **Description** | Categories may have a maximum depth of 3 levels. |
| **Condition** | Category creation or move. |
| **Exception** | None. |
| **Validation** | System rejects creation that would exceed depth 3. |
| **Related Features** | SF-CAT-002 |

### BR-CAT-005 — Variant Uniqueness

| Field | Value |
| --- | --- |
| **Description** | A product variant combination (e.g., color + wattage + size) must be unique within a product. |
| **Condition** | Variant creation or update. |
| **Exception** | None. |
| **Validation** | Unique constraint on variant axis tuple. |
| **Related Features** | SF-CAT-006 |

### BR-CAT-006 — SKU Format

| Field | Value |
| --- | --- |
| **Description** | SKUs must be alphanumeric, uppercase, 6–32 characters, and unique across the catalog. |
| **Condition** | Product or variant creation. |
| **Exception** | None. |
| **Validation** | Regex check + uniqueness check. |
| **Related Features** | SF-CAT-005, SF-ADM-002 |

### BR-CAT-007 — Out-of-Stock Purchase Block

| Field | Value |
| --- | --- |
| **Description** | Customers cannot add to cart a variant that is out of stock. |
| **Condition** | Add-to-cart attempt. |
| **Exception** | Admin can override via backorder flag (future). |
| **Validation** | Cart service rejects line if available stock = 0 and backorder is disabled. |
| **Related Features** | SF-CRT-001, SF-CAT-007 |

---

## 4. Cart Business Rules

### BR-CRT-001 — Cart Line Quantity Limit

| Field | Value |
| --- | --- |
| **Description** | A single cart line item may not exceed 99 units. |
| **Condition** | Add-to-cart or quantity update. |
| **Exception** | Admin override in order creation. |
| **Validation** | Quantity rejected if > 99. |
| **Related Features** | SF-CRT-001, SF-CRT-003 |

### BR-CRT-002 — Cart Merge Conflict Resolution

| Field | Value |
| --- | --- |
| **Description** | When merging guest cart into customer cart, duplicate variants are summed up to the per-line limit. |
| **Condition** | Login event with active guest cart. |
| **Exception** | If sum exceeds 99, merge capped at 99 with a notification. |
| **Validation** | Merge logic enforces cap. |
| **Related Features** | SF-CRT-006 |

### BR-CRT-003 — Cart Reservation Window

| Field | Value |
| --- | --- |
| **Description** | Stock is reserved for cart items for 15 minutes; reservation is renewed on every cart interaction. |
| **Condition** | Add-to-cart, update cart. |
| **Exception** | Reservation released immediately on item removal. |
| **Validation** | Background job expires reservations after 15 minutes. |
| **Related Features** | SF-CRT-001, SF-X-001 |

### BR-CRT-004 — Cart Expiry for Guests

| Field | Value |
| --- | --- |
| **Description** | Guest carts expire after 30 days of inactivity. |
| **Condition** | No cart activity for 30 days. |
| **Exception** | None. |
| **Validation** | Cron job purges expired carts. |
| **Related Features** | SF-CRT-005 |

### BR-CRT-005 — Minimum Cart for Checkout

| Field | Value |
| --- | --- |
| **Description** | Cart must contain at least one item with quantity ≥ 1 to start checkout. |
| **Condition** | Checkout initiation. |
| **Exception** | None. |
| **Validation** | Checkout endpoint rejects empty cart. |
| **Related Features** | SF-CHK-001 |

### BR-CRT-006 — Wishlist Limit

| Field | Value |
| --- | --- |
| **Description** | A customer wishlist may contain up to 200 items. |
| **Condition** | Add to wishlist. |
| **Exception** | None in V1. |
| **Validation** | Reject add if at limit. |
| **Related Features** | SF-CRT-008 |

### BR-CRT-007 — Cart Cannot Combine Sale and Non-Sale Items with Mixed Promotions

| Field | Value |
| --- | --- |
| **Description** | If a flash sale applies to specific items, only those items receive the flash price; promotions are applied per eligibility rule. |
| **Condition** | Promotion eligibility evaluation. |
| **Exception** | Stacking rules may allow combination per promotion config. |
| **Validation** | Promotion engine evaluates eligibility per line. |
| **Related Features** | SF-PRM-001, SF-PRM-009 |

---

## 5. Checkout Business Rules

### BR-CHK-001 — Required Checkout Information

| Field | Value |
| --- | --- |
| **Description** | Checkout requires: full name, phone, email (if guest), shipping address (province, district, ward, street), payment method, shipping method. |
| **Condition** | Order placement. |
| **Exception** | None. |
| **Validation** | Server-side validation with Zod schemas. |
| **Related Features** | SF-CHK-001, SF-CHK-003, SF-CHK-004 |

### BR-CHK-002 — Vietnamese Address Format

| Field | Value |
| --- | --- |
| **Description** | Addresses must include valid province, district, ward, and street. Province/district/ward must be selected from approved lists. |
| **Condition** | Address entry. |
| **Exception** | None. |
| **Validation** | Drop-downs from canonical administrative divisions. |
| **Related Features** | SF-CHK-003 |

### BR-CHK-003 — Vietnamese Phone Format

| Field | Value |
| --- | --- |
| **Description** | Phone numbers must be valid Vietnamese mobile or landline numbers (e.g., 0xxxxxxxxx or +84xxxxxxxxx). |
| **Condition** | Phone entry. |
| **Exception** | None. |
| **Validation** | Regex matching Vietnamese phone patterns. |
| **Related Features** | SF-CHK-004 |

### BR-CHK-004 — Email Validation

| Field | Value |
| --- | --- |
| **Description** | Customer email must be RFC-valid; disposable domains blocked. |
| **Condition** | Account creation, checkout. |
| **Exception** | None. |
| **Validation** | Email regex + disposable domain list. |
| **Related Features** | SF-ID-001, SF-CHK-002 |

### BR-CHK-005 — One Active Order per Cart

| Field | Value |
| --- | --- |
| **Description** | Once an order is created from a cart, the cart is cleared and cannot be reused. |
| **Condition** | Order creation. |
| **Exception** | None. |
| **Validation** | Cart cleared on successful order. |
| **Related Features** | SF-ORD-001 |

### BR-CHK-006 — Shipping Address Must Be Serviced

| Field | Value |
| --- | --- |
| **Description** | Orders can only be placed for shipping addresses within serviced zones. |
| **Condition** | Checkout. |
| **Exception** | None in V1. |
| **Validation** | Address validated against shipping zone coverage. |
| **Related Features** | SF-CHK-003, SF-SHP-010 |

### BR-CHK-007 — No Mixed Currency

| Field | Value |
| --- | --- |
| **Description** | All prices and totals are in VND. No currency conversion occurs. |
| **Condition** | Always. |
| **Exception** | None in V1. |
| **Validation** | All monetary values stored and displayed in VND with no floats. |
| **Related Features** | SF-I18-004, SF-X-003 |

### BR-CHK-008 — Payment Timeout

| Field | Value |
| --- | --- |
| **Description** | A pending order is automatically cancelled if payment is not confirmed within 30 minutes. |
| **Condition** | Order pending payment. |
| **Exception** | Admin can extend or override. |
| **Validation** | Scheduled job cancels expired pending orders. |
| **Related Features** | SF-ORD-003 |

### BR-CHK-009 — Idempotent Checkout Submission

| Field | Value |
| --- | --- |
| **Description** | Duplicate checkout submissions within 60 seconds are deduplicated; only the first is processed. |
| **Condition** | Checkout submission. |
| **Exception** | None. |
| **Validation** | Idempotency key per session + cart ID. |
| **Related Features** | SF-CHK-010 |

---

## 6. Order Business Rules

### BR-ORD-001 — Order Number Format

| Field | Value |
| --- | --- |
| **Description** | Order numbers follow `SL-YYYYMMDD-XXXXX` where XXXXX is a 5-digit zero-padded sequence per day. |
| **Condition** | Order creation. |
| **Exception** | None. |
| **Validation** | Pattern enforced at creation. |
| **Related Features** | SF-ORD-002 |

### BR-ORD-002 — Order Status Transitions

| Field | Value |
| --- | --- |
| **Description** | Status transitions are restricted to allowed flows. Allowed: Pending → Confirmed → Processing → Shipped → Delivered → Completed. Cancellation allowed only from Pending, Confirmed, Processing. Returned allowed only after Delivered. |
| **Condition** | Any status update. |
| **Exception** | Admin with elevated role can override with audit reason. |
| **Validation** | State machine validates transitions. |
| **Related Features** | SF-ORD-003 |

### BR-ORD-003 — Cancellation Window

| Field | Value |
| --- | --- |
| **Description** | Customer may cancel order only before it is `Shipped`. After Shipped, returns process applies. |
| **Condition** | Cancellation request. |
| **Exception** | Admin may cancel Shipped orders with refund processing. |
| **Validation** | Cancellation blocked if status = Shipped or later. |
| **Related Features** | SF-ORD-011 |

### BR-ORD-004 — Invoice Required for Completed Orders

| Field | Value |
| --- | --- |
| **Description** | Every completed order generates an invoice PDF accessible to customer and admin. |
| **Condition** | Order reaches Completed. |
| **Exception** | None. |
| **Validation** | Invoice generation runs on completion. |
| **Related Features** | SF-ORD-008 |

### BR-ORD-005 — Order Modifications After Confirmation

| Field | Value |
| --- | --- |
| **Description** | Customer cannot modify order after it reaches `Confirmed` status. |
| **Condition** | Order detail edit attempt. |
| **Exception** | Admin can modify before Processing with audit. |
| **Validation** | Edit endpoint blocks for non-admin or post-Confirmed orders. |
| **Related Features** | SF-ORD-006, SF-ADM-003 |

### BR-ORD-006 — Refund Must Reference Payment

| Field | Value |
| --- | --- |
| **Description** | Every refund must reference an existing successful payment transaction. |
| **Condition** | Refund issuance. |
| **Exception** | None. |
| **Validation** | Payment must exist and amount must not be over-refunded. |
| **Related Features** | SF-RTN-006 |

### BR-ORD-007 — Duplicate Order Flagging

| Field | Value |
| --- | --- |
| **Description** | Orders with identical cart contents, address, and customer placed within 10 minutes are flagged for review. |
| **Condition** | Order creation. |
| **Exception** | None. |
| **Validation** | Background check flags and notifies admin. |
| **Related Features** | SF-ORD-012 |

### BR-ORD-008 — Tax Display

| Field | Value |
| --- | --- |
| **Description** | Tax (VAT) is shown as a separate line on invoice and order summary. |
| **Condition** | Order display. |
| **Exception** | None. |
| **Validation** | Order totals always include tax breakdown. |
| **Related Features** | SF-ORD-008 |

---

## 7. Shipping Business Rules

### BR-SHP-001 — Shipping Calculation Inputs

| Field | Value |
| --- | --- |
| **Description** | Shipping fees calculated from destination zone, weight (or volumetric weight), carrier, and service level. |
| **Condition** | Shipping fee computation. |
| **Exception** | Free shipping promo may override. |
| **Validation** | Carrier API called with required parameters. |
| **Related Features** | SF-SHP-001, SF-SHP-011 |

### BR-SHP-002 — Free Shipping Threshold

| Field | Value |
| --- | --- |
| **Description** | Free shipping applies when cart subtotal ≥ configured threshold (default 500,000 VND), restricted to eligible zones. |
| **Condition** | Cart subtotal reaches threshold. |
| **Exception** | Carrier-specific exclusions; bulky items surcharge. |
| **Validation** | Promotion engine applies free shipping rule. |
| **Related Features** | SF-SHP-011, SF-PRM-001 |

### BR-SHP-003 — Carrier Selection

| Field | Value |
| --- | --- |
| **Description** | Default carrier is configurable per zone; admin can choose alternative at dispatch time. |
| **Condition** | Dispatch. |
| **Exception** | None. |
| **Validation** | Admin can override carrier selection. |
| **Related Features** | SF-SHP-002, SF-SHP-003 |

### BR-SHP-004 — Tracking Notification Trigger

| Field | Value |
| --- | --- |
| **Description** | Customer receives an email when tracking status changes to `Shipped`, `Out for Delivery`, or `Delivered`. |
| **Condition** | Status sync event. |
| **Exception** | None. |
| **Validation** | Notification dispatched on event. |
| **Related Features** | SF-SHP-007, SF-NOT-001 |

### BR-SHP-005 — Delivery Confirmation

| Field | Value |
| --- | --- |
| **Description** | Order marked `Delivered` only upon carrier confirmation via webhook or polling. |
| **Condition** | Carrier event. |
| **Exception** | Admin manual confirmation with audit. |
| **Validation** | Manual confirmation requires role + reason. |
| **Related Features** | SF-SHP-009 |

### BR-SHP-006 — Address Change After Shipment

| Field | Value |
| --- | --- |
| **Description** | Shipping address cannot be changed after order status = `Shipped`. |
| **Condition** | Address edit attempt. |
| **Exception** | Admin may cancel and re-create order with new shipment. |
| **Validation** | Block address edit if shipped. |
| **Related Features** | SF-SHP-003, SF-ORD-005 |

---

## 8. Identity Business Rules

### BR-ID-001 — Password Complexity

| Field | Value |
| --- | --- |
| **Description** | Passwords must be ≥ 8 characters and include at least one letter and one digit. |
| **Condition** | Registration or password change. |
| **Exception** | None. |
| **Validation** | Server-side regex validation. |
| **Related Features** | SF-ID-001, SF-ID-009 |

### BR-ID-002 — Email Uniqueness

| Field | Value |
| --- | --- |
| **Description** | Each email may register only one customer account. |
| **Condition** | Registration. |
| **Exception** | Admin may merge duplicate accounts. |
| **Validation** | Unique constraint on email. |
| **Related Features** | SF-ID-001 |

### BR-ID-003 — Email Verification Required for Checkout

| Field | Value |
| --- | --- |
| **Description** | Customer accounts must have a verified email before placing their first order. |
| **Condition** | First order placement. |
| **Exception** | Guest checkout does not require an account. |
| **Validation** | Order endpoint checks `email_verified` flag for non-guest. |
| **Related Features** | SF-ID-003, SF-CHK-002 |

### BR-ID-004 — Account Lockout

| Field | Value |
| --- | --- |
| **Description** | After 5 failed login attempts within 15 minutes, the account is locked for 15 minutes. |
| **Condition** | Failed login attempts. |
| **Exception** | Admin can manually unlock with audit. |
| **Validation** | Counter increments per failed attempt; threshold triggers lock. |
| **Related Features** | SF-ID-013 |

### BR-ID-005 — Refresh Token Rotation

| Field | Value |
| --- | --- |
| **Description** | Refresh tokens rotate on each use; reuse triggers session invalidation. |
| **Condition** | Token refresh. |
| **Exception** | None. |
| **Validation** | Token store enforces one-time use. |
| **Related Features** | SF-ID-005, SF-ID-010 |

### BR-ID-006 — Admin MFA Mandatory

| Field | Value |
| --- | --- |
| **Description** | All admin accounts must enroll MFA (TOTP) within first login. |
| **Condition** | Admin login. |
| **Exception** | None in production. |
| **Validation** | Login blocked until MFA enrolled and verified. |
| **Related Features** | SF-ID-011 |

### BR-ID-007 — Role Changes Require Approval

| Field | Value |
| --- | --- |
| **Description** | Granting admin roles above base requires approval from another admin with elevated role. |
| **Condition** | Role assignment. |
| **Exception** | Initial bootstrap by System Administrator. |
| **Validation** | Audit log records approver. |
| **Related Features** | SF-ADM-009 |

### BR-ID-008 — Account Deletion Cooling-Off

| Field | Value |
| --- | --- |
| **Description** | Account deletion requests enter a 7-day cooling-off period before being executed. |
| **Condition** | Customer requests deletion. |
| **Exception** | None. |
| **Validation** | Scheduled job executes deletion after 7 days; user can cancel during the period. |
| **Related Features** | SF-ID-014 |

### BR-ID-009 — Customer Data Export

| Field | Value |
| --- | --- |
| **Description** | Customers may export their personal data in machine-readable format. |
| **Condition** | Customer request. |
| **Exception** | None. |
| **Validation** | Export job produces JSON file with personal data. |
| **Related Features** | SF-ID-014 |

---

## 9. Reviews Business Rules

### BR-RVW-001 — Verified Purchaser Only

| Field | Value |
| --- | --- |
| **Description** | Only customers who purchased and received a product may review it. |
| **Condition** | Review submission. |
| **Exception** | None. |
| **Validation** | System checks order history for completed purchase of the SKU. |
| **Related Features** | SF-RVW-001 |

### BR-RVW-002 — One Review per Order Item

| Field | Value |
| --- | --- |
| **Description** | A customer may submit one review per delivered order line item. |
| **Condition** | Review submission. |
| **Exception** | Customer may edit their review within 30 days. |
| **Validation** | Unique constraint on (customer, orderLineItem). |
| **Related Features** | SF-RVW-001 |

### BR-RVW-003 — Review Content Limits

| Field | Value |
| --- | --- |
| **Description** | Review text ≤ 1000 characters; rating 1–5 stars; up to 5 photos. |
| **Condition** | Review submission. |
| **Exception** | None. |
| **Validation** | Server-side validation. |
| **Related Features** | SF-RVW-002, SF-RVW-003 |

### BR-RVW-004 — Review Moderation Required

| Field | Value |
| --- | --- |
| **Description** | All reviews enter a moderation queue and are only published after admin approval. |
| **Condition** | Review submission. |
| **Exception** | None in V1. |
| **Validation** | Review status = `pending` until approved. |
| **Related Features** | SF-RVW-004, SF-ADM-007 |

### BR-RVW-005 — Prohibited Review Content

| Field | Value |
| --- | --- |
| **Description** | Reviews must not contain profanity, hate speech, personal data of others, or external links. |
| **Condition** | Moderation. |
| **Exception** | None. |
| **Validation** | Auto-filter check + manual moderation. |
| **Related Features** | SF-RVW-004 |

---

## 10. Promotions Business Rules

### BR-PRM-001 — Promotion Eligibility

| Field | Value |
| --- | --- |
| **Description** | A promotion applies only to products, categories, or brands explicitly listed in its eligibility configuration. |
| **Condition** | Promotion evaluation. |
| **Exception** | Site-wide promotions apply to all. |
| **Validation** | Promotion engine evaluates eligibility per cart line. |
| **Related Features** | SF-PRM-009 |

### BR-PRM-002 — Time Bounds Enforcement

| Field | Value |
| --- | --- |
| **Description** | A promotion is only valid between its configured start and end timestamps (Asia/Ho_Chi_Minh). |
| **Condition** | Promotion evaluation. |
| **Exception** | None. |
| **Validation** | Server-side time check using configured zone. |
| **Related Features** | SF-PRM-007 |

### BR-PRM-003 — Usage Limits

| Field | Value |
| --- | --- |
| **Description** | Promotions enforce total usage limit and per-customer usage limit; once reached, promotion cannot be applied. |
| **Condition** | Promotion application. |
| **Exception** | None. |
| **Validation** | Counters checked atomically. |
| **Related Features** | SF-PRM-008 |

### BR-PRM-004 — Voucher Code Uniqueness

| Field | Value |
| --- | --- |
| **Description** | Each voucher code must be unique within a promotion; codes are case-insensitive. |
| **Condition** | Voucher creation, redemption. |
| **Exception** | None. |
| **Validation** | Uniqueness check at creation; normalized lookup at redemption. |
| **Related Features** | SF-PRM-005 |

### BR-PRM-005 — Stacking Rules

| Field | Value |
| --- | --- |
| **Description** | Promotions may be marked as `stackable` or `exclusive`. Exclusive promotions cannot combine with any other. |
| **Condition** | Multiple promotions in cart. |
| **Exception** | None. |
| **Validation** | Promotion engine applies stacking policy. |
| **Related Features** | SF-PRM-005, SF-PRM-009 |

### BR-PRM-006 — Discount Ceiling

| Field | Value |
| --- | --- |
| **Description** | The total discount on a single order may not exceed the order subtotal. |
| **Condition** | Discount application. |
| **Exception** | None. |
| **Validation** | Discount capped at subtotal. |
| **Related Features** | SF-PRM-001, SF-PRM-002 |

### BR-PRM-007 — Flash Sale Per-Customer Limit

| Field | Value |
| --- | --- |
| **Description** | Flash sales enforce per-customer purchase limits (default 2 units per SKU). |
| **Condition** | Flash sale purchase. |
| **Exception** | Admin override. |
| **Validation** | Counted per customer per SKU per flash sale. |
| **Related Features** | SF-PRM-006 |

### BR-PRM-008 — Promotion Modification Lock

| Field | Value |
| --- | --- |
| **Description** | Promotions with redemptions cannot be deleted; only deactivated. |
| **Condition** | Promotion deletion attempt. |
| **Exception** | None. |
| **Validation** | Block delete if redemption count > 0. |
| **Related Features** | SF-PRM-005, SF-ADM-005 |

---

## 11. Returns Business Rules

### BR-RTN-001 — Return Window

| Field | Value |
| --- | --- |
| **Description** | Customers may request returns within 7 days of delivery confirmation. |
| **Condition** | Return request. |
| **Exception** | Defective items may be returned within warranty period. |
| **Validation** | Compare request date with delivery date. |
| **Related Features** | SF-RTN-001 |

### BR-RTN-002 — Eligible Items for Return

| Field | Value |
| --- | --- |
| **Description** | Items must be in original condition; installed, modified, or damaged-by-customer items may be rejected. |
| **Condition** | Return approval. |
| **Exception** | Defective on arrival accepted. |
| **Validation** | Admin reviews and approves manually. |
| **Related Features** | SF-RTN-004 |

### BR-RTN-003 — Refund Method

| Field | Value |
| --- | --- |
| **Description** | Refunds are issued to the original payment method. |
| **Condition** | Refund processing. |
| **Exception** | None in V1. |
| **Validation** | Refund request references original payment. |
| **Related Features** | SF-RTN-006 |

### BR-RTN-004 — Refund Timing

| Field | Value |
| --- | --- |
| **Description** | Refunds are processed within 5 business days of return receipt confirmation. |
| **Condition** | Return received. |
| **Exception** | None. |
| **Validation** | SLA tracked. |
| **Related Features** | SF-RTN-006 |

### BR-RTN-005 — Warranty Validity

| Field | Value |
| --- | --- |
| **Description** | Warranty claims are valid only within the product's stated warranty period. |
| **Condition** | Warranty claim. |
| **Exception** | None. |
| **Validation** | Compare claim date with warranty period from product record. |
| **Related Features** | SF-RTN-007 |

### BR-RTN-006 — RMA Required for Returns

| Field | Value |
| --- | --- |
| **Description** | A return shipment requires a valid RMA number issued by the system. |
| **Condition** | Return shipment. |
| **Exception** | None. |
| **Validation** | Warehouse checks RMA on receipt. |
| **Related Features** | SF-RTN-003 |

### BR-RTN-007 — One Open Return per Order

| Field | Value |
| --- | --- |
| **Description** | Only one return request per order line item is allowed. |
| **Condition** | Return request. |
| **Exception** | Warranty claims create separate records. |
| **Validation** | Unique constraint on (orderLineItem, returnType). |
| **Related Features** | SF-RTN-001 |

---

## 12. Payment Business Rules

### BR-PAY-001 — PCI Scope Minimization

| Field | Value |
| --- | --- |
| **Description** | SmartLight does not store raw payment card numbers; only tokens from the payment provider are stored. |
| **Condition** | Payment processing. |
| **Exception** | None. |
| **Validation** | No PAN fields accepted or stored on SmartLight infrastructure. |
| **Related Features** | SF-CHK-006, SF-CHK-008 |

### BR-PAY-002 — Payment Confirmation Source

| Field | Value |
| --- | --- |
| **Description** | Order is marked `Paid` only upon verified webhook callback from payment provider, signed with shared secret. |
| **Condition** | Payment confirmation. |
| **Exception** | Manual confirmation by Admin with reason and audit. |
| **Validation** | Webhook signature verified. |
| **Related Features** | SF-CHK-009, SF-ORD-001 |

### BR-PAY-003 — Refund Integrity

| Field | Value |
| --- | --- |
| **Description** | Total refunded amount per payment cannot exceed original payment amount. |
| **Condition** | Refund issuance. |
| **Exception** | None. |
| **Validation** | Sum of refunds for payment ≤ payment amount. |
| **Related Features** | SF-RTN-006, BR-ORD-006 |

### BR-PAY-004 — Payment Timeout

| Field | Value |
| --- | --- |
| **Description** | If payment is not confirmed within 30 minutes of order placement, the order is cancelled. |
| **Condition** | Order pending payment. |
| **Exception** | Admin extension with audit. |
| **Validation** | Scheduled job cancels. |
| **Related Features** | SF-ORD-003, BR-CHK-008 |

### BR-PAY-005 — Currency Match

| Field | Value |
| --- | --- |
| **Description** | Payment requests to provider must specify VND; amount must match order total exactly. |
| **Condition** | Payment creation. |
| **Exception** | None. |
| **Validation** | Currency and amount enforced before request. |
| **Related Features** | SF-CHK-008 |

---

## 13. Notifications Business Rules

### BR-NOT-001 — Transactional vs Marketing Separation

| Field | Value |
| --- | --- |
| **Description** | Transactional emails (order, shipping, return) are always sent; marketing emails require explicit opt-in. |
| **Condition** | Email send. |
| **Exception** | None. |
| **Validation** | Preference check before marketing sends. |
| **Related Features** | SF-NOT-001, SF-NOT-006 |

### BR-NOT-002 — Email Frequency Cap (Marketing)

| Field | Value |
| --- | --- |
| **Description** | Marketing emails may not exceed 1 per customer per day. |
| **Condition** | Marketing email send. |
| **Exception** | Critical service messages. |
| **Validation** | Frequency cap enforced. |
| **Related Features** | SF-NOT-001 |

### BR-NOT-003 — Email Retry Policy

| Field | Value |
| --- | --- |
| **Description** | Failed emails retry up to 5 times with exponential backoff (1m, 5m, 30m, 2h, 12h). |
| **Condition** | Send failure. |
| **Exception** | None. |
| **Validation** | Retry queue configured. |
| **Related Features** | SF-NOT-004 |

### BR-NOT-004 — Bounce Handling

| Field | Value |
| --- | --- |
| **Description** | Hard bounces mark the customer's email as invalid and disable further non-critical emails. |
| **Condition** | Bounce webhook. |
| **Exception** | Transactional emails continue (with logging). |
| **Validation** | Bounce event updates email status. |
| **Related Features** | SF-NOT-001 |

### BR-NOT-005 — Vietnamese Character Support

| Field | Value |
| --- | --- |
| **Description** | Email templates must support Vietnamese diacritics and UTF-8 encoding throughout. |
| **Condition** | Template rendering. |
| **Exception** | None. |
| **Validation** | Template tests include Vietnamese strings. |
| **Related Features** | SF-NOT-002 |

---

## 14. Support Business Rules

### BR-SUP-001 — Ticket Response SLA

| Field | Value |
| --- | --- |
| **Description** | First agent response to a customer ticket within 4 business hours during business days. |
| **Condition** | New ticket. |
| **Exception** | Tickets outside business hours measured from next business hour. |
| **Validation** | Time tracked and reported. |
| **Related Features** | SF-SUP-007 |

### BR-SUP-002 — Ticket Closure

| Field | Value |
| --- | --- |
| **Description** | Tickets auto-close after 7 days of inactivity following agent resolution. |
| **Condition** | Resolved ticket. |
| **Exception** | Customer can re-open within 7 days. |
| **Validation** | Cron job enforces. |
| **Related Features** | SF-SUP-006 |

### BR-SUP-003 — Ticket Privacy

| Field | Value |
| --- | --- |
| **Description** | Customers may only view their own tickets; agents only within assigned scope. |
| **Condition** | Ticket access. |
| **Exception** | System Administrator with audit. |
| **Validation** | Authorization checks server-side. |
| **Related Features** | SF-SUP-003 |

### BR-SUP-004 — Internal Notes Hidden from Customers

| Field | Value |
| --- | --- |
| **Description** | Notes flagged as `internal` are visible only to agents and admins. |
| **Condition** | Note creation. |
| **Exception** | None. |
| **Validation** | API filter excludes internal notes from customer view. |
| **Related Features** | SF-SUP-004 |

---

## 15. Admin Business Rules

### BR-ADM-001 — Audit Log Immutability

| Field | Value |
| --- | --- |
| **Description** | Audit log entries cannot be edited or deleted by any user, including System Administrator. |
| **Condition** | Audit log operation. |
| **Exception** | None. |
| **Validation** | Database-level append-only enforcement. |
| **Related Features** | SF-ADM-010 |

### BR-ADM-002 — Sensitive Operations Recorded

| Field | Value |
| --- | --- |
| **Description** | All operations that modify prices, refunds, role assignments, or admin users are recorded in audit log with actor, timestamp, before/after. |
| **Condition** | Sensitive operation. |
| **Exception** | None. |
| **Validation** | Audit middleware captures all designated events. |
| **Related Features** | SF-ADM-010 |

### BR-ADM-003 — No Self-Approval

| Field | Value |
| --- | --- |
| **Description** | An admin cannot approve their own requests (e.g., role change, large refund). |
| **Condition** | Approval action. |
| **Exception** | System Administrator bootstrapping. |
| **Validation** | Comparison of actor and target IDs. |
| **Related Features** | SF-ADM-009, BR-ORD-005 |

### BR-ADM-004 — Admin Session Timeout

| Field | Value |
| --- | --- |
| **Description** | Admin sessions expire after 30 minutes of inactivity. |
| **Condition** | Idle admin session. |
| **Exception** | None. |
| **Validation** | Server-side session validation. |
| **Related Features** | SF-ID-005 |

### BR-ADM-005 — Data Export Limits

| Field | Value |
| --- | --- |
| **Description** | CSV exports are limited to 50,000 rows per export to protect server resources. |
| **Condition** | Export request. |
| **Exception** | Admin can request scheduled, larger exports. |
| **Validation** | Row count enforced. |
| **Related Features** | SF-ANL-006 |

---

## 16. Platform Business Rules

### BR-PLT-001 — Cookie Consent

| Field | Value |
| --- | --- |
| **Description** | Non-essential cookies (analytics, marketing) may only be set after explicit user consent. |
| **Condition** | First visit. |
| **Exception** | Essential cookies (session, cart) may be set without consent. |
| **Validation** | Consent banner blocks non-essential cookies until accepted. |
| **Related Features** | SF-PLT-008 |

### BR-PLT-002 — HTTPS Everywhere

| Field | Value |
| --- | --- |
| **Description** | All traffic over HTTPS; HTTP redirects to HTTPS; HSTS enabled. |
| **Condition** | Always. |
| **Exception** | Local development. |
| **Validation** | Reverse proxy / hosting enforces. |
| **Related Features** | NFR-SEC-001, NFR-SEC-002 |

### BR-PLT-003 — Vietnamese Content Priority

| Field | Value |
| --- | --- |
| **Description** | Vietnamese is the default and only user-facing language in V1. |
| **Condition** | Always. |
| **Exception** | None. |
| **Validation** | Default locale = `vi`. |
| **Related Features** | SF-I18-001 |

### BR-PLT-004 — Feature Flag Defaults

| Field | Value |
| --- | --- |
| **Description** | New features are rolled out behind feature flags, defaulting to `off`. |
| **Condition** | Feature launch. |
| **Exception** | None. |
| **Validation** | Flag required for any new feature path. |
| **Related Features** | SF-PLT-006 |

### BR-PLT-005 — Structured Data on PDP

| Field | Value |
| --- | --- |
| **Description** | All product pages must include valid JSON-LD Product schema. |
| **Condition** | Page render. |
| **Exception** | None. |
| **Validation** | Automated SEO audit. |
| **Related Features** | SF-CAT-015 |

---

## 17. Cross-Module Rules

### BR-X-001 — Money Never Floats

| Field | Value |
| --- | --- |
| **Description** | All monetary values stored as integers (minor units) or `Decimal(18,2)`. Never `float` or `double`. |
| **Condition** | Database schema and computations. |
| **Exception** | None. |
| **Validation** | Lint rule and type system enforcement. |
| **Related Features** | SF-X-003 |

### BR-X-002 — Timestamps in UTC

| Field | Value |
| --- | --- |
| **Description** | All timestamps stored in UTC; converted to `Asia/Ho_Chi_Minh` only at presentation. |
| **Condition** | Always. |
| **Exception** | None. |
| **Validation** | Code review and lint rules. |
| **Related Features** | NFR-I18-004 |

### BR-X-003 — Inventory Decrement at Order

| Field | Value |
| --- | --- |
| **Description** | Inventory is decremented (committed) at order creation, not at payment confirmation. |
| **Condition** | Order creation. |
| **Exception** | None. |
| **Validation** | Atomic decrement in transaction. |
| **Related Features** | SF-X-001, SF-ORD-001 |

### BR-X-004 — PII Access Logging

| Field | Value |
| --- | --- |
| **Description** | Any access to customer PII by admin staff is logged with actor and reason. |
| **Condition** | PII view. |
| **Exception** | None. |
| **Validation** | Service-layer logging enforced. |
| **Related Features** | SF-ADM-010 |

### BR-X-005 — Data Retention

| Field | Value |
| --- | --- |
| **Description** | Customer order data retained for 5 years (tax/audit); marketing data until consent withdrawn; logs for 90 days. |
| **Condition** | Retention cycle. |
| **Exception** | Legal hold may extend retention. |
| **Validation** | Scheduled cleanup jobs enforce. |
| **Related Features** | NFR-COMP-001 |

### BR-X-006 — Single Source of Truth

| Field | Value |
| --- | --- |
| **Description** | Pricing, stock, and product data are read from canonical sources only; no duplication across modules. |
| **Condition** | Always. |
| **Exception** | Caching with TTL is allowed. |
| **Validation** | Architecture review and code review. |
| **Related Features** | All |

---

## 18. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 0.1 | 2026-07-02 | Principal Business Analyst | Initial draft with 70+ rules across 14 modules |

---

**End of Document — BUSINESS_RULES.md**
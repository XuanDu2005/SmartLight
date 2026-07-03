# USE_CASE_SPECIFICATIONS.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal System Analyst

This document provides detailed specifications for the 24 **most critical** Use Cases identified in `USE_CASE_MODEL.md`. Each specification follows the standard template: ID, Name, Description, Actors, Preconditions, Trigger, Main Flow, Alternative Flow, Exception Flow, Post-Conditions, Business Rules, Features, User Stories. The remaining 80 use cases are tracked in `USE_CASE_MODEL.md` with their relationships and inherit the same template patterns documented here.

---

## Template

For every Use Case:

```
ID:               UC-MOD-NNN
Name:             <Verb Phrase>
Description:      <1-3 sentences>
Primary Actor:    <Actor ID>
Secondary Actors: <Actor IDs>
Preconditions:    <list>
Trigger:          <event>
Main Flow:        numbered steps
Alt Flow:         variations
Exception Flow:   failures
Post-Conditions:  success state
Business Rules:   BR-* references
Features:         SF-* references
User Stories:     US-* references
```

---

## UC-ID-001 — Register Account

| Field | Value |
| --- | --- |
| **ID** | UC-ID-001 |
| **Name** | Register Account |
| **Description** | A Guest creates a new customer account with email, password, and basic profile. |
| **Primary Actor** | A-GUEST |
| **Secondary Actors** | A-EMAIL-SVC |
| **Preconditions** | Email is not already registered. Password meets complexity rules (BR-ID-002). |
| **Trigger** | Guest clicks "Đăng ký" and submits registration form. |
| **Main Flow** | 1. Guest navigates to `/register`.<br>2. System displays registration form (email, password, confirm password, name).<br>3. Guest submits form.<br>4. System validates email format, password complexity.<br>5. System creates customer account with `emailVerified = false`.<br>6. System generates email verification token (24h expiry).<br>7. System queues verification email via A-EMAIL-SVC.<br>8. System displays "Vui lòng kiểm tra email để xác nhận". |
| **Alternative Flow** | 3a. Email already exists → system shows "Email đã được đăng ký".<br>5a. Guest came from checkout (UC-CHK-007) → email is auto-verified after payment success (BR-GCH-003). |
| **Exception Flow** | 7a. Email send fails → system logs; verification email is retried (BullMQ, 3 attempts). |
| **Post-Conditions** | Customer account created; verification email sent; user cannot login until email verified (unless registered at checkout). |
| **Business Rules** | BR-ID-001, BR-ID-002, BR-ID-003 |
| **Features** | SF-ID-001, SF-ID-002, SF-ID-003, SF-NOT-001 |
| **User Stories** | US-GUEST-010, US-GUEST-015 |

---

## UC-ID-002 — Login

| Field | Value |
| --- | --- |
| **ID** | UC-ID-002 |
| **Name** | Login |
| **Description** | Authenticate user (customer or admin staff) with email + password (+ MFA for admin staff). |
| **Primary Actor** | A-GUEST, A-CUSTOMER, All Admin Staff |
| **Secondary Actors** | A-EMAIL-SVC (lockout) |
| **Preconditions** | Account exists; email verified (for customer). |
| **Trigger** | User submits login form. |
| **Main Flow** | 1. User navigates to `/login` or `/admin/login`.<br>2. System displays login form.<br>3. User submits email + password.<br>4. System verifies credentials (Argon2id).<br>5a. **Customer path:** System issues JWT access token + refresh token; redirect to home.<br>5b. **Admin path:** System prompts for TOTP code; on valid code, issue admin tokens. |
| **Alternative Flow** | 5a-ext. "Remember me" checked → longer refresh token TTL (30 days). |
| **Exception Flow** | 4a. Wrong password → increment failed counter; show generic error.<br>4b. After 5 failures (BR-ID-013) → lock account 15 min; send email notification.<br>5b-exc. Invalid TOTP → reject; do not increment customer-side counter; admin must contact Tech Lead after multiple failures (BR-MFA-003). |
| **Post-Conditions** | User authenticated; session tokens issued; audit log entry for admin logins. |
| **Business Rules** | BR-ID-005, BR-ID-013, BR-MFA-001, BR-MFA-002, BR-ADM-002 |
| **Features** | SF-ID-004, SF-ID-005, SF-ID-011, SF-ID-013 |
| **User Stories** | US-GUEST-013, US-CUST-001, US-ADM-007 |

---

## UC-ID-006 — Enable MFA

| Field | Value |
| --- | --- |
| **ID** | UC-ID-006 |
| **Name** | Enable Multi-Factor Authentication |
| **Description** | Admin staff sets up TOTP MFA on first login. Customer MFA not required in V1.0. |
| **Primary Actor** | A-ADMIN, A-SELLER, A-SUPPORT, A-CATALOG-MGR, A-FULFILLMENT, A-FINANCE |
| **Preconditions** | Admin account exists; first login (MFA not yet configured). |
| **Trigger** | First-time admin login or "Enable MFA" in account settings. |
| **Main Flow** | 1. Admin completes password login (UC-ID-002 step 4).<br>2. System detects MFA not configured.<br>3. System generates TOTP secret + QR code (otpauth URI).<br>4. Admin scans QR with authenticator app.<br>5. Admin enters 6-digit code to verify.<br>6. System verifies code; on success, stores secret encrypted.<br>7. System generates 8 single-use recovery codes.<br>8. Admin saves recovery codes; MFA setup complete. |
| **Alternative Flow** | (V1.1) Hardware key (FIDO2/YubiKey) supported. |
| **Exception Flow** | 5a. Code invalid → retry up to 3 times; on exhaustion, restart setup. |
| **Post-Conditions** | MFA enabled; admin can complete login on next attempt. |
| **Business Rules** | BR-MFA-001, BR-MFA-003, NFR-SEC-012 |
| **Features** | SF-ID-011 |
| **User Stories** | US-ADM-007 |

---

## UC-CRT-001 — Add to Cart

| Field | Value |
| --- | --- |
| **ID** | UC-CRT-001 |
| **Name** | Add Product to Cart |
| **Description** | User adds a product variant with selected quantity to the cart. |
| **Primary Actor** | A-GUEST, A-CUSTOMER |
| **Secondary Actors** | A-INVENTORY-WORKER |
| **Preconditions** | Product variant exists; stock available. |
| **Trigger** | User clicks "Thêm vào giỏ" on PDP. |
| **Main Flow** | 1. User on PDP selects variant + quantity.<br>2. User clicks "Thêm vào giỏ".<br>3. System validates variant, quantity, stock availability (BR-INV-003).<br>4. System creates/updates cart line (UC-CRT-003).<br>5. System creates inventory reservation: 15-min expiry (BR-INV-002).<br>6. System returns updated cart summary. |
| **Alternative Flow** | 1a. Guest → cart stored in cookie/local storage.<br>1b. Customer → cart stored in DB; persisted across devices. |
| **Exception Flow** | 3a. Out of stock → system shows "Hết hàng".<br>3b. Quantity > available → show max available.<br>3c. Last-unit race → 409 Conflict (BR-INV-003). |
| **Post-Conditions** | Cart line created; reservation active; cart count badge updated. |
| **Business Rules** | BR-INV-002, BR-INV-003, BR-CRT-001 |
| **Features** | SF-CRT-001, SF-INV-002 |
| **User Stories** | US-GUEST-008 |

---

## UC-CHK-001 — Begin Checkout

| Field | Value |
| --- | --- |
| **ID** | UC-CHK-001 |
| **Name** | Begin Checkout |
| **Description** | User starts the checkout flow from cart. |
| **Primary Actor** | A-GUEST, A-CUSTOMER |
| **Preconditions** | Cart has at least one line; user not already in checkout session. |
| **Trigger** | User clicks "Tiến hành thanh toán". |
| **Main Flow** | 1. User on cart page clicks "Tiến hành thanh toán".<br>2. System validates cart (active reservations, prices, stock).<br>3. System creates checkout session (15-min TTL).<br>4. System redirects to step 1 (email/address). |
| **Alternative Flow** | (none) |
| **Exception Flow** | 2a. Reservation expired → show cart with updated stock; force re-add.<br>2b. Price changed → show diff and ask confirmation. |
| **Post-Conditions** | Checkout session created; user on address step. |
| **Business Rules** | BR-CHK-001, BR-CHK-007 |
| **Features** | SF-CHK-001 |
| **User Stories** | US-GUEST-009, US-CUST-005 |

---

## UC-CHK-007 — Complete Guest Checkout

| Field | Value |
| --- | --- |
| **ID** | UC-CHK-007 |
| **Name** | Complete Checkout as Guest |
| **Description** | Guest completes checkout without creating an account. |
| **Primary Actor** | A-GUEST |
| **Secondary Actors** | A-PAYMENT-GW, A-EMAIL-SVC |
| **Preconditions** | All checkout steps completed; payment method selected. |
| **Trigger** | Guest clicks "Thanh toán". |
| **Main Flow** | 1. Guest on review step clicks "Thanh toán".<br>2. System double-submit prevention (idempotency token, BR-CHK-007).<br>3. System creates Order in `Pending` state (UC-ORD-001).<br>4. System creates Payment Intent (UC-PAY-001).<br>5. System redirects to payment provider hosted page.<br>6. User authorizes payment at provider.<br>7. Provider returns via redirect; system displays "Đang xử lý...".<br>8. Webhook arrives (UC-PAY-003); order transitions to `Confirmed`.<br>9. System sends order confirmation email.<br>10. System sends magic link for guest order tracking (BR-GCH-004). |
| **Alternative Flow** | 7a. Optional "Create account" checkbox ticked → after step 8, system creates customer account with `emailVerified = true`; orders linked (BR-GCH-003). |
| **Exception Flow** | 6a. Payment fails → UC-PAY-006 retry.<br>8a. Webhook delayed → UC-PAY-004 reconciliation activates within 1h.<br>9a. Email fails → retry queue. |
| **Post-Conditions** | Order confirmed; payment captured; confirmation email sent; guest can track via magic link. |
| **Business Rules** | BR-CHK-007, BR-CHK-008, BR-CHK-010, BR-CHK-011, BR-GCH-001, BR-GCH-002, BR-GCH-003, BR-GCH-004, BR-INV-001, BR-OSM-001, BR-PAY-002, BR-PAY-006, BR-PAY-007, BR-PAY-008, BR-TAX-001, BR-TAX-002, BR-TAX-004 |
| **Features** | SF-CHK-002, SF-CHK-007, SF-CHK-008, SF-CHK-009, SF-CHK-011, SF-ORD-001, SF-ORD-002, SF-ORD-003, SF-PAY-001, SF-PAY-002, SF-PAY-003, SF-INV-001, SF-TAX-001, SF-TAX-002, SF-NOT-001 |
| **User Stories** | US-GUEST-014, US-GUEST-015, US-GUEST-016 |

---

## UC-PAY-001 — Create Payment Intent

| Field | Value |
| --- | --- |
| **ID** | UC-PAY-001 |
| **Name** | Create Payment Intent |
| **Description** | System creates a payment intent at the provider for an order. |
| **Primary Actor** | System |
| **Secondary Actors** | A-PAYMENT-GW |
| **Preconditions** | Order in `Pending` state; order has no active intent. |
| **Trigger** | Order creation triggers payment intent creation. |
| **Main Flow** | 1. System invokes provider `create-intent` API with order ID, amount, return URL, webhook URL.<br>2. Provider returns `intentId`, `redirectUrl`.<br>3. System persists `currentPaymentIntentId` on order.<br>4. System returns redirect URL to checkout flow. |
| **Alternative Flow** | (none) |
| **Exception Flow** | 1a. Provider API timeout → retry with exponential backoff (3 attempts).<br>1b. Provider returns error → UC-PAY-006 retry path. |
| **Post-Conditions** | Payment intent created; order linked; user redirected. |
| **Business Rules** | BR-PAY-006, BR-PAY-001 |
| **Features** | SF-PAY-001 |
| **User Stories** | US-CUST-007 |

---

## UC-PAY-003 — Receive Payment Webhook

| Field | Value |
| --- | --- |
| **ID** | UC-PAY-003 |
| **Name** | Receive Payment Webhook |
| **Description** | Provider sends signed webhook event; system reconciles order status. |
| **Primary Actor** | A-PAYMENT-GW |
| **Secondary Actors** | None |
| **Preconditions** | Payment intent created. |
| **Trigger** | Provider sends HTTP POST to `/api/payments/webhook`. |
| **Main Flow** | 1. System receives POST request.<br>2. System verifies HMAC-SHA256 signature (BR-PAY-008).<br>3. System checks for duplicate event ID (idempotency, BR-PAY-007).<br>4. System locates order by `intentId`.<br>5. If event = `payment.succeeded`: order → `Confirmed` (BR-OSM-001); stock decremented (BR-INV-001).<br>6. If event = `payment.failed`: order → `Cancelled`; reservation released.<br>7. System stores webhook event log (audit). |
| **Alternative Flow** | 5-ext. Event = `refund.completed` → UC-PAY-005 flow. |
| **Exception Flow** | 2a. Invalid signature → return 401; log.<br>3a. Duplicate → return 200; skip.<br>5a. Order not found → log error; alert Sev-2. |
| **Post-Conditions** | Order status reconciled; audit log updated. |
| **Business Rules** | BR-PAY-002, BR-PAY-007, BR-PAY-008, BR-INV-001, BR-OSM-001 |
| **Features** | SF-PAY-003 |
| **User Stories** | US-CUST-007 |

---

## UC-PAY-004 — Reconcile Payment Status

| Field | Value |
| --- | --- |
| **ID** | UC-PAY-004 |
| **Name** | Reconcile Payment Status |
| **Description** | Hourly worker detects missed webhooks and reconciles order status. |
| **Primary Actor** | A-RECONCILIATION |
| **Secondary Actors** | A-PAYMENT-GW |
| **Preconditions** | Orders in `Pending` state > 5 minutes. |
| **Trigger** | Hourly cron. |
| **Main Flow** | 1. Cron selects orders in `Pending` > 5 min.<br>2. For each order, query provider API for intent status.<br>3. If provider says `succeeded` but order is `Pending` → trigger UC-PAY-003 reconciliation logic.<br>4. If provider says `failed` → cancel order, release reservation.<br>5. Log reconciliation outcome. |
| **Alternative Flow** | (none) |
| **Exception Flow** | 2a. Provider rate limit → exponential backoff.<br>5a. Order unresolved after 24h → Sev-2 alert. |
| **Post-Conditions** | Missed webhooks recovered; alerted if persistent issues. |
| **Business Rules** | BR-PAY-010 |
| **Features** | SF-PAY-005 |
| **User Stories** | US-FIN-005 |

---

## UC-PAY-005 — Issue Refund

| Field | Value |
| --- | --- |
| **ID** | UC-PAY-005 |
| **Name** | Issue Refund |
| **Description** | Admin or Finance issues a refund to original payment method. |
| **Primary Actor** | A-ADMIN, A-FINANCE |
| **Secondary Actors** | A-PAYMENT-GW, A-EMAIL-SVC |
| **Preconditions** | Original payment captured; refund approved (UC-RTN-005). |
| **Trigger** | Admin clicks "Hoàn tiền" on return/return detail. |
| **Main Flow** | 1. Admin selects refund amount (full or partial) and reason.<br>2. System validates amount ≤ remaining refundable.<br>3. System invokes provider refund API with `intentId` and amount (BR-PAY-009).<br>4. Provider returns `refundId`.<br>5. System persists refund record linked to original payment.<br>6. System triggers customer refund confirmation email. |
| **Alternative Flow** | 6a. Customer requested refund → notify customer. |
| **Exception Flow** | 3a. Provider error → retry queue (3 attempts); admin notified.<br>3b. Refund window expired → admin must use manual bank transfer (BR-PAY-009 exception). |
| **Post-Conditions** | Refund processed; customer notified; audit log updated. |
| **Business Rules** | BR-PAY-009, BR-RTN-006, BR-RTN-007 |
| **Features** | SF-PAY-004 |
| **User Stories** | US-CUST-019, US-CUST-027, US-FIN-002 |

---

## UC-ORD-001 — Create Order

| Field | Value |
| --- | --- |
| **ID** | UC-ORD-001 |
| **Name** | Create Order |
| **Description** | System creates an order from a successful checkout. |
| **Primary Actor** | System |
| **Secondary Actors** | None |
| **Preconditions** | Cart validated; address & shipping selected; payment authorized (intent created). |
| **Trigger** | Checkout submit. |
| **Main Flow** | 1. System begins DB transaction.<br>2. System computes order totals: subtotal, shipping fee, discount (voucher), VAT (BR-TAX-001).<br>3. System assigns unique order number (`YYYYMMDD-XXXX`).<br>4. System persists order in `Pending` state with line items, `taxAmount`, `taxRate` snapshot (BR-TAX-004).<br>5. System persists addresses, shipping, payment info.<br>6. System commits transaction.<br>7. System creates payment intent (UC-PAY-001). |
| **Alternative Flow** | (none) |
| **Exception Flow** | 2a. Price mismatch → reject checkout; show updated cart. |
| **Post-Conditions** | Order in `Pending`; awaiting payment confirmation. |
| **Business Rules** | BR-ORD-001, BR-ORD-002, BR-TAX-001, BR-TAX-004, BR-TAX-005 |
| **Features** | SF-ORD-001, SF-ORD-002, SF-TAX-001 |
| **User Stories** | US-CUST-005, US-CUST-007 |

---

## UC-ORD-007 — Update Order Status

| Field | Value |
| --- | --- |
| **ID** | UC-ORD-007 |
| **Name** | Update Order Status |
| **Description** | Admin or Fulfillment transitions an order to a new state per allowed transitions. |
| **Primary Actor** | A-ADMIN, A-FULFILLMENT |
| **Secondary Actors** | A-EMAIL-SVC, A-SHIPPING-PROV |
| **Preconditions** | Order exists; transition is in allowed table (BR-OSM-001). |
| **Trigger** | Admin/Fulfillment changes status in admin UI. |
| **Main Flow** | 1. Admin opens order detail.<br>2. Admin selects new status (e.g., `Processing`).<br>3. System validates transition against BR-OSM-001.<br>4. System writes `order_status_history` entry (BR-OSM-003).<br>5. System executes side effects (e.g., → `Shipped` triggers UC-ORD-009). |
| **Alternative Flow** | 4-ext. Invalid transition → return 409 Conflict with reason. |
| **Exception Flow** | 4a. Terminal state (Cancelled/Completed/Returned) → reject (BR-OSM-002). |
| **Post-Conditions** | Order in new state; history entry written; side effects executed. |
| **Business Rules** | BR-OSM-001, BR-OSM-002, BR-OSM-003, BR-ADM-002 |
| **Features** | SF-ORD-003, SF-ORD-004 |
| **User Stories** | US-ORD-002 |

---

## UC-INV-002 — Reserve Stock

| Field | Value |
| --- | --- |
| **ID** | UC-INV-002 |
| **Name** | Reserve Stock |
| **Description** | System reserves stock for a cart or order. |
| **Primary Actor** | System |
| **Secondary Actors** | None |
| **Preconditions** | Variant has available stock. |
| **Trigger** | Add-to-cart or order creation. |
| **Main Flow** | 1. System validates variant stock ≥ requested qty (BR-INV-003).<br>2. System locks stock row (`SELECT FOR UPDATE`).<br>3. System creates reservation record: variantId, qty, expiresAt = now + 15 min (BR-INV-002).<br>4. System computes available = on_hand − reserved.<br>5. System commits. |
| **Alternative Flow** | (Order creation) reservation converted to decrement (BR-INV-001). |
| **Exception Flow** | 1a. Concurrent race → second request fails with 409. |
| **Post-Conditions** | Stock reserved; available count decreased. |
| **Business Rules** | BR-INV-002, BR-INV-003 |
| **Features** | SF-INV-002 |
| **User Stories** | US-GUEST-008 |

---

## UC-INV-003 — Release Reservation

| Field | Value |
| --- | --- |
| **ID** | UC-INV-003 |
| **Name** | Release Expired Reservation |
| **Description** | Scheduled worker releases reservations older than 15 min. |
| **Primary Actor** | A-INVENTORY-WORKER |
| **Secondary Actors** | None |
| **Preconditions** | Reservations table contains expired rows. |
| **Trigger** | Cron job every minute. |
| **Main Flow** | 1. Worker selects reservations where `expiresAt < now`.<br>2. For each: delete reservation row.<br>3. Available stock recomputed.<br>4. If cart no longer has any active reservation → cart may be marked stale. |
| **Alternative Flow** | (none) |
| **Exception Flow** | (none expected) |
| **Post-Conditions** | Expired reservations removed; stock returned to available pool. |
| **Business Rules** | BR-INV-002, BR-INV-007 |
| **Features** | SF-INV-002 |
| **User Stories** | (operational) |

---

## UC-INV-004 — Adjust Stock Manually

| Field | Value |
| --- | --- |
| **ID** | UC-INV-004 |
| **Name** | Adjust Stock Manually |
| **Description** | Catalog Manager adjusts stock with reason code. |
| **Primary Actor** | A-CATALOG-MGR |
| **Secondary Actors** | None |
| **Preconditions** | Variant exists. |
| **Trigger** | Catalog Manager clicks "Điều chỉnh tồn kho" on variant detail. |
| **Main Flow** | 1. Manager opens variant inventory tab.<br>2. Manager enters new quantity and reason code (damage / audit / theft / other).<br>3. Manager submits.<br>4. System validates reason code.<br>5. System updates stock-on-hand.<br>6. System writes audit log entry (BR-INV-005). |
| **Alternative Flow** | (none) |
| **Exception Flow** | 4a. Missing reason → reject.<br>5a. Adjustment makes stock negative → reject. |
| **Post-Conditions** | Stock updated; audit log entry written. |
| **Business Rules** | BR-INV-005, BR-ADM-002 |
| **Features** | SF-INV-004 |
| **User Stories** | US-ADM-009 |

---

## UC-INV-005 — Receive Low Stock Alert

| Field | Value |
| --- | --- |
| **ID** | UC-INV-005 |
| **Name** | Receive Low Stock Alert |
| **Description** | System alerts Catalog Manager when stock falls below threshold. |
| **Primary Actor** | System (triggered by stock mutation) |
| **Secondary Actors** | A-EMAIL-SVC |
| **Preconditions** | Variant has `lowStockThreshold > 0`. |
| **Trigger** | Stock-on-hand crosses below threshold. |
| **Main Flow** | 1. Stock mutation occurs (order, adjustment, etc.).<br>2. System compares new stock vs threshold (BR-INV-004).<br>3. If below → system queues admin email and dashboard banner.<br>4. Catalog Manager sees banner / email. |
| **Alternative Flow** | (none) |
| **Exception Flow** | 3a. Email send fails → retry queue. |
| **Post-Conditions** | Manager notified; banner visible. |
| **Business Rules** | BR-INV-004 |
| **Features** | SF-INV-003 |
| **User Stories** | US-ADM-008, US-CAT-005 |

---

## UC-INV-006 — Restock After Return Inspection

| Field | Value |
| --- | --- |
| **ID** | UC-INV-006 |
| **Name** | Restock Returned Item |
| **Description** | Fulfillment inspects returned item; restocks sellable or disposes damaged. |
| **Primary Actor** | A-FULFILLMENT |
| **Secondary Actors** | None |
| **Preconditions** | Returned item received; return approved (UC-RTN-002). |
| **Trigger** | Fulfillment marks inspection outcome. |
| **Main Flow** | 1. Fulfillment opens return detail.<br>2. Fulfillment marks outcome: PASS (sellable) / FAIL (damaged).<br>3a. **PASS:** system increments stock-on-hand (BR-INV-006).<br>3b. **FAIL:** system increments `disposed` counter; does NOT touch sellable stock. |
| **Alternative Flow** | (none) |
| **Exception Flow** | (none) |
| **Post-Conditions** | Inventory reconciled; audit log updated. |
| **Business Rules** | BR-INV-006, BR-RTN-006 |
| **Features** | SF-INV-005 |
| **User Stories** | US-ADM-010 |

---

## UC-RTN-001 — Request Return

| Field | Value |
| --- | --- |
| **ID** | UC-RTN-001 |
| **Name** | Request Return |
| **Description** | Customer requests return for a delivered order within the return window. |
| **Primary Actor** | A-CUSTOMER |
| **Secondary Actors** | A-EMAIL-SVC |
| **Preconditions** | Order in `Delivered` or `Completed`; within 7-day return window (BR-RTN-001). |
| **Trigger** | Customer clicks "Yêu cầu trả hàng" on order detail. |
| **Main Flow** | 1. Customer selects items to return.<br>2. Customer selects reason (defective / wrong item / no longer needed) (FR-RTN-002).<br>3. Customer adds photos + description (optional).<br>4. Customer submits.<br>5. System generates RMA number.<br>6. System sends confirmation email to customer. |
| **Alternative Flow** | (Warranty) → reason = warranty claim; routed to support. |
| **Exception Flow** | 1a. Outside window → reject with message.<br>1b. Item already returned → reject. |
| **Post-Conditions** | Return request created with `Pending` status; customer notified. |
| **Business Rules** | BR-RTN-001, BR-RTN-002, BR-RTN-003 |
| **Features** | SF-RTN-001, SF-RTN-002, SF-RTN-003 |
| **User Stories** | US-CUST-017 |

---

## UC-RTN-002 — Approve / Reject Return

| Field | Value |
| --- | --- |
| **ID** | UC-RTN-002 |
| **Name** | Approve or Reject Return Request |
| **Description** | Admin or Support reviews and decides on a return request. |
| **Primary Actor** | A-ADMIN, A-SUPPORT |
| **Secondary Actors** | A-EMAIL-SVC |
| **Preconditions** | Return request in `Pending`. |
| **Trigger** | Admin opens return queue. |
| **Main Flow** | 1. Admin reviews return details, photos, reason.<br>2. Admin clicks "Approve" or "Reject".<br>3a. **Approve:** return → `Approved`; customer notified with return shipping instructions.<br>3b. **Reject:** return → `Rejected`; reason recorded; customer notified. |
| **Alternative Flow** | (none) |
| **Exception Flow** | (none) |
| **Post-Conditions** | Return status updated; customer notified. |
| **Business Rules** | BR-RTN-004 |
| **Features** | SF-RTN-004 |
| **User Stories** | US-ORD-005 |

---

## UC-RTN-005 — Process Refund

| Field | Value |
| --- | --- |
| **ID** | UC-RTN-005 |
| **Name** | Process Refund for Approved Return |
| **Description** | After return inspection, system processes refund. |
| **Primary Actor** | A-ADMIN, A-FINANCE |
| **Secondary Actors** | A-PAYMENT-GW, A-EMAIL-SVC |
| **Preconditions** | Return `Approved`; item received and inspected; restock decision made. |
| **Trigger** | Fulfillment completes inspection (UC-RTN-004). |
| **Main Flow** | 1. System invokes UC-PAY-005 with refund amount.<br>2. Provider processes refund.<br>3. System updates return status → `Refunded`.<br>4. Customer notified. |
| **Alternative Flow** | (Warranty) → refund may be partial or replacement. |
| **Exception Flow** | 2a. Provider error → retry queue. |
| **Post-Conditions** | Refund processed; return closed. |
| **Business Rules** | BR-RTN-006, BR-RTN-007, BR-PAY-009 |
| **Features** | SF-RTN-006 |
| **User Stories** | US-CUST-019, US-CUST-027 |

---

## UC-RVW-001 — Submit Review

| Field | Value |
| --- | --- |
| **ID** | UC-RVW-001 |
| **Name** | Submit Product Review |
| **Description** | Verified purchaser submits a review with rating and text. |
| **Primary Actor** | A-CUSTOMER |
| **Secondary Actors** | A-ADMIN (moderation) |
| **Preconditions** | Customer has purchased the product; order in `Completed`; review not already submitted. |
| **Trigger** | Customer clicks "Viết đánh giá" on order detail. |
| **Main Flow** | 1. Customer selects rating (1–5 stars).<br>2. Customer enters review text (≤1000 chars).<br>3. Customer submits.<br>4. System creates review in `Pending` moderation (FR-RVW-005).<br>5. Admin moderates (UC-RVW-002). |
| **Alternative Flow** | 5a. Auto-approve if customer trust score high (V1.1). |
| **Exception Flow** | 1a. Not purchased → reject. |
| **Post-Conditions** | Review submitted; awaits moderation. |
| **Business Rules** | BR-RVW-001, BR-RVW-002 |
| **Features** | SF-RVW-001, SF-RVW-002, SF-RVW-003 |
| **User Stories** | US-CUST-012 |

---

## UC-PRM-002 — Create Voucher Code

| Field | Value |
| --- | --- |
| **ID** | UC-PRM-002 |
| **Name** | Create Voucher Code |
| **Description** | Admin creates a voucher with discount type, eligibility, and limits. |
| **Primary Actor** | A-ADMIN |
| **Secondary Actors** | None |
| **Preconditions** | Admin authenticated. |
| **Trigger** | Admin clicks "Tạo voucher". |
| **Main Flow** | 1. Admin enters code, type (percentage / fixed), value, min order, eligible products/categories.<br>2. Admin sets start/end time, total usage limit, per-user limit.<br>3. Admin submits.<br>4. System validates and persists voucher.<br>5. System returns voucher detail. |
| **Alternative Flow** | (Bulk) → generate multiple codes. |
| **Exception Flow** | 4a. Code duplicate → reject. |
| **Post-Conditions** | Voucher active and applicable per rules. |
| **Business Rules** | BR-PRM-001..005 |
| **Features** | SF-PRM-005 |
| **User Stories** | US-MKT-002 |

---

## UC-CHK-006 — Apply Voucher Code

| Field | Value |
| --- | --- |
| **ID** | UC-CHK-006 |
| **Name** | Apply Voucher Code at Checkout |
| **Description** | User applies a voucher code during checkout. |
| **Primary Actor** | A-GUEST, A-CUSTOMER |
| **Secondary Actors** | None |
| **Preconditions** | Voucher exists; checkout session active. |
| **Trigger** | User enters code in voucher field. |
| **Main Flow** | 1. User enters code and clicks "Áp dụng".<br>2. System validates: active window, min order, eligible products, usage limits (BR-PRM-006..010).<br>3. System computes discount.<br>4. System updates order preview (subtotal, discount, total). |
| **Alternative Flow** | (Stacking) → system checks stacking rules (BR-PRM-006). |
| **Exception Flow** | 2a. Invalid → show specific reason ("Đã hết hạn" / "Chưa đạt giá trị tối thiểu" / etc.). |
| **Post-Conditions** | Discount applied to order preview. |
| **Business Rules** | BR-PRM-006, BR-PRM-007, BR-PRM-008, BR-PRM-009, BR-PRM-010 |
| **Features** | SF-PRM-005 |
| **User Stories** | US-CUST-013 |

---

## UC-SHP-003 — Sync Tracking Status

| Field | Value |
| --- | --- |
| **ID** | UC-SHP-003 |
| **Name** | Sync Tracking Status from Carrier |
| **Description** | Carrier sends tracking events via webhook or polling. |
| **Primary Actor** | A-SHIPPING-PROV |
| **Secondary Actors** | A-EMAIL-SVC |
| **Preconditions** | Shipment exists with tracking number. |
| **Trigger** | Carrier webhook or hourly polling. |
| **Main Flow** | 1. System receives tracking event (or polls API).<br>2. System updates shipment tracking history.<br>3. If status = `delivered` → UC-ORD-007 transition to `Delivered`; customer notified. |
| **Alternative Flow** | 3-ext. Status = `lost` → admin alert; transition to `Returned` (BR-OSM-001). |
| **Exception Flow** | 1a. Tracking not found → log; retry. |
| **Post-Conditions** | Shipment status updated; notifications sent as appropriate. |
| **Business Rules** | BR-SHP-005, BR-OSM-001 |
| **Features** | SF-SHP-005, SF-SHP-006 |
| **User Stories** | US-CUST-010 |

---

## UC-CAT-009 — Create Product

| Field | Value |
| --- | --- |
| **ID** | UC-CAT-009 |
| **Name** | Create Product |
| **Description** | Catalog Manager creates a new product with variants, images, and pricing. |
| **Primary Actor** | A-CATALOG-MGR |
| **Secondary Actors** | A-MEDIA-CDN |
| **Preconditions** | Category exists. |
| **Trigger** | Catalog Manager clicks "Tạo sản phẩm". |
| **Main Flow** | 1. Manager enters product details (name, description, category, brand).<br>2. Manager adds variants (SKU, price, attributes).<br>3. Manager uploads images (UC-MED-001).<br>4. Manager enters stock-on-hand for each variant.<br>5. Manager submits.<br>6. System validates (required fields, price > 0, SKU unique).<br>7. System persists product in `Draft` status.<br>8. Manager publishes → status `Published`; visible on storefront. |
| **Alternative Flow** | (Bulk import) → CSV upload (V1.1). |
| **Exception Flow** | 6a. Validation errors → redisplay with errors. |
| **Post-Conditions** | Product created and published; visible to customers. |
| **Business Rules** | BR-CAT-001, BR-CAT-002, BR-CAT-003, BR-CAT-005, BR-CAT-009 |
| **Features** | SF-CAT-009, SF-CAT-010, SF-CAT-014, SF-CAT-015 |
| **User Stories** | US-CAT-001 |

---

## UC-MED-001 — Upload Image

| Field | Value |
| --- | --- |
| **ID** | UC-MED-001 |
| **Name** | Upload Product Image |
| **Description** | Catalog Manager uploads an image which is optimized into variants. |
| **Primary Actor** | A-CATALOG-MGR |
| **Secondary Actors** | A-MEDIA-CDN |
| **Preconditions** | Manager authenticated; product context exists. |
| **Trigger** | Manager drops file on upload widget. |
| **Main Flow** | 1. Manager selects or drops image file.<br>2. Client requests signed upload URL from server.<br>3. Server returns signed Cloudinary URL.<br>4. Client uploads directly to Cloudinary (BR-MED-001).<br>5. Cloudinary returns asset ID + URLs.<br>6. Server stores image reference (assetId, urls) in DB.<br>7. System triggers variant generation (UC-MED-002). |
| **Alternative Flow** | (none) |
| **Exception Flow** | 4a. Invalid type / > 5MB → reject (BR-MED-001). |
| **Post-Conditions** | Image uploaded; variants auto-generated; ready to attach to product. |
| **Business Rules** | BR-MED-001, BR-MED-002 |
| **Features** | SF-MED-001, SF-MED-002 |
| **User Stories** | US-CAT-004, US-CAT-006 |

---

## UC-ADM-005 — Configure Feature Flags

| Field | Value |
| --- | --- |
| **ID** | UC-ADM-005 |
| **Name** | Configure Feature Flag |
| **Description** | Admin toggles a feature flag to enable / disable functionality. |
| **Primary Actor** | A-ADMIN |
| **Secondary Actors** | None |
| **Preconditions** | Flag exists in configuration. |
| **Trigger** | Admin toggles flag in admin UI. |
| **Main Flow** | 1. Admin opens feature flags page.<br>2. Admin toggles flag value (on / off / percentage rollout).<br>3. System validates (BR-PLT-006).<br>4. System persists new value.<br>5. System invalidates cache.<br>6. Subsequent reads return new value. |
| **Alternative Flow** | (Percentage rollout) → flag returns true for X% of users. |
| **Exception Flow** | (none) |
| **Post-Conditions** | Flag value changed; new behavior active. |
| **Business Rules** | BR-PLT-006 |
| **Features** | SF-PLT-005 |
| **User Stories** | US-ADM-002 |

---

## UC-TAX-003 — Mark Tax-Exempt Category

| Field | Value |
| --- | --- |
| **ID** | UC-TAX-003 |
| **Name** | Mark Category as Tax-Exempt |
| **Description** | Admin marks a product category as VAT-exempt. |
| **Primary Actor** | A-ADMIN |
| **Secondary Actors** | None |
| **Preconditions** | Category exists. |
| **Trigger** | Admin clicks "Đánh dấu không chịu VAT" on category. |
| **Main Flow** | 1. Admin selects category.<br>2. Admin checks "VAT exempt".<br>3. Admin enters reason.<br>4. System saves flag + reason (BR-TAX-003).<br>5. Audit log entry created. |
| **Alternative Flow** | (none) |
| **Exception Flow** | (none) |
| **Post-Conditions** | Category marked; future orders use VAT = 0%. |
| **Business Rules** | BR-TAX-003 |
| **Features** | SF-TAX-003 |
| **User Stories** | (operational) |

---

## UC-NOT-001 — Send Order Confirmation Email

| Field | Value |
| --- | --- |
| **ID** | UC-NOT-001 |
| **Name** | Send Order Confirmation Email |
| **Description** | Asynchronously send order confirmation email after payment success. |
| **Primary Actor** | A-NOTIFICATION |
| **Secondary Actors** | A-EMAIL-SVC |
| **Preconditions** | Order `Confirmed`; email template exists. |
| **Trigger** | Order transitions to `Confirmed`. |
| **Main Flow** | 1. System queues email job (BullMQ).<br>2. Worker picks job.<br>3. Worker renders Vietnamese template with order data.<br>4. Worker calls email service API.<br>5. Service accepts; logs delivery ID. |
| **Alternative Flow** | (none) |
| **Exception Flow** | 4a. Service error → retry 3x with exponential backoff; on failure, log + Sev-3 alert. |
| **Post-Conditions** | Email queued; delivery attempted; recipient (customer or guest) receives confirmation. |
| **Business Rules** | BR-NOT-001, BR-NOT-002, BR-NOT-004 |
| **Features** | SF-NOT-001 |
| **User Stories** | US-CUST-008 |

---

## UC-ORD-006 — Auto-Complete Order

| Field | Value |
| --- | --- |
| **ID** | UC-ORD-006 |
| **Name** | Auto-Complete Order |
| **Description** | Scheduled worker transitions Delivered orders to Completed after 7 days. |
| **Primary Actor** | A-INVENTORY-WORKER (cron) |
| **Secondary Actors** | None |
| **Preconditions** | Order `Delivered`; `deliveredAt + 7 days ≤ now`; no active return. |
| **Trigger** | Daily cron. |
| **Main Flow** | 1. Cron selects eligible orders.<br>2. For each: order → `Completed` (BR-OSM-004).<br>3. Status history entry written.<br>4. Customer notified. |
| **Alternative Flow** | (none) |
| **Exception Flow** | 2a. Active return → skip. |
| **Post-Conditions** | Order auto-completed; warranty window opens. |
| **Business Rules** | BR-OSM-004 |
| **Features** | SF-ORD-003 |
| **User Stories** | US-ORD-008 |

---

## UC-SUP-001 — Submit Support Ticket

| Field | Value |
| --- | --- |
| **ID** | UC-SUP-001 |
| **Name** | Submit Support Ticket |
| **Description** | Customer submits a support ticket linked to an order. |
| **Primary Actor** | A-CUSTOMER |
| **Secondary Actors** | A-EMAIL-SVC, A-SUPPORT |
| **Preconditions** | Customer authenticated. |
| **Trigger** | Customer submits ticket form. |
| **Main Flow** | 1. Customer opens support page.<br>2. Customer selects related order (optional).<br>3. Customer enters subject + description.<br>4. Customer submits.<br>5. System creates ticket in `Open` status.<br>6. System sends confirmation email to customer.<br>7. System notifies support queue. |
| **Alternative Flow** | (Guest ticket) → requires email; no account. |
| **Exception Flow** | (none) |
| **Post-Conditions** | Ticket created; assigned to queue; SLA timer started. |
| **Business Rules** | BR-SUP-001, BR-SUP-002 |
| **Features** | SF-SUP-001, SF-SUP-005, SF-SUP-006 |
| **User Stories** | US-CUST-020 |

---

## 24. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal System Analyst | Initial 24 detailed use case specifications covering all major flows |

---

**End of Document — USE_CASE_SPECIFICATIONS.md**
# SYSTEM_WORKFLOWS.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal System Analyst

This document catalogs all SmartLight **system workflows** at the operational level. Each workflow references its use case(s), business rules, system features, and acceptance criteria.

---

## 1. WF-AUTH-01 — Customer Authentication

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-ID-001, UC-ID-002, UC-ID-004, UC-ID-005 |
| **Business Rules** | BR-ID-001..005, BR-ID-013 |
| **Features** | SF-ID-001..005, SF-ID-007, SF-ID-009, SF-ID-010, SF-ID-013 |
| **Acceptance Criteria** | AC-AC-010, AC-AC-014, AC-AC-028 |
| **Trigger** | Customer submits login/register form |
| **Inputs** | Email, password (and optional TOTP for admin) |
| **Outputs** | JWT access token + refresh token; user session |
| **Modules** | M-ID, M-NOT (verification email) |

### Steps
1. Customer opens `/login` or `/register`
2. Customer submits form
3. M-ID validates input
4. M-ID hashes password (Argon2id)
5. M-ID issues JWT tokens
6. M-NOT sends verification email (if registration)
7. Audit log entry (if admin)

---

## 2. WF-AUTH-02 — Admin MFA Setup

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-ID-006 |
| **Business Rules** | BR-MFA-001, BR-MFA-003 |
| **Features** | SF-ID-011 |
| **Acceptance Criteria** | AC-MFA-001 |
| **Trigger** | First admin login OR "Enable MFA" action |
| **Inputs** | TOTP code from authenticator app |
| **Outputs** | Encrypted TOTP secret + 8 recovery codes |
| **Modules** | M-ID, M-NOT |

### Steps
1. Admin completes password login
2. System detects no MFA → forces setup
3. System generates TOTP secret
4. System displays QR code (otpauth URI)
5. Admin scans with authenticator app
6. Admin enters 6-digit code
7. System verifies and stores encrypted secret
8. System generates and displays 8 recovery codes
9. M-NOT sends confirmation email

---

## 3. WF-CAT-01 — Product Browsing & Search

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-CAT-001..004 |
| **Business Rules** | BR-CAT-001..005 |
| **Features** | SF-CAT-001..005, SF-CAT-014, SF-CAT-015 |
| **Acceptance Criteria** | AC-AC-001..005 |
| **Trigger** | User navigates to storefront |
| **Inputs** | Category, search query, filters |
| **Outputs** | Product list with prices, stock status, ratings |
| **Modules** | M-CAT, M-INV (stock status), M-RVW (ratings), M-PLT (SEO) |

### Steps
1. User lands on homepage
2. User selects category OR searches
3. M-CAT queries products with filters, sort
4. M-INV provides stock status per variant
5. M-RVW provides aggregated rating
6. M-PLT serves sitemap / JSON-LD
7. Results rendered with pagination

---

## 4. WF-CAT-02 — Product Detail View

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-CAT-004, UC-CAT-005, UC-CAT-007 |
| **Business Rules** | BR-CAT-009, BR-CAT-010, BR-INV-002 |
| **Features** | SF-CAT-005, SF-CAT-006, SF-CAT-010, SF-CAT-012, SF-CAT-013 |
| **Acceptance Criteria** | AC-AC-004, AC-AC-005 |
| **Trigger** | User clicks product card |
| **Inputs** | Product slug |
| **Outputs** | Product detail page with gallery, variants, specs, reviews |
| **Modules** | M-CAT, M-MED, M-INV, M-RVW, M-PLT (JSON-LD) |

### Steps
1. User clicks product
2. M-CAT loads product by slug
3. M-CAT loads variants with attributes
4. M-MED provides image URLs (variants)
5. M-INV provides stock status
6. M-RVW provides rating summary + top reviews
7. M-PLT serves JSON-LD structured data
8. PDP rendered

---

## 5. WF-CRT-01 — Cart Management

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-CRT-001..005 |
| **Business Rules** | BR-CRT-001, BR-INV-002, BR-INV-003 |
| **Features** | SF-CRT-001..007 |
| **Acceptance Criteria** | AC-AC-008, AC-AC-009 |
| **Trigger** | User adds to cart / manages cart |
| **Inputs** | Variant ID, quantity |
| **Outputs** | Cart with totals; reservations |
| **Modules** | M-CRT, M-INV, M-CAT, M-TAX |

### Steps
1. User clicks "Thêm vào giỏ"
2. M-CRT validates variant
3. M-INV reserves stock (15-min expiry)
4. M-CRT persists cart line
5. M-TAX computes VAT preview
6. M-PRM computes discount preview (if voucher applied)
7. Updated cart returned

---

## 6. WF-CHK-01 — Checkout

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-CHK-001..008 |
| **Business Rules** | BR-CHK-001..011, BR-GCH-001..004, BR-TAX-001..005 |
| **Features** | SF-CHK-001..011 |
| **Acceptance Criteria** | AC-CHK-001..003 (in AC.md) |
| **Trigger** | User clicks "Tiến hành thanh toán" |
| **Inputs** | Cart, address, shipping method, payment method, voucher code |
| **Outputs** | Order created, payment intent, redirect to provider |
| **Modules** | M-CHK, M-CRT, M-CAT, M-INV, M-PRM, M-TAX, M-ORD, M-PAY |

### Steps
1. User begins checkout
2. M-CHK creates session (15-min TTL)
3. User enters address (or selects from book)
4. User selects shipping
5. User selects payment method
6. User applies voucher (optional)
7. User reviews order
8. User clicks "Thanh toán"
9. M-CHK generates idempotency token
10. M-ORD creates order in `Pending` state
11. M-TAX computes VAT with snapshot
12. M-INV converts reservations to decrements
13. M-PAY creates payment intent
14. User redirected to provider

---

## 7. WF-PAY-01 — Payment Processing

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-PAY-001..006 |
| **Business Rules** | BR-PAY-001..011 |
| **Features** | SF-PAY-001..005 |
| **Acceptance Criteria** | AC-PAY-001, AC-PAY-002 |
| **Trigger** | Payment intent creation; webhook arrival; cron |
| **Inputs** | Order, payment intent, webhook event |
| **Outputs** | Order state transition; email; refund |
| **Modules** | M-PAY, M-ORD, M-INV, M-NOT, M-RTN |

### Steps
1. M-PAY creates intent at provider
2. User authorizes payment
3. Provider sends webhook (or cron reconciles)
4. M-PAY verifies HMAC signature (BR-PAY-008)
5. M-PAY checks idempotency (BR-PAY-002)
6. On `payment.succeeded`:
   - M-ORD transitions to `Confirmed`
   - M-NOT queues confirmation email
   - M-NOT queues magic link (if guest)
7. On `payment.failed`:
   - M-ORD transitions to `Cancelled`
   - M-INV releases reservation
   - M-NOT queues failure email

---

## 8. WF-PAY-02 — Refund

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-PAY-005, UC-RTN-005 |
| **Business Rules** | BR-PAY-009, BR-RTN-006 |
| **Features** | SF-PAY-004 |
| **Acceptance Criteria** | AC-PAY-002 |
| **Trigger** | Admin/Finance initiates refund |
| **Inputs** | Original intent ID, refund amount |
| **Outputs** | Refund record; customer notification |
| **Modules** | M-PAY, M-RTN, M-ORD, M-NOT |

### Steps
1. Admin opens approved return
2. Admin clicks "Hoàn tiền"
3. M-RTN calls M-PAY.IssueRefund(intentId, amount)
4. M-PAY calls provider refund API
5. M-PAY stores refund record
6. M-RTN updates return status to `Refunded`
7. M-NOT queues refund email

---

## 9. WF-INV-01 — Stock Reservation Lifecycle

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-INV-002, UC-INV-003 |
| **Business Rules** | BR-INV-001..003, BR-INV-007 |
| **Features** | SF-INV-001, SF-INV-002 |
| **Acceptance Criteria** | AC-INV-001 |
| **Trigger** | Add-to-cart; cron |
| **Inputs** | Variant ID, quantity |
| **Outputs** | Reservation row; available stock computed |
| **Modules** | M-INV |

### Steps
1. Reservation requested (from cart)
2. M-INV validates availability
3. M-INV locks stock row (`SELECT FOR UPDATE`)
4. M-INV creates reservation with 15-min expiry
5. Cron worker checks expired reservations every minute
6. Expired reservations released back to available pool

---

## 10. WF-INV-02 — Manual Stock Adjustment

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-INV-004 |
| **Business Rules** | BR-INV-005 |
| **Features** | SF-INV-004 |
| **Acceptance Criteria** | AC-INV-003 |
| **Trigger** | Catalog Manager action |
| **Inputs** | Variant, new quantity, reason code |
| **Outputs** | Updated stock; audit log |
| **Modules** | M-INV, M-ADM (audit) |

### Steps
1. Manager opens variant inventory tab
2. Manager enters new quantity + reason
3. Manager submits
4. M-INV validates reason
5. M-INV updates stock-on-hand
6. M-ADM writes audit log entry

---

## 11. WF-INV-03 — Restock After Return

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-INV-006 |
| **Business Rules** | BR-INV-006 |
| **Features** | SF-INV-005 |
| **Acceptance Criteria** | AC-INV-004 |
| **Trigger** | Fulfillment marks inspection outcome |
| **Inputs** | Return ID, outcome (PASS/FAIL) |
| **Outputs** | Stock incremented OR disposal counter incremented |
| **Modules** | M-INV, M-RTN |

### Steps
1. Fulfillment receives returned item
2. Fulfillment inspects (3 days SLA)
3. Fulfillment marks outcome
4a. **PASS**: M-INV increments stock-on-hand
4b. **FAIL**: M-INV increments disposed counter
5. Audit log entry written

---

## 12. WF-SHP-01 — Shipment Tracking Sync

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-SHP-003 |
| **Business Rules** | BR-SHP-005 |
| **Features** | SF-SHP-005, SF-SHP-006 |
| **Acceptance Criteria** | AC-SHP-005 (referenced) |
| **Trigger** | Carrier webhook OR polling |
| **Inputs** | Tracking number |
| **Outputs** | Tracking events; order status transitions |
| **Modules** | M-SHP, M-ORD, M-NOT |

### Steps
1. Carrier webhook arrives (or polling cron)
2. M-SHP updates tracking history
3. If status = delivered:
   - M-ORD transitions to Delivered
   - M-NOT queues delivery email
4. If status = lost:
   - M-ORD transitions to Returned (per BR-OSM-001)
   - Admin notified

---

## 13. WF-RTN-01 — Return Request Lifecycle

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-RTN-001..005 |
| **Business Rules** | BR-RTN-001..007 |
| **Features** | SF-RTN-001..006 |
| **Acceptance Criteria** | AC-RTN-001 (referenced) |
| **Trigger** | Customer submits return request |
| **Inputs** | Order ID, items, reason, photos |
| **Outputs** | RMA number; status updates; refund |
| **Modules** | M-RTN, M-ORD, M-PAY, M-INV, M-NOT |

### Steps
1. Customer requests return (within window)
2. M-RTN generates RMA
3. M-RTN sets status = Pending
4. Admin/Support reviews
5. Admin approves → status = Approved
6. Customer ships back
7. Fulfillment receives → status = Received
8. Fulfillment inspects → status = Inspected
9a. PASS → M-INV restocks
9b. FAIL → M-INV disposes
10. M-PAY refunds → status = Refunded
11. Customer notified

---

## 14. WF-NOT-01 — Email Delivery

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-NOT-001 |
| **Business Rules** | BR-NOT-001..004 |
| **Features** | SF-NOT-001..005 |
| **Acceptance Criteria** | AC-AC-021 (referenced) |
| **Trigger** | Domain event (OrderConfirmed, OrderShipped, etc.) |
| **Inputs** | Template ID, recipient, payload |
| **Outputs** | Email delivered; log entry |
| **Modules** | M-NOT, A-EMAIL-SVC |

### Steps
1. Event published by domain module
2. M-NOT enqueues BullMQ job
3. Worker picks up job
4. Worker renders Vietnamese template
5. Worker calls email provider API
6. On success: log delivered
7. On failure: retry 3x with backoff; Sev-3 alert on exhaustion

---

## 15. WF-MED-01 — Image Upload

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-MED-001 |
| **Business Rules** | BR-MED-001, BR-MED-002 |
| **Features** | SF-MED-001, SF-MED-002 |
| **Acceptance Criteria** | AC-MED-001 |
| **Trigger** | Catalog Manager uploads image |
| **Inputs** | Image file |
| **Outputs** | Asset ID, variant URLs (thumbnail, card, hero) |
| **Modules** | M-MED, A-MEDIA-CDN |

### Steps
1. Manager selects/drops file
2. Client requests signed upload URL
3. Server returns Cloudinary signed URL
4. Client uploads directly to Cloudinary
5. Cloudinary returns asset ID + URLs
6. M-MED stores asset reference
7. Cloudinary generates variants (eager transformation)
8. M-MED stores variant URLs

---

## 16. WF-RVW-01 — Review Submission & Moderation

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-RVW-001, UC-RVW-002 |
| **Business Rules** | BR-RVW-001..005 |
| **Features** | SF-RVW-001..005 |
| **Acceptance Criteria** | AC-AC-025 (referenced) |
| **Trigger** | Customer submits review |
| **Inputs** | Product ID, rating, text, photos |
| **Outputs** | Review (Pending → Published); rating update |
| **Modules** | M-RVW, M-ORD, M-NOT |

### Steps
1. Customer submits review
2. M-RVW validates (purchased check)
3. Review created in Pending
4. Admin/Support moderates
5. Admin approves → Published
6. M-RVW updates aggregated rating
7. Customer optionally notified

---

## 17. WF-SUP-01 — Support Ticket Lifecycle

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-SUP-001..004 |
| **Business Rules** | BR-SUP-001..007 |
| **Features** | SF-SUP-001..007 |
| **Acceptance Criteria** | AC-AC-033 (referenced) |
| **Trigger** | Customer submits ticket |
| **Inputs** | Subject, description, optional order reference |
| **Outputs** | Ticket; SLA timer; resolution |
| **Modules** | M-SUP, M-NOT, M-ORD (link) |

### Steps
1. Customer submits ticket
2. M-SUP creates ticket (status = Open)
3. SLA timer starts (BR-SUP-007)
4. Support agent views queue
5. Agent responds (status = Pending)
6. Customer replies (back to Open)
7. Agent resolves (status = Resolved)
8. Customer confirms (status = Closed)

---

## 18. WF-TAX-01 — VAT Calculation & Display

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-TAX-001, UC-TAX-002 |
| **Business Rules** | BR-TAX-001, BR-TAX-002, BR-TAX-004, BR-TAX-005 |
| **Features** | SF-TAX-001, SF-TAX-002 |
| **Acceptance Criteria** | AC-TAX-001 |
| **Trigger** | Order creation; cart preview; invoice |
| **Inputs** | Cart lines, category flags, VAT rate |
| **Outputs** | Per-line VAT; total VAT; VAT amount snapshot |
| **Modules** | M-TAX, M-CAT, M-ORD |

### Steps
1. M-TAX reads VAT rate (default 10%)
2. M-CAT checks category exempt flags
3. M-TAX computes per-line tax (BR-TAX-005 rounding)
4. M-ORD stores taxAmount + taxRate snapshot on line
5. UI displays VAT as separate line item
6. Invoice PDF includes VAT line

---

## 19. WF-PRM-01 — Voucher Application

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-CHK-006, UC-PRM-003 |
| **Business Rules** | BR-PRM-006..010 |
| **Features** | SF-PRM-005 |
| **Acceptance Criteria** | AC-AC-026 (referenced) |
| **Trigger** | User enters voucher code at checkout |
| **Inputs** | Voucher code, cart |
| **Outputs** | Discount amount; updated order preview |
| **Modules** | M-PRM, M-CHK |

### Steps
1. User enters code
2. M-PRM validates: active window, min order, eligibility, usage
3. M-PRM computes discount
4. Stacking rules applied
5. Order preview updated

---

## 20. WF-ADM-01 — Feature Flag Configuration

| Aspect | Detail |
| --- | --- |
| **Use Case** | UC-ADM-005 |
| **Business Rules** | BR-PLT-006 |
| **Features** | SF-PLT-005 |
| **Acceptance Criteria** | AC-AC-067 (referenced) |
| **Trigger** | Admin toggles flag |
| **Inputs** | Flag key, new value |
| **Outputs** | New flag value; cache invalidation |
| **Modules** | M-ADM, M-PLT |

### Steps
1. Admin opens feature flags page
2. Admin toggles value
3. M-ADM validates
4. M-ADM persists
5. M-PLT invalidates cache
6. Subsequent reads see new value

---

## 21. Workflow Coverage Matrix

| Workflow | Use Cases | Business Rules | Features | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| WF-AUTH-01 | UC-ID-001..005 | BR-ID-001..005, BR-ID-013 | SF-ID-001..005, SF-ID-007, SF-ID-009, SF-ID-010, SF-ID-013 | AC-AC-010, AC-AC-014, AC-AC-028 |
| WF-AUTH-02 | UC-ID-006 | BR-MFA-001, BR-MFA-003 | SF-ID-011 | AC-MFA-001 |
| WF-CAT-01 | UC-CAT-001..003 | BR-CAT-001..005 | SF-CAT-001..005, SF-CAT-014 | AC-AC-001..003 |
| WF-CAT-02 | UC-CAT-004, UC-CAT-005 | BR-CAT-009, BR-CAT-010 | SF-CAT-005, SF-CAT-006, SF-CAT-010, SF-CAT-012 | AC-AC-004, AC-AC-005 |
| WF-CRT-01 | UC-CRT-001..005 | BR-CRT-001, BR-INV-002, BR-INV-003 | SF-CRT-001..007 | AC-AC-008, AC-AC-009 |
| WF-CHK-01 | UC-CHK-001..008 | BR-CHK-001..011, BR-GCH-001..004, BR-TAX-001..005 | SF-CHK-001..011 | AC-CHK-001..003 |
| WF-PAY-01 | UC-PAY-001..006 | BR-PAY-001..011 | SF-PAY-001..005 | AC-PAY-001, AC-PAY-002 |
| WF-PAY-02 | UC-PAY-005, UC-RTN-005 | BR-PAY-009, BR-RTN-006 | SF-PAY-004 | AC-PAY-002 |
| WF-INV-01 | UC-INV-002, UC-INV-003 | BR-INV-001..003, BR-INV-007 | SF-INV-001, SF-INV-002 | AC-INV-001 |
| WF-INV-02 | UC-INV-004 | BR-INV-005 | SF-INV-004 | AC-INV-003 |
| WF-INV-03 | UC-INV-006 | BR-INV-006 | SF-INV-005 | AC-INV-004 |
| WF-SHP-01 | UC-SHP-003 | BR-SHP-005 | SF-SHP-005, SF-SHP-006 | (referenced) |
| WF-RTN-01 | UC-RTN-001..005 | BR-RTN-001..007 | SF-RTN-001..006 | (referenced) |
| WF-NOT-01 | UC-NOT-001 | BR-NOT-001..004 | SF-NOT-001..005 | AC-AC-021 |
| WF-MED-01 | UC-MED-001 | BR-MED-001, BR-MED-002 | SF-MED-001, SF-MED-002 | AC-MED-001 |
| WF-RVW-01 | UC-RVW-001, UC-RVW-002 | BR-RVW-001..005 | SF-RVW-001..005 | AC-AC-025 |
| WF-SUP-01 | UC-SUP-001..004 | BR-SUP-001..007 | SF-SUP-001..007 | AC-AC-033 |
| WF-TAX-01 | UC-TAX-001, UC-TAX-002 | BR-TAX-001..005 | SF-TAX-001, SF-TAX-002 | AC-TAX-001 |
| WF-PRM-01 | UC-CHK-006, UC-PRM-003 | BR-PRM-006..010 | SF-PRM-005 | AC-AC-026 |
| WF-ADM-01 | UC-ADM-005 | BR-PLT-006 | SF-PLT-005 | AC-AC-067 |

---

## 22. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal System Analyst | Initial 20 system workflows with use case, BR, SF, AC coverage matrix |

---

**End of Document — SYSTEM_WORKFLOWS.md**
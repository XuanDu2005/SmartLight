# SEQUENCE_DIAGRAMS.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal System Analyst

This document contains **sequence diagrams** for the critical SmartLight workflows. All diagrams use **Mermaid** syntax. Each diagram represents the interaction between actors, the system, and external services.

---

## 1. SD-01 — Login Sequence

```mermaid
sequenceDiagram
    autonumber
    actor U as User<br/>(Customer / Admin)
    participant FE as Storefront / Admin UI
    participant ID as Identity Module
    participant DB as Database
    participant EM as Email Service
    participant TOTP as TOTP Service

    U->>FE: Navigate to /login
    FE->>U: Display login form
    U->>FE: Submit email + password
    FE->>ID: POST /auth/login {email, password}
    ID->>DB: SELECT user WHERE email = ?
    DB-->>ID: User record
    ID->>ID: Verify password (Argon2id)
    alt Invalid credentials
        ID->>ID: Increment failed counter
        alt Counter >= 5
            ID->>DB: Lock account (15 min)
            ID->>EM: Send lockout notification
        end
        ID-->>FE: 401 Unauthorized
        FE-->>U: Show generic error
    else Valid credentials
        alt Email not verified (customer)
            ID-->>FE: 403 Email not verified
            FE-->>U: Show verification message
        else Email verified
            alt Admin user
                ID->>TOTP: Prompt TOTP code
                U->>FE: Enter TOTP code
                FE->>ID: POST /auth/login/totp {code}
                ID->>TOTP: Verify TOTP
                alt TOTP invalid
                    ID-->>FE: 401 Invalid code
                    ID->>DB: Write audit log
                else TOTP valid
                    ID->>DB: Write audit log: success
                end
            end
            ID->>DB: Generate JWT access + refresh
            ID-->>FE: 200 OK {accessToken, refreshToken, role}
            FE-->>U: Redirect to dashboard
        end
    end
```

**References:** UC-ID-002, BR-ID-005, BR-ID-013, BR-MFA-001

---

## 2. SD-02 — Checkout Sequence

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer / Guest
    participant FE as Storefront
    participant CHK as Checkout Module
    participant CRT as Cart Module
    participant INV as Inventory Module
    participant TAX as Tax Module
    participant PRM as Promotion Module
    participant ORD as Order Module
    participant PAY as Payment Module
    participant DB as Database

    C->>FE: Click "Tiến hành thanh toán"
    FE->>CHK: POST /checkout/begin
    CHK->>CRT: GET cart
    CRT->>DB: Load cart lines + reservations
    DB-->>CRT: Cart data
    CRT-->>CHK: Cart details
    CHK->>INV: Validate reservations still active
    INV->>DB: SELECT reservations WHERE expiresAt > now
    DB-->>INV: Active reservations
    INV-->>CHK: Reservations valid
    CHK->>DB: Create checkout session (15 min TTL)
    CHK-->>FE: 200 OK {sessionId, step1}

    C->>FE: Submit address
    FE->>CHK: PUT /checkout/session/{id}/address
    CHK->>DB: Save address

    C->>FE: Choose shipping
    FE->>CHK: PUT /checkout/session/{id}/shipping
    CHK->>DB: Save shipping selection

    C->>FE: Apply voucher (optional)
    FE->>CHK: POST /checkout/session/{id}/voucher {code}
    CHK->>PRM: Validate voucher
    PRM-->>CHK: Voucher valid + discount
    CHK->>DB: Save voucher

    C->>FE: Click "Thanh toán"
    FE->>CHK: POST /checkout/session/{id}/submit {idempotencyKey}
    CHK->>TAX: Calculate VAT
    TAX->>DB: Get VAT rate
    TAX-->>CHK: VAT computed
    CHK->>ORD: Create order (UC-ORD-001)
    ORD->>DB: BEGIN TRANSACTION
    ORD->>TAX: Snapshot tax amount
    ORD->>INV: Convert reservations to decrements (BR-INV-001)
    INV->>DB: UPDATE stock FOR UPDATE
    INV-->>ORD: Stock decremented
    ORD->>DB: INSERT order, lines, status_history
    ORD->>DB: COMMIT
    ORD-->>CHK: Order ID
    CHK->>PAY: Create payment intent (UC-PAY-001)
    PAY-->>CHK: Intent ID + redirect URL
    CHK-->>FE: 200 OK {redirectUrl}
    FE-->>C: Redirect to payment provider
```

**References:** UC-CHK-001..008, UC-ORD-001, UC-PAY-001, BR-CHK-007, BR-INV-001, BR-TAX-001..005

---

## 3. SD-03 — Payment Sequence

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant FE as Storefront
    participant PAY as Payment Module
    participant PGW as Payment Gateway
    participant INV as Inventory Module
    participant ORD as Order Module
    participant NOT as Notification Service
    participant DB as Database

    C->>FE: Authorize payment at provider
    PGW-->>FE: Redirect to /payment/success?intentId
    C->>FE: Browser requests success page
    FE->>PAY: GET /payment/status?intentId

    par Webhook path
        PGW->>PAY: POST /payments/webhook {event}
        PAY->>PAY: Verify HMAC signature (BR-PAY-008)
        alt Invalid signature
            PAY-->>PGW: 401 Unauthorized
        else Valid signature
            PAY->>DB: Check duplicate eventId (BR-PAY-002)
            alt Duplicate
                PAY-->>PGW: 200 OK (skip)
            else New event
                PAY->>DB: SELECT order WHERE intentId = ?
                DB-->>PAY: Order
                alt event = payment.succeeded
                    PAY->>ORD: Transition order Confirmed (BR-OSM-001)
                    ORD->>DB: Write status_history
                    ORD->>DB: UPDATE order SET status = 'Confirmed'
                    ORD-->>PAY: OK
                    PAY->>NOT: Queue order confirmation email
                    NOT->>NOT: Send email (UC-NOT-001)
                    PAY-->>PGW: 200 OK
                else event = payment.failed
                    PAY->>ORD: Transition order Cancelled
                    ORD->>INV: Release reservation (BR-INV-002)
                    INV->>DB: DELETE reservation
                    PAY-->>PGW: 200 OK
                end
            end
        end
    and Reconciliation path
        Note over PAY: Hourly cron
        PAY->>DB: SELECT orders WHERE status = 'Pending' AND createdAt < now - 5min
        DB-->>PAY: Stale orders
        loop For each stale order
            PAY->>PGW: GET /intents/{intentId}
            PGW-->>PAY: Intent status
            alt Status = succeeded
                PAY->>ORD: Transition order Confirmed
                ORD->>NOT: Queue confirmation
            else Status = failed
                PAY->>ORD: Transition order Cancelled
                ORD->>INV: Release reservation
            end
        end
    end

    FE-->>C: Display "Thanh toán thành công"
```

**References:** UC-PAY-001..005, BR-PAY-002, BR-PAY-007, BR-PAY-008, BR-PAY-010, BR-OSM-001

---

## 4. SD-04 — Order Creation Sequence

```mermaid
sequenceDiagram
    autonumber
    participant CHK as Checkout Module
    participant ORD as Order Module
    participant INV as Inventory Module
    participant TAX as Tax Module
    participant PRM as Promotion Module
    participant DB as Database
    participant NUM as Number Generator

    CHK->>ORD: CreateOrder(checkoutSessionId)
    ORD->>DB: BEGIN TRANSACTION
    ORD->>DB: SELECT cart lines + product details
    DB-->>ORD: Cart details
    ORD->>TAX: ComputeVAT(lines, categoryFlags)
    TAX->>DB: Get VAT rate + exempt categories
    TAX-->>ORD: Per-line tax + total tax
    ORD->>PRM: ApplyDiscounts(cart, voucherCode?)
    PRM-->>ORD: Discount amount
    ORD->>ORD: Compute shipping fee (from session)
    ORD->>NUM: Generate order number (YYYYMMDD-XXXX)
    NUM-->>ORD: Order number
    ORD->>DB: SELECT FOR UPDATE variant (lock)
    ORD->>INV: DecrementStock(variantId, qty)
    INV->>DB: UPDATE stock SET on_hand = on_hand - qty
    INV-->>ORD: OK
    ORD->>DB: INSERT order (status='Pending', taxAmount, taxRate)
    ORD->>DB: INSERT order_lines (taxRate snapshot)
    ORD->>DB: INSERT order_status_history (from=null, to=Pending, actor=System)
    ORD->>DB: COMMIT
    ORD-->>CHK: OrderId
```

**References:** UC-ORD-001, BR-ORD-001, BR-ORD-002, BR-INV-001, BR-TAX-004, BR-TAX-005, BR-OSM-003

---

## 5. SD-05 — Notification Sequence

```mermaid
sequenceDiagram
    autonumber
    participant EVT as Event Source<br/>(Order/Return/Shipping)
    participant Q as BullMQ Queue
    participant W as Worker
    participant TEMP as Template Service
    participant EM as Email Service
    participant DB as Database
    participant USR as Recipient

    EVT->>Q: enqueue(notification job)<br/>{templateId, recipientId, payload}
    Q-->>W: pickup job
    W->>DB: SELECT recipient (email, locale)
    DB-->>W: Recipient
    W->>TEMP: Render template (vi-VN)
    TEMP->>DB: GET template
    TEMP-->>W: Rendered email (subject + body)
    W->>EM: POST /emails {to, subject, body, headers}
    alt Email accepted
        EM-->>W: 200 OK {messageId}
        W->>DB: Write notification log (status=delivered)
    else Email failed
        EM-->>W: 5xx / 4xx error
        W->>Q: Retry with backoff (1m, 5m, 30m)
        alt Retries exhausted
            W->>DB: Write notification log (status=failed)
            W->>DB: Sev-3 alert
        end
    end
    EM->>USR: Deliver email
    USR-->>EM: Open / click / bounce event
    EM-->>W: Webhook: delivered / opened / bounced
    W->>DB: Update notification log
```

**References:** UC-NOT-001, BR-NOT-001..004, NFR-AVAIL-002

---

## 6. SD-06 — Refund Sequence

```mermaid
sequenceDiagram
    autonumber
    actor ADM as Admin / Finance
    participant FE as Admin UI
    participant RTN as Returns Module
    participant PAY as Payment Module
    participant PGW as Payment Gateway
    participant INV as Inventory Module
    participant NOT as Notification Service
    participant DB as Database

    ADM->>FE: Open approved return detail
    FE->>RTN: GET /returns/{id}
    RTN-->>FE: Return with items + decision (PASS/FAIL)
    ADM->>FE: Click "Hoàn tiền"
    FE->>RTN: POST /returns/{id}/refund {amount}
    RTN->>DB: SELECT original payment intentId
    DB-->>RTN: Payment intent
    RTN->>PAY: IssueRefund(intentId, amount)
    PAY->>PGW: POST /refunds {intentId, amount}
    alt Provider error
        PGW-->>PAY: 4xx error
        PAY-->>RTN: 422 Unprocessable
        RTN-->>FE: Show error + retry
    else Provider success
        PGW-->>PAY: 200 OK {refundId}
        PAY->>DB: INSERT refund record
        RTN->>DB: UPDATE return SET status = 'Refunded'
        alt Inspection was PASS
            RTN->>INV: IncrementStock (already done in UC-INV-006)
            INV-->>RTN: OK
        end
        RTN->>NOT: Queue refund email
        NOT->>NOT: Send email to customer
        RTN-->>FE: 200 OK
        FE-->>ADM: Show "Đã hoàn tiền"
    end
```

**References:** UC-RTN-005, UC-PAY-005, BR-PAY-009, BR-RTN-006, BR-INV-006

---

## 7. SD-07 — Inventory Reservation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor U as User (Guest / Customer)
    participant FE as Storefront
    participant CRT as Cart Module
    participant INV as Inventory Module
    participant DB as Database

    U->>FE: Click "Thêm vào giỏ" {variantId, qty}
    FE->>CRT: POST /cart/items {variantId, qty}
    CRT->>INV: ReserveStock(variantId, qty, sessionId)
    INV->>DB: BEGIN TRANSACTION
    INV->>DB: SELECT variant WHERE id = ? FOR UPDATE
    DB-->>INV: Variant {on_hand, reserved}
    alt on_hand - reserved >= qty
        INV->>DB: INSERT reservation {variantId, qty, expiresAt = now + 15min}
        INV->>DB: COMMIT
        INV-->>CRT: 200 OK {reservationId, expiresAt}
        CRT->>DB: INSERT cart_line
        CRT-->>FE: 200 OK {cart summary}
        FE-->>U: Show "Đã thêm vào giỏ"
    else Insufficient stock
        INV->>DB: ROLLBACK
        INV-->>CRT: 409 Conflict {available}
        CRT-->>FE: 409 {available}
        FE-->>U: Show "Chỉ còn X sản phẩm"
    end

    Note over DB,INV: Background worker
    loop Every minute
        DB->>INV: Worker selects expired reservations
        INV->>DB: DELETE reservations WHERE expiresAt < now
    end
```

**References:** UC-INV-002, UC-INV-003, BR-INV-002, BR-INV-003, BR-INV-007

---

## 8. SD-08 — Return Request to Refund (End-to-End)

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    actor ADM as Admin
    actor FUL as Fulfillment
    participant FE as Customer UI
    participant ADM_FE as Admin UI
    participant FUL_FE as Fulfillment UI
    participant RTN as Returns Module
    participant INV as Inventory Module
    participant PAY as Payment Module
    participant PGW as Payment Gateway
    participant NOT as Notification Service
    participant DB as Database

    C->>FE: Open order detail
    C->>FE: Click "Yêu cầu trả hàng"
    FE->>RTN: POST /returns {orderId, items, reason, photos}
    RTN->>DB: Generate RMA number
    RTN->>DB: INSERT return (status=Pending)
    RTN->>NOT: Queue customer email
    NOT-->>C: Email confirmation
    RTN-->>FE: 200 OK {rmaNumber}

    ADM->>ADM_FE: Review return queue
    ADM->>ADM_FE: Click "Approve"
    ADM_FE->>RTN: PUT /returns/{id}/approve
    RTN->>DB: UPDATE return SET status = Approved
    RTN->>NOT: Queue approval email
    NOT-->>C: Email: return instructions
    ADM_FE-->>ADM: Show "Đã duyệt"

    Note over C: Customer ships item back
    FUL->>FUL_FE: Mark item received
    FUL_FE->>RTN: PUT /returns/{id}/received
    RTN->>DB: UPDATE return SET status = 'Received'

    FUL->>FUL_FE: Inspect + mark PASS
    FUL_FE->>RTN: PUT /returns/{id}/inspection {outcome: PASS}
    RTN->>INV: Restock(variantId, qty)
    INV->>DB: UPDATE stock
    INV->>DB: Write audit log
    RTN->>PAY: ProcessRefund(returnId)
    PAY->>PGW: POST /refunds {intentId, amount}
    PGW-->>PAY: 200 OK {refundId}
    PAY->>DB: INSERT refund
    RTN->>DB: UPDATE return SET status = 'Refunded'
    RTN->>NOT: Queue refund email
    NOT-->>C: Email: refund processed
```

**References:** UC-RTN-001..005, UC-PAY-005, UC-INV-006, BR-RTN-001..007, BR-INV-006, BR-PAY-009

---

## 9. Sequence Diagram Coverage Matrix

| Sequence Diagram | Use Cases | Business Rules | Features |
| --- | --- | --- | --- |
| SD-01 Login | UC-ID-002 | BR-ID-005, BR-ID-013, BR-MFA-001 | SF-ID-004..005, SF-ID-011..013 |
| SD-02 Checkout | UC-CHK-001..008 | BR-CHK-007, BR-INV-001, BR-TAX-001..005 | SF-CHK-001..011 |
| SD-03 Payment | UC-PAY-001..005 | BR-PAY-002, BR-PAY-007, BR-PAY-008, BR-PAY-010 | SF-PAY-001..005 |
| SD-04 Order Creation | UC-ORD-001 | BR-ORD-001, BR-INV-001, BR-TAX-004 | SF-ORD-001, SF-TAX-001 |
| SD-05 Notification | UC-NOT-001 | BR-NOT-001..004 | SF-NOT-001..005 |
| SD-06 Refund | UC-PAY-005, UC-RTN-005 | BR-PAY-009, BR-RTN-006 | SF-PAY-004, SF-RTN-006 |
| SD-07 Inventory Reservation | UC-INV-002, UC-INV-003 | BR-INV-002, BR-INV-003, BR-INV-007 | SF-INV-001, SF-INV-002 |
| SD-08 Return E2E | UC-RTN-001..005 | BR-RTN-001..007, BR-INV-006, BR-PAY-009 | SF-RTN-001..006, SF-PAY-004 |

---

## 10. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal System Analyst | Initial 8 sequence diagrams in Mermaid syntax; coverage matrix |

---

**End of Document — SEQUENCE_DIAGRAMS.md**
# ACTIVITY_DIAGRAMS.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal System Analyst

This document contains **activity diagrams** for the major SmartLight workflows. All diagrams use **Mermaid** syntax. Each diagram maps to one or more Use Cases and is referenced in `SYSTEM_WORKFLOWS.md` and `USE_CASE_SPECIFICATIONS.md`.

---

## 1. AD-01 — Login Activity

```mermaid
flowchart TD
    Start([Start]) --> Display[Display Login Form]
    Display --> Input[User enters email + password]
    Input --> Submit[User submits]
    Submit --> Validate{Email format valid?}
    Validate -- No --> ShowErr1[Show 'Email không hợp lệ']
    ShowErr1 --> Display
    Validate -- Yes --> CheckUser{User exists?}
    CheckUser -- No --> ShowErr2[Show generic error: 'Email hoặc mật khẩu không đúng']
    ShowErr2 --> Display
    CheckUser -- Yes --> VerifyPass{Password matches Argon2id hash?}
    VerifyPass -- No --> IncCounter[Increment failed counter]
    IncCounter --> LockCheck{Counter >= 5?}
    LockCheck -- Yes --> Lock[Lock account 15 min<br/>BR-ID-013]
    Lock --> EmailLock[Send lockout email]
    EmailLock --> ShowLocked[Show 'Tài khoản bị khóa tạm thời']
    ShowLocked --> Display
    LockCheck -- No --> ShowErr2
    VerifyPass -- Yes --> CheckVerified{Email verified?}
    CheckVerified -- No --> ShowVerify[Show 'Vui lòng xác nhận email trước']
    ShowVerify --> Display
    CheckVerified -- Yes --> CheckAdmin{Is admin user?}
    CheckAdmin -- No --> IssueTokens[Issue JWT access + refresh tokens<br/>BR-ID-005]
    CheckAdmin -- Yes --> CheckMFA{MFA enabled?}
    CheckMFA -- No --> RequireMFASetup[Redirect to MFA setup<br/>UC-ID-006]
    RequireMFASetup --> MFASetup[Admin configures TOTP]
    MFASetup --> IssueAdminTokens[Issue admin tokens after MFA verify]
    CheckMFA -- Yes --> PromptTOTP[Prompt for TOTP code]
    PromptTOTP --> VerifyTOTP{TOTP valid?}
    VerifyTOTP -- No --> MFAFail[Show 'Mã không hợp lệ']
    MFAFail --> Audit[Write audit log: failed MFA attempt]
    Audit --> PromptTOTP
    VerifyTOTP -- Yes --> Audit2[Write audit log: successful admin login]
    Audit2 --> IssueAdminTokens
    IssueTokens --> Redirect[Redirect to home / admin dashboard]
    IssueAdminTokens --> Redirect
    Redirect --> End([End])
```

**References:** UC-ID-002, BR-ID-005, BR-ID-013, BR-MFA-001, NFR-SEC-012

---

## 2. AD-02 — Registration Activity

```mermaid
flowchart TD
    Start([Start]) --> Nav[User clicks 'Đăng ký']
    Nav --> Form[Display registration form: email, password, confirm, name]
    Form --> Input[User fills + submits]
    Input --> ValEmail{Email valid?}
    ValEmail -- No --> ErrEmail[Show 'Email không hợp lệ']
    ErrEmail --> Form
    ValEmail -- Yes --> ValPwd{Password >= 8 chars<br/>+ 1 upper + 1 digit + 1 special?}
    ValPwd -- No --> ErrPwd[Show password requirements]
    ErrPwd --> Form
    ValPwd -- Yes --> ValMatch{Passwords match?}
    ValMatch -- No --> ErrMatch[Show 'Mật khẩu xác nhận không khớp']
    ErrMatch --> Form
    ValMatch -- Yes --> ExistCheck{Email already registered?}
    ExistCheck -- Yes --> ErrExist[Show 'Email đã được đăng ký']
    ErrExist --> Form
    ExistCheck -- No --> Hash[Hash password with Argon2id]
    Hash --> Create[Create customer account<br/>emailVerified = false]
    Create --> Token[Generate verification token<br/>expiresAt = now + 24h]
    Token --> QueueEmail[Queue verification email<br/>via BullMQ]
    QueueEmail --> ShowOK[Show 'Vui lòng kiểm tra email để xác nhận']
    ShowOK --> End([End])
```

**References:** UC-ID-001, BR-ID-001, BR-ID-002, BR-ID-003, NFR-SEC-005

---

## 3. AD-03 — Product Browsing Activity

```mermaid
flowchart TD
    Start([Start]) --> Home[User lands on storefront]
    Home --> Catalog[Display category tree]
    Catalog --> Choose{Customer chooses}
    Choose -- Category --> ListCat[List products in category<br/>with pagination]
    Choose -- Search --> Search[User types search query]
    Search --> SearchSvc[Full-text search: name, brand, SKU]
    SearchSvc --> Result[Display results]
    ListCat --> Filter[User applies filters: brand, price, attributes]
    Filter --> Result
    Result --> Sort[User sorts: price asc/desc, newest, popular]
    Sort --> Display[Display product cards: image, name, price, rating]
    Display --> Click{Click product?}
    Click -- No --> End([End])
    Click -- Yes --> AD4[Product Detail Activity]
```

**References:** UC-CAT-001, UC-CAT-002, UC-CAT-003, BR-CAT-001, BR-CAT-004, BR-CAT-005

---

## 4. AD-04 — Product Detail Activity

```mermaid
flowchart TD
    Start([Start]) --> Load[Load product by slug]
    Load --> Exist{Product exists and Published?}
    Exist -- No --> NotFound[Show 404]
    NotFound --> End([End])
    Exist -- Yes --> Display[Display: gallery, name, price, ratings,<br/>variants, attributes, warranty, stock status]
    Display --> SelectVar[Customer selects variant]
    SelectVar --> CheckStock{Stock available?}
    CheckStock -- Out --> ShowOOS[Show 'Hết hàng' + disable ATC]
    ShowOOS --> End
    CheckStock -- Low --> ShowLow[Show 'Còn ít - chỉ còn X']
    ShowLow --> Enter
    CheckStock -- In --> Enter[Customer enters quantity]
    Enter --> ClickATC[Customer clicks 'Thêm vào giỏ']
    ClickATC --> AD_CRT[Add to Cart Activity]
    AD_CRT --> Cart[Cart updated]
    Cart --> Continue{Continue shopping?}
    Continue -- Yes --> Display
    Continue -- No --> Checkout[Proceed to Checkout Activity]
```

**References:** UC-CAT-004, UC-CAT-005, UC-CRT-001, BR-INV-002, BR-INV-004, BR-CAT-009, BR-CAT-010

---

## 5. AD-05 — Cart Activity

```mermaid
flowchart TD
    Start([Start]) --> View[User opens cart page]
    View --> Load[Load cart lines + reservation status]
    Load --> Display[Display: thumbnail, name, variant, qty, price, line total]
    Display --> Action{User action}
    Action -- Update qty --> UpdQty[Validate qty ≤ stock]
    UpdQty --> ValOK{Within limits?}
    ValOK -- No --> ShowErr[Show 'Vượt quá tồn kho']
    ShowErr --> Display
    ValOK -- Yes --> Update[Update line + reservation]
    Update --> Recalc[Recalculate totals: subtotal, VAT, shipping preview, total]
    Recalc --> Display
    Action -- Remove --> Remove[Remove line + release reservation]
    Remove --> Empty{Cart empty?}
    Empty -- Yes --> EmptyCart[Show 'Giỏ hàng trống' + 'Tiếp tục mua sắm' button]
    Empty --> Display
    EmptyCart --> Display
    Action -- Checkout --> AD_CHK[Checkout Activity]
```

**References:** UC-CRT-002, UC-CRT-003, UC-CRT-004, BR-INV-002, BR-INV-003, BR-X-001, BR-TAX-002

---

## 6. AD-06 — Checkout Activity

```mermaid
flowchart TD
    Start([Start]) --> Begin[User clicks 'Tiến hành thanh toán']
    Begin --> ValCart{Validate cart:<br/>reservations active, stock OK, prices?}
    ValCart -- No --> ShowExpired[Show 'Một số sản phẩm đã hết hạn giữ chỗ' + back to cart]
    ShowExpired --> End([End])
    ValCart -- Yes --> CreateSession[Create checkout session<br/>15-min TTL]
    CreateSession --> Step1[Step 1: Email + shipping address]
    Step1 --> GuestQ{Guest or customer?}
    GuestQ -- Guest --> EmailInput[Enter email, name, phone, address]
    GuestQ -- Customer --> PickAddr[Pick from address book]
    PickAddr --> ConfirmAddr
    EmailInput --> ConfirmAddr[Confirm address]
    ConfirmAddr --> Step2[Step 2: Shipping method]
    Step2 --> CalcShip[System calculates shipping fee by zone + weight]
    CalcShip --> ChooseShip[Customer chooses method]
    ChooseShip --> Step3[Step 3: Payment method]
    Step3 --> ChoosePay[Customer chooses payment provider]
    ChoosePay --> Step4[Step 4: Review]
    Step4 --> ApplyVoucher[Customer applies voucher code]
    ApplyVoucher --> ValVoucher{Voucher valid?}
    ValVoucher -- No --> ShowVErr[Show reason 'Đã hết hạn' / etc.]
    ShowVErr --> ApplyVoucher
    ValVoucher -- Yes --> DiscApply[Apply discount, recalculate totals]
    DiscApply --> Step4
    Step4 --> CheckOptional{Optional:<br/>Create account?}
    CheckOptional -- Yes --> SetPwd[Set password]
    CheckOptional -- No --> PlaceOrder
    SetPwd --> PlaceOrder[Customer clicks 'Thanh toán']
    PlaceOrder --> Idemp[Generate idempotency token<br/>BR-CHK-007]
    Idemp --> CreateOrder[Create Order in Pending state<br/>UC-ORD-001]
    CreateOrder --> AD_PAY[Payment Activity]
```

**References:** UC-CHK-001..008, BR-CHK-001..010, BR-INV-002, BR-TAX-001..005, BR-GCH-001..004

---

## 7. AD-07 — Payment Activity

```mermaid
flowchart TD
    Start([Start]) --> CreateIntent[Create payment intent<br/>via provider API]
    CreateIntent --> IntentOK{Intent created?}
    IntentOK -- No --> ShowFail[Show 'Không thể khởi tạo thanh toán' + retry option]
    ShowFail --> Retry{User retries?}
    Retry -- Yes --> CreateIntent
    Retry -- No --> End([End])
    IntentOK -- Yes --> Persist[Persist intentId on order]
    Persist --> Redirect[Redirect user to provider hosted page]
    Redirect --> UserAction[User authorizes payment]
    UserAction --> ProviderResult{Provider result}
    ProviderResult -- Success --> RedirBack[Redirect back to SmartLight /success]
    ProviderResult -- Failure --> RedirFail[Redirect back to /failed]
    RedirBack --> WaitWeb[Wait for webhook]
    RedirFail --> RetryOption[Show 'Thanh toán thất lại' option]
    RetryOption --> UC_RETRY[UC-PAY-006 Retry Payment]
    WaitWeb --> Webhook[Receive webhook UC-PAY-003]
    Webhook --> SigVerify{Valid HMAC signature?}
    SigVerify -- No --> Log401[Log 401, ignore]
    Log401 --> End
    SigVerify -- Yes --> DupCheck{Duplicate event?}
    DupCheck -- Yes --> LogOK[Return 200, skip]
    LogOK --> End
    DupCheck -- No --> Process[Process: order -> Confirmed<br/>stock decremented]
    Process --> SendEmail[Send order confirmation email<br/>UC-NOT-001]
    SendEmail --> SendMagicLink[If guest: send magic link<br/>BR-GCH-004]
    SendMagicLink --> Confirmed[Show 'Thanh toán thành công']
    Confirmed --> End

    %% Reconciliation branch
    Cron[Hourly cron] --> Recon[Reconcile pending orders]
    Recon --> ProviderQuery[Query provider for stale orders]
    ProviderQuery --> Reconcile{Reconcile to confirmed?}
    Reconcile -- Yes --> Process
    Reconcile -- No --> Log[Log result]
    Log --> AlertCheck{Stale > 24h?}
    AlertCheck -- Yes --> Sev2[Sev-2 alert]
    AlertCheck -- No --> End
```

**References:** UC-PAY-001..006, BR-PAY-006..011, BR-PAY-002, BR-PAY-008, BR-PAY-007, BR-INV-001, BR-OSM-001

---

## 8. AD-08 — Order Processing Activity

```mermaid
flowchart TD
    Start([Order Confirmed]) --> Queue[Order in fulfillment queue]
    Queue --> Pick[Admin clicks 'Bắt đầu xử lý']
    Pick --> ValStock{Stock available for all lines?}
    ValStock -- No --> OutOfStock[Notify admin: stock issue]
    OutOfStock --> End([End])
    ValStock -- Yes --> Process[Order -> Processing<br/>BR-OSM-001]
    Process --> CreateShip[Create shipment at carrier<br/>UC-ORD-009]
    CreateShip --> GenLabel[Generate label + tracking number]
    GenLabel --> Shipped[Order -> Shipped<br/>BR-OSM-001]
    Shipped --> NotifyCust[Notify customer: tracking number]
    NotifyCust --> WaitCarrier[Wait for carrier tracking events]
    WaitCarrier --> Status{Carrier status}
    Status -- In transit --> Update[Update tracking history]
    Update --> WaitCarrier
    Status -- Delivered --> Delivered[Order -> Delivered]
    Delivered --> NotifyDel[Notify customer: delivered]
    NotifyDel --> Wait7[Wait 7 days]
    Wait7 --> Auto[Daily cron: order -> Completed<br/>BR-OSM-004]
    Auto --> NotifyComp[Notify customer: order completed]
    NotifyComp --> End
    Status -- Lost --> LostNotify[Notify admin: shipment lost]
    LostNotify --> Manual[Admin decides: cancel/refund/re-ship]
    Manual --> End
```

**References:** UC-ORD-007, UC-ORD-009, UC-SHP-002, UC-SHP-003, BR-OSM-001, BR-OSM-004

---

## 9. AD-09 — Return Request Activity

```mermaid
flowchart TD
    Start([Start]) --> Open[Customer opens order detail]
    Open --> InWindow{Order Delivered/Completed<br/>AND within 7 days?}
    InWindow -- No --> Reject[Show 'Đã quá hạn trả hàng']
    Reject --> End([End])
    InWindow -- Yes --> SelItems[Customer selects items to return]
    SelItems --> Reason[Customer picks reason:<br/>defective / wrong / no longer needed]
    Reason --> Photos[Optional: upload photos]
    Photos --> Submit[Customer submits]
    Submit --> GenRMA[Generate RMA number]
    GenRMA --> Pending[Return -> Pending]
    Pending --> EmailCust[Email customer: return submitted]
    EmailCust --> Queue[Return in support queue]
    Queue --> Review[Admin/Support reviews]
    Review --> Decision{Approve or Reject?}
    Decision -- Reject --> Rejected[Return -> Rejected]
    Rejected --> EmailRej[Email customer with reason]
    EmailRej --> End
    Decision -- Approve --> Approved[Return -> Approved]
    Approved --> EmailAp[Email customer: return shipping instructions]
    EmailAp --> WaitShip[Wait for return shipment]
    WaitShip --> Received[Fulfillment receives item]
    Received --> Inspect[Fulfillment inspects]
    Inspect --> Outcome{Outcome}
    Outcome -- PASS --> Restock[Increment stock-on-hand<br/>BR-INV-006]
    Outcome -- FAIL --> Dispose[Increment disposed counter]
    Restock --> Refund
    Dispose --> Refund[Process refund UC-PAY-005]
    Refund --> Closed[Return -> Refunded / Closed]
    Closed --> End
```

**References:** UC-RTN-001..005, BR-RTN-001..007, BR-INV-006, BR-PAY-009

---

## 10. AD-10 — Review Submission Activity

```mermaid
flowchart TD
    Start([Start]) --> Order[Customer views Completed order]
    Order --> Eligible{Customer purchased this product<br/>AND no existing review?}
    Eligible -- No --> Block[Show 'Bạn không thể đánh giá sản phẩm này']
    Block --> End([End])
    Eligible -- Yes --> ClickWrite[Customer clicks 'Viết đánh giá']
    ClickWrite --> Form[Display review form: rating 1-5 stars, text 1000 chars]
    Form --> Submit[Customer submits]
    Submit --> ValRating{Rating 1-5?}
    ValRating -- No --> ShowErr[Show validation error]
    ShowErr --> Form
    ValRating -- Yes --> Save[Create review in Pending moderation<br/>BR-RVW-001]
    Save --> ShowThank[Show 'Cảm ơn bạn đã đánh giá']
    ShowThank --> End
    Save -.-> ModQueue[Admin moderation queue]
    ModQueue --> Admin[Admin reviews]
    Admin --> AdminDecision{Approve or Reject?}
    AdminDecision -- Approve --> Publish[Review -> Published<br/>FR-RVW-005]
    AdminDecision -- Reject --> Hide[Review -> Rejected]
    Publish --> UpdateAgg[Update aggregated rating]
    Hide --> NotifyRej[Notify customer if requested]
    UpdateAgg --> End
    NotifyRej --> End
```

**References:** UC-RVW-001, UC-RVW-002, BR-RVW-001..005

---

## 11. AD-11 — Admin Product Management Activity

```mermaid
flowchart TD
    Start([Start]) --> Login[Admin logs in with MFA]
    Login --> List[Admin opens product list]
    List --> Action{Action}
    Action -- Create --> CreateForm[Open create form]
    CreateForm --> Fill[Admin fills: name, category, brand, description]
    Fill --> AddVar[Admin adds variants: SKU, price, attributes]
    AddVar --> SetStock[Admin sets initial stock + threshold]
    SetStock --> UploadImg[Admin uploads images UC-MED-001]
    UploadImg --> SaveDraft[Save as Draft]
    SaveDraft --> PublishQ{Publish?}
    PublishQ -- Yes --> Pub[Status -> Published]
    PublishQ -- No --> End1[End]
    Pub --> End1
    Action -- Edit --> EditForm[Open edit form pre-filled]
    EditForm --> EditChange[Admin modifies fields]
    EditChange --> SaveEdit[Save changes<br/>audit log entry]
    SaveEdit --> End2[End]
    Action -- Delete --> SoftDel{Soft delete?}
    SoftDel -- Yes --> MarkDel[Mark Deleted, hide from storefront]
    MarkDel --> End3[End]
    SoftDel -- No --> End3
```

**References:** UC-CAT-009, UC-CAT-010, UC-MED-001, BR-CAT-001..005, BR-ADM-002

---

## 12. AD-12 — Promotion Management Activity

```mermaid
flowchart TD
    Start([Start]) --> Open[Admin opens promotions]
    Open --> Type{Promotion type}
    Type -- Percentage --> Pct[Admin sets: percent off, eligible products/categories, min order]
    Type -- Fixed --> Fix[Admin sets: VND amount off, min order]
    Type -- Voucher --> Vch[Admin enters voucher code, discount, usage limits]
    Type -- Flash Sale --> FS[Admin sets: discount, start/end time, eligible variants]
    Pct --> SetWindow[Set start/end times]
    Fix --> SetWindow
    Vch --> SetWindow
    FS --> SetWindow
    SetWindow --> SetLimits[Set usage limits:<br/>total, per-user]
    SetLimits --> Stacking[Set stacking rules<br/>BR-PRM-006]
    Stacking --> Review[Admin reviews summary]
    Review --> ApproveQ{Requires approval<br/>over threshold?}
    ApproveQ -- Yes --> MgrAppr[Manager approval required]
    MgrAppr --> Approved
    ApproveQ -- No --> Approved[Promotion saved as Scheduled/Active]
    Approved --> Active{Within active window?}
    Active -- Yes --> NowActive[Promotion goes Active<br/>UC-PRM-003 enabled]
    Active -- No --> Scheduled[Promotion stays Scheduled]
    Scheduled --> Wait[Wait until start time<br/>cron activates]
    Wait --> NowActive
    NowActive --> End([End])
```

**References:** UC-PRM-001..004, BR-PRM-001..012

---

## 13. Activity Diagram Coverage Matrix

| Activity | Use Case | Business Rules | Features |
| --- | --- | --- | --- |
| AD-01 Login | UC-ID-002 | BR-ID-005, BR-ID-013, BR-MFA-001 | SF-ID-004, SF-ID-005, SF-ID-011 |
| AD-02 Registration | UC-ID-001 | BR-ID-001..003 | SF-ID-001..003 |
| AD-03 Product Browsing | UC-CAT-001..003 | BR-CAT-001..005 | SF-CAT-001..005 |
| AD-04 Product Detail | UC-CAT-004..005 | BR-INV-002, BR-CAT-009..010 | SF-CAT-005..007 |
| AD-05 Cart | UC-CRT-002..004 | BR-INV-002, BR-X-001 | SF-CRT-001..007 |
| AD-06 Checkout | UC-CHK-001..008 | BR-CHK-001..010, BR-GCH-001..004, BR-TAX-001..005 | SF-CHK-001..011 |
| AD-07 Payment | UC-PAY-001..006 | BR-PAY-002, BR-PAY-006..011 | SF-PAY-001..005 |
| AD-08 Order Processing | UC-ORD-007, UC-SHP-002..004 | BR-OSM-001, BR-OSM-004 | SF-ORD-003..004, SF-SHP-002..006 |
| AD-09 Return | UC-RTN-001..005 | BR-RTN-001..007, BR-INV-006 | SF-RTN-001..006 |
| AD-10 Review | UC-RVW-001..002 | BR-RVW-001..005 | SF-RVW-001..005 |
| AD-11 Admin Product | UC-CAT-009..010, UC-MED-001 | BR-CAT-001..005, BR-MED-001..002 | SF-CAT-009..015 |
| AD-12 Promotion | UC-PRM-001..004 | BR-PRM-001..012 | SF-PRM-001..005 |

---

## 14. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal System Analyst | Initial 12 activity diagrams in Mermaid syntax; coverage matrix; references to BR and SF |

---

**End of Document — ACTIVITY_DIAGRAMS.md**
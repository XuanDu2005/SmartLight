# SmartLight — System Features

| Field | Value |
| --- | --- |
| **Document ID** | `BA-FEATURES-001` |
| **Document Owner** | Principal Business Analyst |
| **Status** | Draft — v0.1 |
| **Created Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2026-08-01 |
| **Classification** | Business Analysis — Authoritative |
| **Audience** | Engineering, Product, QA, Stakeholders, AI Agents |

> **Source of Truth:** This document conforms to `docs/00-governance/PROJECT_BLUEPRINT.md` and `SRS.md`. Features listed here are production-ready targets for SmartLight Version 1 (single-vendor, Vietnam, VND).

---

## 1. Purpose

This document lists every production-ready feature of the SmartLight platform. Each feature is described using a consistent template to support:

- **Engineering estimation** and sprint planning.
- **QA test planning** and acceptance verification.
- **Traceability** to user stories and acceptance criteria.
- **Roadmap prioritization** and release planning.

---

## 2. Feature ID Convention

| Pattern | Meaning |
| --- | --- |
| `SF-<MODULE>-<NUMBER>` | System Feature ID |
| Module codes | `CAT`, `CRT`, `CHK`, `ORD`, `SHP`, `ID`, `RVW`, `PRM`, `RTN`, `NOT`, `SUP`, `ADM`, `ANL`, `I18`, `PLT` |

---

## 3. Priority Levels

| Priority | Meaning | SLA |
| --- | --- | --- |
| **P0 (Critical)** | Must be in V1.0 GA. Cannot ship without. | Required for Phase 1 GA |
| **P1 (High)** | Must be in V1.0 GA or first minor release. | Required for V1.0 GA |
| **P2 (Medium)** | Should be in V1.x. | Required for V1.x |
| **P3 (Low)** | Nice to have. May defer to V1.5+. | Optional |

---

## 4. Feature Catalog — Catalog Module

### SF-CAT-001 — Product Listing

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Display products in a paginated, sortable, filterable list view. |
| **Actors** | Guest, Customer |
| **Business Value** | Core product discovery; revenue entry point. |
| **Priority** | P0 |
| **Dependencies** | SF-CAT-002, SF-CAT-005 |
| **Future Extension** | Personalized recommendations, recently viewed. |

### SF-CAT-002 — Category Browsing

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Browse products by category, including nested subcategories up to 3 levels. |
| **Actors** | Guest, Customer |
| **Business Value** | Structured navigation; improves findability. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Visual category landing pages, curated collections. |

### SF-CAT-003 — Product Search

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Full-text search across product names, descriptions, SKUs, and brands. |
| **Actors** | Guest, Customer |
| **Business Value** | Direct path to purchase intent. |
| **Priority** | P0 |
| **Dependencies** | SF-CAT-001 |
| **Future Extension** | Search suggestions, typo tolerance, semantic search. |

### SF-CAT-004 — Product Filtering

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Filter products by price range, wattage, color temperature, IP rating, brand, availability. |
| **Actors** | Guest, Customer |
| **Business Value** | Reduces decision friction; increases conversion. |
| **Priority** | P0 |
| **Dependencies** | SF-CAT-001 |
| **Future Extension** | Saved filter presets, AI-recommended filters. |

### SF-CAT-005 — Product Detail Page

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Full product detail with image gallery, video, technical specs, variants, price, availability, reviews summary. |
| **Actors** | Guest, Customer |
| **Business Value** | Conversion-driving page; SEO landing page. |
| **Priority** | P0 |
| **Dependencies** | SF-CAT-001, SF-RVW-001 |
| **Future Extension** | AR preview, 360° view. |

### SF-CAT-006 — Product Variants

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Support product variants (color, size, wattage, color temperature) with per-variant stock and price. |
| **Actors** | Guest, Customer |
| **Business Value** | Reduces SKU explosion; improves UX. |
| **Priority** | P0 |
| **Dependencies** | SF-CAT-005 |
| **Future Extension** | Bundle variants, custom configurations. |

### SF-CAT-007 — Product Availability Display

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Show stock status: In Stock, Low Stock (≤ threshold), Out of Stock, Backorder. |
| **Actors** | Guest, Customer |
| **Business Value** | Sets expectations; reduces cart abandonment. |
| **Priority** | P0 |
| **Dependencies** | SF-INV-002 |
| **Future Extension** | Notify-me when available. |

### SF-CAT-008 — Related Products

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Show related and complementary products on PDP. |
| **Actors** | Guest, Customer |
| **Business Value** | Cross-sell; increases AOV. |
| **Priority** | P1 |
| **Dependencies** | SF-CAT-005 |
| **Future Extension** | AI-recommended related products. |

### SF-CAT-009 — Product Comparison

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Allow customers to compare 2–4 products side-by-side. |
| **Actors** | Customer |
| **Business Value** | Decision support for considered purchases. |
| **Priority** | P2 |
| **Dependencies** | SF-CAT-005 |
| **Future Extension** | Shareable comparison links. |

### SF-CAT-010 — Product Image Gallery

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Display multiple images per product with zoom and thumbnails. |
| **Actors** | Guest, Customer |
| **Business Value** | Visual product evaluation. |
| **Priority** | P0 |
| **Dependencies** | SF-MED-001 |
| **Future Extension** | Video gallery. |

### SF-CAT-011 — Product Video

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Embed product demonstration videos on PDP. |
| **Actors** | Guest, Customer |
| **Business Value** | Higher engagement and conversion. |
| **Priority** | P2 |
| **Dependencies** | SF-MED-001 |
| **Future Extension** | Live product demos. |

### SF-CAT-012 — Technical Specifications Display

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Display structured technical specs (lumen, wattage, CRI, IP rating, voltage, dimensions, materials). |
| **Actors** | Guest, Customer |
| **Business Value** | Decision support for technical buyers. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Downloadable spec sheets. |

### SF-CAT-013 — Warranty Information Display

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Show warranty terms per product on PDP and cart. |
| **Actors** | Guest, Customer |
| **Business Value** | Trust building; reduces pre-purchase friction. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Extended warranty offerings. |

### SF-CAT-014 — SEO-Friendly URLs

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Generate human-readable, SEO-friendly product and category URLs. |
| **Actors** | System, SEO crawlers |
| **Business Value** | Search engine visibility. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Multilingual slugs. |

### SF-CAT-015 — Structured Data (JSON-LD)

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Emit JSON-LD Product and BreadcrumbList structured data. |
| **Actors** | SEO crawlers |
| **Business Value** | Rich search results. |
| **Priority** | P0 |
| **Dependencies** | SF-CAT-005 |
| **Future Extension** | Organization, FAQ, Review schemas. |

### SF-CAT-016 — Recently Viewed Products

| Attribute | Value |
| --- | --- |
| **Module** | Catalog |
| **Description** | Display recently viewed products to the customer. |
| **Actors** | Customer |
| **Business Value** | Re-engagement; reduces navigation effort. |
| **Priority** | P2 |
| **Dependencies** | SF-ID-005 |
| **Future Extension** | Cross-device history. |

---

## 5. Feature Catalog — Cart Module

### SF-CRT-001 — Add to Cart

| Attribute | Value |
| --- | --- |
| **Module** | Cart |
| **Description** | Add product (with variant) to cart from PDP or listing. |
| **Actors** | Guest, Customer |
| **Business Value** | Core commerce action. |
| **Priority** | P0 |
| **Dependencies** | SF-CAT-007 |
| **Future Extension** | Bulk add. |

### SF-CRT-002 — View Cart

| Attribute | Value |
| --- | --- |
| **Module** | Cart |
| **Description** | Display cart with line items, quantities, subtotal. |
| **Actors** | Guest, Customer |
| **Business Value** | Pre-checkout summary. |
| **Priority** | P0 |
| **Dependencies** | SF-CRT-001 |
| **Future Extension** | Saved carts. |

### SF-CRT-003 — Update Cart Line Item

| Attribute | Value |
| --- | --- |
| **Module** | Cart |
| **Description** | Change quantity of a cart line item. |
| **Actors** | Guest, Customer |
| **Business Value** | Cart management. |
| **Priority** | P0 |
| **Dependencies** | SF-CRT-002 |
| **Future Extension** | Bulk update. |

### SF-CRT-004 — Remove from Cart

| Attribute | Value |
| --- | --- |
| **Module** | Cart |
| **Description** | Remove a line item from cart. |
| **Actors** | Guest, Customer |
| **Business Value** | Cart management. |
| **Priority** | P0 |
| **Dependencies** | SF-CRT-002 |
| **Future Extension** | Save for later. |

### SF-CRT-005 — Guest Cart Persistence

| Attribute | Value |
| --- | --- |
| **Module** | Cart |
| **Description** | Persist guest cart across sessions via cookie. |
| **Actors** | Guest |
| **Business Value** | Reduces friction; preserves intent. |
| **Priority** | P0 |
| **Dependencies** | SF-CRT-001 |
| **Future Extension** | Cart recovery email links. |

### SF-CRT-006 — Cart Merge on Login

| Attribute | Value |
| --- | --- |
| **Module** | Cart |
| **Description** | Merge guest cart into customer's account cart on login. |
| **Actors** | Customer |
| **Business Value** | Continuity; no lost intent. |
| **Priority** | P0 |
| **Dependencies** | SF-CRT-005, SF-ID-005 |
| **Future Extension** | Configurable merge rules. |

### SF-CRT-007 — Cart Subtotal and Totals

| Attribute | Value |
| --- | --- |
| **Module** | Cart |
| **Description** | Display subtotal, discount, estimated tax, and shipping estimate. |
| **Actors** | Guest, Customer |
| **Business Value** | Price transparency. |
| **Priority** | P0 |
| **Dependencies** | SF-PRM-005, SF-SHP-001 |
| **Future Extension** | Loyalty points applied. |

### SF-CRT-008 — Wishlist

| Attribute | Value |
| --- | --- |
| **Module** | Cart |
| **Description** | Save products to a wishlist for later. |
| **Actors** | Customer |
| **Business Value** | Re-engagement; saves intent. |
| **Priority** | P1 |
| **Dependencies** | SF-ID-005 |
| **Future Extension** | Share wishlists, wishlist price-drop alerts. |

### SF-CRT-009 — Move to Cart from Wishlist

| Attribute | Value |
| --- | --- |
| **Module** | Cart |
| **Description** | Move a wishlist item back to cart. |
| **Actors** | Customer |
| **Business Value** | Faster re-engagement. |
| **Priority** | P1 |
| **Dependencies** | SF-CRT-008 |
| **Future Extension** | Bulk move. |

### SF-CRT-010 — Abandoned Cart Email

| Attribute | Value |
| --- | --- |
| **Module** | Cart |
| **Description** | Send automated abandoned cart reminders at 24h and 72h. |
| **Actors** | Customer |
| **Business Value** | Recovery of abandoned carts; revenue lift. |
| **Priority** | P1 |
| **Dependencies** | SF-NOT-001 |
| **Future Extension** | Personalized incentives. |

---

## 6. Feature Catalog — Checkout Module

### SF-CHK-001 — Multi-Step Checkout

| Attribute | Value |
| --- | --- |
| **Module** | Checkout |
| **Description** | Address → Shipping → Payment → Review steps. |
| **Actors** | Guest, Customer |
| **Business Value** | Reduces abandonment; clarifies progress. |
| **Priority** | P0 |
| **Dependencies** | SF-ID-008 |
| **Future Extension** | One-page checkout. |

### SF-CHK-002 — Guest Checkout

| Attribute | Value |
| --- | --- |
| **Module** | Checkout |
| **Description** | Allow checkout without registration, using email. |
| **Actors** | Guest |
| **Business Value** | Reduces friction; increases conversion. |
| **Priority** | P0 |
| **Dependencies** | SF-CHK-001 |
| **Future Extension** | Optional account creation post-purchase. |

### SF-CHK-003 — Address Management

| Attribute | Value |
| --- | --- |
| **Module** | Checkout |
| **Description** | Enter and validate Vietnamese address (province, district, ward, street). |
| **Actors** | Guest, Customer |
| **Business Value** | Accurate shipping; reduced errors. |
| **Priority** | P0 |
| **Dependencies** | SF-ID-008 |
| **Future Extension** | Address autocomplete. |

### SF-CHK-004 — Phone Number Validation

| Attribute | Value |
| --- | --- |
| **Module** | Checkout |
| **Description** | Validate Vietnamese phone numbers (+84 / 0xx). |
| **Actors** | Guest, Customer |
| **Business Value** | Delivery accuracy. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | SMS verification. |

### SF-CHK-005 — Shipping Method Selection

| Attribute | Value |
| --- | --- |
| **Module** | Checkout |
| **Description** | Choose from available shipping methods with calculated fees. |
| **Actors** | Guest, Customer |
| **Business Value** | Choice and transparency. |
| **Priority** | P0 |
| **Dependencies** | SF-SHP-001 |
| **Future Extension** | Scheduled delivery. |

### SF-CHK-006 — Payment Method Selection

| Attribute | Value |
| --- | --- |
| **Module** | Checkout |
| **Description** | Choose from available payment methods. |
| **Actors** | Guest, Customer |
| **Business Value** | Flexibility; conversion. |
| **Priority** | P0 |
| **Dependencies** | SF-PAY-001 |
| **Future Extension** | BNPL, e-wallets. |

### SF-CHK-007 — Order Review

| Attribute | Value |
| --- | --- |
| **Module** | Checkout |
| **Description** | Review order summary before payment. |
| **Actors** | Guest, Customer |
| **Business Value** | Reduces errors and disputes. |
| **Priority** | P0 |
| **Dependencies** | SF-CHK-001 |
| **Future Extension** | Final price-lock confirmation. |

### SF-CHK-008 — Payment Redirect

| Attribute | Value |
| --- | --- |
| **Module** | Checkout |
| **Description** | Redirect to payment provider securely. |
| **Actors** | Customer |
| **Business Value** | Provider-side security and UX. |
| **Priority** | P0 |
| **Dependencies** | SF-PAY-001 |
| **Future Extension** | Embedded payment (if supported). |

### SF-CHK-009 — Payment Callback Handling

| Attribute | Value |
| --- | --- |
| **Module** | Checkout |
| **Description** | Receive and verify payment status via webhook. |
| **Actors** | System, Payment Provider |
| **Business Value** | Reliable order confirmation. |
| **Priority** | P0 |
| **Dependencies** | SF-PAY-002 |
| **Future Extension** | Multi-provider orchestration. |

### SF-CHK-010 — Double-Submit Prevention

| Attribute | Value |
| --- | --- |
| **Module** | Checkout |
| **Description** | Prevent duplicate order creation on resubmit. |
| **Actors** | Guest, Customer |
| **Business Value** | Avoid duplicate charges. |
| **Priority** | P0 |
| **Dependencies** | SF-ORD-012 |
| **Future Extension** | Idempotency keys. |

### SF-CHK-011 — Order Confirmation

| Attribute | Value |
| --- | --- |
| **Module** | Checkout |
| **Description** | Display confirmation page and send confirmation email. |
| **Actors** | Customer |
| **Business Value** | Reassurance; reference. |
| **Priority** | P0 |
| **Dependencies** | SF-NOT-001 |
| **Future Extension** | SMS confirmation. |

### SF-CHK-012 — Checkout State Recovery

| Attribute | Value |
| --- | --- |
| **Module** | Checkout |
| **Description** | Retain checkout state for 15 minutes after interruption. |
| **Actors** | Guest, Customer |
| **Business Value** | Resilience; reduced abandonment. |
| **Priority** | P1 |
| **Dependencies** | — |
| **Future Extension** | Email resume link. |

---

## 7. Feature Catalog — Order Module

### SF-ORD-001 — Order Creation

| Attribute | Value |
| --- | --- |
| **Module** | Order |
| **Description** | Create an order upon successful payment. |
| **Actors** | System |
| **Business Value** | Core commerce transaction. |
| **Priority** | P0 |
| **Dependencies** | SF-PAY-002 |
| **Future Extension** | Backorders, pre-orders. |

### SF-ORD-002 — Order Number Generation

| Attribute | Value |
| --- | --- |
| **Module** | Order |
| **Description** | Generate unique human-readable order numbers. |
| **Actors** | System |
| **Business Value** | Easy reference; support. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Branch prefix, year prefix. |

### SF-ORD-003 — Order Lifecycle Management

| Attribute | Value |
| --- | --- |
| **Module** | Order |
| **Description** | Manage states: Pending → Confirmed → Processing → Shipped → Delivered → Completed (plus Cancelled, Returned). |
| **Actors** | Admin, System |
| **Business Value** | Operational control. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Custom state flows per category. |

### SF-ORD-004 — Order Status History

| Attribute | Value |
| --- | --- |
| **Module** | Order |
| **Description** | Record every status change with timestamp and actor. |
| **Actors** | System |
| **Business Value** | Audit; customer trust. |
| **Priority** | P0 |
| **Dependencies** | SF-ORD-003 |
| **Future Extension** | Reason codes per transition. |

### SF-ORD-005 — Order History (Customer)

| Attribute | Value |
| --- | --- |
| **Module** | Order |
| **Description** | Customer view of their past and current orders. |
| **Actors** | Customer |
| **Business Value** | Self-service; reduces support load. |
| **Priority** | P0 |
| **Dependencies** | SF-ID-005 |
| **Future Extension** | Reorder from history. |

### SF-ORD-006 — Order Detail View

| Attribute | Value |
| --- | --- |
| **Module** | Order |
| **Description** | Detailed view of order with items, status, tracking, totals. |
| **Actors** | Customer, Admin |
| **Business Value** | Transparency. |
| **Priority** | P0 |
| **Dependencies** | SF-ORD-005 |
| **Future Extension** | Live tracking map. |

### SF-ORD-007 — Order Status Update by Admin

| Attribute | Value |
| --- | --- |
| **Module** | Order |
| **Description** | Admin updates order status manually with notes. |
| **Actors** | Order Fulfillment Staff |
| **Business Value** | Operational control. |
| **Priority** | P0 |
| **Dependencies** | SF-ORD-003 |
| **Future Extension** | Bulk status update. |

### SF-ORD-008 — Invoice Generation (PDF)

| Attribute | Value |
| --- | --- |
| **Module** | Order |
| **Description** | Generate PDF invoice per order. |
| **Actors** | Customer, Admin |
| **Business Value** | Tax/compliance; reference. |
| **Priority** | P0 |
| **Dependencies** | SF-ORD-001 |
| **Future Extension** | E-invoice integration. |

### SF-ORD-009 — Picklist Generation

| Attribute | Value |
| --- | --- |
| **Module** | Order |
| **Description** | Generate warehouse picklist per order. |
| **Actors** | Order Fulfillment Staff |
| **Business Value** | Operational efficiency. |
| **Priority** | P1 |
| **Dependencies** | SF-ORD-001 |
| **Future Extension** | Batch picklists. |

### SF-ORD-010 — Partial Shipment

| Attribute | Value |
| --- | --- |
| **Module** | Order |
| **Description** | Allow multiple shipments per order. |
| **Actors** | Order Fulfillment Staff |
| **Business Value** | Operational flexibility. |
| **Priority** | P2 |
| **Dependencies** | SF-ORD-003, SF-SHP-002 |
| **Future Extension** | Split shipments with separate tracking. |

### SF-ORD-011 — Order Cancellation

| Attribute | Value |
| --- | --- |
| **Module** | Order |
| **Description** | Allow customer or admin to cancel orders before shipment. |
| **Actors** | Customer, Admin |
| **Business Value** | Customer satisfaction; operational control. |
| **Priority** | P0 |
| **Dependencies** | SF-ORD-003 |
| **Future Extension** | Reason-based cancellation policy. |

### SF-ORD-012 — Duplicate Order Detection

| Attribute | Value |
| --- | --- |
| **Module** | Order |
| **Description** | Detect and flag potentially duplicate orders. |
| **Actors** | System |
| **Business Value** | Fraud prevention; trust. |
| **Priority** | P1 |
| **Dependencies** | SF-ORD-001 |
| **Future Extension** | ML-based fraud scoring. |

### SF-ORD-013 — Order Notes (Internal)

| Attribute | Value |
| --- | --- |
| **Module** | Order |
| **Description** | Internal notes on orders for staff. |
| **Actors** | Admin |
| **Business Value** | Internal communication. |
| **Priority** | P1 |
| **Dependencies** | SF-ORD-001 |
| **Future Extension** | Customer-visible notes. |

---

## 8. Feature Catalog — Shipping Module

### SF-SHP-001 — Shipping Fee Calculation

| Attribute | Value |
| --- | --- |
| **Module** | Shipping |
| **Description** | Calculate shipping fees by zone, weight, dimensions, and carrier. |
| **Actors** | System |
| **Business Value** | Accurate cost display; conversion. |
| **Priority** | P0 |
| **Dependencies** | SF-SHP-002 |
| **Future Extension** | Real-time rate shopping. |

### SF-SHP-002 — Shipping Carrier Integration

| Attribute | Value |
| --- | --- |
| **Module** | Shipping |
| **Description** | Integrate with at least one Vietnamese carrier (GHN, GHTK, or Viettel Post). |
| **Actors** | System |
| **Business Value** | Operational capability. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Multi-carrier orchestration. |

### SF-SHP-003 — Shipment Creation

| Attribute | Value |
| --- | --- |
| **Module** | Shipping |
| **Description** | Create shipment with carrier on order dispatch. |
| **Actors** | Order Fulfillment Staff |
| **Business Value** | Operational capability. |
| **Priority** | P0 |
| **Dependencies** | SF-SHP-002 |
| **Future Extension** | Bulk dispatch. |

### SF-SHP-004 — Shipping Label Generation

| Attribute | Value |
| --- | --- |
| **Module** | Shipping |
| **Description** | Generate shipping label PDF. |
| **Actors** | Order Fulfillment Staff |
| **Business Value** | Operational efficiency. |
| **Priority** | P0 |
| **Dependencies** | SF-SHP-003 |
| **Future Extension** | Multi-label print sheets. |

### SF-SHP-005 — Tracking Number Assignment

| Attribute | Value |
| --- | --- |
| **Module** | Shipping |
| **Description** | Capture and assign tracking numbers to orders. |
| **Actors** | System |
| **Business Value** | Visibility. |
| **Priority** | P0 |
| **Dependencies** | SF-SHP-003 |
| **Future Extension** | Tracking portal embed. |

### SF-SHP-006 — Tracking Status Synchronization

| Attribute | Value |
| --- | --- |
| **Module** | Shipping |
| **Description** | Sync tracking status via webhook or polling. |
| **Actors** | System |
| **Business Value** | Real-time visibility. |
| **Priority** | P0 |
| **Dependencies** | SF-SHP-005 |
| **Future Extension** | Multi-carrier aggregation. |

### SF-SHP-007 — Customer Tracking View

| Attribute | Value |
| --- | --- |
| **Module** | Shipping |
| **Description** | Customer-facing tracking timeline. |
| **Actors** | Customer |
| **Business Value** | Self-service; reduces WISMO contacts. |
| **Priority** | P0 |
| **Dependencies** | SF-SHP-006 |
| **Future Extension** | Map view. |

### SF-SHP-008 — Estimated Delivery Date

| Attribute | Value |
| --- | --- |
| **Module** | Shipping |
| **Description** | Display estimated delivery date at checkout and order page. |
| **Actors** | Customer |
| **Business Value** | Expectation setting. |
| **Priority** | P1 |
| **Dependencies** | SF-SHP-001 |
| **Future Extension** | Carrier-specific ETAs. |

### SF-SHP-009 — Delivery Confirmation

| Attribute | Value |
| --- | --- |
| **Module** | Shipping |
| **Description** | Mark order as delivered upon carrier confirmation. |
| **Actors** | System |
| **Business Value** | Order closure. |
| **Priority** | P0 |
| **Dependencies** | SF-SHP-006 |
| **Future Extension** | Photo proof of delivery. |

### SF-SHP-010 — Shipping Zones Configuration

| Attribute | Value |
| --- | --- |
| **Module** | Shipping |
| **Description** | Admin can configure shipping zones (provinces, regions). |
| **Actors** | Admin |
| **Business Value** | Operational flexibility. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Carrier-specific zones. |

### SF-SHP-011 — Free Shipping Threshold

| Attribute | Value |
| --- | --- |
| **Module** | Shipping |
| **Description** | Offer free shipping above cart threshold. |
| **Actors** | Customer, Admin |
| **Business Value** | Conversion lever; AOV growth. |
| **Priority** | P1 |
| **Dependencies** | SF-SHP-001, SF-PRM-001 |
| **Future Extension** | Carrier-specific thresholds. |

---

## 9. Feature Catalog — Identity Module

### SF-ID-001 — User Registration

| Attribute | Value |
| --- | --- |
| **Module** | Identity |
| **Description** | Register with email, password, name. |
| **Actors** | Guest |
| **Business Value** | Customer acquisition. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Social login, phone registration. |

### SF-ID-002 — Password Policy Enforcement

| Attribute | Value |
| --- | --- |
| **Module** | Identity |
| **Description** | Enforce password complexity rules (length, character classes). |
| **Actors** | Guest, Customer |
| **Business Value** | Security baseline. |
| **Priority** | P0 |
| **Dependencies** | SF-ID-001 |
| **Future Extension** | Password breach check. |

### SF-ID-003 — Email Verification

| Attribute | Value |
| --- | --- |
| **Module** | Identity |
| **Description** | Send verification email on registration; require verification. |
| **Actors** | Customer |
| **Business Value** | Trust; deliverability. |
| **Priority** | P0 |
| **Dependencies** | SF-NOT-001 |
| **Future Extension** | Phone verification. |

### SF-ID-004 — User Login

| Attribute | Value |
| --- | --- |
| **Module** | Identity |
| **Description** | Authenticate user with email + password. |
| **Actors** | Customer, Admin |
| **Business Value** | Core identity flow. |
| **Priority** | P0 |
| **Dependencies** | SF-ID-001 |
| **Future Extension** | MFA for customers, biometric. |

### SF-ID-005 — Token-Based Session

| Attribute | Value |
| --- | --- |
| **Module** | Identity |
| **Description** | Issue JWT access tokens and refresh tokens. |
| **Actors** | System |
| **Business Value** | Stateless auth; security. |
| **Priority** | P0 |
| **Dependencies** | SF-ID-004 |
| **Future Extension** | Token rotation policies. |

### SF-ID-006 — Password Reset

| Attribute | Value |
| --- | --- |
| **Module** | Identity |
| **Description** | Reset password via email link. |
| **Actors** | Customer |
| **Business Value** | Account recovery. |
| **Priority** | P0 |
| **Dependencies** | SF-NOT-001 |
| **Future Extension** | SMS reset. |

### SF-ID-007 — Profile Management

| Attribute | Value |
| --- | --- |
| **Module** | Identity |
| **Description** | Customer can view and edit profile (name, phone, email). |
| **Actors** | Customer |
| **Business Value** | Self-service. |
| **Priority** | P0 |
| **Dependencies** | SF-ID-004 |
| **Future Extension** | Avatar upload. |

### SF-ID-008 — Address Book

| Attribute | Value |
| --- | --- |
| **Module** | Identity |
| **Description** | Manage multiple shipping addresses with default designation. |
| **Actors** | Customer |
| **Business Value** | Reorder convenience. |
| **Priority** | P0 |
| **Dependencies** | SF-ID-007 |
| **Future Extension** | Address validation service. |

### SF-ID-009 — Change Password

| Attribute | Value |
| --- | --- |
| **Module** | Identity |
| **Description** | Customer can change password from profile. |
| **Actors** | Customer |
| **Business Value** | Security hygiene. |
| **Priority** | P0 |
| **Dependencies** | SF-ID-004 |
| **Future Extension** | Password history. |

### SF-ID-010 — Logout

| Attribute | Value |
| --- | --- |
| **Module** | Identity |
| **Description** | Log out and invalidate refresh tokens. |
| **Actors** | Customer, Admin |
| **Business Value** | Security. |
| **Priority** | P0 |
| **Dependencies** | SF-ID-005 |
| **Future Extension** | Session timeout policies. |

### SF-ID-011 — Admin Authentication with MFA

| Attribute | Value |
| --- | --- |
| **Module** | Identity |
| **Description** | Admin login requires MFA (TOTP). |
| **Actors** | Admin |
| **Business Value** | Security baseline for staff. |
| **Priority** | P0 |
| **Dependencies** | SF-ID-004 |
| **Future Extension** | Hardware key support. |

### SF-ID-012 — Role-Based Access Control

| Attribute | Value |
| --- | --- |
| **Module** | Identity |
| **Description** | Admins assigned roles; permissions enforced server-side. |
| **Actors** | Admin |
| **Business Value** | Operational security. |
| **Priority** | P0 |
| **Dependencies** | SF-ID-011 |
| **Future Extension** | Custom roles. |

### SF-ID-013 — Account Lockout

| Attribute | Value |
| --- | --- |
| **Module** | Identity |
| **Description** | Lock account after 5 failed logins for 15 minutes. |
| **Actors** | System |
| **Business Value** | Brute-force protection. |
| **Priority** | P0 |
| **Dependencies** | SF-ID-004 |
| **Future Extension** | CAPTCHA after threshold. |

### SF-ID-014 — Account Deletion Request

| Attribute | Value |
| --- | --- |
| **Module** | Identity |
| **Description** | Customer can request account deletion (PDPD compliance). |
| **Actors** | Customer |
| **Business Value** | Compliance; trust. |
| **Priority** | P1 |
| **Dependencies** | SF-ID-007 |
| **Future Extension** | Data export before deletion. |

---

## 10. Feature Catalog — Reviews Module

### SF-RVW-001 — Submit Review

| Attribute | Value |
| --- | --- |
| **Module** | Reviews |
| **Description** | Verified purchasers can submit star rating and text. |
| **Actors** | Customer |
| **Business Value** | Social proof; conversion. |
| **Priority** | P0 |
| **Dependencies** | SF-ORD-009 |
| **Future Extension** | Video reviews. |

### SF-RVW-002 — Star Rating

| Attribute | Value |
| --- | --- |
| **Module** | Reviews |
| **Description** | 1–5 star rating per review. |
| **Actors** | Customer |
| **Business Value** | Quick evaluation signal. |
| **Priority** | P0 |
| **Dependencies** | SF-RVW-001 |
| **Future Extension** | Sub-criteria ratings. |

### SF-RVW-003 — Photo Reviews

| Attribute | Value |
| --- | --- |
| **Module** | Reviews |
| **Description** | Attach up to 5 photos per review. |
| **Actors** | Customer |
| **Business Value** | Visual social proof. |
| **Priority** | P1 |
| **Dependencies** | SF-MED-001 |
| **Future Extension** | Video reviews. |

### SF-RVW-004 — Review Moderation

| Attribute | Value |
| --- | --- |
| **Module** | Reviews |
| **Description** | Reviews held for moderation before publishing. |
| **Actors** | Admin |
| **Business Value** | Brand protection. |
| **Priority** | P0 |
| **Dependencies** | SF-RVW-001 |
| **Future Extension** | Automated moderation. |

### SF-RVW-005 — Aggregated Rating

| Attribute | Value |
| --- | --- |
| **Module** | Reviews |
| **Description** | Display average rating and review count on PDP. |
| **Actors** | Customer, Guest |
| **Business Value** | Quick product evaluation. |
| **Priority** | P0 |
| **Dependencies** | SF-RVW-001 |
| **Future Extension** | Rating breakdown histogram. |

### SF-RVW-006 — Review Sorting and Filtering

| Attribute | Value |
| --- | --- |
| **Module** | Reviews |
| **Description** | Sort reviews by date, rating; filter by rating. |
| **Actors** | Customer |
| **Business Value** | UX. |
| **Priority** | P1 |
| **Dependencies** | SF-RVW-001 |
| **Future Extension** | Verified-purchase filter. |

### SF-RVW-007 — Helpful Votes

| Attribute | Value |
| --- | --- |
| **Module** | Reviews |
| **Description** | Mark reviews as helpful. |
| **Actors** | Customer |
| **Business Value** | Quality signal. |
| **Priority** | P2 |
| **Dependencies** | SF-RVW-001 |
| **Future Extension** | Review ranking algorithm. |

### SF-RVW-008 — Admin Response to Review

| Attribute | Value |
| --- | --- |
| **Module** | Reviews |
| **Description** | Admin can publicly respond to a review. |
| **Actors** | Admin |
| **Business Value** | Customer service; trust. |
| **Priority** | P1 |
| **Dependencies** | SF-RVW-001 |
| **Future Extension** | Auto-responses for common cases. |

---

## 11. Feature Catalog — Promotions Module

### SF-PRM-001 — Percentage Discount

| Attribute | Value |
| --- | --- |
| **Module** | Promotions |
| **Description** | Apply X% off eligible items or cart. |
| **Actors** | Customer, Admin |
| **Business Value** | Conversion lever. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Tiered percentages. |

### SF-PRM-002 — Fixed-Amount Discount

| Attribute | Value |
| --- | --- |
| **Module** | Promotions |
| **Description** | Apply fixed VND amount off. |
| **Actors** | Customer, Admin |
| **Business Value** | Conversion lever. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Caps and floors. |

### SF-PRM-003 — Buy X Get Y (BOGO)

| Attribute | Value |
| --- | --- |
| **Module** | Promotions |
| **Description** | "Buy X get Y" promotions. |
| **Actors** | Customer, Admin |
| **Business Value** | AOV growth; inventory movement. |
| **Priority** | P1 |
| **Dependencies** | — |
| **Future Extension** | Multi-tier BOGO. |

### SF-PRM-004 — Tiered Discount

| Attribute | Value |
| --- | --- |
| **Module** | Promotions |
| **Description** | Spend thresholds unlock discount levels. |
| **Actors** | Customer, Admin |
| **Business Value** | AOV growth. |
| **Priority** | P1 |
| **Dependencies** | — |
| **Future Extension** | Progressive unlocks. |

### SF-PRM-005 — Voucher Codes

| Attribute | Value |
| --- | --- |
| **Module** | Promotions |
| **Description** | Apply voucher codes at cart/checkout. |
| **Actors** | Customer, Admin |
| **Business Value** | Marketing campaigns. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Customer-specific vouchers. |

### SF-PRM-006 — Flash Sale

| Attribute | Value |
| --- | --- |
| **Module** | Promotions |
| **Description** | Time-bound promotions with countdown. |
| **Actors** | Customer, Admin |
| **Business Value** | Urgency; conversion spike. |
| **Priority** | P1 |
| **Dependencies** | SF-CAT-007 |
| **Future Extension** | Inventory capping per flash sale. |

### SF-PRM-007 — Promotion Scheduling

| Attribute | Value |
| --- | --- |
| **Module** | Promotions |
| **Description** | Schedule start and end times per promotion. |
| **Actors** | Admin |
| **Business Value** | Operational control. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Recurring schedules. |

### SF-PRM-008 — Promotion Usage Limits

| Attribute | Value |
| --- | --- |
| **Module** | Promotions |
| **Description** | Per-user and total usage limits. |
| **Actors** | Admin |
| **Business Value** | Budget control. |
| **Priority** | P0 |
| **Dependencies** | SF-PRM-005 |
| **Future Extension** | Auto-disable on limit. |

### SF-PRM-009 — Promotion Eligibility Rules

| Attribute | Value |
| --- | --- |
| **Module** | Promotions |
| **Description** | Restrict to products, categories, brands, customer segments. |
| **Actors** | Admin |
| **Business Value** | Precision marketing. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Combinatorial rules engine. |

### SF-PRM-010 — Display of Original and Discounted Price

| Attribute | Value |
| --- | --- |
| **Module** | Promotions |
| **Description** | Show both prices with strike-through on original. |
| **Actors** | Customer |
| **Business Value** | Conversion lever. |
| **Priority** | P0 |
| **Dependencies** | SF-PRM-001 |
| **Future Extension** | Savings amount highlight. |

---

## 12. Feature Catalog — Returns Module

### SF-RTN-001 — Return Request

| Attribute | Value |
| --- | --- |
| **Module** | Returns |
| **Description** | Customer requests return within 7 days of delivery. |
| **Actors** | Customer |
| **Business Value** | Customer satisfaction; legal compliance. |
| **Priority** | P0 |
| **Dependencies** | SF-SHP-009 |
| **Future Extension** | Configurable per-category window. |

### SF-RTN-002 — Return Reasons

| Attribute | Value |
| --- | --- |
| **Module** | Returns |
| **Description** | Categorize return reasons (defective, wrong item, no longer needed). |
| **Actors** | Customer |
| **Business Value** | Quality insight. |
| **Priority** | P0 |
| **Dependencies** | SF-RTN-001 |
| **Future Extension** | Custom reasons per category. |

### SF-RTN-003 — RMA Generation

| Attribute | Value |
| --- | --- |
| **Module** | Returns |
| **Description** | Generate Return Merchandise Authorization numbers. |
| **Actors** | System |
| **Business Value** | Operational traceability. |
| **Priority** | P0 |
| **Dependencies** | SF-RTN-001 |
| **Future Extension** | RMA templates. |

### SF-RTN-004 — Return Approval/Rejection

| Attribute | Value |
| --- | --- |
| **Module** | Returns |
| **Description** | Admin approves or rejects return requests. |
| **Actors** | Admin |
| **Business Value** | Operational control. |
| **Priority** | P0 |
| **Dependencies** | SF-RTN-003 |
| **Future Extension** | Auto-approval rules. |

### SF-RTN-005 — Return Shipment Tracking

| Attribute | Value |
| --- | --- |
| **Module** | Returns |
| **Description** | Track return shipment back to warehouse. |
| **Actors** | Admin, Customer |
| **Business Value** | Visibility. |
| **Priority** | P1 |
| **Dependencies** | SF-SHP-005 |
| **Future Extension** | Customer self-shipping labels. |

### SF-RTN-006 — Refund Processing

| Attribute | Value |
| --- | --- |
| **Module** | Returns |
| **Description** | Process refund upon return receipt confirmation. |
| **Actors** | Admin, System |
| **Business Value** | Customer satisfaction. |
| **Priority** | P0 |
| **Dependencies** | SF-PAY-003 |
| **Future Extension** | Partial refunds. |

### SF-RTN-007 — Warranty Claim

| Attribute | Value |
| --- | --- |
| **Module** | Returns |
| **Description** | Customer files warranty claim per product terms. |
| **Actors** | Customer |
| **Business Value** | Trust; legal compliance. |
| **Priority** | P1 |
| **Dependencies** | SF-ORD-005 |
| **Future Extension** | Manufacturer-direct claims. |

### SF-RTN-008 — Warranty Tracking

| Attribute | Value |
| --- | --- |
| **Module** | Returns |
| **Description** | Track warranty claim status and outcomes. |
| **Actors** | Customer, Admin |
| **Business Value** | Visibility. |
| **Priority** | P1 |
| **Dependencies** | SF-RTN-007 |
| **Future Extension** | Warranty analytics. |

---

## 13. Feature Catalog — Notifications Module

### SF-NOT-001 — Transactional Email

| Attribute | Value |
| --- | --- |
| **Module** | Notifications |
| **Description** | Send emails on key events (order, shipping, returns, etc.). |
| **Actors** | Customer, Admin |
| **Business Value** | Communication baseline. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | SMS, push notifications. |

### SF-NOT-002 — Email Templates (Vietnamese)

| Attribute | Value |
| --- | --- |
| **Module** | Notifications |
| **Description** | Email templates authored in Vietnamese. |
| **Actors** | Admin, Customer |
| **Business Value** | Brand consistency. |
| **Priority** | P0 |
| **Dependencies** | SF-NOT-001 |
| **Future Extension** | Visual template editor. |

### SF-NOT-003 — Admin Template Management

| Attribute | Value |
| --- | --- |
| **Module** | Notifications |
| **Description** | Admin can edit email templates. |
| **Actors** | Admin |
| **Business Value** | Operational agility. |
| **Priority** | P1 |
| **Dependencies** | SF-NOT-002 |
| **Future Extension** | Versioning of templates. |

### SF-NOT-004 — Email Retry on Failure

| Attribute | Value |
| --- | --- |
| **Module** | Notifications |
| **Description** | Retry failed emails with exponential backoff. |
| **Actors** | System |
| **Business Value** | Reliability. |
| **Priority** | P0 |
| **Dependencies** | SF-NOT-001 |
| **Future Extension** | Dead-letter handling. |

### SF-NOT-005 — Notification Preferences

| Attribute | Value |
| --- | --- |
| **Module** | Notifications |
| **Description** | Customer can opt in/out of non-essential notifications. |
| **Actors** | Customer |
| **Business Value** | Compliance; UX. |
| **Priority** | P1 |
| **Dependencies** | SF-ID-007 |
| **Future Extension** | Per-channel preferences. |

### SF-NOT-006 — Marketing Email Opt-In

| Attribute | Value |
| --- | --- |
| **Module** | Notifications |
| **Description** | Customers must explicitly opt in to marketing emails. |
| **Actors** | Customer |
| **Business Value** | Compliance; reputation. |
| **Priority** | P0 |
| **Dependencies** | SF-ID-001 |
| **Future Extension** | Double opt-in. |

---

## 14. Feature Catalog — Customer Support Module

### SF-SUP-001 — Submit Support Ticket

| Attribute | Value |
| --- | --- |
| **Module** | Support |
| **Description** | Customer submits a support ticket. |
| **Actors** | Customer |
| **Business Value** | Customer service baseline. |
| **Priority** | P1 |
| **Dependencies** | SF-ID-004 |
| **Future Extension** | AI-assisted triage. |

### SF-SUP-002 — Ticket Attachments

| Attribute | Value |
| --- | --- |
| **Module** | Support |
| **Description** | Customer can attach files to tickets. |
| **Actors** | Customer |
| **Business Value** | Better diagnosis. |
| **Priority** | P2 |
| **Dependencies** | SF-MED-001 |
| **Future Extension** | Video attachments. |

### SF-SUP-003 — Agent Ticket View

| Attribute | Value |
| --- | --- |
| **Module** | Support |
| **Description** | Support agent views, filters, and assigns tickets. |
| **Actors** | Customer Support Agent |
| **Business Value** | Operational efficiency. |
| **Priority** | P1 |
| **Dependencies** | SF-SUP-001 |
| **Future Extension** | AI-recommended responses. |

### SF-SUP-004 — Internal Notes on Tickets

| Attribute | Value |
| --- | --- |
| **Module** | Support |
| **Description** | Agents add internal notes not visible to customers. |
| **Actors** | Customer Support Agent |
| **Business Value** | Team coordination. |
| **Priority** | P2 |
| **Dependencies** | SF-SUP-003 |
| **Future Extension** | @mentions and notifications. |

### SF-SUP-005 — Ticket-Order Linking

| Attribute | Value |
| --- | --- |
| **Module** | Support |
| **Description** | Link tickets to orders for context. |
| **Actors** | Customer, Customer Support Agent |
| **Business Value** | Context efficiency. |
| **Priority** | P1 |
| **Dependencies** | SF-SUP-001 |
| **Future Extension** | Auto-suggest linking. |

### SF-SUP-006 — Ticket Status Tracking

| Attribute | Value |
| --- | --- |
| **Module** | Support |
| **Description** | Status transitions: Open → Pending → Resolved → Closed. |
| **Actors** | Customer, Customer Support Agent |
| **Business Value** | Visibility. |
| **Priority** | P1 |
| **Dependencies** | SF-SUP-001 |
| **Future Extension** | Customer satisfaction (CSAT) survey. |

### SF-SUP-007 — First Response Time Tracking

| Attribute | Value |
| --- | --- |
| **Module** | Support |
| **Description** | Measure time to first agent response per ticket. |
| **Actors** | Admin |
| **Business Value** | Service quality. |
| **Priority** | P1 |
| **Dependencies** | SF-SUP-006 |
| **Future Extension** | SLA breach alerts. |

---

## 15. Feature Catalog — Admin Module

### SF-ADM-001 — Admin Dashboard

| Attribute | Value |
| --- | --- |
| **Module** | Admin |
| **Description** | KPI dashboard: orders, revenue, AOV, conversion, top products. |
| **Actors** | Admin |
| **Business Value** | Operational visibility. |
| **Priority** | P0 |
| **Dependencies** | SF-ANL-002 |
| **Future Extension** | Customizable dashboards. |

### SF-ADM-002 — Product Management

| Attribute | Value |
| --- | --- |
| **Module** | Admin |
| **Description** | CRUD for products, variants, attributes, categories. |
| **Actors** | Catalog Manager |
| **Business Value** | Operational capability. |
| **Priority** | P0 |
| **Dependencies** | SF-CAT-005 |
| **Future Extension** | Bulk edit. |

### SF-ADM-003 — Order Management

| Attribute | Value |
| --- | --- |
| **Module** | Admin |
| **Description** | View, search, filter, update orders. |
| **Actors** | Order Fulfillment Staff |
| **Business Value** | Operational capability. |
| **Priority** | P0 |
| **Dependencies** | SF-ORD-007 |
| **Future Extension** | Bulk actions. |

### SF-ADM-004 — Customer Management

| Attribute | Value |
| --- | --- |
| **Module** | Admin |
| **Description** | View and manage customers. |
| **Actors** | Admin |
| **Business Value** | Operational capability. |
| **Priority** | P1 |
| **Dependencies** | SF-ID-001 |
| **Future Extension** | Customer segmentation tools. |

### SF-ADM-005 — Promotion Management

| Attribute | Value |
| --- | --- |
| **Module** | Admin |
| **Description** | CRUD for promotions, vouchers, flash sales. |
| **Actors** | Marketing Staff |
| **Business Value** | Marketing agility. |
| **Priority** | P0 |
| **Dependencies** | SF-PRM-001 |
| **Future Extension** | Promotion analytics. |

### SF-ADM-006 — Returns and Refunds Management

| Attribute | Value |
| --- | --- |
| **Module** | Admin |
| **Description** | Admin manages return requests and processes refunds. |
| **Actors** | Admin |
| **Business Value** | Operational capability. |
| **Priority** | P0 |
| **Dependencies** | SF-RTN-004 |
| **Future Extension** | Bulk refund. |

### SF-ADM-007 — Reviews Moderation

| Attribute | Value |
| --- | --- |
| **Module** | Admin |
| **Description** | Approve, reject, or remove reviews. |
| **Actors** | Admin |
| **Business Value** | Brand protection. |
| **Priority** | P0 |
| **Dependencies** | SF-RVW-004 |
| **Future Extension** | Auto-moderation rules. |

### SF-ADM-008 — Support Ticket Management

| Attribute | Value |
| --- | --- |
| **Module** | Admin |
| **Description** | Manage and respond to support tickets. |
| **Actors** | Customer Support Agent |
| **Business Value** | Customer service. |
| **Priority** | P1 |
| **Dependencies** | SF-SUP-003 |
| **Future Extension** | AI-drafted responses. |

### SF-ADM-009 — Admin User Management

| Attribute | Value |
| --- | --- |
| **Module** | Admin |
| **Description** | Manage admin users, roles, and permissions. |
| **Actors** | System Administrator |
| **Business Value** | Operational security. |
| **Priority** | P0 |
| **Dependencies** | SF-ID-012 |
| **Future Extension** | Granular permissions. |

### SF-ADM-010 — Audit Log

| Attribute | Value |
| --- | --- |
| **Module** | Admin |
| **Description** | Record sensitive admin operations. |
| **Actors** | System Administrator |
| **Business Value** | Security and compliance. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Audit log search and export. |

### SF-ADM-011 — Content Management (Banners, Static Pages)

| Attribute | Value |
| --- | --- |
| **Module** | Admin |
| **Description** | Manage homepage banners and static content pages. |
| **Actors** | Marketing Staff |
| **Business Value** | Marketing agility. |
| **Priority** | P1 |
| **Dependencies** | — |
| **Future Extension** | Rich text editor. |

### SF-ADM-012 — Operational Reports

| Attribute | Value |
| --- | --- |
| **Module** | Admin |
| **Description** | View operational reports (inventory, sales, returns). |
| **Actors** | Admin |
| **Business Value** | Decision support. |
| **Priority** | P0 |
| **Dependencies** | SF-ANL-001 |
| **Future Extension** | Scheduled reports. |

### SF-ADM-013 — Feature Flag Management

| Attribute | Value |
| --- | --- |
| **Module** | Admin |
| **Description** | Toggle features on/off via feature flags. |
| **Actors** | System Administrator |
| **Business Value** | Risk-controlled rollouts. |
| **Priority** | P1 |
| **Dependencies** | — |
| **Future Extension** | Percentage rollouts. |

---

## 16. Feature Catalog — Analytics Module

### SF-ANL-001 — Event Tracking

| Attribute | Value |
| --- | --- |
| **Module** | Analytics |
| **Description** | Track key business events (view, cart, checkout, purchase). |
| **Actors** | System |
| **Business Value** | Decision support. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Custom event taxonomy. |

### SF-ANL-002 — Sales Reports

| Attribute | Value |
| --- | --- |
| **Module** | Analytics |
| **Description** | Daily, weekly, monthly sales aggregations. |
| **Actors** | Admin |
| **Business Value** | Decision support. |
| **Priority** | P0 |
| **Dependencies** | SF-ANL-001 |
| **Future Extension** | Year-over-year comparison. |

### SF-ANL-003 — Product Performance Reports

| Attribute | Value |
| --- | --- |
| **Module** | Analytics |
| **Description** | Top products by units, revenue, conversion. |
| **Actors** | Admin |
| **Business Value** | Merchandising insight. |
| **Priority** | P0 |
| **Dependencies** | SF-ANL-001 |
| **Future Extension** | Cohort analysis. |

### SF-ANL-004 — Customer Cohort Reports

| Attribute | Value |
| --- | --- |
| **Module** | Analytics |
| **Description** | Customer retention and repeat-purchase cohorts. |
| **Actors** | Admin |
| **Business Value** | Retention strategy. |
| **Priority** | P1 |
| **Dependencies** | SF-ANL-001 |
| **Future Extension** | RFM segmentation. |

### SF-ANL-005 — Inventory Reports

| Attribute | Value |
| --- | --- |
| **Module** | Analytics |
| **Description** | Low-stock and stockout reports. |
| **Actors** | Admin |
| **Business Value** | Operational control. |
| **Priority** | P1 |
| **Dependencies** | SF-INV-002 |
| **Future Extension** | Reorder suggestions. |

### SF-ANL-006 — CSV Export

| Attribute | Value |
| --- | --- |
| **Module** | Analytics |
| **Description** | Export reports to CSV. |
| **Actors** | Admin |
| **Business Value** | Operational analysis. |
| **Priority** | P1 |
| **Dependencies** | — |
| **Future Extension** | Excel, scheduled email delivery. |

### SF-ANL-007 — Conversion Funnel

| Attribute | Value |
| --- | --- |
| **Module** | Analytics |
| **Description** | Funnel from view → cart → checkout → purchase. |
| **Actors** | Admin |
| **Business Value** | Optimization insight. |
| **Priority** | P1 |
| **Dependencies** | SF-ANL-001 |
| **Future Extension** | Per-segment funnels. |

---

## 17. Feature Catalog — Localization Module

### SF-I18-001 — Vietnamese UI

| Attribute | Value |
| --- | --- |
| **Module** | Localization |
| **Description** | All user-facing strings displayed in Vietnamese. |
| **Actors** | All |
| **Business Value** | Market fit. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Additional locales. |

### SF-I18-002 — Date Formatting

| Attribute | Value |
| --- | --- |
| **Module** | Localization |
| **Description** | Format dates per `vi-VN`. |
| **Actors** | All |
| **Business Value** | Local convention. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Time zone selector. |

### SF-I18-003 — Number Formatting

| Attribute | Value |
| --- | --- |
| **Module** | Localization |
| **Description** | Format numbers per `vi-VN` (e.g., thousand separator). |
| **Actors** | All |
| **Business Value** | Local convention. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Compact notations. |

### SF-I18-004 — VND Currency Display

| Attribute | Value |
| --- | --- |
| **Module** | Localization |
| **Description** | Display prices in VND with currency symbol or code. |
| **Actors** | All |
| **Business Value** | Local convention. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Multi-currency. |

### SF-I18-005 — Locale-Ready Architecture

| Attribute | Value |
| --- | --- |
| **Module** | Localization |
| **Description** | Strings externalized; architecture supports new locales without refactor. |
| **Actors** | Engineering |
| **Business Value** | Future-readiness. |
| **Priority** | P0 |
| **Dependencies** | SF-I18-001 |
| **Future Extension** | Locale switcher. |

---

## 18. Feature Catalog — Platform Module

### SF-PLT-001 — Health Endpoint

| Attribute | Value |
| --- | --- |
| **Module** | Platform |
| **Description** | Expose `/health` for liveness/readiness checks. |
| **Actors** | System, Monitoring |
| **Business Value** | Operational reliability. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Detailed component health. |

### SF-PLT-002 — Version Endpoint

| Attribute | Value |
| --- | --- |
| **Module** | Platform |
| **Description** | Expose `/_/version` with version, commit, environment. |
| **Actors** | System, Operations |
| **Business Value** | Diagnostics. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Build provenance. |

### SF-PLT-003 — Sitemap Generation

| Attribute | Value |
| --- | --- |
| **Module** | Platform |
| **Description** | Generate `sitemap.xml` for SEO. |
| **Actors** | SEO crawlers |
| **Business Value** | SEO. |
| **Priority** | P0 |
| **Dependencies** | SF-CAT-014 |
| **Future Extension** | Image sitemaps. |

### SF-PLT-004 — Robots.txt

| Attribute | Value |
| --- | --- |
| **Module** | Platform |
| **Description** | Serve `robots.txt` with crawl rules. |
| **Actors** | SEO crawlers |
| **Business Value** | SEO. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Per-bot rules. |

### SF-PLT-005 — Open Graph Metadata

| Attribute | Value |
| --- | --- |
| **Module** | Platform |
| **Description** | Render Open Graph and Twitter Card meta tags. |
| **Actors** | Social platforms |
| **Business Value** | Social sharing. |
| **Priority** | P0 |
| **Dependencies** | SF-CAT-005 |
| **Future Extension** | Per-product customization. |

### SF-PLT-006 — Feature Flags

| Attribute | Value |
| --- | --- |
| **Module** | Platform |
| **Description** | Feature flags for gradual rollouts. |
| **Actors** | System Administrator |
| **Business Value** | Risk reduction. |
| **Priority** | P1 |
| **Dependencies** | SF-ADM-013 |
| **Future Extension** | User-targeted rollouts. |

### SF-PLT-007 — Media Management (Cloudinary)

| Attribute | Value |
| --- | --- |
| **Module** | Platform |
| **Description** | Integrate Cloudinary for image upload, transformation, CDN delivery. |
| **Actors** | System, Catalog Manager |
| **Business Value** | Performance and quality. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Video optimization. |

### SF-PLT-008 — Cookie Consent Banner

| Attribute | Value |
| --- | --- |
| **Module** | Platform |
| **Description** | Display cookie consent banner for non-essential cookies. |
| **Actors** | Customer, Guest |
| **Business Value** | Compliance; trust. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Granular consent. |

### SF-PLT-009 — Static Pages (About, Contact, Policies)

| Attribute | Value |
| --- | --- |
| **Module** | Platform |
| **Description** | Static content pages for About, Contact, Terms, Privacy, Return Policy. |
| **Actors** | Customer, Guest |
| **Business Value** | Compliance; trust. |
| **Priority** | P0 |
| **Dependencies** | SF-ADM-011 |
| **Future Extension** | MDX-based content. |

---

## 19. Cross-Module Sub-Features

These features span multiple modules; tracked separately for clarity.

### SF-X-001 — Inventory Reservation

| Attribute | Value |
| --- | --- |
| **Module** | Inventory (cross-cutting) |
| **Description** | Reserve stock at cart-add (15 min) and order-create (until fulfillment). |
| **Actors** | System |
| **Business Value** | Prevents overselling. |
| **Priority** | P0 |
| **Dependencies** | SF-CRT-001, SF-ORD-001 |
| **Future Extension** | Backorder queue. |

### SF-X-002 — Low Stock Notifications

| Attribute | Value |
| --- | --- |
| **Module** | Inventory (cross-cutting) |
| **Description** | Notify admin when stock falls below threshold. |
| **Actors** | Admin |
| **Business Value** | Operational efficiency. |
| **Priority** | P1 |
| **Dependencies** | — |
| **Future Extension** | Auto-reorder. |

### SF-X-003 — Currency Consistency

| Attribute | Value |
| --- | --- |
| **Module** | Platform (cross-cutting) |
| **Description** | All money values handled in VND with no floats. |
| **Actors** | System |
| **Business Value** | Financial correctness. |
| **Priority** | P0 |
| **Dependencies** | — |
| **Future Extension** | Multi-currency. |

---

## 20. Feature Summary

| Module | Feature Count | P0 | P1 | P2 | P3 |
| --- | --- | --- | --- | --- | --- |
| Catalog (CAT) | 16 | 10 | 2 | 4 | 0 |
| Cart (CRT) | 10 | 7 | 3 | 0 | 0 |
| Checkout (CHK) | 12 | 9 | 1 | 0 | 2 |
| Order (ORD) | 13 | 8 | 3 | 2 | 0 |
| Shipping (SHP) | 11 | 8 | 2 | 0 | 1 |
| Identity (ID) | 14 | 12 | 2 | 0 | 0 |
| Reviews (RVW) | 8 | 5 | 2 | 1 | 0 |
| Promotions (PRM) | 10 | 6 | 3 | 0 | 1 |
| Returns (RTN) | 8 | 5 | 3 | 0 | 0 |
| Notifications (NOT) | 6 | 4 | 2 | 0 | 0 |
| Support (SUP) | 7 | 0 | 4 | 3 | 0 |
| Admin (ADM) | 13 | 8 | 4 | 0 | 1 |
| Analytics (ANL) | 7 | 3 | 3 | 0 | 1 |
| Localization (I18) | 5 | 5 | 0 | 0 | 0 |
| Platform (PLT) | 9 | 7 | 1 | 0 | 1 |
| Cross-cutting (X) | 3 | 2 | 1 | 0 | 0 |
| **TOTAL** | **152** | **99** | **36** | **10** | **7** |

> **Note:** The table above lists all numbered features. The expected production-ready count for Version 1 is approximately **45 unique end-user capabilities**, organized here as 152 atomic system features grouped into 16 modules. Each end-user capability is decomposed into its sub-features (e.g., "Add to Cart" = SF-CRT-001 + SF-X-001 + SF-CAT-007).

---

## 21. End-User Capability Roll-Up (45 Production-Ready Capabilities)

The following 45 capabilities map to the prioritized end-user functionality of Version 1:

| # | Capability | Module | Features |
| --- | --- | --- | --- |
| 1 | Browse catalog | Catalog | SF-CAT-001, SF-CAT-002 |
| 2 | Search products | Catalog | SF-CAT-003 |
| 3 | Filter products | Catalog | SF-CAT-004 |
| 4 | View product detail | Catalog | SF-CAT-005, SF-CAT-010, SF-CAT-011, SF-CAT-012, SF-CAT-013 |
| 5 | View product variants | Catalog | SF-CAT-006 |
| 6 | See stock status | Catalog | SF-CAT-007, SF-X-001 |
| 7 | View related products | Catalog | SF-CAT-008 |
| 8 | Add to cart | Cart | SF-CRT-001, SF-X-001 |
| 9 | Manage cart | Cart | SF-CRT-002, SF-CRT-003, SF-CRT-004 |
| 10 | Guest cart persistence | Cart | SF-CRT-005 |
| 11 | Cart merge on login | Cart | SF-CRT-006 |
| 12 | View cart totals | Cart | SF-CRT-007, SF-PRM-010 |
| 13 | Save to wishlist | Cart | SF-CRT-008 |
| 14 | Move wishlist to cart | Cart | SF-CRT-009 |
| 15 | Abandoned cart email | Cart | SF-CRT-010, SF-NOT-001 |
| 16 | Multi-step checkout | Checkout | SF-CHK-001 |
| 17 | Guest checkout | Checkout | SF-CHK-002 |
| 18 | Address management | Checkout, Identity | SF-CHK-003, SF-ID-008 |
| 19 | Phone validation | Checkout | SF-CHK-004 |
| 20 | Choose shipping method | Checkout, Shipping | SF-CHK-005, SF-SHP-001, SF-SHP-010 |
| 21 | Choose payment method | Checkout | SF-CHK-006 |
| 22 | Review order | Checkout | SF-CHK-007 |
| 23 | Pay via provider | Checkout, Payments | SF-CHK-008, SF-CHK-009 |
| 24 | Receive order confirmation | Checkout, Notifications | SF-CHK-011, SF-NOT-001 |
| 25 | View order history | Order | SF-ORD-005, SF-ORD-006 |
| 26 | Cancel order | Order | SF-ORD-011 |
| 27 | Track shipment | Shipping | SF-SHP-005, SF-SHP-006, SF-SHP-007, SF-SHP-008 |
| 28 | Register account | Identity | SF-ID-001, SF-ID-002, SF-ID-003 |
| 29 | Login / logout | Identity | SF-ID-004, SF-ID-005, SF-ID-010 |
| 30 | Reset password | Identity | SF-ID-006 |
| 31 | Manage profile | Identity | SF-ID-007 |
| 32 | Manage addresses | Identity | SF-ID-008 |
| 33 | Change password | Identity | SF-ID-009 |
| 34 | Submit product review | Reviews | SF-RVW-001, SF-RVW-002, SF-RVW-003 |
| 35 | View aggregated ratings | Reviews | SF-RVW-005 |
| 36 | Apply voucher | Promotions | SF-PRM-001, SF-PRM-002, SF-PRM-005 |
| 37 | Use flash sale | Promotions | SF-PRM-006 |
| 38 | Request return | Returns | SF-RTN-001, SF-RTN-002, SF-RTN-003 |
| 39 | Track return status | Returns | SF-RTN-005 |
| 40 | Receive refund | Returns, Payments | SF-RTN-006 |
| 41 | Submit support ticket | Support | SF-SUP-001, SF-SUP-002, SF-SUP-005 |
| 42 | Manage notification preferences | Notifications, Identity | SF-NOT-005, SF-NOT-006 |
| 43 | Browse in Vietnamese | Localization | SF-I18-001..005 |
| 44 | View static pages and policies | Platform | SF-PLT-009 |
| 45 | Admin operations | Admin | SF-ADM-001..013 |

---

## 22. Future Extensions (V1.5+ and V2)

| Capability | Target Version |
| --- | --- |
| AI Sales Assistant | V1.5+ |
| AI Customer Support | V1.5+ |
| Mobile native apps | V1.5+ |
| Multi-language | V1.5+ |
| Marketplace (multi-seller) | V2 |
| Loyalty program | V2 |
| Live chat | V2 |
| AR product preview | V2 |

---

## 23. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 0.1 | 2026-07-02 | Principal Business Analyst | Initial draft with 152 features across 16 modules |

---

**End of Document — SYSTEM_FEATURES.md**
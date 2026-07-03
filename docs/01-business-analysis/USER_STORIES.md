# SmartLight — User Stories

| Field | Value |
| --- | --- |
| **Document ID** | `BA-USER-STORIES-001` |
| **Document Owner** | Principal Business Analyst |
| **Status** | Draft — v0.1 |
| **Created Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2026-08-01 |
| **Classification** | Business Analysis — Authoritative |
| **Audience** | Engineering, Product, QA, Stakeholders, AI Agents |

> **Source of Truth:** This document conforms to `docs/00-governance/PROJECT_BLUEPRINT.md`, `SRS.md`, `SYSTEM_FEATURES.md`, and `BUSINESS_RULES.md`.

---

## 1. Purpose

This document captures user stories for SmartLight Version 1. Each story:

1. Represents a **discrete unit of customer or staff value**.
2. Follows the standard format: **As a / I want / So that**.
3. Includes **acceptance criteria summary** (detailed Gherkin in `ACCEPTANCE_CRITERIA.md`).
4. Has an assigned **priority** and **story point estimate**.
5. Is traceable to **features** in `SYSTEM_FEATURES.md` and **rules** in `BUSINESS_RULES.md`.

---

## 2. Story ID Convention

| Pattern | Meaning |
| --- | --- |
| `US-<PERSONA>-<NUMBER>` | User Story ID |

Persona codes:

- `GUEST` — Unauthenticated visitor.
- `CUST` — Registered customer.
- `COM` — Commercial customer / architect / designer.
- `SUP` — Customer support agent.
- `CAT` — Catalog manager.
- `ORD` — Order fulfillment staff.
- `MKT` — Marketing staff.
- `FIN` — Finance / admin staff.
- `ADM` — System administrator.
- `OWN` — Product owner / store owner.

---

## 3. Priority Levels

| Priority | Meaning |
| --- | --- |
| **P0** | Must ship in V1.0 GA |
| **P1** | Must ship in V1.0 or first minor release |
| **P2** | Should ship in V1.x |
| **P3** | Nice to have; may defer to V1.5+ |

---

## 4. Story Points Scale (Fibonacci)

| Points | Meaning |
| --- | --- |
| 1 | Trivial (< 0.5 day) |
| 2 | Small (≈ 0.5 day) |
| 3 | Medium (1–2 days) |
| 5 | Large (3–5 days) |
| 8 | Very large (1–2 weeks) |
| 13 | Epic-sized; must be split |
| 21 | Too large; must be broken down |

---

## 5. Guest Stories

### US-GUEST-001 — Browse Catalog by Category

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | Browse products organized by category |
| **So that** | I can discover lighting products without searching by keyword |
| **Acceptance Criteria** | See AC-AC-001 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-CAT-001, SF-CAT-002 |
| **Related Rules** | BR-CAT-001 |

### US-GUEST-002 — Search for Products

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | Search for products by keyword |
| **So that** | I can quickly find a specific lighting product |
| **Acceptance Criteria** | See AC-AC-002 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-CAT-003 |
| **Related Rules** | — |

### US-GUEST-003 — Filter Products by Attributes

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | Filter products by price, wattage, color temperature, and brand |
| **So that** | I can narrow down options to match my needs |
| **Acceptance Criteria** | See AC-AC-003 |
| **Priority** | P0 |
| **Story Points** | 5 |
| **Related Features** | SF-CAT-004 |
| **Related Rules** | — |

### US-GUEST-004 — View Product Detail

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | See full product details including images, specs, and price |
| **So that** | I can evaluate whether the product fits my needs |
| **Acceptance Criteria** | See AC-AC-004 |
| **Priority** | P0 |
| **Story Points** | 5 |
| **Related Features** | SF-CAT-005, SF-CAT-010, SF-CAT-012, SF-CAT-013 |
| **Related Rules** | BR-CAT-001 |

### US-GUEST-005 — View Product Variants

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | See available variants (color, wattage) on the product page |
| **So that** | I can choose the variant that suits my installation |
| **Acceptance Criteria** | See AC-AC-005 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-CAT-006 |
| **Related Rules** | BR-CAT-005 |

### US-GUEST-006 — See Stock Availability

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | See whether a product is in stock |
| **So that** | I can decide whether to proceed |
| **Acceptance Criteria** | See AC-AC-006 |
| **Priority** | P0 |
| **Story Points** | 2 |
| **Related Features** | SF-CAT-007 |
| **Related Rules** | BR-CAT-007 |

### US-GUEST-007 — View Aggregated Ratings

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | See the average rating and number of reviews on a product page |
| **So that** | I can gauge product quality |
| **Acceptance Criteria** | See AC-AC-007 |
| **Priority** | P0 |
| **Story Points** | 2 |
| **Related Features** | SF-RVW-005 |
| **Related Rules** | — |

### US-GUEST-008 — Add Product to Cart

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | Add a product variant to my cart |
| **So that** | I can purchase it later |
| **Acceptance Criteria** | See AC-AC-008 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-CRT-001, SF-X-001 |
| **Related Rules** | BR-CAT-007, BR-CRT-001, BR-CRT-003 |

### US-GUEST-009 — View and Manage Cart

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | View my cart, update quantities, and remove items |
| **So that** | I can prepare for checkout |
| **Acceptance Criteria** | See AC-AC-009 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-CRT-002, SF-CRT-003, SF-CRT-004 |
| **Related Rules** | BR-CRT-001 |

### US-GUEST-010 — Register an Account

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | Register with email and password |
| **So that** | I can place orders and track them |
| **Acceptance Criteria** | See AC-AC-010 |
| **Priority** | P0 |
| **Story Points** | 5 |
| **Related Features** | SF-ID-001, SF-ID-002, SF-ID-003 |
| **Related Rules** | BR-ID-001, BR-ID-002 |

### US-GUEST-011 — Reset Forgotten Password

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | Request a password reset link via email |
| **So that** | I can regain access to my account |
| **Acceptance Criteria** | See AC-AC-011 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-ID-006 |
| **Related Rules** | — |

### US-GUEST-012 — View Static Pages and Policies

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | Read About, Contact, Terms, Privacy, and Return Policy pages |
| **So that** | I can trust the store before purchasing |
| **Acceptance Criteria** | See AC-AC-012 |
| **Priority** | P0 |
| **Story Points** | 2 |
| **Related Features** | SF-PLT-009 |
| **Related Rules** | NFR-COMP-002 |

### US-GUEST-013 — Cookie Consent

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | See a cookie consent banner on first visit |
| **So that** | I can choose what data I share |
| **Acceptance Criteria** | See AC-AC-013 |
| **Priority** | P0 |
| **Story Points** | 2 |
| **Related Features** | SF-PLT-008 |
| **Related Rules** | BR-PLT-001 |

---

## 6. Customer Stories

### US-CUST-001 — Log In to Account

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Log in with email and password |
| **So that** | I can access my account |
| **Acceptance Criteria** | See AC-AC-014 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-ID-004, SF-ID-005 |
| **Related Rules** | BR-ID-004 |

### US-CUST-002 — Merge Guest Cart on Login

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Have my guest cart merged into my account cart upon login |
| **So that** | I don't lose items I added before signing in |
| **Acceptance Criteria** | See AC-AC-015 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-CRT-006 |
| **Related Rules** | BR-CRT-002 |

### US-CUST-003 — Save Product to Wishlist

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Add a product to my wishlist |
| **So that** | I can buy it later |
| **Acceptance Criteria** | See AC-AC-016 |
| **Priority** | P1 |
| **Story Points** | 3 |
| **Related Features** | SF-CRT-008 |
| **Related Rules** | BR-CRT-006 |

### US-CUST-004 — Move Wishlist Item to Cart

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Move a wishlist item back to my cart |
| **So that** | I can purchase it easily |
| **Acceptance Criteria** | See AC-AC-017 |
| **Priority** | P1 |
| **Story Points** | 2 |
| **Related Features** | SF-CRT-009 |
| **Related Rules** | BR-CRT-006 |

### US-CUST-005 — Complete Checkout as Logged-In User

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Complete checkout using my saved address and payment |
| **So that** | I can quickly place an order |
| **Acceptance Criteria** | See AC-AC-018 |
| **Priority** | P0 |
| **Story Points** | 8 |
| **Related Features** | SF-CHK-001, SF-CHK-005, SF-CHK-006, SF-CHK-007 |
| **Related Rules** | BR-CHK-001..007 |

### US-CUST-006 — Complete Guest Checkout

| Field | Value |
| --- | --- |
| **As a** | Customer (guest) |
| **I want to** | Checkout without creating an account |
| **So that** | I can purchase quickly |
| **Acceptance Criteria** | See AC-AC-019 |
| **Priority** | P0 |
| **Story Points** | 5 |
| **Related Features** | SF-CHK-002 |
| **Related Rules** | BR-CHK-001, BR-ID-003 |

### US-CUST-007 — Pay Using Vietnamese Provider

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Pay via Vietnamese payment provider (VNPay, MoMo, ZaloPay) |
| **So that** | I can use my preferred payment method |
| **Acceptance Criteria** | See AC-AC-020 |
| **Priority** | P0 |
| **Story Points** | 8 |
| **Related Features** | SF-CHK-006, SF-CHK-008, SF-CHK-009 |
| **Related Rules** | BR-PAY-001, BR-PAY-002, BR-PAY-005, BR-PAY-006, BR-PAY-010 |

### US-CUST-008 — Receive Order Confirmation Email

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Receive an order confirmation email after payment |
| **So that** | I have a record of my purchase |
| **Acceptance Criteria** | See AC-AC-021 |
| **Priority** | P0 |
| **Story Points** | 2 |
| **Related Features** | SF-CHK-011, SF-NOT-001 |
| **Related Rules** | — |

### US-CUST-009 — View Order History

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | See my past orders |
| **So that** | I can track purchases and reorder |
| **Acceptance Criteria** | See AC-AC-022 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-ORD-005, SF-ORD-006 |
| **Related Rules** | — |

### US-CUST-010 — Track Shipment

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | See real-time tracking of my order |
| **So that** | I know when to expect delivery |
| **Acceptance Criteria** | See AC-AC-023 |
| **Priority** | P0 |
| **Story Points** | 5 |
| **Related Features** | SF-SHP-005, SF-SHP-006, SF-SHP-007 |
| **Related Rules** | BR-SHP-004 |

### US-CUST-011 — Cancel Pending Order

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Cancel my order before it ships |
| **So that** | I can get a refund if I change my mind |
| **Acceptance Criteria** | See AC-AC-024 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-ORD-011 |
| **Related Rules** | BR-ORD-003 |

### US-CUST-012 — Submit Product Review

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Submit a star rating and review for a delivered product |
| **So that** | I can share my experience |
| **Acceptance Criteria** | See AC-AC-025 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-RVW-001, SF-RVW-002, SF-RVW-003 |
| **Related Rules** | BR-RVW-001, BR-RVW-002, BR-RVW-003 |

### US-CUST-013 — Apply Voucher Code

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Apply a voucher code at checkout |
| **So that** | I can get a discount |
| **Acceptance Criteria** | See AC-AC-026 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-PRM-005 |
| **Related Rules** | BR-PRM-003, BR-PRM-004, BR-PRM-005 |

### US-CUST-014 — Manage Addresses

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Add, edit, and delete addresses in my address book |
| **So that** | I can quickly select one at checkout |
| **Acceptance Criteria** | See AC-AC-027 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-ID-008 |
| **Related Rules** | BR-CHK-002 |

### US-CUST-015 — Change Password

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Change my account password |
| **So that** | I can keep my account secure |
| **Acceptance Criteria** | See AC-AC-028 |
| **Priority** | P0 |
| **Story Points** | 2 |
| **Related Features** | SF-ID-009 |
| **Related Rules** | BR-ID-001 |

### US-CUST-016 — Manage Profile

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Update my name and phone number |
| **So that** | my profile is current |
| **Acceptance Criteria** | See AC-AC-029 |
| **Priority** | P0 |
| **Story Points** | 2 |
| **Related Features** | SF-ID-007 |
| **Related Rules** | BR-CHK-003 |

### US-CUST-017 — Request Return

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Request a return within 7 days of delivery |
| **So that** | I can get a refund for unsuitable items |
| **Acceptance Criteria** | See AC-AC-030 |
| **Priority** | P0 |
| **Story Points** | 5 |
| **Related Features** | SF-RTN-001, SF-RTN-002, SF-RTN-003 |
| **Related Rules** | BR-RTN-001, BR-RTN-007 |

### US-CUST-018 — Track Return Status

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | See the status of my return |
| **So that** | I know when to expect my refund |
| **Acceptance Criteria** | See AC-AC-031 |
| **Priority** | P1 |
| **Story Points** | 3 |
| **Related Features** | SF-RTN-005 |
| **Related Rules** | BR-RTN-004 |

### US-CUST-019 — Receive Refund

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Receive a refund to my original payment method |
| **So that** | I get my money back after a return |
| **Acceptance Criteria** | See AC-AC-032 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-RTN-006 |
| **Related Rules** | BR-RTN-003, BR-RTN-004, BR-PAY-003, BR-PAY-009 |

### US-CUST-020 — Submit Support Ticket

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Submit a support ticket with description and attachments |
| **So that** | I can get help with an issue |
| **Acceptance Criteria** | See AC-AC-033 |
| **Priority** | P1 |
| **Story Points** | 5 |
| **Related Features** | SF-SUP-001, SF-SUP-002 |
| **Related Rules** | BR-SUP-001 |

### US-CUST-021 — Manage Notification Preferences

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Opt in or out of marketing emails |
| **So that** | I control what I receive |
| **Acceptance Criteria** | See AC-AC-034 |
| **Priority** | P1 |
| **Story Points** | 2 |
| **Related Features** | SF-NOT-005, SF-NOT-006 |
| **Related Rules** | BR-NOT-001 |

### US-CUST-022 — Delete Account

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Request deletion of my account |
| **So that** | my data is removed per PDPD |
| **Acceptance Criteria** | See AC-AC-035 |
| **Priority** | P1 |
| **Story Points** | 3 |
| **Related Features** | SF-ID-014 |
| **Related Rules** | BR-ID-008, BR-ID-009 |

### US-CUST-023 — Logout

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Log out of my account |
| **So that** | my session is secure |
| **Acceptance Criteria** | See AC-AC-036 |
| **Priority** | P0 |
| **Story Points** | 1 |
| **Related Features** | SF-ID-010 |
| **Related Rules** | BR-ID-005 |

### US-CUST-024 — Compare Products

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Compare 2–4 products side-by-side |
| **So that** | I can choose the best one |
| **Acceptance Criteria** | See AC-AC-037 |
| **Priority** | P2 |
| **Story Points** | 5 |
| **Related Features** | SF-CAT-009 |
| **Related Rules** | — |

### US-CUST-025 — See Recently Viewed Products

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | See products I recently viewed |
| **So that** | I can return to them quickly |
| **Acceptance Criteria** | See AC-AC-038 |
| **Priority** | P2 |
| **Story Points** | 3 |
| **Related Features** | SF-CAT-016 |
| **Related Rules** | — |

### US-CUST-026 — Mark Review as Helpful

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | Mark a review as helpful |
| **So that** | other shoppers see useful reviews first |
| **Acceptance Criteria** | See AC-AC-039 |
| **Priority** | P2 |
| **Story Points** | 2 |
| **Related Features** | SF-RVW-007 |
| **Related Rules** | — |

---

## 7. Commercial Customer Stories

### US-COM-001 — Save Project Cart

| Field | Value |
| --- | --- |
| **As a** | Commercial Customer |
| **I want to** | Save a cart as a named project |
| **So that** | I can reuse it for multiple clients |
| **Acceptance Criteria** | See AC-AC-040 |
| **Priority** | P2 |
| **Story Points** | 5 |
| **Related Features** | SF-CRT-002 (extension) |
| **Related Rules** | — |

### US-COM-002 — Bulk Add to Cart

| Field | Value |
| --- | --- |
| **As a** | Commercial Customer |
| **I want to** | Add multiple products to cart in one action |
| **So that** | I can prepare large orders efficiently |
| **Acceptance Criteria** | See AC-AC-041 |
| **Priority** | P2 |
| **Story Points** | 5 |
| **Related Features** | SF-CRT-001 (extension) |
| **Related Rules** | BR-CRT-001 |

### US-COM-003 — Download Specification Sheet

| Field | Value |
| --- | --- |
| **As a** | Commercial Customer |
| **I want to** | Download a product specification PDF |
| **So that** | I can include it in client proposals |
| **Acceptance Criteria** | See AC-AC-042 |
| **Priority** | P2 |
| **Story Points** | 3 |
| **Related Features** | SF-CAT-012 (extension) |
| **Related Rules** | — |

---

## 8. Admin Stories — Catalog Manager

### US-CAT-001 — Create Product

| Field | Value |
| --- | --- |
| **As a** | Catalog Manager |
| **I want to** | Create a product with name, category, brand, variants, images, specs |
| **So that** | it is available for sale |
| **Acceptance Criteria** | See AC-AC-043 |
| **Priority** | P0 |
| **Story Points** | 8 |
| **Related Features** | SF-ADM-002, SF-CAT-005, SF-CAT-006 |
| **Related Rules** | BR-CAT-002, BR-CAT-005, BR-CAT-006 |

### US-CAT-002 — Update Product

| Field | Value |
| --- | --- |
| **As a** | Catalog Manager |
| **I want to** | Edit product details, price, images, and variants |
| **So that** | the catalog stays current |
| **Acceptance Criteria** | See AC-AC-044 |
| **Priority** | P0 |
| **Story Points** | 5 |
| **Related Features** | SF-ADM-002 |
| **Related Rules** | BR-X-001, BR-X-002 |

### US-CAT-003 — Manage Categories

| Field | Value |
| --- | --- |
| **As a** | Catalog Manager |
| **I want to** | Create and organize categories |
| **So that** | products are well-structured |
| **Acceptance Criteria** | See AC-AC-045 |
| **Priority** | P0 |
| **Story Points** | 5 |
| **Related Features** | SF-ADM-002, SF-CAT-002 |
| **Related Rules** | BR-CAT-004 |

### US-CAT-004 — Upload Product Media

| Field | Value |
| --- | --- |
| **As a** | Catalog Manager |
| **I want to** | Upload images and videos for products |
| **So that** | customers can see the product |
| **Acceptance Criteria** | See AC-AC-046 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-CAT-010, SF-PLT-007 |
| **Related Rules** | — |

### US-CAT-005 — Set Low-Stock Threshold

| Field | Value |
| --- | --- |
| **As a** | Catalog Manager |
| **I want to** | Set a low-stock threshold per product |
| **So that** | I get notified when stock is low |
| **Acceptance Criteria** | See AC-AC-047 |
| **Priority** | P1 |
| **Story Points** | 2 |
| **Related Features** | SF-X-002 |
| **Related Rules** | — |

---

## 9. Admin Stories — Order Fulfillment

### US-ORD-001 — View Order Queue

| Field | Value |
| --- | --- |
| **As a** | Order Fulfillment Staff |
| **I want to** | See a list of orders ready for fulfillment |
| **So that** | I can process them efficiently |
| **Acceptance Criteria** | See AC-AC-048 |
| **Priority** | P0 |
| **Story Points** | 5 |
| **Related Features** | SF-ADM-003, SF-ORD-007 |
| **Related Rules** | — |

### US-ORD-002 — Update Order Status

| Field | Value |
| --- | --- |
| **As a** | Order Fulfillment Staff |
| **I want to** | Update order status (Confirmed, Processing, Shipped, Delivered) |
| **So that** | the order progresses through its lifecycle |
| **Acceptance Criteria** | See AC-AC-049 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-ORD-007 |
| **Related Rules** | BR-ORD-002 |

### US-ORD-003 — Generate Picklist

| Field | Value |
| --- | --- |
| **As a** | Order Fulfillment Staff |
| **I want to** | Print a picklist for an order |
| **So that** | warehouse can pick items |
| **Acceptance Criteria** | See AC-AC-050 |
| **Priority** | P1 |
| **Story Points** | 3 |
| **Related Features** | SF-ORD-009 |
| **Related Rules** | — |

### US-ORD-004 — Create Shipment

| Field | Value |
| --- | --- |
| **As a** | Order Fulfillment Staff |
| **I want to** | Create a shipment with carrier and print a label |
| **So that** | the order ships to the customer |
| **Acceptance Criteria** | See AC-AC-051 |
| **Priority** | P0 |
| **Story Points** | 5 |
| **Related Features** | SF-SHP-003, SF-SHP-004, SF-SHP-005 |
| **Related Rules** | BR-SHP-003 |

### US-ORD-005 — Cancel Order on Customer Request

| Field | Value |
| --- | --- |
| **As a** | Order Fulfillment Staff |
| **I want to** | Cancel an order and trigger refund |
| **So that** | customer requests are handled |
| **Acceptance Criteria** | See AC-AC-052 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-ORD-011 |
| **Related Rules** | BR-ORD-003, BR-PAY-003, BR-PAY-008 |

### US-ORD-006 — Add Internal Note to Order

| Field | Value |
| --- | --- |
| **As a** | Order Fulfillment Staff |
| **I want to** | Add an internal note to an order |
| **So that** | other staff see relevant context |
| **Acceptance Criteria** | See AC-AC-053 |
| **Priority** | P1 |
| **Story Points** | 2 |
| **Related Features** | SF-ORD-013 |
| **Related Rules** | — |

---

## 10. Admin Stories — Marketing

### US-MKT-001 — Create Promotion

| Field | Value |
| --- | --- |
| **As a** | Marketing Staff |
| **I want to** | Create a percentage or fixed discount promotion |
| **So that** | I can drive sales |
| **Acceptance Criteria** | See AC-AC-054 |
| **Priority** | P0 |
| **Story Points** | 5 |
| **Related Features** | SF-PRM-001, SF-PRM-002, SF-ADM-005 |
| **Related Rules** | BR-PRM-001, BR-PRM-002 |

### US-MKT-002 — Create Voucher Codes

| Field | Value |
| --- | --- |
| **As a** | Marketing Staff |
| **I want to** | Generate voucher codes for a promotion |
| **So that** | I can run a campaign |
| **Acceptance Criteria** | See AC-AC-055 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-PRM-005, SF-ADM-005 |
| **Related Rules** | BR-PRM-004 |

### US-MKT-003 — Schedule Flash Sale

| Field | Value |
| --- | --- |
| **As a** | Marketing Staff |
| **I want to** | Schedule a time-bound flash sale |
| **So that** | I can create urgency |
| **Acceptance Criteria** | See AC-AC-056 |
| **Priority** | P1 |
| **Story Points** | 5 |
| **Related Features** | SF-PRM-006, SF-PRM-007 |
| **Related Rules** | BR-PRM-002, BR-PRM-007 |

### US-MKT-004 — Edit Banners and Static Pages

| Field | Value |
| --- | --- |
| **As a** | Marketing Staff |
| **I want to** | Edit homepage banners and static pages |
| **So that** | marketing content stays current |
| **Acceptance Criteria** | See AC-AC-057 |
| **Priority** | P1 |
| **Story Points** | 5 |
| **Related Features** | SF-ADM-011, SF-PLT-009 |
| **Related Rules** | — |

---

## 11. Admin Stories — Customer Support

### US-SUP-001 — View Customer Profile

| Field | Value |
| --- | --- |
| **As a** | Customer Support Agent |
| **I want to** | Search for and view a customer's profile and orders |
| **So that** | I can answer support questions |
| **Acceptance Criteria** | See AC-AC-058 |
| **Priority** | P1 |
| **Story Points** | 3 |
| **Related Features** | SF-ADM-004 |
| **Related Rules** | BR-X-004 |

### US-SUP-002 — Respond to Support Ticket

| Field | Value |
| --- | --- |
| **As a** | Customer Support Agent |
| **I want to** | Respond to a customer support ticket |
| **So that** | the customer's issue is addressed |
| **Acceptance Criteria** | See AC-AC-059 |
| **Priority** | P1 |
| **Story Points** | 3 |
| **Related Features** | SF-SUP-003, SF-ADM-008 |
| **Related Rules** | BR-SUP-001, BR-SUP-003 |

### US-SUP-003 — Add Internal Note to Ticket

| Field | Value |
| --- | --- |
| **As a** | Customer Support Agent |
| **I want to** | Add an internal note to a ticket |
| **So that** | colleagues see context |
| **Acceptance Criteria** | See AC-AC-060 |
| **Priority** | P2 |
| **Story Points** | 2 |
| **Related Features** | SF-SUP-004 |
| **Related Rules** | BR-SUP-004 |

### US-SUP-004 — Approve Return Request

| Field | Value |
| --- | --- |
| **As a** | Customer Support Agent |
| **I want to** | Approve or reject a return request |
| **So that** | the customer gets resolution |
| **Acceptance Criteria** | See AC-AC-061 |
| **Priority** | P1 |
| **Story Points** | 3 |
| **Related Features** | SF-RTN-004, SF-ADM-006 |
| **Related Rules** | BR-RTN-002 |

### US-SUP-005 — Moderate Review

| Field | Value |
| --- | --- |
| **As a** | Customer Support Agent |
| **I want to** | Approve, reject, or remove customer reviews |
| **So that** | only appropriate reviews appear |
| **Acceptance Criteria** | See AC-AC-062 |
| **Priority** | P1 |
| **Story Points** | 3 |
| **Related Features** | SF-RVW-004, SF-ADM-007 |
| **Related Rules** | BR-RVW-004, BR-RVW-005 |

---

## 12. Admin Stories — Finance

### US-FIN-001 — View Sales Reports

| Field | Value |
| --- | --- |
| **As a** | Finance Staff |
| **I want to** | View daily, weekly, and monthly sales reports |
| **So that** | I can monitor revenue |
| **Acceptance Criteria** | See AC-AC-063 |
| **Priority** | P0 |
| **Story Points** | 5 |
| **Related Features** | SF-ANL-002, SF-ADM-012 |
| **Related Rules** | — |

### US-FIN-002 — Process Refund

| Field | Value |
| --- | --- |
| **As a** | Finance Staff |
| **I want to** | Process a refund against a payment |
| **So that** | the customer receives their money back |
| **Acceptance Criteria** | See AC-AC-064 |
| **Priority** | P1 |
| **Story Points** | 5 |
| **Related Features** | SF-RTN-006, SF-ADM-006 |
| **Related Rules** | BR-PAY-003, BR-PAY-008 |

### US-FIN-003 — Export Reports

| Field | Value |
| --- | --- |
| **As a** | Finance Staff |
| **I want to** | Export reports to CSV |
| **So that** | I can analyze data offline |
| **Acceptance Criteria** | See AC-AC-065 |
| **Priority** | P1 |
| **Story Points** | 3 |
| **Related Features** | SF-ANL-006 |
| **Related Rules** | BR-ADM-005 |

---

## 13. Admin Stories — System Administrator

### US-ADM-001 — Manage Admin Users and Roles

| Field | Value |
| --- | --- |
| **As a** | System Administrator |
| **I want to** | Create, disable, and assign roles to admin users |
| **So that** | access is properly managed |
| **Acceptance Criteria** | See AC-AC-066 |
| **Priority** | P0 |
| **Story Points** | 8 |
| **Related Features** | SF-ADM-009, SF-ID-012 |
| **Related Rules** | BR-ID-007, BR-ADM-003 |

### US-ADM-002 — Configure Feature Flags

| Field | Value |
| --- | --- |
| **As a** | System Administrator |
| **I want to** | Toggle feature flags |
| **So that** | I can control rollouts |
| **Acceptance Criteria** | See AC-AC-067 |
| **Priority** | P1 |
| **Story Points** | 5 |
| **Related Features** | SF-PLT-006, SF-ADM-013 |
| **Related Rules** | BR-PLT-004 |

### US-ADM-003 — View Audit Log

| Field | Value |
| --- | --- |
| **As a** | System Administrator |
| **I want to** | View the audit log |
| **So that** | I can review sensitive actions |
| **Acceptance Criteria** | See AC-AC-068 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-ADM-010 |
| **Related Rules** | BR-ADM-001, BR-ADM-002 |

### US-ADM-004 — Configure Shipping Zones

| Field | Value |
| --- | --- |
| **As a** | System Administrator |
| **I want to** | Configure shipping zones and rates |
| **So that** | accurate fees are calculated |
| **Acceptance Criteria** | See AC-AC-069 |
| **Priority** | P0 |
| **Story Points** | 5 |
| **Related Features** | SF-SHP-010 |
| **Related Rules** | BR-SHP-001 |

### US-ADM-005 — Configure Email Templates

| Field | Value |
| --- | --- |
| **As a** | System Administrator |
| **I want to** | Edit email templates |
| **So that** | messaging stays on-brand |
| **Acceptance Criteria** | See AC-AC-070 |
| **Priority** | P1 |
| **Story Points** | 5 |
| **Related Features** | SF-NOT-003 |
| **Related Rules** | BR-NOT-005 |

### US-ADM-006 — View Platform Dashboard

| Field | Value |
| --- | --- |
| **As a** | System Administrator |
| **I want to** | See a real-time platform health dashboard |
| **So that** | I can monitor the system |
| **Acceptance Criteria** | See AC-AC-071 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-ADM-001, SF-PLT-001 |
| **Related Rules** | — |

---

## 14. Story Summary

| Persona | Story Count | P0 | P1 | P2 |
| --- | --- | --- | --- | --- |
| Guest | 13 | 11 | 0 | 0 |
| Customer | 26 | 18 | 4 | 3 |
| Commercial Customer | 3 | 0 | 0 | 3 |
| Catalog Manager | 5 | 4 | 1 | 0 |
| Order Fulfillment | 6 | 4 | 2 | 0 |
| Marketing | 4 | 2 | 2 | 0 |
| Customer Support | 5 | 0 | 4 | 1 |
| Finance | 3 | 1 | 2 | 0 |
| System Administrator | 6 | 4 | 2 | 0 |
| **TOTAL** | **71** | **44** | **17** | **7** |

> Note: Three additional stories (US-OWN-*) for Product Owner are tracked separately as epics and not detailed here.

---

## 15. Epic Roll-Up

| Epic | Stories | Theme |
| --- | --- | --- |
| EP-01 Storefront Browsing | US-GUEST-001..007 | Catalog |
| EP-02 Storefront Cart & Checkout | US-GUEST-008..009, US-CUST-005..008 | Cart & Checkout |
| EP-03 Customer Account | US-GUEST-010..011, US-CUST-001, US-CUST-014..017, US-CUST-022, US-CUST-023 | Identity |
| EP-04 Customer Engagement | US-CUST-003, US-CUST-004, US-CUST-012, US-CUST-013, US-CUST-026 | Engagement |
| EP-05 Order & Shipment | US-CUST-009..011 | Order & Shipping |
| EP-06 Returns & Refunds | US-CUST-017..019 | Returns |
| EP-07 Support & Trust | US-CUST-020, US-CUST-021, US-GUEST-012, US-GUEST-013 | Support |
| EP-08 Catalog Operations | US-CAT-001..005 | Catalog Admin |
| EP-09 Order Fulfillment Operations | US-ORD-001..006 | Order Admin |
| EP-10 Marketing Operations | US-MKT-001..004 | Marketing Admin |
| EP-11 Support Operations | US-SUP-001..005 | Support Admin |
| EP-12 Finance & Reporting | US-FIN-001..003 | Finance Admin |
| EP-13 Platform Administration | US-ADM-001..006 | Platform Admin |
| EP-14 Commercial Features | US-COM-001..003 | Commercial |

---

## 16. New User Stories (v1.0)

> **Added per REVIEW_REPORT.md.** These stories cover missing workflows: Guest checkout, Admin MFA, Refund processing, Low stock, Order state transitions, VAT display, Inventory restock.

### US-GUEST-014 — Checkout as Guest

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | complete checkout without creating an account |
| **So that** | I can purchase quickly without registration friction |
| **Acceptance Criteria** | See AC-GCH-001 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-CHK-002, SF-ORD-001 |
| **Related Rules** | BR-GCH-001, BR-GCH-002 |

### US-GUEST-015 — Optionally Create Account at Checkout

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | tick a checkbox to create an account during checkout |
| **So that** | I can track my order easily afterward |
| **Acceptance Criteria** | See AC-GCH-002 |
| **Priority** | P1 |
| **Story Points** | 2 |
| **Related Features** | SF-ID-001, SF-CHK-002 |
| **Related Rules** | BR-GCH-001 |

### US-GUEST-016 — Track Order via Magic Link

| Field | Value |
| --- | --- |
| **As a** | Guest |
| **I want to** | click a magic link in my email to view my order |
| **So that** | I can see shipping status without an account |
| **Acceptance Criteria** | See AC-GCH-003 |
| **Priority** | P0 |
| **Story Points** | 2 |
| **Related Features** | SF-ORD-006, SF-NOT-001 |
| **Related Rules** | BR-GCH-004 |

### US-CUST-027 — Receive Refund

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | receive my refund after returning an item |
| **So that** | I am made whole when the product is faulty or unwanted |
| **Acceptance Criteria** | See AC-RFN-001 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-PAY-004, SF-RTN-006 |
| **Related Rules** | BR-PAY-009 |

### US-CUST-028 — See VAT on Order

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | see VAT as a separate line on my order and invoice |
| **So that** | I understand the tax breakdown of my purchase |
| **Acceptance Criteria** | See AC-TAX-001 |
| **Priority** | P0 |
| **Story Points** | 1 |
| **Related Features** | SF-TAX-002 |
| **Related Rules** | BR-TAX-002 |

### US-ADM-007 — Enable MFA on Admin Account

| Field | Value |
| --- | --- |
| **As a** | Admin Staff |
| **I want to** | set up TOTP-based MFA on my admin account |
| **So that** | my access is protected by two-factor authentication |
| **Acceptance Criteria** | See AC-MFA-001 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-ID-011 |
| **Related Rules** | BR-MFA-001, NFR-SEC-012 |

### US-ADM-008 — Receive Low Stock Alert

| Field | Value |
| --- | --- |
| **As a** | Catalog Manager |
| **I want to** | receive an alert when a product is low on stock |
| **So that** | I can reorder before it sells out |
| **Acceptance Criteria** | See AC-INV-002 |
| **Priority** | P1 |
| **Story Points** | 2 |
| **Related Features** | SF-INV-003 |
| **Related Rules** | BR-INV-004 |

### US-ADM-009 — Adjust Stock Manually

| Field | Value |
| --- | --- |
| **As a** | Catalog Manager |
| **I want to** | adjust stock levels manually with a reason |
| **So that** | inventory discrepancies are corrected and audited |
| **Acceptance Criteria** | See AC-INV-003 |
| **Priority** | P1 |
| **Story Points** | 2 |
| **Related Features** | SF-INV-004 |
| **Related Rules** | BR-INV-005 |

### US-ADM-010 — Inspect and Restock Returned Item

| Field | Value |
| --- | --- |
| **As a** | Order Fulfillment Staff |
| **I want to** | inspect returned items and restock sellable ones |
| **So that** | inventory is accurately recovered from returns |
| **Acceptance Criteria** | See AC-INV-004 |
| **Priority** | P1 |
| **Story Points** | 3 |
| **Related Features** | SF-INV-005, SF-RTN-006 |
| **Related Rules** | BR-INV-006 |

### US-ORD-007 — View Order Status History

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | see the timeline of my order's status changes |
| **So that** | I can understand where my order is in fulfillment |
| **Acceptance Criteria** | See AC-ORD-001 |
| **Priority** | P1 |
| **Story Points** | 2 |
| **Related Features** | SF-ORD-004, SF-ORD-006 |
| **Related Rules** | BR-OSM-003 |

### US-ORD-008 — Receive Auto-Completion

| Field | Value |
| --- | --- |
| **As a** | Customer |
| **I want to** | have my order auto-complete 7 days after delivery |
| **So that** | the warranty / return window closes deterministically |
| **Acceptance Criteria** | See AC-ORD-002 |
| **Priority** | P2 |
| **Story Points** | 1 |
| **Related Features** | SF-ORD-003 |
| **Related Rules** | BR-OSM-004 |

### US-FIN-004 — Generate VAT Report

| Field | Value |
| --- | --- |
| **As a** | Finance Staff |
| **I want to** | export a VAT report (taxable sales, VAT collected) |
| **So that** | I can file taxes with Vietnamese authorities |
| **Acceptance Criteria** | See AC-TAX-002 |
| **Priority** | P1 |
| **Story Points** | 3 |
| **Related Features** | SF-TAX-004, SF-ANL-006 |
| **Related Rules** | BR-TAX-002, BR-TAX-004 |

### US-FIN-005 — Reconcile Payment Status

| Field | Value |
| --- | --- |
| **As a** | Finance Staff |
| **I want to** | reconcile payment transactions with provider statements |
| **So that** | missed payments and discrepancies are caught |
| **Acceptance Criteria** | See AC-PAY-001 |
| **Priority** | P1 |
| **Story Points** | 3 |
| **Related Features** | SF-PAY-005 |
| **Related Rules** | BR-PAY-005, BR-PAY-010 |

### US-CAT-006 — Upload Product Images

| Field | Value |
| --- | --- |
| **As a** | Catalog Manager |
| **I want to** | upload multiple product images with auto-optimization |
| **So that** | products look professional across devices |
| **Acceptance Criteria** | See AC-MED-001 |
| **Priority** | P0 |
| **Story Points** | 3 |
| **Related Features** | SF-MED-001, SF-MED-002 |
| **Related Rules** | BR-MED-001, BR-MED-002 |

---

## 17. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 0.1 | 2026-07-02 | Principal Business Analyst | Initial draft with 71 stories across 9 personas |
| 1.0 | 2026-07-03 | Architecture Review Board | Added 14 new stories (Guest Checkout x3, Refund, VAT, MFA, Low Stock x3, Order Status, Auto-Complete, VAT Report, Payment Recon, Image Upload); addressed REVIEW_REPORT.md RC-05..08 |

---

**End of Document — USER_STORIES.md**
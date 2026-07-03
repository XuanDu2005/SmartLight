# SmartLight — Acceptance Criteria (Gherkin)

| Field | Value |
| --- | --- |
| **Document ID** | `BA-AC-001` |
| **Document Owner** | Principal Business Analyst |
| **Status** | Draft — v0.1 |
| **Created Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2026-08-01 |
| **Classification** | Business Analysis — Authoritative |
| **Audience** | Engineering, Product, QA, AI Agents |

> **Source of Truth:** This document conforms to `docs/00-governance/PROJECT_BLUEPRINT.md`, `SRS.md`, `SYSTEM_FEATURES.md`, `BUSINESS_RULES.md`, and `USER_STORIES.md`.
>
> **Format:** All scenarios use Gherkin syntax: `Given` (initial context), `When` (action), `Then` (expected outcome). Each scenario maps to a user story ID in `USER_STORIES.md`.

---

## 1. Purpose

This document provides **executable acceptance criteria** for SmartLight features in Gherkin format. These scenarios are intended for:

1. **QA** to write automated tests.
2. **Engineering** to validate behavior in development.
3. **Product** to confirm acceptance of features.
4. **AI agents** to verify their own work against acceptance criteria.

---

## 2. Acceptance Criteria ID Convention

| Pattern | Meaning |
| --- | --- |
| `AC-<NUMBER>` | Acceptance Criteria ID, references story in `USER_STORIES.md` |

---

## 3. Catalog Acceptance Criteria

### AC-AC-001 — Browse Catalog by Category

**Story:** US-GUEST-001

```gherkin
Scenario: Guest browses a top-level category
  Given I am a guest on the storefront homepage
  When I click on the "Indoor Lighting" category
  Then I see a list of products under "Indoor Lighting"
  And I see subcategory links if any exist
  And each product card shows image, name, and price

Scenario: Guest browses a nested category
  Given I am viewing "Indoor Lighting > Ceiling Lights"
  When the page loads
  Then I see only products in "Ceiling Lights"
  And I see breadcrumb navigation showing the hierarchy

Scenario: Category is empty
  Given a category has no products
  When I view that category
  Then I see an empty-state message in Vietnamese
```

### AC-AC-002 — Search for Products

**Story:** US-GUEST-002

```gherkin
Scenario: Search returns matching products
  Given I am on any page with the search bar
  When I type "đèn âm trần" and submit
  Then I see search results with matching products
  And I see the number of results
  And each result shows name, image, price

Scenario: Search returns no results
  Given I search for "xyzabc123"
  When results are returned
  Then I see an empty-state message
  And I see suggestions for popular categories
```

### AC-AC-003 — Filter Products by Attributes

**Story:** US-GUEST-003

```gherkin
Scenario: Filter by price range
  Given I am on a product listing page
  When I set the price filter to "100,000 VND – 500,000 VND"
  Then I see only products within that price range
  And the result count updates

Scenario: Filter by multiple attributes
  Given I am on a product listing page
  When I select wattage "9W" and color temperature "3000K"
  Then I see only products matching both filters
  And applied filters are visible and removable
```

### AC-AC-004 — View Product Detail

**Story:** US-GUEST-004

```gherkin
Scenario: Guest views product details
  Given I click on a product from a listing
  When the product detail page loads
  Then I see product images, name, price, description
  And I see technical specifications
  And I see warranty terms
  And I see variant selection if available

Scenario: Product has multiple images
  Given a product has 4 images
  When I view the product detail page
  Then I see a gallery with thumbnails
  And clicking a thumbnail shows that image as the main image
```

### AC-AC-005 — View Product Variants

**Story:** US-GUEST-005

```gherkin
Scenario: Select a variant
  Given a product has variants by color and wattage
  When I select color "Black" and wattage "12W"
  Then I see the price and stock for that variant
  And I see an updated SKU displayed

Scenario: Variant is out of stock
  Given I select a variant that is out of stock
  Then the "Add to Cart" button is disabled
  And I see "Out of Stock" status
```

### AC-AC-006 — See Stock Availability

**Story:** US-GUEST-006

```gherkin
Scenario: Product is in stock
  Given a product has stock > 10
  When I view the product
  Then I see "In Stock" status

Scenario: Product is low on stock
  Given a product has stock = 3
  When I view the product
  Then I see "Low Stock — only 3 left" status

Scenario: Product is out of stock
  Given a product has stock = 0
  When I view the product
  Then I see "Out of Stock" status
  And the "Add to Cart" button is disabled
```

### AC-AC-007 — View Aggregated Ratings

**Story:** US-GUEST-007

```gherkin
Scenario: Product has reviews
  Given a product has 12 reviews with average 4.3 stars
  When I view the product page
  Then I see "4.3" with star icons
  And I see "12 reviews"

Scenario: Product has no reviews
  Given a product has 0 reviews
  When I view the product page
  Then I see "No reviews yet"
```

---

## 4. Cart Acceptance Criteria

### AC-AC-008 — Add Product to Cart

**Story:** US-GUEST-008

```gherkin
Scenario: Add in-stock variant to cart
  Given I am on a product page with an in-stock variant
  When I click "Add to Cart"
  Then the variant is added to my cart
  And I see a confirmation message
  And the cart count increments

Scenario: Add out-of-stock variant
  Given I am on a product page with an out-of-stock variant
  When the page renders
  Then the "Add to Cart" button is disabled

Scenario: Exceed per-line limit
  Given I have 99 units of a variant in cart
  When I try to increase quantity
  Then the change is rejected with a clear message
```

### AC-AC-009 — View and Manage Cart

**Story:** US-GUEST-009

```gherkin
Scenario: View cart
  Given I have 2 items in cart
  When I open the cart
  Then I see both line items with quantity and line total
  And I see the cart subtotal

Scenario: Update quantity
  Given I have 2 units of a line item
  When I change quantity to 5
  Then the line total updates
  And the cart subtotal updates

Scenario: Remove line item
  Given I have a line item in cart
  When I click "Remove"
  Then the line is removed
  And the cart subtotal updates
```

---

## 5. Identity Acceptance Criteria

### AC-AC-010 — Register an Account

**Story:** US-GUEST-010

```gherkin
Scenario: Successful registration
  Given I provide a valid email, password, and name
  When I submit the registration form
  Then my account is created
  And I receive a verification email
  And I am logged in

Scenario: Email already exists
  Given an account with email "user@example.com" exists
  When I try to register with the same email
  Then I see an error message "Email is already in use"

Scenario: Weak password
  Given I provide password "abc"
  When I submit the form
  Then I see a password requirement message in Vietnamese
```

### AC-AC-011 — Reset Forgotten Password

**Story:** US-GUEST-011

```gherkin
Scenario: Request password reset
  Given I provide a registered email
  When I submit the reset form
  Then I see "Check your email for instructions"
  And I receive a reset email with a link

Scenario: Use reset link
  Given I click the reset link in the email
  When the page opens
  Then I see a form to enter a new password
  And I can submit a new password

Scenario: Expired reset link
  Given the reset link has expired (> 1 hour)
  When I click the link
  Then I see "Link has expired, please request a new one"
```

### AC-AC-014 — Log In

**Story:** US-CUST-001

```gherkin
Scenario: Successful login
  Given I have a verified account
  When I submit correct email and password
  Then I am logged in
  And I am redirected to the home page

Scenario: Invalid credentials
  Given I submit wrong password
  When I submit
  Then I see "Invalid email or password"

Scenario: Account lockout
  Given I have failed login 5 times
  When I try again
  Then I see "Account locked. Try again in 15 minutes."
```

### AC-AC-015 — Merge Guest Cart on Login

**Story:** US-CUST-002

```gherkin
Scenario: Merge with no conflicts
  Given I have 1 item in guest cart
  And I have 0 items in customer cart
  When I log in
  Then my customer cart has 1 item

Scenario: Merge with same variant
  Given guest cart has 2 units of variant A
  And customer cart has 3 units of variant A
  When I log in
  Then customer cart has 5 units of variant A (capped at 99)

Scenario: Merge exceeds limit
  Given guest cart has 90 units
  And customer cart has 20 units of same variant
  When I log in
  Then the merged quantity is capped at 99
  And I see a notification about the cap
```

---

## 6. Wishlist Acceptance Criteria

### AC-AC-016 — Save Product to Wishlist

**Story:** US-CUST-003

```gherkin
Scenario: Add to wishlist
  Given I am logged in and on a product page
  When I click the wishlist icon
  Then the product is added to my wishlist
  And the icon shows "added" state

Scenario: Wishlist at limit
  Given my wishlist has 200 items
  When I try to add another
  Then I see "Wishlist is full"
```

### AC-AC-017 — Move Wishlist Item to Cart

**Story:** US-CUST-004

```gherkin
Scenario: Move from wishlist to cart
  Given I have a wishlist item in stock
  When I click "Move to Cart"
  Then the item is added to my cart
  And it is removed from my wishlist

Scenario: Item out of stock
  Given a wishlist item is now out of stock
  When I click "Move to Cart"
  Then I see "Out of stock — cannot move to cart"
```

---

## 7. Checkout Acceptance Criteria

### AC-AC-018 — Complete Checkout (Logged-in)

**Story:** US-CUST-005

```gherkin
Scenario: Complete checkout successfully
  Given I am logged in with a saved address
  When I select the address, shipping method, and payment method
  And I confirm the order
  Then an order is created in "Pending Payment" status
  And I am redirected to the payment provider
  And after successful payment, the order becomes "Paid"
  And I receive a confirmation email

Scenario: Missing required information
  Given I do not select a shipping method
  When I try to confirm
  Then I see a validation error in Vietnamese
```

### AC-AC-019 — Complete Guest Checkout

**Story:** US-CUST-006

```gherkin
Scenario: Guest checkout without account
  Given I provide email, name, phone, and address
  When I complete checkout and pay
  Then an order is created
  And a guest account is created for the email
  And a verification email is sent
```

### AC-AC-020 — Pay Using Vietnamese Provider

**Story:** US-CUST-007

```gherkin
Scenario: Successful payment via VNPay
  Given I am at the payment step with VNPay selected
  When I confirm and complete payment on VNPay
  Then I am redirected back to SmartLight
  And the order status becomes "Paid"
  And I receive order confirmation

Scenario: Payment failure
  Given I cancel payment on the provider's page
  When I return to SmartLight
  Then the order remains "Pending Payment"
  And I see "Payment was not completed"

Scenario: Payment webhook reconciles
  Given payment webhook arrives after redirect
  When the webhook is verified and processed
  Then the order is marked "Paid" even if redirect failed
```

---

## 8. Order Acceptance Criteria

### AC-AC-021 — Receive Order Confirmation Email

**Story:** US-CUST-008

```gherkin
Scenario: Confirmation email sent
  Given my order is "Paid"
  When the system processes the event
  Then I receive an email in Vietnamese with order details
  And the email contains order number, items, total, and tracking link
```

### AC-AC-022 — View Order History

**Story:** US-CUST-009

```gherkin
Scenario: Customer views order history
  Given I am logged in with past orders
  When I visit "My Orders"
  Then I see a paginated list of my orders
  And I can click each to see details

Scenario: Filter by status
  Given I have orders in various statuses
  When I filter by "Delivered"
  Then only delivered orders are shown
```

### AC-AC-023 — Track Shipment

**Story:** US-CUST-010

```gherkin
Scenario: View tracking timeline
  Given my order has been shipped
  When I open the order detail
  Then I see a timeline: Confirmed → Processing → Shipped → Out for Delivery → Delivered
  And I see the carrier name and tracking number
```

### AC-AC-024 — Cancel Pending Order

**Story:** US-CUST-011

```gherkin
Scenario: Cancel before shipping
  Given my order is "Processing" (not yet shipped)
  When I click "Cancel Order" and confirm
  Then the order is cancelled
  And a refund is initiated
  And I receive a cancellation email

Scenario: Cannot cancel after shipping
  Given my order is "Shipped"
  When I try to cancel
  Then I see "Cannot cancel — please request a return"
```

---

## 9. Reviews Acceptance Criteria

### AC-AC-025 — Submit Product Review

**Story:** US-CUST-012

```gherkin
Scenario: Verified customer submits review
  Given I have a delivered order with product X
  When I submit a 5-star review with text and 2 photos
  Then my review enters moderation
  And I see "Review submitted, awaiting approval"

Scenario: Non-verified customer cannot review
  Given I have not purchased product X
  When I try to submit a review for X
  Then I see "Only verified purchasers may review this product"

Scenario: Multiple photos
  Given I try to upload 6 photos
  When I submit
  Then the upload is rejected with "Max 5 photos"
```

---

## 10. Promotions Acceptance Criteria

### AC-AC-026 — Apply Voucher Code

**Story:** US-CUST-013

```gherkin
Scenario: Valid voucher applied
  Given I have a valid voucher code "SUMMER10"
  When I apply it at checkout
  Then the discount is applied to the order
  And I see the original and discounted total

Scenario: Expired voucher
  Given I apply an expired voucher
  When I submit
  Then I see "Voucher has expired"

Scenario: Usage limit reached
  Given I have used a voucher twice (limit = 2)
  When I try to use it again
  Then I see "Voucher usage limit reached"
```

---

## 11. Account Management Acceptance Criteria

### AC-AC-027 — Manage Addresses

**Story:** US-CUST-014

```gherkin
Scenario: Add new address
  Given I provide valid province, district, ward, street
  When I save
  Then the address is added to my address book

Scenario: Set default address
  Given I have multiple addresses
  When I mark one as default
  Then it is preselected at checkout

Scenario: Invalid province
  Given I provide an invalid province value
  When I save
  Then I see "Please select a valid province"
```

### AC-AC-028 — Change Password

**Story:** US-CUST-015

```gherkin
Scenario: Successful password change
  Given I provide current and new valid password
  When I submit
  Then my password is updated
  And I see "Password changed successfully"

Scenario: Wrong current password
  Given I provide wrong current password
  When I submit
  Then I see "Current password is incorrect"
```

### AC-AC-029 — Manage Profile

**Story:** US-CUST-016

```gherkin
Scenario: Update profile
  Given I update my name and phone
  When I save
  Then my profile is updated
  And I see "Profile updated"

Scenario: Invalid phone
  Given I provide an invalid Vietnamese phone
  When I save
  Then I see "Please enter a valid phone number"
```

### AC-AC-035 — Delete Account

**Story:** US-CUST-022

```gherkin
Scenario: Request deletion
  Given I request account deletion
  When I confirm
  Then I see "Deletion scheduled in 7 days"
  And I receive an email confirmation

Scenario: Cancel deletion within cooling-off
  Given I have a pending deletion
  When I log in within 7 days and click "Cancel Deletion"
  Then the deletion is cancelled
```

### AC-AC-036 — Logout

**Story:** US-CUST-023

```gherkin
Scenario: Logout clears session
  Given I am logged in
  When I click "Logout"
  Then I am logged out
  And I cannot access authenticated pages
```

---

## 12. Returns Acceptance Criteria

### AC-AC-030 — Request Return

**Story:** US-CUST-017

```gherkin
Scenario: Eligible return
  Given I have a delivered order from 3 days ago
  When I request a return with reason "Wrong item"
  Then a return request is created
  And I receive an RMA number
  And I see return shipping instructions

Scenario: Outside return window
  Given I have a delivered order from 30 days ago
  When I try to request a return
  Then I see "Return window has expired"
```

### AC-AC-031 — Track Return Status

**Story:** US-CUST-018

```gherkin
Scenario: Customer tracks return
  Given I have an open return request
  When I view return status
  Then I see: Requested → Approved → In Transit → Received → Refunded
```

### AC-AC-032 — Receive Refund

**Story:** US-CUST-019

```gherkin
Scenario: Refund processed
  Given my return is received and inspected
  When admin confirms receipt
  Then a refund is initiated to my original payment method
  And I receive a refund confirmation email

Scenario: Refund timing SLA
  Given my return was received
  When 5 business days pass
  Then the refund must be completed
```

---

## 13. Support Acceptance Criteria

### AC-AC-033 — Submit Support Ticket

**Story:** US-CUST-020

```gherkin
Scenario: Submit ticket
  Given I am logged in
  When I submit a ticket with subject and description
  Then a ticket is created with status "Open"
  And I receive a confirmation email

Scenario: Attach files
  Given I attach 2 files (under size limit)
  When I submit
  Then the files are uploaded
  And the ticket is created with attachments
```

### AC-AC-034 — Manage Notification Preferences

**Story:** US-CUST-021

```gherkin
Scenario: Opt in to marketing
  Given I am on notification preferences page
  When I check "Marketing emails"
  And save
  Then I receive marketing opt-in confirmation

Scenario: Opt out of marketing
  Given I am currently opted in
  When I uncheck "Marketing emails"
  And save
  Then I no longer receive marketing emails
  And transactional emails continue
```

---

## 14. Engagement Acceptance Criteria

### AC-AC-037 — Compare Products

**Story:** US-CUST-024

```gherkin
Scenario: Add to compare
  Given I am on a product page
  When I click "Compare"
  Then the product is added to my compare list
  And the list shows up to 4 products

Scenario: View comparison
  Given I have 3 products in compare list
  When I click "Compare"
  Then I see a side-by-side comparison table
  And differences are highlighted
```

### AC-AC-038 — Recently Viewed Products

**Story:** US-CUST-025

```gherkin
Scenario: Recently viewed displayed
  Given I have viewed 5 products in this session
  When I view my account home
  Then I see the recently viewed products carousel
```

### AC-AC-039 — Mark Review as Helpful

**Story:** US-CUST-026

```gherkin
Scenario: Mark review helpful
  Given I view a product review
  When I click "Helpful"
  Then the helpful count increments
  And my vote is recorded
```

---

## 15. Commercial Customer Acceptance Criteria

### AC-AC-040 — Save Project Cart

**Story:** US-COM-001

```gherkin
Scenario: Save cart as project
  Given I have items in cart
  When I click "Save as Project" and enter a name
  Then the cart is saved as a named project
  And I can re-load it later
```

### AC-AC-041 — Bulk Add to Cart

**Story:** US-COM-002

```gherkin
Scenario: Bulk add
  Given I select multiple products and quantities
  When I click "Add All to Cart"
  Then all selected items are added
  And the cart updates with all entries
```

### AC-AC-042 — Download Specification Sheet

**Story:** US-COM-003

```gherkin
Scenario: Download specs
  Given I am on a product page
  When I click "Download Specs"
  Then a PDF is downloaded with technical specifications
```

---

## 16. Admin Catalog Acceptance Criteria

### AC-AC-043 — Create Product

**Story:** US-CAT-001

```gherkin
Scenario: Create product with all required fields
  Given I am a Catalog Manager
  When I fill in name, category, brand, price, image, variant
  And I save
  Then the product is created with status "Draft"

Scenario: Missing mandatory fields
  Given I try to publish without a variant
  When I attempt to publish
  Then I see a validation error listing missing fields
```

### AC-AC-044 — Update Product

**Story:** US-CAT-002

```gherkin
Scenario: Update price
  Given I edit a product's price
  When I save
  Then the new price is reflected on the storefront
  And an audit log entry is recorded

Scenario: Update variants
  Given I add a new variant
  When I save
  Then the variant is available on the storefront
```

### AC-AC-045 — Manage Categories

**Story:** US-CAT-003

```gherkin
Scenario: Create category
  Given I create a category under "Indoor Lighting"
  When I save
  Then the category is created with proper hierarchy

Scenario: Cannot exceed depth limit
  Given I try to create a category at depth 4
  When I save
  Then I see "Maximum category depth is 3"
```

### AC-AC-046 — Upload Product Media

**Story:** US-CAT-004

```gherkin
Scenario: Upload image
  Given I upload a valid JPG < 5MB
  When upload completes
  Then the image is associated with the product
  And CDN URL is generated

Scenario: Upload invalid file
  Given I upload a 10MB file
  When I submit
  Then I see "File exceeds 5MB limit"
```

### AC-AC-047 — Set Low-Stock Threshold

**Story:** US-CAT-005

```gherkin
Scenario: Configure threshold
  Given I set the threshold to 5 for product X
  When I save
  Then the threshold is stored

Scenario: Threshold triggers notification
  Given product X stock falls to 5
  When the system detects low stock
  Then admin receives a low-stock notification
```

---

## 17. Admin Order Acceptance Criteria

### AC-AC-048 — View Order Queue

**Story:** US-ORD-001

```gherkin
Scenario: View pending orders
  Given there are 10 orders in "Pending Payment"
  When I open the order queue
  Then I see the list sorted by creation time
  And I can filter by status

Scenario: Search orders
  Given I search by order number "SL-20260702-00012"
  When search runs
  Then I see the matching order
```

### AC-AC-049 — Update Order Status

**Story:** US-ORD-002

```gherkin
Scenario: Move from Confirmed to Processing
  Given an order is "Confirmed"
  When I update status to "Processing"
  Then the status changes
  And a status history entry is added

Scenario: Invalid transition
  Given an order is "Delivered"
  When I try to update to "Pending"
  Then I see "Invalid status transition"
```

### AC-AC-050 — Generate Picklist

**Story:** US-ORD-003

```gherkin
Scenario: Print picklist
  Given I open an order in "Processing"
  When I click "Print Picklist"
  Then a PDF with line items is generated and downloaded
```

### AC-AC-051 — Create Shipment

**Story:** US-ORD-004

```gherkin
Scenario: Create shipment
  Given I select a carrier and provide package details
  When I click "Create Shipment"
  Then a shipment is created with the carrier
  And a tracking number is assigned
  And a shipping label PDF is available

Scenario: Cancel shipment
  Given I have a shipment not yet picked up
  When I click "Cancel Shipment"
  Then the shipment is cancelled
```

### AC-AC-052 — Cancel Order on Customer Request

**Story:** US-ORD-005

```gherkin
Scenario: Admin cancels order
  Given an order is "Confirmed"
  When I cancel and confirm
  Then the order is cancelled
  And a refund is initiated

Scenario: Cancel shipped order
  Given an order is "Shipped"
  When I try to cancel
  Then I see "Order already shipped — process as return"
```

### AC-AC-053 — Add Internal Note to Order

**Story:** US-ORD-006

```gherkin
Scenario: Add internal note
  Given I am viewing an order
  When I type a note and save
  Then the note is added with my name and timestamp
  And the note is visible only to staff
```

---

## 18. Admin Marketing Acceptance Criteria

### AC-AC-054 — Create Promotion

**Story:** US-MKT-001

```gherkin
Scenario: Create 10% discount promotion
  Given I configure: 10% off, eligible categories ["Ceiling Lights"], valid 2026-07-10 to 2026-07-20
  When I save
  Then the promotion is created in "Scheduled" status

Scenario: Promotion auto-activates
  Given a promotion starts at 2026-07-10 00:00
  When that time arrives
  Then the promotion becomes "Active"
  And customers see the discount on eligible products
```

### AC-AC-055 — Create Voucher Codes

**Story:** US-MKT-002

```gherkin
Scenario: Generate 100 codes
  Given I create a voucher with 100 unique codes
  When I save
  Then 100 codes are generated and downloadable as CSV

Scenario: Voucher uniqueness
  Given I try to create a voucher with duplicate code "SUMMER10"
  When I save
  Then I see "Code already exists"
```

### AC-AC-056 — Schedule Flash Sale

**Story:** US-MKT-003

```gherkin
Scenario: Schedule flash sale
  Given I schedule a flash sale from 2026-07-15 12:00 to 2026-07-15 14:00
  When I save
  Then the flash sale appears on the storefront during the window
  And customers see a countdown timer
```

### AC-AC-057 — Edit Banners and Static Pages

**Story:** US-MKT-004

```gherkin
Scenario: Update homepage banner
  Given I edit banner image and link
  When I publish
  Then the new banner appears on the homepage within 5 minutes
```

---

## 19. Admin Support Acceptance Criteria

### AC-AC-058 — View Customer Profile

**Story:** US-SUP-001

```gherkin
Scenario: Search customer
  Given I search by email "user@example.com"
  When results load
  Then I see the customer's profile
  And I see their order history
  And the access is logged in audit
```

### AC-AC-059 — Respond to Support Ticket

**Story:** US-SUP-002

```gherkin
Scenario: Agent responds
  Given I am viewing a ticket
  When I write a response and submit
  Then the customer receives an email
  And the ticket status updates to "Pending"

Scenario: First response SLA
  Given a ticket is created at 09:00
  When 4 business hours pass without response
  Then the SLA breach is flagged
```

### AC-AC-060 — Add Internal Note to Ticket

**Story:** US-SUP-003

```gherkin
Scenario: Internal note
  Given I am viewing a ticket
  When I add a note marked as internal
  Then the note is saved
  And customers cannot see it
```

### AC-AC-061 — Approve Return Request

**Story:** US-SUP-004

```gherkin
Scenario: Approve return
  Given I view a return request with valid reason
  When I approve
  Then the customer is notified
  And the return status is "Approved"

Scenario: Reject return
  Given I view a return request outside the window
  When I reject with reason
  Then the customer is notified with the reason
```

### AC-AC-062 — Moderate Review

**Story:** US-SUP-005

```gherkin
Scenario: Approve review
  Given a pending review meets guidelines
  When I approve
  Then the review becomes public

Scenario: Reject review with reason
  Given a review contains prohibited content
  When I reject with reason
  Then the review is not published
  And the customer is notified
```

---

## 20. Admin Finance Acceptance Criteria

### AC-AC-063 — View Sales Reports

**Story:** US-FIN-001

```gherkin
Scenario: View monthly report
  Given I select July 2026
  When I view the sales report
  Then I see total orders, revenue, AOV, refunds
  And I see a daily breakdown
```

### AC-AC-064 — Process Refund

**Story:** US-FIN-002

```gherkin
Scenario: Process partial refund
  Given an order of 1,000,000 VND with 1 refundable item
  When I refund 500,000 VND
  Then the partial refund is processed
  And the remaining refundable amount = 500,000 VND

Scenario: Cannot exceed original
  Given payment of 1,000,000 VND with 800,000 VND already refunded
  When I try to refund 300,000 VND
  Then I see "Refund would exceed original payment"
```

### AC-AC-065 — Export Reports

**Story:** US-FIN-003

```gherkin
Scenario: Export sales report
  Given I select a date range with 500 orders
  When I click "Export CSV"
  Then a CSV file is generated and downloaded

Scenario: Export limit
  Given I select a date range with 60,000 orders
  When I try to export
  Then I see "Export exceeds 50,000 row limit — please narrow the range"
```

---

## 21. Admin System Acceptance Criteria

### AC-AC-066 — Manage Admin Users and Roles

**Story:** US-ADM-001

```gherkin
Scenario: Create admin user
  Given I create an admin with role "OrderFulfillment"
  When I save
  Then the user receives an MFA enrollment email
  And they cannot self-approve role changes

Scenario: Disable admin user
  Given I disable an admin user
  When I confirm
  Then the user cannot log in
  And their sessions are invalidated
```

### AC-AC-067 — Configure Feature Flags

**Story:** US-ADM-002

```gherkin
Scenario: Toggle flag
  Given I toggle "CompareProducts" flag to ON
  When I save
  Then the feature becomes available within 5 minutes
  And the change is logged in audit
```

### AC-AC-068 — View Audit Log

**Story:** US-ADM-003

```gherkin
Scenario: View audit log
  Given sensitive operations have occurred
  When I open the audit log
  Then I see a filterable list with actor, action, timestamp, target
```

### AC-AC-069 — Configure Shipping Zones

**Story:** US-ADM-004

```gherkin
Scenario: Configure zone
  Given I add zone "HCMC" with carrier "GHN" and rate 25,000 VND
  When I save
  Then HCMC orders calculate shipping using this rate
```

### AC-AC-070 — Configure Email Templates

**Story:** US-ADM-005

```gherkin
Scenario: Edit template
  Given I edit the order confirmation template
  When I save
  Then subsequent order confirmations use the new template
```

### AC-AC-071 — View Platform Dashboard

**Story:** US-ADM-006

```gherkin
Scenario: View dashboard
  Given I am logged in as System Administrator
  When I open the dashboard
  Then I see KPIs: orders today, revenue today, conversion, top products
  And I see system health indicators
```

---

## 22. Cross-Feature Acceptance Criteria

### AC-AC-071a — Duplicate Submission Prevention

**Reference:** SF-CHK-010, BR-CHK-009

```gherkin
Scenario: Prevent duplicate order
  Given I click "Place Order" twice within 1 second
  When the second click is processed
  Then only one order is created
  And the second click returns the existing order
```

### AC-AC-071b — Inventory Reservation

**Reference:** SF-X-001, BR-CRT-003

```gherkin
Scenario: Reservation expires
  Given I have a cart with reserved items
  When 15 minutes pass without checkout
  Then the reservation is released
  And the items are available for other customers

Scenario: Stock reserved at checkout
  Given I have items in cart
  When I complete checkout
  Then the reservation is converted to a stock decrement
```

### AC-AC-071c — Money Integrity

**Reference:** BR-X-001

```gherkin
Scenario: No float arithmetic
  Given the system computes order totals
  When calculations run
  Then all math is performed on integers or Decimal(18,2)
  And no floating-point currency errors occur
```

### AC-AC-071d — Currency Consistency

**Reference:** BR-CHK-007, SF-I18-004

```gherkin
Scenario: VND only
  Given the storefront displays prices
  When a price is shown
  Then it is formatted in VND with Vietnamese locale
```

### AC-AC-071e — Timestamp Consistency

**Reference:** BR-X-002

```gherkin
Scenario: UTC stored, local displayed
  Given an order is created at 2026-07-02 22:30 ICT
  When stored in database
  Then the timestamp is 2026-07-02 15:30 UTC
  And displayed to Vietnamese users as "02/07/2026 22:30"
```

### AC-AC-071f — HTTPS Enforcement

**Reference:** BR-PLT-002

```gherkin
Scenario: HTTP redirects to HTTPS
  Given I visit http://smartlight.vn
  When the request is processed
  Then I am redirected to https://smartlight.vn
```

### AC-AC-071g — Cookie Consent

**Reference:** SF-PLT-008, BR-PLT-001

```gherkin
Scenario: Reject analytics cookies without consent
  Given I have not given consent
  When the page loads
  Then no analytics cookies are set
  And the consent banner is shown

Scenario: After consent
  Given I accept analytics cookies
  When I navigate the site
  Then analytics cookies are set
  And the banner is hidden
```

---

## 23. Non-Functional Acceptance Scenarios

### AC-NFR-001 — Performance

```gherkin
Scenario: Storefront TTFB
  Given the storefront is under normal load
  When a cached page is requested
  Then TTFB < 200 ms (p95)

Scenario: API read latency
  Given the API is under normal load
  When a read endpoint is called
  Then response < 250 ms (p95)
```

### AC-NFR-002 — Availability

```gherkin
Scenario: Monthly uptime
  Given the system is monitored continuously
  When a calendar month ends
  Then uptime ≥ 99.5%
```

### AC-NFR-003 — Security

```gherkin
Scenario: TLS enforced
  Given any HTTP request
  When processed
  Then it is upgraded to HTTPS

Scenario: Account lockout
  Given 5 failed login attempts
  When the 6th attempt is made
  Then the account is locked for 15 minutes

Scenario: MFA required for admin
  Given I am an admin without MFA enrolled
  When I try to log in
  Then I am required to enroll MFA first
```

### AC-NFR-004 — Accessibility

```gherkin
Scenario: Keyboard navigation
  Given I use only the keyboard
  When I navigate the storefront
  Then I can reach all interactive elements
  And focus indicators are visible

Scenario: Screen reader labels
  Given I use a screen reader
  When I navigate the storefront
  Then all images have meaningful alt text
  And form fields have labels
```

---

## 24. New Acceptance Criteria (v1.0)

> **Added per REVIEW_REPORT.md RC-09.** Covers VAT, inventory expiry, cookie reject, guest checkout, refund, low stock, and payment failure.

### AC-TAX-001 — VAT Display

**Story:** US-CUST-028

```gherkin
Scenario: VAT shown on cart
  Given I have a cart with one product priced at 200,000 VND
  When I view the cart
  Then I see Subtotal: 200,000 VND
  And I see VAT (10%): 20,000 VND
  And I see Total: 220,000 VND

Scenario: VAT shown on invoice
  Given I complete an order
  When I view my invoice PDF
  Then VAT is shown as a separate line
  And total = subtotal + VAT
```

### AC-TAX-002 — VAT Report

**Story:** US-FIN-004

```gherkin
Scenario: Export VAT report
  Given I am Finance Staff
  When I generate the VAT report for June 2026
  Then I see total taxable sales and total VAT collected
  And I can download the report as CSV
```

### AC-INV-001 — Stock Reservation Expiry

**Story:** US-GUEST-008

```gherkin
Scenario: Reservation expires after 15 minutes
  Given I added a product to my cart
  And I do not complete checkout
  When 15 minutes elapse
  Then the reservation is released
  And the stock returns to the available pool
  And another shopper can now purchase the item
```

### AC-INV-002 — Low Stock Alert

**Story:** US-ADM-008

```gherkin
Scenario: Alert when stock falls below threshold
  Given a product variant has threshold = 5
  And current stock = 6
  When an order reduces stock to 4
  Then an email is sent to admin staff
  And a dashboard banner shows the low-stock product
```

### AC-INV-003 — Manual Stock Adjustment

**Story:** US-ADM-009

```gherkin
Scenario: Adjust stock with reason
  Given I am Catalog Manager
  When I adjust stock from 50 to 47 with reason "Hao hụt kiểm kê"
  Then stock is set to 47
  And an audit log entry is recorded with reason and actor
```

### AC-INV-004 — Restock After Return Inspection

**Story:** US-ADM-010

```gherkin
Scenario: Restock sellable returned item
  Given a returned item passed inspection
  When I mark the item as "Có thể bán lại"
  Then stock-on-hand is incremented by 1
  And the item is available on the storefront

Scenario: Dispose damaged returned item
  Given a returned item failed inspection
  When I mark the item as "Hỏng - thanh lý"
  Then stock-on-hand is not incremented
  And the disposed counter is incremented
```

### AC-PAY-001 — Payment Reconciliation

**Story:** US-FIN-005

```gherkin
Scenario: Detect missed webhook
  Given an order has been paid but no webhook was received
  When the hourly reconciliation job runs
  Then the order is updated to Confirmed
  And a log entry records the reconciliation

Scenario: Payment failure isolates order
  Given I submit payment and the provider returns failure
  When the webhook arrives
  Then no order is created
  And no stock is decremented
  And I am redirected to retry payment
```

### AC-PAY-002 — Refund

**Story:** US-CUST-027

```gherkin
Scenario: Full refund after return
  Given I returned an item and the return was approved
  When admin confirms receipt and inspection passes
  Then a refund is initiated to my original payment method
  And I receive an email confirming the refund amount

Scenario: Refund to original method only
  Given admin attempts to refund
  When admin selects an alternative payment method
  Then the system rejects the request
  And the refund remains on the original method
```

### AC-MFA-001 — Admin MFA Setup

**Story:** US-ADM-007

```gherkin
Scenario: First-time MFA setup
  Given I am a new admin user
  When I log in for the first time
  Then I am prompted to set up TOTP MFA
  And I cannot access admin pages until MFA is configured

Scenario: Login with MFA
  Given I have MFA configured
  When I log in with email + password
  Then I am prompted for the TOTP code
  And on valid code, I am granted admin access
```

### AC-MED-001 — Image Upload

**Story:** US-CAT-006

```gherkin
Scenario: Upload valid image
  Given I upload a 1200x1200 JPEG, 2 MB
  When the upload completes
  Then the image is stored in Cloudinary
  And thumbnail, card, and hero variants are auto-generated
  And the image is associated with the product

Scenario: Reject oversized image
  Given I upload a 7 MB image
  When I attempt to save
  Then the system rejects the upload
  And shows "Kích thước tối đa 5 MB"
```

### AC-ORD-001 — Order Status Timeline

**Story:** US-ORD-007

```gherkin
Scenario: View status history
  Given my order has transitioned through Pending, Confirmed, Shipped, Delivered
  When I open the order detail page
  Then I see a timeline of each transition with timestamp
  And I see the actor (System / Admin / Carrier)
```

### AC-ORD-002 — Auto-Completion

**Story:** US-ORD-008

```gherkin
Scenario: Auto-complete after 7 days
  Given my order was marked Delivered on 2026-07-01
  When 2026-07-08 arrives
  Then my order is auto-transitioned to Completed
  And I receive a confirmation email
```

### AC-GCH-001 — Guest Checkout

**Story:** US-GUEST-014

```gherkin
Scenario: Complete checkout without account
  Given I am a guest
  And I have items in my cart
  When I enter email, name, phone, address
  And I select shipping and payment
  And I complete payment
  Then an order is created with guestEmail set
  And customerId is null
  And I receive an order confirmation email
```

### AC-GCH-002 — Optional Account Creation at Checkout

**Story:** US-GUEST-015

```gherkin
Scenario: Create account at checkout
  Given I check "Tạo tài khoản với mật khẩu" during checkout
  When payment succeeds
  Then a customer account is created
  And my email is auto-verified
  And the order is linked to my new account
```

### AC-GCH-003 — Magic Link Tracking

**Story:** US-GUEST-016

```gherkin
Scenario: Track guest order via magic link
  Given I am a guest who placed an order
  When I click the tracking link in my email
  Then I see my order status without login
  And the link expires after 24 hours or single use
```

> **Note:** Cookie consent scenarios are covered by AC-AC-071g in §22.4.

---

## 25. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 0.1 | 2026-07-02 | Principal Business Analyst | Initial draft with 70+ Gherkin scenarios |
| 1.0 | 2026-07-03 | Architecture Review Board | Added 17 new scenarios (VAT x2, Inventory x4, Payment x2, MFA, Media x2, Order x2, Guest Checkout x3, Cookie); addressed REVIEW_REPORT.md RC-09 |

---

**End of Document — ACCEPTANCE_CRITERIA.md**
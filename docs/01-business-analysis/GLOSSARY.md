# SmartLight — Glossary

| Field | Value |
| --- | --- |
| **Document ID** | `BA-GLOSSARY-001` |
| **Document Owner** | Principal Business Analyst |
| **Status** | Draft — v0.1 |
| **Created Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2026-08-01 |
| **Classification** | Business Analysis — Authoritative |
| **Audience** | Engineering, Product, QA, Stakeholders, AI Agents |

> **Source of Truth:** This document defines every business term used in SmartLight. Definitions are aligned with `docs/00-governance/PROJECT_BLUEPRINT.md`, `SRS.md`, and `BUSINESS_RULES.md`.

---

## 1. Purpose

The Glossary is the **single source of truth for terminology** in SmartLight. It exists to:

1. Ensure consistent use of terms across engineering, product, QA, and stakeholders.
2. Remove ambiguity in requirements and code.
3. Serve as a reference for AI agents generating or interpreting artifacts.
4. Support onboarding of new team members.

---

## 2. Glossary Format

Each entry includes:

| Field | Description |
| --- | --- |
| **Term** | Canonical name |
| **Vietnamese** | Local language equivalent (where applicable) |
| **Definition** | Clear, concise meaning |
| **Context** | Where the term is used in SmartLight |
| **Example** | Optional clarifying example |
| **Related** | Cross-references to related terms |

---

## 3. A

### AOV (Average Order Value)

| Field | Value |
| --- | --- |
| **Vietnamese** | Giá trị đơn hàng trung bình |
| **Definition** | Total revenue divided by number of orders in a given period. |
| **Context** | KPI metric in admin dashboards. |
| **Example** | 100 orders totaling 50,000,000 VND → AOV = 500,000 VND. |
| **Related** | GMV, Conversion Rate |

### Admin

| Field | Value |
| --- | --- |
| **Vietnamese** | Quản trị viên |
| **Definition** | Internal staff member with elevated privileges to manage the platform. |
| **Context** | Distinct from Customer; accesses admin web app. |
| **Example** | Catalog Manager, Order Fulfillment Staff. |
| **Related** | RBAC, MFA, Role |

### Admin Panel

| Field | Value |
| --- | --- |
| **Vietnamese** | Trang quản trị |
| **Definition** | Internal web application used by staff to operate SmartLight. |
| **Context** | Separate from the customer storefront. |
| **Related** | Storefront |

### Anonymous User

| Field | Value |
| --- | --- |
| **Vietnamese** | Người dùng ẩn danh |
| **Definition** | See **Guest**. |
| **Related** | Guest |

### Audit Log

| Field | Value |
| --- | --- |
| **Vietnamese** | Nhật ký kiểm toán |
| **Definition** | Immutable record of sensitive operations, capturing actor, action, timestamp, and before/after values. |
| **Context** | Required by governance; cannot be edited or deleted. |
| **Related** | RBAC, Compliance |

### Authentication

| Field | Value |
| --- | --- |
| **Vietnamese** | Xác thực |
| **Definition** | Process of verifying the identity of a user. |
| **Context** | Implemented via email + password for customers; email + password + MFA for admins. |
| **Related** | Authorization, JWT, MFA |

### Authorization

| Field | Value |
| --- | --- |
| **Vietnamese** | Phân quyền |
| **Definition** | Process of determining what an authenticated user is allowed to do. |
| **Context** | Enforced via RBAC server-side. |
| **Related** | RBAC |

### Availability

| Field | Value |
| --- | --- |
| **Vietnamese** | Tính sẵn sàng |
| **Definition** | Percentage of time the system is operational and accessible. |
| **Context** | Target ≥ 99.5% monthly. |
| **Related** | SLA, RTO, RPO |

### Average Order Value

See **AOV**.

---

## 4. B

### Backorder

| Field | Value |
| --- | --- |
| **Vietnamese** | Đặt hàng trước |
| **Definition** | An order for a product currently out of stock, fulfilled when stock returns. |
| **Context** | Not supported in V1; reserved for future. |
| **Related** | Stock, Reservation |

### Brand

| Field | Value |
| --- | --- |
| **Vietnamese** | Thương hiệu |
| **Definition** | The maker or label of a product. |
| **Context** | Single brand (SmartLight's own label) in V1. |
| **Related** | Vendor |

### Bundle

| Field | Value |
| --- | --- |
| **Vietnamese** | Combo |
| **Definition** | A set of products sold together as a single SKU. |
| **Context** | Future extension. |
| **Related** | SKU, Variant |

### BOGO (Buy One Get One)

| Field | Value |
| --- | --- |
| **Vietnamese** | Mua một tặng một |
| **Definition** | Promotion where purchasing one item grants a discount or free item. |
| **Context** | Supported in promotions engine. |
| **Related** | Promotion, Flash Sale |

---

## 5. C

### Cart

| Field | Value |
| --- | --- |
| **Vietnamese** | Giỏ hàng |
| **Definition** | A collection of products a customer intends to purchase. |
| **Context** | Persisted for guests (30 days) and customers (indefinitely). |
| **Related** | Wishlist, Checkout |

### Cart Abandonment

| Field | Value |
| --- | --- |
| **Vietnamese** | Bỏ giỏ hàng |
| **Definition** | When a customer adds items to cart but does not complete checkout. |
| **Context** | KPI; target ≤ 70%. |
| **Related** | Conversion Rate |

### Cash on Delivery (COD)

| Field | Value |
| --- | --- |
| **Vietnamese** | Thanh toán khi nhận hàng |
| **Definition** | Payment method where the customer pays in cash upon delivery. |
| **Context** | Common in Vietnam; support optional via payment provider. |
| **Related** | Payment, Payment Provider |

### Category

| Field | Value |
| --- | --- |
| **Vietnamese** | Danh mục |
| **Definition** | A grouping of products, organized hierarchically up to 3 levels deep. |
| **Context** | Indoor Lighting → Ceiling Lights → Recessed Ceiling Lights. |
| **Related** | Product, Subcategory |

### CDN (Content Delivery Network)

| Field | Value |
| --- | --- |
| **Vietnamese** | Mạng phân phối nội dung |
| **Definition** | A distributed network of servers that deliver content with low latency. |
| **Context** | Cloudinary acts as CDN for product media. |
| **Related** | Cloudinary, Media |

### Checkout

| Field | Value |
| --- | --- |
| **Vietnamese** | Thanh toán |
| **Definition** | The process of completing a purchase: address, shipping, payment, review. |
| **Context** | Multi-step checkout (4 steps) in V1. |
| **Related** | Order, Payment |

### Cloudinary

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | Media management and CDN service used by SmartLight for product images and videos. |
| **Context** | Hosting, transformation, and delivery. |
| **Related** | CDN, Media |

### Confirmation Email

| Field | Value |
| --- | --- |
| **Vietnamese** | Email xác nhận |
| **Definition** | Email sent to confirm a transaction (order, registration, return). |
| **Context** | Sent in Vietnamese. |
| **Related** | Transactional Email |

### Conversion Rate

| Field | Value |
| --- | --- |
| **Vietnamese** | Tỷ lệ chuyển đổi |
| **Definition** | Percentage of sessions that result in a purchase. |
| **Context** | KPI; target ≥ 1.5%. |
| **Related** | AOV, GMV |

### Cookie Consent

| Field | Value |
| --- | --- |
| **Vietnamese** | Đồng ý cookie |
| **Definition** | User's explicit permission for non-essential cookies. |
| **Context** | Required by PDPD compliance. |
| **Related** | PDPD |

### Coupon

See **Voucher**.

### CRI (Color Rendering Index)

| Field | Value |
| --- | --- |
| **Vietnamese** | Chỉ số hoàn màu |
| **Definition** | Measure of a light source's ability to reveal colors of objects faithfully (0–100). |
| **Context** | Common technical specification for lighting products. |
| **Example** | CRI ≥ 90 considered high-quality for indoor lighting. |
| **Related** | Technical Specification |

### Customer

| Field | Value |
| --- | --- |
| **Vietnamese** | Khách hàng |
| **Definition** | A registered user who can place orders and manage their account. |
| **Context** | B2C and B2B customers; all are individual buyers in V1. |
| **Related** | Guest, Account |

### Customer Support

| Field | Value |
| --- | --- |
| **Vietnamese** | Hỗ trợ khách hàng |
| **Definition** | Internal function handling customer inquiries via tickets. |
| **Context** | Tickets linked to orders; first-response SLA 4 business hours. |
| **Related** | Ticket, SLA |

---

## 6. D

### Decimal

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | Fixed-precision numeric type used for monetary values. |
| **Context** | All VND values stored as Decimal(18, 2) or integer minor units; never floats. |
| **Related** | VND, Money |

### Discount

| Field | Value |
| --- | --- |
| **Vietnamese** | Giảm giá |
| **Definition** | A reduction in price, applied via promotion or voucher. |
| **Context** | Percentage or fixed amount; ceiling cannot exceed subtotal. |
| **Related** | Promotion, Voucher |

### Draft

| Field | Value |
| --- | --- |
| **Vietnamese** | Bản nháp |
| **Definition** | A product not yet published to the storefront. |
| **Context** | Visible only in admin. |
| **Related** | Product Status |

---

## 7. E

### E-Invoice

| Field | Value |
| --- | --- |
| **Vietnamese** | Hóa đơn điện tử |
| **Definition** | A digital invoice compliant with Vietnamese tax authority requirements. |
| **Context** | Future integration; PDF invoices in V1. |
| **Related** | Invoice |

### Email Verification

| Field | Value |
| --- | --- |
| **Vietnamese** | Xác minh email |
| **Definition** | Confirmation that an email address is valid and accessible by its owner. |
| **Context** | Required before first order placement. |
| **Related** | Registration |

### Exclusive Promotion

| Field | Value |
| --- | --- |
| **Vietnamese** | Khuyến mãi độc quyền |
| **Definition** | A promotion that cannot combine with any other. |
| **Context** | Stacking rules. |
| **Related** | Stacking, Promotion |

### Express Shipping

| Field | Value |
| --- | --- |
| **Vietnamese** | Giao hàng nhanh |
| **Definition** | A faster shipping option with higher fees. |
| **Context** | Carrier-dependent; configuration per zone. |
| **Related** | Shipping, Carrier |

---

## 8. F

### FAQ

| Field | Value |
| --- | --- |
| **Vietnamese** | Câu hỏi thường gặp |
| **Definition** | Frequently Asked Questions, displayed as static content. |
| **Context** | Static page editable in admin. |
| **Related** | Static Page |

### Featured Product

| Field | Value |
| --- | --- |
| **Vietnamese** | Sản phẩm nổi bật |
| **Definition** | A product highlighted on the storefront. |
| **Context** | Curated by Catalog Manager. |
| **Related** | Product |

### First Response Time

| Field | Value |
| --- | --- |
| **Vietnamese** | Thời gian phản hồi đầu tiên |
| **Definition** | Time from ticket creation to first agent response. |
| **Context** | SLA target: 4 business hours. |
| **Related** | SLA, Support |

### Flash Sale

| Field | Value |
| --- | --- |
| **Vietnamese** | Flash Sale / Khuyến mãi chớp nhoáng |
| **Definition** | A time-bound promotion creating urgency with a countdown. |
| **Context** | Per-customer limit enforced (default 2 units). |
| **Related** | Promotion |

### Fulfillment

| Field | Value |
| --- | --- |
| **Vietnamese** | Hoàn tất đơn hàng |
| **Definition** | The process of picking, packing, and shipping orders. |
| **Context** | Performed by Order Fulfillment Staff. |
| **Related** | Picklist, Shipping |

---

## 9. G

### GDPR

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | EU General Data Protection Regulation. |
| **Context** | Not directly applicable in Vietnam, but principles inform PDPD compliance. |
| **Related** | PDPD |

### GMV (Gross Merchandise Value)

| Field | Value |
| --- | --- |
| **Vietnamese** | Tổng giá trị hàng hóa |
| **Definition** | Total value of goods sold over a period. |
| **Context** | Top-line business KPI. |
| **Related** | AOV |

### Guest

| Field | Value |
| --- | --- |
| **Vietnamese** | Khách vãng lai |
| **Definition** | An unauthenticated user browsing the storefront. |
| **Context** | Can browse, add to cart, register; cannot place order without checkout account. |
| **Related** | Customer |

### Guest Checkout

| Field | Value |
| --- | --- |
| **Vietnamese** | Thanh toán không cần tài khoản |
| **Definition** | Checkout flow that does not require account creation. |
| **Context** | Email required; account created post-purchase with verification. |
| **Related** | Checkout, Customer |

---

## 10. H

### Hero Banner

| Field | Value |
| --- | --- |
| **Vietnamese** | Biểu ngữ chính |
| **Definition** | The main promotional banner displayed on the homepage. |
| **Context** | Editable by Marketing Staff. |
| **Related** | CMS, Static Page |

### HTTPS

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | HTTP over TLS, providing encrypted communication. |
| **Context** | Enforced everywhere; HSTS enabled. |
| **Related** | TLS, HSTS |

---

## 11. I

### Identity

| Field | Value |
| --- | --- |
| **Vietnamese** | Định danh |
| **Definition** | The module responsible for user accounts, authentication, and addresses. |
| **Context** | Bounded context. |
| **Related** | Account, Authentication |

### Image

| Field | Value |
| --- | --- |
| **Vietnamese** | Hình ảnh |
| **Definition** | A visual representation of a product. |
| **Context** | Stored in Cloudinary; multiple per product. |
| **Related** | Media |

### Integration

| Field | Value |
| --- | --- |
| **Vietnamese** | Tích hợp |
| **Definition** | Connection to an external system (payment, shipping, email). |
| **Context** | All external integrations must be abstracted for testability. |
| **Related** | Payment Gateway, Carrier |

### Inventory

| Field | Value |
| --- | --- |
| **Vietnamese** | Tồn kho |
| **Definition** | Stock on hand for each product variant. |
| **Context** | Decremented at order creation; reserved during cart and checkout. |
| **Related** | Stock, Reservation |

### IP Rating

| Field | Value |
| --- | --- |
| **Vietnamese** | Cấp bảo vệ IP |
| **Definition** | Ingress Protection rating (e.g., IP65) defining dust/water resistance. |
| **Context** | Common technical specification for outdoor lighting. |
| **Related** | Technical Specification |

---

## 12. J

### JWT (JSON Web Token)

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | A signed token used for stateless authentication. |
| **Context** | Access tokens (short-lived) + refresh tokens (rotated). |
| **Related** | Authentication, OAuth |

---

## 13. L

### LCP (Largest Contentful Paint)

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | Web performance metric measuring when the largest visible content renders. |
| **Context** | Target < 2.5s on 4G. |
| **Related** | Web Vitals |

### Lead Time

| Field | Value |
| --- | --- |
| **Vietnamese** | Thời gian xử lý |
| **Definition** | Time from order placement to dispatch. |
| **Context** | Target ≤ 24 hours. |
| **Related** | Fulfillment |

### Locale

| Field | Value |
| --- | --- |
| **Vietnamese** | Ngôn ngữ |
| **Definition** | A combination of language and regional settings. |
| **Context** | Default `vi-VN`; architecture ready for additional locales. |
| **Related** | i18n |

### Loyalty

| Field | Value |
| --- | --- |
| **Vietnamese** | Khách hàng thân thiết |
| **Definition** | Program rewarding repeat purchases. |
| **Context** | V2 feature. |
| **Related** | Customer |

---

## 14. M

### Marketing Email

| Field | Value |
| --- | --- |
| **Vietnamese** | Email tiếp thị |
| **Definition** | Promotional email sent to opted-in customers. |
| **Context** | Opt-in required; max 1 per day per customer. |
| **Related** | Transactional Email |

### Marketplace

| Field | Value |
| --- | --- |
| **Vietnamese** | Sàn thương mại |
| **Definition** | A platform enabling multiple sellers to sell to customers. |
| **Context** | V2; not in V1. |
| **Related** | Vendor, Single-Vendor |

### Media

| Field | Value |
| --- | --- |
| **Vietnamese** | Phương tiện |
| **Definition** | Images and videos for products and content. |
| **Context** | Managed via Cloudinary. |
| **Related** | Cloudinary, Image |

### Merchant

See **Vendor**.

### MFA (Multi-Factor Authentication)

| Field | Value |
| --- | --- |
| **Vietnamese** | Xác thực đa yếu tố |
| **Definition** | Authentication requiring two or more factors. |
| **Context** | Mandatory for all admin accounts (TOTP). |
| **Related** | Authentication |

### Mobile (Web)

| Field | Value |
| --- | --- |
| **Vietnamese** | Di động |
| **Definition** | Browsing SmartLight on mobile devices. |
| **Context** | Mobile-responsive storefront; native apps in V1.5+. |
| **Related** | Storefront |

### Module

| Field | Value |
| --- | --- |
| **Vietnamese** | Mô-đun |
| **Definition** | A bounded context in the modular monolith. |
| **Context** | Identity, Catalog, Cart, Checkout, Order, Shipping, etc. |
| **Related** | Bounded Context |

---

## 15. N

### Notification

| Field | Value |
| --- | --- |
| **Vietnamese** | Thông báo |
| **Definition** | Communication sent to user (email, SMS, push). |
| **Context** | Email-only in V1. |
| **Related** | Email |

### NPS (Net Promoter Score)

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | Customer loyalty metric based on likelihood to recommend. |
| **Context** | Target ≥ 40. |
| **Related** | Customer Satisfaction |

---

## 16. O

### OAuth

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | Industry-standard authorization framework. |
| **Context** | Foundation for JWT flows; not used for external logins in V1. |
| **Related** | JWT |

### Open Graph

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | Metadata standard for social sharing previews. |
| **Context** | All PDPs render Open Graph tags. |
| **Related** | SEO |

### Order

| Field | Value |
| --- | --- |
| **Vietnamese** | Đơn hàng |
| **Definition** | A customer's commitment to purchase, with status tracking. |
| **Context** | Created upon successful payment. |
| **Related** | Checkout |

### Order Number

| Field | Value |
| --- | --- |
| **Vietnamese** | Số đơn hàng |
| **Definition** | Unique identifier for an order. |
| **Context** | Format: `SL-YYYYMMDD-XXXXX`. |
| **Example** | `SL-20260702-00012` |
| **Related** | Order |

---

## 17. P

### PDPD (Personal Data Protection Decree)

| Field | Value |
| --- | --- |
| **Vietnamese** | Nghị định bảo vệ dữ liệu cá nhân |
| **Definition** | Vietnamese regulation governing personal data handling. |
| **Context** | Compliance required for all data processing. |
| **Related** | Compliance, Cookie Consent |

### Payment

| Field | Value |
| --- | --- |
| **Vietnamese** | Thanh toán |
| **Definition** | Settlement of an order via a payment method. |
| **Context** | Processed by Vietnamese providers. |
| **Related** | Payment Gateway |

### Payment Gateway

| Field | Value |
| --- | --- |
| **Vietnamese** | Cổng thanh toán |
| **Definition** | Third-party service that processes payments (e.g., VNPay, MoMo, ZaloPay). |
| **Context** | PCI scope minimized via tokenization. |
| **Related** | PCI-DSS |

### PCI-DSS

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | Payment Card Industry Data Security Standard. |
| **Context** | SmartLight minimizes scope via tokenization. |
| **Related** | Payment |

### Picklist

| Field | Value |
| --- | --- |
| **Vietnamese** | Phiếu lấy hàng |
| **Definition** | A printed document listing items to pick for an order. |
| **Context** | Generated per order for warehouse fulfillment. |
| **Related** | Fulfillment |

### PII (Personally Identifiable Information)

| Field | Value |
| --- | --- |
| **Vietnamese** | Thông tin cá nhân nhận dạng |
| **Definition** | Data that can identify a specific individual. |
| **Context** | Access logged; never written to logs or analytics. |
| **Related** | PDPD |

### Product

| Field | Value |
| --- | --- |
| **Vietnamese** | Sản phẩm |
| **Definition** | A sellable item with variants, attributes, and pricing. |
| **Context** | Belongs to category, brand (single in V1). |
| **Related** | SKU, Variant |

### Product Listing

| Field | Value |
| --- | --- |
| **Vietnamese** | Danh sách sản phẩm |
| **Definition** | A page displaying multiple products with filtering and sorting. |
| **Context** | PLP. |
| **Related** | Catalog |

### Promotion

| Field | Value |
| --- | --- |
| **Vietnamese** | Khuyến mãi |
| **Definition** | A discount mechanism with eligibility, time bounds, and usage rules. |
| **Context** | Percentage, fixed, BOGO, tiered. |
| **Related** | Voucher, Flash Sale |

---

## 18. Q

### QA (Quality Assurance)

| Field | Value |
| --- | --- |
| **Vietnamese** | Đảm bảo chất lượng |
| **Definition** | Activities ensuring software meets requirements and is defect-free. |
| **Context** | Acceptance criteria in `ACCEPTANCE_CRITERIA.md` define what QA verifies. |
| **Related** | Definition of Done |

### Quantity

| Field | Value |
| --- | --- |
| **Vietnamese** | Số lượng |
| **Definition** | Number of units of a product variant in cart or order. |
| **Context** | Max 99 per line item. |
| **Related** | Cart |

---

## 19. R

### RBAC (Role-Based Access Control)

| Field | Value |
| --- | --- |
| **Vietnamese** | Phân quyền theo vai trò |
| **Definition** | Access control based on roles assigned to users. |
| **Context** | Enforced server-side for all admin functions. |
| **Related** | Role, Authorization |

### Refund

| Field | Value |
| --- | --- |
| **Vietnamese** | Hoàn tiền |
| **Definition** | Returning money to a customer, full or partial. |
| **Context** | Issued to original payment method. |
| **Related** | Return |

### Repeat Purchase Rate

| Field | Value |
| --- | --- |
| **Vietnamese** | Tỷ lệ mua lại |
| **Definition** | Percentage of customers who make a second purchase. |
| **Context** | Target ≥ 20%. |
| **Related** | Customer Retention |

### Reservation

| Field | Value |
| --- | --- |
| **Vietnamese** | Giữ chỗ |
| **Definition** | Temporary stock hold during cart or checkout. |
| **Context** | 15-minute window; released on inactivity. |
| **Related** | Inventory |

### Return

| Field | Value |
| --- | --- |
| **Vietnamese** | Trả hàng |
| **Definition** | A customer-initiated request to send back delivered goods. |
| **Context** | Window: 7 days; requires RMA. |
| **Related** | RMA, Refund |

### Return Merchandise Authorization (RMA)

| Field | Value |
| --- | --- |
| **Vietnamese** | Mã ủy quyền trả hàng |
| **Definition** | A unique identifier for an approved return. |
| **Context** | Required on return shipment. |
| **Related** | Return |

### Review

| Field | Value |
| --- | --- |
| **Vietnamese** | Đánh giá |
| **Definition** | Customer feedback on a product, including star rating and text. |
| **Context** | Verified purchasers only; moderated before publishing. |
| **Related** | Rating |

### Role

| Field | Value |
| --- | --- |
| **Vietnamese** | Vai trò |
| **Definition** | A named set of permissions assigned to admin users. |
| **Context** | Catalog Manager, Order Fulfillment Staff, etc. |
| **Related** | RBAC |

### RPO (Recovery Point Objective)

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | Maximum acceptable data loss measured in time. |
| **Context** | Target ≤ 1 hour. |
| **Related** | RTO, Backup |

### RTO (Recovery Time Objective)

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | Maximum acceptable downtime after a disaster. |
| **Context** | Target ≤ 4 hours. |
| **Related** | RPO |

---

## 20. S

### Sales Channel

| Field | Value |
| --- | --- |
| **Vietnamese** | Kênh bán hàng |
| **Definition** | A medium through which sales occur. |
| **Context** | Single channel (web storefront) in V1. |
| **Related** | Storefront |

### Search

| Field | Value |
| --- | --- |
| **Vietnamese** | Tìm kiếm |
| **Definition** | User-initiated product discovery by keyword. |
| **Context** | Full-text on name, description, SKU, brand. |
| **Related** | Filter |

### SEO (Search Engine Optimization)

| Field | Value |
| --- | --- |
| **Vietnamese** | Tối ưu hóa công cụ tìm kiếm |
| **Definition** | Practices to improve visibility in search engines. |
| **Context** | SEO-friendly URLs, structured data, sitemap, meta tags. |
| **Related** | Sitemap, JSON-LD |

### Shipment

| Field | Value |
| --- | --- |
| **Vietnamese** | Lô hàng |
| **Definition** | A package sent to a customer via a carrier. |
| **Context** | One order may have multiple shipments. |
| **Related** | Shipping |

### Shipping

| Field | Value |
| --- | --- |
| **Vietnamese** | Vận chuyển |
| **Definition** | The process of delivering orders to customers. |
| **Context** | Calculated by zone, weight, carrier. |
| **Related** | Carrier, Tracking |

### Shipping Carrier

| Field | Value |
| --- | --- |
| **Vietnamese** | Đơn vị vận chuyển |
| **Definition** | A logistics company that handles delivery (e.g., GHN, GHTK, Viettel Post). |
| **Context** | At least one integrated; multiple supported. |
| **Related** | Shipping |

### Shipping Zone

| Field | Value |
| --- | --- |
| **Vietnamese** | Vùng vận chuyển |
| **Definition** | A geographic area with shared shipping rates. |
| **Context** | Configured per province/region. |
| **Related** | Shipping |

### Shopping Cart

See **Cart**.

### Single-Vendor

| Field | Value |
| --- | --- |
| **Vietnamese** | Nhà cung cấp duy nhất |
| **Definition** | Business model where the platform owner is the sole seller. |
| **Context** | SmartLight V1 model. |
| **Related** | Marketplace |

### SKU (Stock Keeping Unit)

| Field | Value |
| --- | --- |
| **Vietnamese** | Mã hàng hóa |
| **Definition** | A unique identifier for a product variant. |
| **Context** | Alphanumeric, uppercase, 6–32 chars, globally unique. |
| **Example** | `SL-RC-9W-3K-BK` |
| **Related** | Product, Variant |

### SLA (Service Level Agreement)

| Field | Value |
| --- | --- |
| **Vietnamese** | Cam kết mức dịch vụ |
| **Definition** | A commitment on service quality (uptime, response time). |
| **Context** | First response: 4 business hours; uptime: 99.5%. |
| **Related** | Support |

### Static Page

| Field | Value |
| --- | --- |
| **Vietnamese** | Trang tĩnh |
| **Definition** | Content page that does not change frequently (About, Terms, Privacy). |
| **Context** | Editable by Marketing Staff. |
| **Related** | CMS |

### Stock

| Field | Value |
| --- | --- |
| **Vietnamese** | Tồn kho |
| **Definition** | Available quantity of a product variant. |
| **Context** | Decremented on order creation. |
| **Related** | Inventory |

### Storefront

| Field | Value |
| --- | --- |
| **Vietnamese** | Cửa hàng trực tuyến |
| **Definition** | The customer-facing web application. |
| **Context** | Separate from admin app. |
| **Related** | Admin Panel |

### Support Ticket

See **Ticket**.

---

## 21. T

### Tax / VAT

| Field | Value |
| --- | --- |
| **Vietnamese** | Thuế VAT |
| **Definition** | Vietnamese Value-Added Tax applied to goods. |
| **Context** | Shown as separate line on invoices; compliant with tax regulations. |
| **Related** | Invoice |

### Technical Specification

| Field | Value |
| --- | --- |
| **Vietnamese** | Thông số kỹ thuật |
| **Definition** | Structured data describing a product's technical attributes. |
| **Context** | Lumen, wattage, CRI, IP rating, voltage, dimensions. |
| **Related** | Product |

### Ticket

| Field | Value |
| --- | --- |
| **Vietnamese** | Phiếu hỗ trợ |
| **Definition** | A support request submitted by a customer. |
| **Context** | Linked to orders; status flow Open → Pending → Resolved → Closed. |
| **Related** | Support |

### Tracking Number

| Field | Value |
| --- | --- |
| **Vietnamese** | Mã vận đơn |
| **Definition** | Carrier-issued identifier for a shipment. |
| **Context** | Surfaced to customers; synced via webhook. |
| **Related** | Shipment |

### Transactional Email

| Field | Value |
| --- | --- |
| **Vietnamese** | Email giao dịch |
| **Definition** | Non-promotional email triggered by user actions. |
| **Context** | Always sent; opt-out not allowed. |
| **Related** | Marketing Email |

### TTL (Time To Live)

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | Duration a cached value is valid. |
| **Context** | Applied to Redis cache entries. |
| **Related** | Cache |

---

## 22. U

### UI (User Interface)

| Field | Value |
| --- | --- |
| **Vietnamese** | Giao diện người dùng |
| **Definition** | The visual and interactive layer of the application. |
| **Context** | Built with React + TypeScript + Tailwind + shadcn/ui. |
| **Related** | UX |

### URL Slug

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | Human-readable URL segment. |
| **Context** | Used for product and category pages. |
| **Example** | `/products/den-am-tran-9w-vang` |
| **Related** | SEO |

### UTC (Coordinated Universal Time)

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | The time standard used for stored timestamps. |
| **Context** | Display in `Asia/Ho_Chi_Minh`. |
| **Related** | Time Zone |

### UX (User Experience)

| Field | Value |
| --- | --- |
| **Vietnamese** | Trải nghiệm người dùng |
| **Definition** | The overall experience of using the product. |
| **Context** | Accessibility, responsiveness, simplicity. |
| **Related** | UI |

---

## 23. V

### Variant

| Field | Value |
| --- | --- |
| **Vietnamese** | Phiên bản |
| **Definition** | A specific combination of product attributes (color, wattage, etc.). |
| **Context** | Each variant has its own SKU, price, stock. |
| **Example** | Color: Black, Wattage: 12W → unique SKU. |
| **Related** | Product, SKU |

### Vendor

| Field | Value |
| --- | --- |
| **Vietnamese** | Nhà cung cấp |
| **Definition** | The entity selling products on the platform. |
| **Context** | Single vendor (SmartLight) in V1; multiple in V2 marketplace. |
| **Related** | Single-Vendor, Marketplace |

### VND (Vietnamese Đồng)

| Field | Value |
| --- | --- |
| **Vietnamese** | Đồng Việt Nam |
| **Definition** | The official currency of Vietnam. |
| **Context** | Only currency accepted in V1. |
| **Example** | 1,000,000 VND |
| **Related** | Currency |

### Voucher

| Field | Value |
| --- | --- |
| **Vietnamese** | Mã giảm giá |
| **Definition** | A code that, when applied, grants a discount. |
| **Context** | Unique per promotion; case-insensitive. |
| **Example** | `SUMMER10`, `FREESHIP` |
| **Related** | Promotion |

---

## 24. W

### Warehouse

| Field | Value |
| --- | --- |
| **Vietnamese** | Kho |
| **Definition** | A physical location where stock is stored. |
| **Context** | Stock tracked per warehouse; default warehouse in V1. |
| **Related** | Inventory |

### Warranty

| Field | Value |
| --- | --- |
| **Vietnamese** | Bảo hành |
| **Definition** | A commitment to repair or replace defective products within a period. |
| **Context** | Per-product terms; tracked via warranty claims. |
| **Related** | Return |

### Webhook

| Field | Value |
| --- | --- |
| **Vietnamese** | — |
| **Definition** | An HTTP callback sent by an external system in response to events. |
| **Context** | Used for payment, shipping, and email status updates. |
| **Related** | Integration |

### Wishlist

| Field | Value |
| --- | --- |
| **Vietnamese** | Danh sách yêu thích |
| **Definition** | A saved list of products a customer wants to consider later. |
| **Context** | Limit: 200 items per customer. |
| **Related** | Cart |

---

## 25. Acronyms and Abbreviations

| Acronym | Meaning | Vietnamese |
| --- | --- | --- |
| AOV | Average Order Value | Giá trị đơn hàng trung bình |
| API | Application Programming Interface | Giao diện lập trình ứng dụng |
| ADR | Architecture Decision Record | Bản ghi quyết định kiến trúc |
| CDN | Content Delivery Network | Mạng phân phối nội dung |
| CI/CD | Continuous Integration / Continuous Deployment | Tích hợp liên tục / Triển khai liên tục |
| COD | Cash on Delivery | Thanh toán khi nhận hàng |
| CRM | Customer Relationship Management | Quản lý quan hệ khách hàng |
| CRO | Conversion Rate Optimization | Tối ưu tỷ lệ chuyển đổi |
| CTA | Call To Action | Lời kêu gọi hành động |
| DI | Dependency Injection | Tiêm phụ thuộc |
| DoD | Definition of Done | Định nghĩa hoàn thành |
| DTO | Data Transfer Object | Đối tượng truyền dữ liệu |
| GDPR | General Data Protection Regulation | Quy định bảo vệ dữ liệu chung (EU) |
| GMV | Gross Merchandise Value | Tổng giá trị hàng hóa |
| HSTS | HTTP Strict Transport Security | Bảo mật truyền tải HTTP nghiêm ngặt |
| IP | Ingress Protection | Cấp bảo vệ chống xâm nhập |
| IP | Intellectual Property | Sở hữu trí tuệ |
| JWT | JSON Web Token | Token web JSON |
| KPI | Key Performance Indicator | Chỉ số hiệu suất chính |
| LCP | Largest Contentful Paint | — |
| MFA | Multi-Factor Authentication | Xác thực đa yếu tố |
| NFR | Non-Functional Requirement | Yêu cầu phi chức năng |
| NPS | Net Promoter Score | — |
| OWASP | Open Web Application Security Project | — |
| PCI-DSS | Payment Card Industry Data Security Standard | Tiêu chuẩn bảo mật dữ liệu thẻ thanh toán |
| PDPD | Personal Data Protection Decree (Vietnam) | Nghị định bảo vệ dữ liệu cá nhân |
| PII | Personally Identifiable Information | Thông tin cá nhân nhận dạng |
| PRD | Product Requirements Document | Tài liệu yêu cầu sản phẩm |
| RBAC | Role-Based Access Control | Phân quyền theo vai trò |
| RMA | Return Merchandise Authorization | Ủy quyền trả hàng |
| RPO | Recovery Point Objective | Mục tiêu điểm khôi phục |
| RTO | Recovery Time Objective | Mục tiêu thời gian khôi phục |
| SEO | Search Engine Optimization | Tối ưu hóa công cụ tìm kiếm |
| SLA | Service Level Agreement | Cam kết mức dịch vụ |
| SKU | Stock Keeping Unit | Mã hàng hóa |
| SRS | Software Requirements Specification | Đặc tả yêu cầu phần mềm |
| SSL | Secure Sockets Layer | — |
| TOTP | Time-Based One-Time Password | Mật khẩu một lần theo thời gian |
| TTL | Time To Live | Thời gian sống |
| UI | User Interface | Giao diện người dùng |
| URL | Uniform Resource Locator | Định vị tài nguyên thống nhất |
| UX | User Experience | Trải nghiệm người dùng |
| VAT | Value Added Tax | Thuế giá trị gia tăng |
| VND | Vietnamese Đồng | Đồng Việt Nam |
| WCAG | Web Content Accessibility Guidelines | Hướng dẫn truy cập nội dung web |

---

## 26. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 0.1 | 2026-07-02 | Principal Business Analyst | Initial draft with 100+ business terms and acronyms |

---

**End of Document — GLOSSARY.md**
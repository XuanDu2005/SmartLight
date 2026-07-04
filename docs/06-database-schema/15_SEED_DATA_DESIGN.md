# 15 — Seed Data Design

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04
**Author:** Principal Database Architect

---

## 1. Purpose

This document defines **seed data design** (NOT the implementation):

- What data is required at install time
- Per-environment policy (dev/staging/prod)
- How seed relates to migrations
- Determinism rules

It is the **design contract** for seed scripts. Implementation lives in the implementation phase.

---

## 2. Goals

| Goal | Detail |
|---|---|
| Reproducible | Same seed → same DB state across machines (where reasonable) |
| Deterministic IDs | Seeded entities use stable, predictable IDs |
| Idempotent | Re-running does not duplicate |
| Environment-aware | Dev has more sample data; prod has minimal |
| Fast | Seed ≤ 30 s dev |
| Auditable | Print summary after seed run |

---

## 3. Environment Matrix

| Env | Seed Type | Notes |
|---|---|---|
| `local` | Full dev seed (categories, brands, products, users, sample carts/orders) | Loaded into developer DB |
| `preview` | Minimal seed (super admin, brand, sample product, sample order) | Quick preview verification |
| `staging` | Realistic sample (every ~100 products, orders spanning 30 days) | Mirrors prod |
| `production` | Minimal: 1 super admin, base tax rate, shipping zone skeleton, no sample orders | Created by `bootstrap.ts` only |
| `test` (CI) | Per-fixture (jest/pytest setup) | Clean DB per suite |

---

## 4. Required Seed Data (All Envs)

### 4.1 Permission Catalog

The **complete permission catalog** is seeded (`tbl: permission`). Source of truth = `docs/05-software-architecture/07_AUTHORIZATION_ARCHITECTURE.md`.

```yaml
permissions:
  - code: catalog.product.read
    category: catalog
    displayName: Xem sản phẩm
    description: View catalog products
  # ... (everything listed in ARCHITECTURE §07)
```

~ 60 permissions.

### 4.2 System Roles

```yaml
roles:
  - code: super_admin
    scope: SYSTEM
    displayName: Super Admin
    description: Toàn quyền
    permissions: [*]   # all
  - code: catalog_manager
    scope: SYSTEM
    displayName: Quản lý catalog
    permissions: [catalog.*]
  # ...
```

~ 6 system roles.

### 4.3 Super Admin User

A single super admin (created ONLY on first run; rotated via env vars):

```
email: env.SUPER_ADMIN_EMAIL
password: env.SUPER_ADMIN_PASSWORD  (Argon2id hashed on insert)
displayName: "SmartLight Super Admin"
status: ACTIVE
MFA: required; setup TOTP at first login
```

### 4.4 Tax Rate

```yaml
tax_rates:
  - code: VAT-VN-10
    name: VAT 10%
    ratePercent: 10.00
    isDefault: true
    isActive: true
    effectiveFrom: 2024-01-01T00:00:00Z
```

### 4.5 Vietnam Provinces

Seed script reads from `data/vietnam-provinces.json` and inserts into the province dictionary used by `Address`.

> Source: Vietnam General Statistics Office or internal CSV.
> Provinces used in API responses via `system_config` table.

### 4.6 Categories (Dev only)

```yaml
dev_categories:
  - root: Đèn trần (ceiling lights)
    children:
      - Đèn LED âm trần
      - Đèn LED ốp trần
      - Đèn chùm
  - root: Đèn tường (wall lights)
  - root: Đèn bàn
  - root: Đèn ngoài trời
  - root: Phụ kiện
```

### 4.7 Brands (Dev only)

```yaml
dev_brands:
  - Philips
  - Rạng Đông
  - Điện Quang
  - Panasonic
  - Osram
  - Xiaomi Yeelight
```

### 4.8 Shipping Zone Skeleton

```yaml
shipping_zones:
  - code: HANOI
    name: Hà Nội
    provinceCodes: [01, 02, …]
  - code: HCM
    name: TP Hồ Chí Minh
  - code: NATIONAL
    name: Toàn quốc
    provinceCodes: []  # wildcard
```

Each zone seeded with at least 1 rate per carrier.

### 4.9 Email Templates (Vi-VN)

All `EmailTemplate.code` rows seeded with `locale=VI, version=1`:

- `welcome`
- `email_verification`
- `password_reset`
- `order_confirmation`
- `order_paid`
- `order_shipped`
- `order_delivered`
- `order_cancelled`
- `refund_issued`
- `return_received`
- `low_stock_alert`
- `review_request`
- `mfa_enabled`
- `mfa_disabled`
- `support_ticket_reply`

EN-locale templates seeded in V1.5 (no longer required for MVP).

### 4.10 Static Pages

```yaml
static_pages:
  - slug: about
    title: Về SmartLight
    isPublished: true
  - slug: terms
    title: Điều khoản sử dụng
    isPublished: true
  - slug: privacy
    title: Chính sách bảo mật
    isPublished: true
  - slug: return-policy
    title: Chính sách đổi trả
    isPublished: true
  - slug: shipping-policy
    title: Chính sách vận chuyển
    isPublished: true
```

### 4.11 Feature Flags (Defaults)

```yaml
feature_flags:
  - key: enable.product_reviews
    defaultValue: true
    valueType: BOOLEAN
  - key: enable.guest_checkout
    defaultValue: true
    valueType: BOOLEAN
  - key: enable.coupons
    defaultValue: true
    valueType: BOOLEAN
  - key: enable.gift_wrapping
    defaultValue: false
    valueType: BOOLEAN
  - key: enable.mfa_for_customers
    defaultValue: false
    valueType: BOOLEAN
```

### 4.12 System Config (Defaults)

```yaml
system_config:
  - key: site.name
    value: { value: "SmartLight" }
    isSecret: false
  - key: site.support_email
    value: { value: "support@smartlight.vn" }
  - key: orders.expire_pending_minutes
    value: { value: 60 }
  - key: cart.expire_days
    value: { value: 30 }
  - key: cart.reservation_minutes
    value: { value: 15 }
  - key: checkout.session_minutes
    value: { value: 15 }
  - key: payments.providers.vnpay.enabled
    value: { value: true }
    isSecret: false
  # provider secrets seeded separately (env-only) — never in JSON
```

### 4.13 Outbox Dispatcher Config

```yaml
system_config:
  - key: outbox.batch_size
    value: { value: 50 }
  - key: outbox.poll_interval_ms
    value: { value: 1000 }
```

---

## 5. Sample Data (Dev Only)

> Sample data is **never** seeded into production.

### 5.1 Sample Users

```yaml
dev_users:
  - email: alice@example.com
    firstName: Alice
    lastName: Nguyễn
    phone: 0987654321
    acceptsMarketing: true
    verified: true
  - email: bob@example.com
    firstName: Bob
    lastName: Trần
    verified: true
  - email: charlie@example.com
    firstName: Charlie
    verified: false
```

### 5.2 Sample Catalog

```yaml
dev_products:
  count_per_top_category: 20
  brands_each: 6
  variants_per_product: 1..4
  images_per_product: 1..5
  price_range: 50_000..5_000_000     # VND
```

### 5.3 Sample Carts & Orders

```yaml
dev_cart_for_alice: 3 items
dev_order_for_alice:
  - paid
  - shipped
  - delivered
dev_order_for_bob:
  - pending
  - cancelled
```

### 5.4 Sample Reviews

Per published product, 1-3 reviews. 50 products gets reviews.

### 5.5 Sample Tax-Exempt Categories (for testing)

- One category marked VAT exempt for QA flows.

---

## 6. Test Fixtures (CI)

Each test suite seeds its slice:

| Test | Tables seeded |
|---|---|
| Auth | `user`, `admin_user`, `mfa_secret`, `refresh_token` |
| Catalog | `category`, `brand`, `product`, `product_variant` |
| Cart | `cart`, `cart_item`, `product_variant`, `inventory` |
| Checkout | full above + `coupon`, `tax_rate` |
| Order | `order`, `order_item`, `order_address`, `payment` |
| Reviews | `review` |
| Support | `support_ticket`, `ticket_message` |

Test seed uses **transactional truncate** (`TRUNCATE … CASCADE` per test), with autoincrement reset.

---

## 7. Determinism

| Aspect | Determinism strategy |
|---|---|
| IDs | Stable, hashed from seed key (e.g., `seed_alice_user_id = hash('user:alice:dev')`) |
| Dates | Relative to `now()` so seed is reproducible at any point in time |
| Content | Curated samples in `dev/` YAML files; version-controlled |
| Sequence | Idempotent: `INSERT … ON CONFLICT DO NOTHING` |

---

## 8. Seed Pipeline Steps

```
1. Truncate (dev/preview only — never prod)
2. Apply migrations (`prisma migrate deploy`)
3. Run role migrations (RBAC permissions, system roles)
4. Seed required data: tax, super admin, province dictionary
5. Seed feature flags + system config
6. Seed shipping zones + rates
7. (dev only) Seed sample catalog, users, orders
8. Compute aggregates (Materialized views in V1.5)
9. `ANALYZE` tables
10. Report summary
```

---

## 9. Seed Auditability

After seed, log:

```
✅ Seeded 64 permissions
✅ Seeded 6 roles
✅ Created super admin
✅ Seeded 1 default tax rate (VAT-VN-10 10%)
✅ Seeded 63 provinces
✅ Seeded 5 categories (dev)
✅ Seeded 6 brands (dev)
✅ Seeded 120 products (dev)
✅ Seeded 5 orders (dev)
⏱  Elapsed: 1.42s
```

---

## 10. Seed Re-run Policy

| Env | Re-run policy |
|---|---|
| dev | Truncate → full seed |
| preview | Skip if already seeded |
| staging | Skip if data drift detected |
| prod | **Never automatic**; super admin bootstrap only |

---

## 11. Anti-Patterns

| Anti-pattern | Why bad |
|---|---|
| Seed real user PII in dev | Compliance breach |
| Seed large data in CI | Slow |
| Seed duplicates on rerun | Hard to debug |
| Hard-coded IDs | Breaks future fixtures |
| Insert into active / production from seed | Manual error → always guard |
| Sync write of thousands of rows | Slow; batch |

---

## 12. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial seed design |

---

**End of 15_SEED_DATA_DESIGN.md**

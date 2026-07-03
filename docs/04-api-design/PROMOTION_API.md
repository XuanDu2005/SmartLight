# PROMOTION_API.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document details the **Promotion API endpoints** for SmartLight. Covers active promotion browsing, voucher validation, admin promotion/voucher management, and tax rate administration.

---

## 2. Promotion Concepts

| Concept | Description |
| --- | --- |
| **Promotion** | Rules: percentage/fixed/flash discount, eligibility, windows |
| **Voucher** | Code attached to a promotion; usage limits |
| **TaxRate** | VAT rate (10% Vietnam standard) |
| **TaxExemption** | Per-category exemption flag (rare) |

---

## 3. Public Promotion Endpoints

### 3.1 EP-PRM-001 — List Active Promotions

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/promotions/active` |
| **Authentication** | None |
| **Cache** | public, max-age=300 |
| **Related Use Case** | UC-PRM-001 |
| **Related Entity** | promotion |

**Query Parameters:** `categoryId`, `brandId`, `type` (`percentage`/`fixed`/`flash`), `limit`, `sort`.

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "name": "Khuyến mãi hè 2026",
      "type": "percentage",
      "value": 10,
      "description": "Giảm 10% tất cả sản phẩm đèn LED",
      "minOrderAmount": 100000000,
      "startDate": "2026-06-01T00:00:00Z",
      "endDate": "2026-08-31T23:59:59Z",
      "applicableCategories": ["uuid"],
      "bannerImage": "https://cdn.smartlight.vn/...",
      "badgeText": "-10%"
    }
  ]
}
```

---

### 3.2 EP-PRM-002 — Validate Voucher

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/promotions/validate-voucher` |
| **Authentication** | Optional |
| **Idempotency** | Required |
| **Related Use Case** | UC-PRM-005 |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `code` | string | Yes |
| `cartTotal` | int (xu) | No (for min order check) |
| `items` | array | No (for product-specific check) |

**Response `200 OK` (valid):**

```
{
  "data": {
    "valid": true,
    "voucherId": "uuid",
    "code": "SUMMER10",
    "discountType": "percentage",
    "discountValue": 10,
    "estimatedDiscountAmount": 4000000,
    "appliedTo": "cart",
    "restrictions": {
      "minOrderMet": true,
      "usageRemaining": 245,
      "userUsageRemaining": 1
    }
  }
}
```

**Response `200 OK` (invalid):**

```
{
  "data": {
    "valid": false,
    "code": "EXPIRED",
    "reason": "VOUCHER_EXPIRED",
    "message": "Voucher này đã hết hạn"
  }
}
```

**Errors:** Various voucher validation errors (HTTP 200 with `valid: false`).

---

### 3.3 EP-PRM-003 — Flash Sales

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/promotions/flash-sales` |
| **Authentication** | None |
| **Cache** | public, max-age=60 |

**Response `200 OK`:** Active flash-sale promotions with countdown.

```
{
  "data": [
    {
      "id": "uuid",
      "name": "Flash Sale 12:00",
      "type": "flash",
      "value": 30,
      "startDate": "...",
      "endDate": "...",
      "secondsRemaining": 2400,
      "remainingSlots": 50,
      "products": ["uuid1", "uuid2"]
    }
  ]
}
```

---

## 4. Admin Promotion Endpoints

### 4.1 EP-ADM-PRM-001 — List All Promotions

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/promotions` |
| **Authentication** | Yes (MarketingManager+) |

**Query Parameters:** `status`, `type`, `from`, `to`, `q`, etc.

---

### 4.2 EP-ADM-PRM-002 — Get Promotion

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/promotions/{promotionId}` |

---

### 4.3 EP-ADM-PRM-003 — Create Promotion

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/promotions` |
| **Audit** | `promotion.created` |
| **Idempotency** | Required |

**Request Body:**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `name` | string | Yes | Max 100 |
| `type` | enum | Yes | `percentage`, `fixed`, `flash`, `bundle` |
| `value` | decimal | Yes | For percentage: 0..100; for fixed: positive |
| `applicableType` | enum | Yes | `all`, `category`, `product` |
| `applicableIds` | array | Conditional | If applicableType != `all` |
| `minOrderAmount` | int (xu) | No | Default 0 |
| `usageLimit` | int | No | Default unlimited |
| `perUserLimit` | int | No | Default 1 |
| `stackable` | boolean | No | Default false |
| `startDate` | datetime | Yes | UTC |
| `endDate` | datetime | Yes | UTC; > startDate |
| `status` | enum | No | Default `draft` |
| `description` | string | No | Max 1000 |
| `bannerMediaId` | string | No | |

**Response `201 Created`:** Promotion.

---

### 4.4 EP-ADM-PRM-004 — Update Promotion

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/promotions/{promotionId}` |
| **Audit** | `promotion.updated` |

**Constraint:** Cannot edit rate (`value`) of an active promotion with usage; can only update metadata or window.

---

### 4.5 EP-ADM-PRM-005 — Soft-Delete Promotion

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/promotions/{promotionId}` |
| **Audit** | `promotion.deleted` |

---

### 4.6 EP-ADM-PRM-006 — Activate Promotion

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/promotions/{promotionId}/activate` |
| **Audit** | `promotion.activated` |

---

### 4.7 EP-ADM-PRM-007 — Deactivate Promotion

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/promotions/{promotionId}/deactivate` |
| **Audit** | `promotion.deactivated` |

---

### 4.8 EP-ADM-PRM-008 — Usage Stats

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/promotions/{promotionId}/usage` |
| **Authentication** | Yes (MarketingManager+) |

**Response `200 OK`:**

```
{
  "data": {
    "promotionId": "uuid",
    "usageCount": 245,
    "usageLimit": 1000,
    "remainingUses": 755,
    "totalDiscountAmount": 245000000,
    "averageDiscountAmount": 1000000,
    "ordersCount": 245,
    "period": {
      "start": "...",
      "end": "..."
    },
    "topUsers": [
      { "userId": "uuid", "usageCount": 3 }
    ]
  }
}
```

---

## 5. Voucher Admin Endpoints

### 5.1 EP-ADM-VCH-001 — List Vouchers

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/vouchers` |
| **Authentication** | Yes (MarketingManager+) |

**Query:** `promotionId`, `status`, `q`, etc.

---

### 5.2 EP-ADM-VCH-002 — Create Voucher

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/vouchers` |
| **Audit** | `voucher.created` |
| **Idempotency** | Required |

**Request:**

| Field | Type | Required |
| --- | --- | --- |
| `promotionId` | string | Yes |
| `code` | string | Yes (auto-generated if null) |
| `usageLimit` | int | No (unlimited) |
| `perUserLimit` | int | Default 1 |
| `validFrom` | datetime | Yes |
| `validTo` | datetime | Yes |

Or batch creation:
**Request Body (batch):**

```
POST /v1/admin/vouchers
{
  "mode": "batch",
  "promotionId": "uuid",
  "count": 100,
  "prefix": "SUMMER",
  "usageLimit": 1,
  "perUserLimit": 1,
  "validFrom": "...",
  "validTo": "..."
}
```

**Response:** Batch with generated codes.

---

### 5.3 EP-ADM-VCH-003 — Update Voucher

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/vouchers/{voucherId}` |
| **Audit** | `voucher.updated` |

> Cannot reduce usageLimit below current usageCount.

---

### 5.4 EP-ADM-VCH-004 — Soft-Delete Voucher

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/vouchers/{voucherId}` |
| **Audit** | `voucher.deleted` |

---

### 5.5 EP-ADM-VCH-005 — Voucher Usage Stats

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/vouchers/{voucherId}/usage` |

---

## 6. Tax Rate Admin Endpoints

### 6.1 EP-ADM-TAX-001 — List Tax Rates

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/tax/rates` |
| **Authentication** | Yes (FinanceManager+) |

---

### 6.2 EP-ADM-TAX-002 — Create Tax Rate

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/tax/rates` |
| **Audit** | `tax_rate.created` |

**Request:**

| Field | Type | Required |
| --- | --- | --- |
| `name` | string | Yes |
| `rate` | decimal | Yes (0-100) |
| `countryCode` | string | Default `VN` |
| `isDefault` | boolean | Default false |
| `isActive` | boolean | Default true |
| `effectiveFrom` | datetime | No |
| `effectiveTo` | datetime | No |

---

### 6.3 EP-ADM-TAX-003 — Update Tax Rate

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/tax/rates/{rateId}` |
| **Audit** | `tax_rate.updated` |

> Cannot edit if has usage; create new rate.

---

## 7. Cross-References

| Field | Reference |
| --- | --- |
| Use Cases | UC-PRM-001..005 |
| Business Rules | BR-PRM-001..012, BR-TAX-001..005 |
| Workflows | WF-PRM-01..03, WF-TAX-01..02 |
| Features | SF-PRM-001..005, SF-TAX-001..004 |
| Entities | promotion, voucher, promotion_usage, voucher_usage, tax_rate |

---

## 8. Coverage Validation

| Check | Status |
| --- | --- |
| Active promotions browsable | ✓ |
| Voucher validation covered | ✓ |
| Flash sales covered | ✓ |
| Admin promotion CRUD covered | ✓ |
| Activation/deactivation covered | ✓ |
| Usage stats covered | ✓ |
| Voucher CRUD covered | ✓ |
| Voucher batch creation covered | ✓ |
| Tax rate admin covered | ✓ |
| Audit logging specified | ✓ |

---

## 9. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial promotion API: 18 endpoints (3 public + 15 admin) |

---

**End of Document — PROMOTION_API.md**
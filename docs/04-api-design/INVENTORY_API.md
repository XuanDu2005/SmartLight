# INVENTORY_API.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document details the **Inventory API endpoints** for SmartLight, including stock checking, inventory listing, manual adjustments, movement history, and low-stock alerts.

---

## 2. Public Inventory Endpoints

### 2.1 EP-INV-001 — Get Variant Availability (Embedded)

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/products/{productId}/variants/{variantId}/availability` |
| **Authentication** | None |
| **Cache** | public, max-age=30 |
| **Related Use Case** | UC-INV-001 (read) |
| **Related Entity** | inventory |

**Response `200 OK`:**

```
{
  "data": {
    "variantId": "uuid",
    "sku": "LT-LED-A19-WW-9W",
    "inStock": true,
    "availableQuantity": 45,
    "stockOnHand": 50,
    "stockReserved": 5,
    "lowStock": false,
    "expectedRestockAt": null,
    "maxQuantityPerOrder": 99
  }
}
```

> `stockOnHand` is shown for admin context; public only sees `availableQuantity`. For SEO optimization, `availableQuantity` may be cached.

---

### 2.2 EP-INV-002 — Get Variant Availability (Direct)

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/variants/{variantId}/availability` |
| **Authentication** | None |
| **Cache** | public, max-age=30 |

Same response as `EP-INV-001`.

---

## 3. Admin Inventory Endpoints

### 3.1 EP-ADM-INV-001 — List All Inventory

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/inventory` |
| **Authentication** | Yes (InventoryManager+) |
| **Related Entity** | inventory, product_variant |

**Query Parameters:**

| Name | Type | Description |
| --- | --- | --- |
| `categoryId` | string | Filter by category |
| `brandId` | string | Filter by brand |
| `stockStatus` | enum | `inStock`, `lowStock`, `outOfStock` |
| `minStock` | int | Min stock count |
| `maxStock` | int | Max stock count |
| `search` | string | Search by SKU or product name |
| `sort` | string | e.g. `stockOnHand`, `-stockOnHand`, `lowStock`, `-updatedAt` |
| `page`, `limit` | int | Pagination |

**Response `200 OK`:**

```
{
  "data": [
    {
      "variantId": "uuid",
      "sku": "LT-LED-A19-WW-9W",
      "productName": "Đèn LED âm trần 9W",
      "productSlug": "den-led-am-tran-9w",
      "stockOnHand": 50,
      "stockReserved": 5,
      "available": 45,
      "lowStockThreshold": 5,
      "lowStock": false,
      "lastCountedAt": "2026-06-01T00:00:00Z",
      "updatedAt": "2026-07-03T15:30:00Z"
    }
  ],
  "meta": { "pagination": { ... } }
}
```

---

### 3.2 EP-ADM-INV-002 — Get Variant Inventory Detail

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/inventory/{variantId}` |
| **Authentication** | Yes (InventoryManager+) |

**Response `200 OK`:**

```
{
  "data": {
    "variantId": "uuid",
    "sku": "LT-LED-A19-WW-9W",
    "productName": "...",
    "stockOnHand": 50,
    "stockReserved": 5,
    "available": 45,
    "lowStockThreshold": 5,
    "lowStock": false,
    "lastCountedAt": "2026-06-01T00:00:00Z",
    "averageDailySales": 2.5,
    "daysOfStockRemaining": 18,
    "expectedRestockAt": null,
    "updatedAt": "..."
  }
}
```

---

### 3.3 EP-ADM-INV-003 — List Low Stock Variants

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/inventory/low-stock` |
| **Authentication** | Yes (InventoryManager+) |
| **Related Use Case** | UC-INV-003 |
| **Related Entity** | inventory (partial filter `lowStock`) |

**Query Parameters:**

| Name | Type | Description |
| --- | --- | --- |
| `threshold` | int | Override default low-stock threshold |
| `categoryId` | string | Filter |
| `sort` | string | `-daysOfStockRemaining`, `stockOnHand` |
| `limit` | int | Default 50, max 200 |

**Response `200 OK`:** Same structure as inventory list.

---

### 3.4 EP-ADM-INV-004 — Get Movement History

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/inventory/{variantId}/movements` |
| **Authentication** | Yes (InventoryManager+) |
| **Related Use Case** | UC-INV-005 |
| **Related Entity** | stock_movement, inventory_adjustment |

**Query Parameters:**

| Name | Type | Description |
| --- | --- | --- |
| `type` | enum | `OrderSale`, `OrderCancel`, `ReturnRestock`, `ReturnDispose`, `ManualAdjustment`, `InitialStock` |
| `from` | date | Start date |
| `to` | date | End date |
| `page`, `limit` | int | Pagination |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "type": "OrderSale",
      "quantity": -2,
      "balanceAfter": 50,
      "reference": { "type": "Order", "id": "uuid", "orderNumber": "..." },
      "reason": null,
      "actor": { "type": "System", "id": null },
      "createdAt": "..."
    },
    {
      "id": "uuid",
      "type": "ManualAdjustment",
      "quantity": 5,
      "balanceAfter": 52,
      "reference": null,
      "reason": { "code": "Restock", "text": "Received shipment" },
      "actor": { "type": "AdminUser", "id": "uuid", "displayName": "..." },
      "createdAt": "..."
    }
  ],
  "meta": { "pagination": { ... } }
}
```

---

### 3.5 EP-ADM-INV-005 — Manual Inventory Adjustment

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/inventory/{variantId}/adjust` |
| **Authentication** | Yes (InventoryManager+) |
| **Idempotency** | Required |
| **Audit** | `inventory.adjusted` |
| **Related Use Case** | UC-INV-004 |
| **Related Entity** | inventory_adjustment |

**Request Body:**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `delta` | int | Yes | Sign + or -; non-zero |
| `reasonCode` | enum | Yes | `Damage`, `Audit`, `Theft`, `Other`, `RestockFromReturn` |
| `reasonText` | string | No | Max 500; required if reasonCode = `Other` |
| `newStockOnHand` | int | Alternative | New absolute value (server computes delta) |
| `setLastCountedAt` | boolean | No | If true, marks `lastCountedAt = now()` |

> Either `delta` or `newStockOnHand` must be provided (not both).

**Response `200 OK`:**

```
{
  "data": {
    "adjustmentId": "uuid",
    "variantId": "uuid",
    "sku": "LT-LED-A19-WW-9W",
    "quantityBefore": 50,
    "quantityAfter": 55,
    "delta": 5,
    "reason": { "code": "RestockFromReturn", "text": "..." },
    "actor": { "id": "uuid", "displayName": "..." },
    "appliedAt": "..."
  }
}
```

**Business Rules:**
- BR-INV-005: Every adjustment audited
- BR-INV-001: Stock never goes below 0 (server validates)

**Errors:**
- `STOCK_GOES_NEGATIVE` (422) — delta would result in negative stock
- `INVALID_REASON_CODE` (422)
- `REASON_TEXT_REQUIRED` (422)

---

### 3.6 EP-ADM-INV-006 — Bulk Inventory Adjustment

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/inventory/bulk-adjust` |
| **Authentication** | Yes (InventoryManager+) |
| **Idempotency** | Required |
| **Audit** | `inventory.bulk_adjusted` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `adjustments` | array | Yes (max 100) |
| Each entry | object | Same as single adjustment |

**Response `200 OK`:**

```
{
  "data": {
    "succeeded": ["uuid1", "uuid2"],
    "failed": [
      { "variantId": "uuid3", "code": "STOCK_GOES_NEGATIVE", "message": "..." }
    ],
    "summary": { "total": 3, "succeeded": 2, "failed": 1 }
  }
}
```

---

## 4. Stock Reservation (Internal; not exposed via public API)

Stock reservations are managed internally by cart/checkout/order services. They are not directly exposed through the API. However:

| Internal Action | Triggered By |
| --- | --- |
| Create reservation | `POST /v1/cart/items`, `POST /v1/checkout` |
| Consume reservation | `POST /v1/checkout/{sessionId}/place-order` |
| Release reservation | Cart item remove, TTL expiry, order cancel |

Each reservation has a 15-minute TTL (BR-INV-007) enforced via background job.

---

## 5. Low Stock Alerts

### 5.1 Alert Trigger

Triggered automatically when:
- `inventory.stockOnHand <= inventory.lowStockThreshold`
- An order moves stock below threshold

Action:
- Internal notification logged (`notification_log` with `eventType: 'inventory.low_stock'`)
- Admin dashboard indicator (`/v1/admin/dashboard/inventory-alerts`)

---

## 6. Return Restock (Admin Workflow)

When a return is inspected and items pass (BR-INV-006), the system automatically:
1. Increments `inventory.stockOnHand` (Pass) or not (Fail).
2. Creates `stock_movement` record with type `ReturnRestock` or `ReturnDispose`.
3. Creates `inventory_adjustment` for audit.

These happen via internal API calls during return processing — not directly exposed.

For inspection endpoints, see `ORDER_API.md` §Returns.

---

## 7. Cross-References

| Field | Reference |
| --- | --- |
| Use Cases | UC-INV-001..005 |
| Business Rules | BR-INV-001..007 |
| State Machine | SM-INV (StockReservation lifecycle) |
| Workflows | WF-INV-01..05 |
| Features | SF-INV-001..005 |
| Entities | inventory, stock_reservation, stock_movement, inventory_adjustment |

---

## 8. Coverage Validation

| Check | Status |
| --- | --- |
| Public availability check covered | ✓ |
| Admin inventory listing covered | ✓ |
| Manual adjustment covered | ✓ |
| Bulk adjustment covered | ✓ |
| Movement history covered | ✓ |
| Low stock alerts covered | ✓ |
| Return restock flow documented | ✓ |
| Reservation lifecycle referenced | ✓ |
| Audit logging specified | ✓ |
| Idempotency required for mutations | ✓ |

---

## 9. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial inventory API: 7 endpoints (2 public + 5 admin) |

---

**End of Document — INVENTORY_API.md**
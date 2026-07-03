# ORDER_API.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document details the **Order API endpoints** for SmartLight, including customer order history, status tracking, admin order management, and return flow.

---

## 2. Order State Machine

```
Pending → Confirmed → Processing → Shipped → Delivered → Completed
   ↓         ↓           ↓           ↓
Cancelled Cancelled   Cancelled   Returned
```

See `docs/02-system-analysis/STATE_MACHINE.md` §SM-ORD for details.

---

## 3. Customer Order Endpoints

### 3.1 EP-ORD-001 — List Own Orders

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/orders` |
| **Authentication** | Yes |
| **Related Entity** | order |
| **Related Use Case** | UC-ORD-002 |

**Query Parameters:**

| Name | Type | Description |
| --- | --- | --- |
| `status` | enum | Filter by status |
| `from` | date | Date range filter |
| `to` | date | Date range filter |
| `sort` | string | `-createdAt` (default), `createdAt`, `-total` |
| `page`, `limit` | int | Pagination |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "orderNumber": "20260703-0001",
      "status": "shipped",
      "currency": "VND",
      "itemCount": 3,
      "subtotal": 195000000,
      "total": 217000000,
      "paidAmount": 217000000,
      "refundedAmount": 0,
      "primaryImageUrl": "https://cdn.smartlight.vn/...",
      "shippingCarrier": "ghn",
      "trackingNumber": "GHN123456",
      "placedAt": "2026-07-03T15:00:00Z",
      "deliveredAt": null,
      "isReturnable": true,
      "returnWindowEndsAt": "2026-07-13T15:00:00Z"
    }
  ],
  "meta": { "pagination": { ... } }
}
```

---

### 3.2 EP-ORD-002 — Get Order

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/orders/{orderId}` |
| **Authentication** | Yes (own order only) |

**Query Parameters:**

| Name | Description |
| --- | --- |
| `include` | `items`, `addresses`, `payment`, `shipment`, `statusHistory`, `returns` |

**Response `200 OK`:** Full order object.

---

### 3.3 EP-ORD-003 — Get Order Items

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/orders/{orderId}/items` |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "variantId": "uuid",
      "productId": "uuid",
      "productName": "Đèn LED âm trần 9W",
      "productSlug": "den-led-am-tran-9w",
      "variantSku": "LT-LED-A19-WW-9W",
      "quantity": 2,
      "unitPrice": 20000000,
      "subtotal": 40000000,
      "taxAmount": 4000000,
      "taxRate": 10,
      "discountAmount": 0,
      "total": 44000000,
      "imageUrl": "...",
      "isReturnable": true,
      "returnedQuantity": 0,
      "reviewed": false
    }
  ]
}
```

---

### 3.4 EP-ORD-004 — Get Order Status History

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/orders/{orderId}/status-history` |
| **Related Use Case** | UC-ORD-003 |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "fromStatus": null,
      "toStatus": "pending",
      "actor": { "type": "System", "id": null },
      "reason": "Order placed",
      "metadata": { "orderNumber": "..." },
      "createdAt": "2026-07-03T15:00:00Z"
    },
    {
      "id": "uuid",
      "fromStatus": "pending",
      "toStatus": "confirmed",
      "actor": { "type": "System", "id": null },
      "reason": "Payment captured",
      "createdAt": "2026-07-03T15:05:00Z"
    },
    {
      "id": "uuid",
      "fromStatus": "confirmed",
      "toStatus": "processing",
      "actor": { "type": "AdminUser", "id": "uuid", "displayName": "..." },
      "reason": null,
      "createdAt": "2026-07-04T08:00:00Z"
    }
  ]
}
```

---

### 3.5 EP-ORD-005 — Get Shipment Tracking

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/orders/{orderId}/tracking` |
| **Related Use Case** | UC-ORD-005 |

**Response `200 OK`:**

```
{
  "data": {
    "shipmentId": "uuid",
    "trackingNumber": "GHN123456",
    "carrierCode": "ghn",
    "carrierName": "GHN",
    "status": "in_transit",
    "estimatedDeliveryAt": "2026-07-05T15:00:00Z",
    "events": [
      { "status": "dispatched", "location": "HCM Hub", "description": "...", "eventAt": "2026-07-04T08:00:00Z" },
      { "status": "in_transit", "location": "Hà Nội Hub", "description": "...", "eventAt": "2026-07-04T20:00:00Z" }
    ]
  }
}
```

---

### 3.6 EP-ORD-006 — Cancel Order (Customer)

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/orders/{orderId}/cancel` |
| **Authentication** | Yes |
| **Idempotency** | Required |
| **Audit** | `order.cancelled` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `reason` | enum | Yes: `changed_mind`, `duplicate_order`, `found_better_price`, `delivery_too_long`, `payment_issue`, `other` |
| `notes` | string | No |
| `confirm` | boolean | Yes; must be `true` |

**Response `200 OK`:**

```
{
  "data": {
    "orderId": "uuid",
    "orderNumber": "...",
    "status": "cancelled",
    "cancelledAt": "...",
    "refund": {
      "status": "pending",
      "amount": 217000000,
      "currency": "VND",
      "estimatedAt": "..."
    },
    "stockReleased": true
  }
}
```

**Business Rules:**
- BR-ORD-007: Can cancel only if status = `pending`, `confirmed`
- BR-ORD-008: After `processing`, customer cannot cancel (admin must cancel)
- Refund automatically initiated

**Errors:**
- `ORDER_NOT_CANCELLABLE` (409) — status not cancellable
- `ORDER_NOT_FOUND` (404)
- `FORBIDDEN` (403) — not own order

---

### 3.7 EP-ORD-007 — Guest Order Tracking

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/orders/track/{orderNumber}` |
| **Authentication** | None |
| **Cache** | public, max-age=60 |

**Query Parameters:**

| Name | Required | Description |
| --- | --- | --- |
| `email` | Yes | Guest email used at checkout |

**Response `200 OK`:** Limited order info (no sensitive data).

```
{
  "data": {
    "orderNumber": "20260703-0001",
    "status": "shipped",
    "currency": "VND",
    "total": 217000000,
    "placedAt": "...",
    "deliveredAt": null,
    "shipment": {
      "carrierCode": "ghn",
      "trackingNumber": "GHN123456",
      "status": "in_transit"
    }
  }
}
```

**Business Rule:** BR-GCH-004: Track by email verification.

---

### 3.8 EP-ORD-008 — Confirm Receipt

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/orders/{orderId}/confirm-received` |
| **Authentication** | Yes |
| **Idempotency** | Required |
| **Audit** | `order.received` |

**Side Effect:** Triggers `Delivered → Completed` after 7 days (auto-completion).

---

## 4. Admin Order Endpoints

### 4.1 EP-ADM-ORD-001 — List All Orders

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/orders` |
| **Authentication** | Yes (OrderManager+) |

**Query Parameters (extensive):**

| Name | Description |
| --- | --- |
| `status` | Filter by status |
| `paymentStatus` | `paid`, `unpaid`, `refunded`, `partial` |
| `customerId` | By user UUID |
| `customerEmail` | By user email |
| `orderNumber` | Search |
| `carrierCode` | By carrier |
| `trackingNumber` | Search |
| `minTotal` / `maxTotal` | Price range |
| `from` / `to` | Date range |
| `hasReturns` | Boolean |
| `sort` | Multi-field sort |
| `page`, `limit` | Pagination (max 100) |

---

### 4.2 EP-ADM-ORD-002 — Get Order (Admin)

Same as `EP-ORD-002` but for any order.

---

### 4.3 EP-ADM-ORD-003 — Update Order

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/orders/{orderId}` |
| **Audit** | `order.updated` |

**Request Body:**

| Field | Type | Notes |
| --- | --- | --- |
| `notes` | string | Internal notes |
| `shippingAddressId` | string | Update shipping address |
| `billingAddressId` | string | Update billing |

> Items, totals, currency, status NOT editable here (use dedicated transitions).

---

### 4.4 EP-ADM-ORD-004 — Confirm Order

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/orders/{orderId}/confirm` |
| **Audit** | `order.confirmed` |

**Constraint:** Status must be `pending`; payment must be captured.

**Side Effects:**
- Order → `confirmed`
- Notify customer

---

### 4.5 EP-ADM-ORD-005 — Mark Processing

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/orders/{orderId}/process` |
| **Audit** | `order.processing` |

Status: `confirmed` → `processing`.

---

### 4.6 EP-ADM-ORD-006 — Mark Shipped

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/orders/{orderId}/ship` |
| **Audit** | `order.shipped` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `trackingNumber` | string | Yes |
| `carrierCode` | string | Yes |
| `serviceName` | string | No |
| `estimatedDeliveryAt` | date | No |
| `weight` | decimal | No |

**Side Effects:**
- Order → `shipped`
- Shipment record created
- Customer notified

---

### 4.7 EP-ADM-ORD-007 — Mark Delivered

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/orders/{orderId}/deliver` |
| **Audit** | `order.delivered` |

**Side Effect:** Order → `delivered`; auto-complete in 7 days.

---

### 4.8 EP-ADM-ORD-008 — Mark Completed

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/orders/{orderId}/complete` |
| **Audit** | `order.completed` |

---

### 4.9 EP-ADM-ORD-009 — Admin Cancel

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/orders/{orderId}/cancel` |
| **Authorization** | Yes (OrderManager+) |
| **Audit** | `order.admin_cancelled` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `reason` | string | Yes |
| `refundCustomer` | boolean | Default true |
| `restockItems` | boolean | Default true |

**Side Effects:**
- Stock restocked (if `restockItems`)
- Refund initiated (if `refundCustomer`)
- Order → `cancelled`

---

### 4.10 EP-ADM-ORD-010 — Bulk Update

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/orders/bulk-update` |
| **Idempotency** | Required |
| **Audit** | `order.bulk_updated` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `ids` | array | Yes |
| `action` | enum | `confirm`, `process`, `ship` (with tracking), `cancel` |
| `params` | object | Action-specific |

**Response:** Bulk succeeded/failed.

---

### 4.11 EP-ADM-ORD-011 — Export Orders

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/orders/export` |
| **Format** | CSV streaming |

**Query:** Same filters as `EP-ADM-ORD-001`.

**Response:** `text/csv` stream.

**Audit:** `order.export_requested`

---

### 4.12 EP-ADM-ORD-012 — Reconciliation Report

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/orders/reconciliation` |
| **Authentication** | Yes (FinanceManager+) |

Lists orders in `pending` status with pending payment (potential stuck orders).

---

## 5. Returns Endpoints

See `docs/02-system-analysis/` Returns flow. Customer + admin endpoints:

### 5.1 Customer: EP-RTN-001 — List Own Returns

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/returns` |

### 5.2 Customer: EP-RTN-002 — Request Return

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/returns` |
| **Idempotency** | Required |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `orderId` | string | Yes |
| `items` | array | Yes (per-line return info) |
| `reason` | enum | Required: `defective`, `wrong_item`, `not_as_described`, `damaged_in_transit`, `other` |
| `customerNotes` | string | No |
| `photos` | array | No (mediaIds) |

**Response `201 Created`:** Return object with `rmaNumber`.

**Business Rule:** BR-RTN-001: Return window = 7 days after delivery.

---

### 5.3 Customer: EP-RTN-003 — Get Return

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/returns/{rmaNumber}` |

---

### 5.4 Customer: EP-RTN-004 — Cancel Return Request

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/returns/{rmaNumber}/cancel` |

Only allowed if status = `pending`.

---

### 5.5 Customer: EP-RTN-005 — Add Photos to Return

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/returns/{rmaNumber}/images` |
| **Content-Type** | multipart/form-data |

---

### 5.6 Admin: EP-ADM-RTN-001..007

Approve, reject, mark received, inspect item, close return — all admin operations.

---

## 6. Cross-References

| Field | Reference |
| --- | --- |
| Use Cases | UC-ORD-001..015, UC-RTN-001..008 |
| Business Rules | BR-ORD-001..008, BR-RTN-001..007, BR-OSM-001..004 |
| State Machine | SM-ORD |
| Workflows | WF-ORD-01..09, WF-RTN-01..05 |
| Features | SF-ORD-001..013, SF-RTN-001..008 |
| Entities | order, order_item, order_address, order_status_history, return, return_item |

---

## 7. Coverage Validation

| Check | Status |
| --- | --- |
| Customer order list covered | ✓ |
| Order detail covered | ✓ |
| Status history covered | ✓ |
| Customer cancel covered | ✓ |
| Tracking covered | ✓ |
| Admin list covered | ✓ |
| Admin transitions covered (confirm → processing → shipped → delivered → completed) | ✓ |
| Admin cancel covered | ✓ |
| Bulk operations covered | ✓ |
| Export covered | ✓ |
| Guest tracking covered | ✓ |
| Returns (customer + admin) covered | ✓ |
| Audit logging specified | ✓ |

---

## 8. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial order API: 32+ endpoints (customer, admin, returns) |

---

**End of Document — ORDER_API.md**
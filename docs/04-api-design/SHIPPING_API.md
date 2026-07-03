# SHIPPING_API.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document details the **Shipping API endpoints** for SmartLight. Covers public rates/quote/tracking, admin zone and rate management, and shipment lifecycle operations.

---

## 2. Shipping Carriers (V1)

| Carrier Code | Name | API Support |
| --- | --- | --- |
| `ghn` | GHN | Full API (V1) |
| `ghtk` | GHTK | Full API (V1) |
| `viettel_post` | Viettel Post | Full API (V1) |
| `vnpost` | VNPost | Manual upload only (V1.1+) |

---

## 3. Public Shipping Endpoints

### 3.1 EP-SHP-001 — List Shipping Zones

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/shipping/zones` |
| **Authentication** | None |
| **Cache** | public, max-age=3600 |
| **Related Entity** | shipping_zone |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "name": "Miền Bắc",
      "countryCode": "VN",
      "regionCodes": ["HN", "HP", "..."],
      "isActive": true
    }
  ]
}
```

---

### 3.2 EP-SHP-002 — List Shipping Methods

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/shipping/methods` |
| **Authentication** | None |
| **Cache** | public, max-age=1800 |

**Query Parameters:**

| Name | Description |
| --- | --- |
| `zoneId` | Optional filter |
| `carrierCode` | Optional filter |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "carrierCode": "ghn",
      "carrierName": "GHN",
      "serviceName": "Standard",
      "estimatedDaysMin": 2,
      "estimatedDaysMax": 4,
      "baseFee": 2500000,
      "perKgFee": 500000,
      "currency": "VND",
      "isActive": true
    }
  ]
}
```

---

### 3.3 EP-SHP-003 — Calculate Shipping Fee

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/shipping/calculate` |
| **Authentication** | None |
| **Idempotency** | Required |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `province` | string | Yes |
| `district` | string | Yes |
| `ward` | string | Yes |
| `totalWeight` | decimal | Yes (kg) |
| `totalValue` | int | Optional (xu; for insurance calculation) |
| `items` | array | Optional (for item-level weight) |

**Response `200 OK`:**

```
{
  "data": [
    {
      "methodId": "uuid",
      "carrierCode": "ghn",
      "serviceName": "Standard",
      "fee": 2500000,
      "currency": "VND",
      "estimatedDaysMin": 2,
      "estimatedDaysMax": 4,
      "insuranceFee": 0,
      "totalFee": 2500000
    }
  ]
}
```

**Errors:**
- `NO_SHIPPING_METHOD_FOUND` (404) — region unserviceable
- `WEIGHT_EXCEEDS_LIMIT` (422)

---

### 3.4 EP-SHP-004 — Public Tracking

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/shipping/track/{trackingNumber}` |
| **Authentication** | None |
| **Cache** | public, max-age=300 |
| **Rate Limit** | 30/hour per IP (anti-scraping) |

**Response `200 OK`:**

```
{
  "data": {
    "trackingNumber": "GHN123456",
    "carrierCode": "ghn",
    "status": "in_transit",
    "estimatedDeliveryAt": "...",
    "events": [
      { "status": "dispatched", "location": "HCM Hub", "description": "...", "eventAt": "..." },
      { "status": "in_transit", "location": "Hà Nội Hub", "description": "...", "eventAt": "..." }
    ]
  }
}
```

> Limited information for privacy; full details require login + own order.

---

## 4. Admin Shipping Endpoints

### 4.1 Zones

#### EP-ADM-SHP-001 — List Zones (Admin)

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/shipping/zones` |
| **Authentication** | Yes (OrderManager+) |

Includes soft-deleted zones with `?includeDeleted=true`.

#### EP-ADM-SHP-002 — Create Zone

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/shipping/zones` |
| **Audit** | `shipping_zone.created` |

**Request:**

| Field | Type | Required |
| --- | --- | --- |
| `name` | string | Yes |
| `countryCode` | string | Default `VN` |
| `regionCodes` | array | Yes |
| `isActive` | boolean | Default true |

#### EP-ADM-SHP-003 — Update Zone

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/shipping/zones/{zoneId}` |
| **Audit** | `shipping_zone.updated` |

#### EP-ADM-SHP-004 — Soft-Delete Zone

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/shipping/zones/{zoneId}` |
| **Audit** | `shipping_zone.deleted` |

**Constraint:** Cannot delete zone with active rates; archive rates first.

---

### 4.2 Rates

#### EP-ADM-SHP-011 — List Rates

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/shipping/rates` |
| **Authentication** | Yes (OrderManager+) |

#### EP-ADM-SHP-012 — Create Rate

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/shipping/rates` |
| **Audit** | `shipping_rate.created` |

**Request:**

| Field | Type | Required |
| --- | --- | --- |
| `zoneId` | string | Yes |
| `carrierCode` | enum | Yes |
| `serviceName` | string | Yes |
| `minWeight` | decimal | No (0) |
| `maxWeight` | decimal | No |
| `baseFee` | int (xu) | Yes |
| `perKgFee` | int (xu) | No |
| `estimatedDaysMin` | int | Yes |
| `estimatedDaysMax` | int | Yes |
| `isActive` | boolean | Default true |

#### EP-ADM-SHP-013 — Update Rate

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/shipping/rates/{rateId}` |

#### EP-ADM-SHP-014 — Soft-Delete Rate

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/shipping/rates/{rateId}` |

---

### 4.3 Shipments

#### EP-ADM-SHP-021 — List Shipments

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/shipping/shipments` |
| **Authentication** | Yes (OrderManager+) |

**Query:** `status`, `carrierCode`, `from`, `to`, `orderId`, etc.

#### EP-ADM-SHP-022 — Get Shipment

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/shipping/shipments/{shipmentId}` |

#### EP-ADM-SHP-023 — Dispatch Shipment

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/shipping/shipments/{shipmentId}/dispatch` |
| **Audit** | `shipment.dispatched` |

**Request:**

| Field | Type | Required |
| --- | --- | --- |
| `trackingNumber` | string | Yes (auto-fetched from carrier) |
| `carrierCode` | string | Yes |

**Side Effects:**
- Order → `shipped`
- Customer notified with tracking
- Label URL generated

#### EP-ADM-SHP-024 — Mark Delivered (Admin Override)

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/shipping/shipments/{shipmentId}/mark-delivered` |
| **Audit** | `shipment.delivered` |

For manual override (carrier issue, lost-and-found).

#### EP-ADM-SHP-025 — Get Tracking History

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/shipping/shipments/{shipmentId}/tracking` |

Full event log including internal notes.

#### EP-ADM-SHP-026 — Generate Label

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/shipping/shipments/{shipmentId}/label` |
| **Audit** | `shipment.label_generated` |

**Response:** Binary PDF/image or URL.

---

## 5. Shipping Webhooks

Detailed in `WEBHOOK_SPECIFICATION.md`. Summary:

| EP | URL | Carrier |
| --- | --- | --- |
| EP-WHK-011 | `POST /v1/webhooks/shipping/ghn` | GHN tracking |
| EP-WHK-012 | `POST /v1/webhooks/shipping/ghtk` | GHTK tracking |
| EP-WHK-013 | `POST /v1/webhooks/shipping/viettel-post` | Viettel Post tracking |

---

## 6. Cross-References

| Field | Reference |
| --- | --- |
| Use Cases | UC-SHP-001..003 |
| Business Rules | BR-SHP-001..008 |
| State Machine | SM-SHP |
| Workflows | WF-SHP-01..03 |
| Features | SF-SHP-001..011 |
| Entities | shipping_zone, shipping_rate, shipment, tracking_event |

---

## 7. Coverage Validation

| Check | Status |
| --- | --- |
| Public zones list covered | ✓ |
| Public methods list covered | ✓ |
| Public fee calculation covered | ✓ |
| Public tracking covered | ✓ |
| Admin zone CRUD covered | ✓ |
| Admin rate CRUD covered | ✓ |
| Admin shipment lifecycle covered | ✓ |
| Webhooks referenced | ✓ |
| Audit logging specified | ✓ |

---

## 8. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial shipping API: 18 endpoints (4 public + 14 admin + webhooks) |

---

**End of Document — SHIPPING_API.md**
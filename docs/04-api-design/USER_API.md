# USER_API.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document details the **User Profile and Address API endpoints** for SmartLight customers. Includes profile management, address book, notification preferences, PDPD rights (data export, deletion).

---

## 2. User Profile Endpoints (`/v1/users/me`)

### 2.1 EP-USER-001 — Get Current User

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/users/me` |
| **Authentication** | Yes |
| **Cache** | Private, max-age=60 |
| **Related Use Case** | UC-ID-003 |
| **Related Entity** | user |

**Response `200 OK`:**

```
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "Nguyễn",
    "lastName": "Văn A",
    "phone": "+84912345678",
    "status": "active",
    "emailVerifiedAt": "2026-07-01T08:00:00Z",
    "locale": "vi-VN",
    "defaultAddressId": "uuid",
    "loyaltyTier": null,
    "createdAt": "...",
    "updatedAt": "...",
    "deletedAt": null
  }
}
```

---

### 2.2 EP-USER-002 — Update Current User

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/users/me` |
| **Idempotency** | Required |
| **Audit** | `user.profile_updated` |

**Request Body:**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `firstName` | string | No | Max 100 |
| `lastName` | string | No | Max 100 |
| `phone` | string | No | +84 format |
| `locale` | string | No | Default `vi-VN` |

**Response `200 OK`:** Updated user object.

**Business Rule:** Email cannot be changed via this endpoint (use dedicated flow).

---

### 2.3 EP-USER-003 — Delete Own Account (PDPD)

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/users/me` |
| **Authentication** | Yes |
| **Idempotency** | Required |
| **Audit** | `user.deleted` and `user.anonymized` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `password` | string | Yes (re-auth) |
| `reason` | string | No |
| `confirmation` | string | Required: `"DELETE MY ACCOUNT"` |

**Response `202 Accepted`:**

```
{
  "data": {
    "anonymizationScheduled": true,
    "deletionDate": "2026-08-02T00:00:00Z",
    "gracePeriodDays": 30
  }
}
```

> 30-day grace period before permanent anonymization. Can be restored via `/users/me/restore` during grace period.

**Business Rule:** BR-ID-007, BR-COMP-001 (PDPD)

---

### 2.4 EP-USER-009 — Restore Own Account (Within Grace Period)

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/users/me/restore` |
| **Authentication** | Yes (with valid token) |
| **Audit** | `user.restored` |

**Response `200 OK`:** `{ "data": { "restored": true } }`

> Only valid within 30-day grace period after deletion request.

---

### 2.5 EP-USER-010 — Cookie Consent State

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/users/me/consent` |

**Response `200 OK`:**

```
{
  "data": {
    "necessary": true,
    "analytics": false,
    "marketing": false,
    "consentedAt": "2026-07-03T15:30:00Z",
    "expiresAt": "2027-07-03T15:30:00Z"
  }
}
```

---

## 3. Notification Preferences

### 3.1 EP-USER-004 — Get Notification Preferences

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/users/me/preferences` |
| **Related Entity** | notification_preference |

**Response `200 OK`:**

```
{
  "data": [
    { "channel": "email", "eventType": "order.confirmed", "enabled": true },
    { "channel": "email", "eventType": "order.shipped", "enabled": true },
    { "channel": "email", "eventType": "review.reply", "enabled": false },
    { "channel": "email", "eventType": "marketing.newsletter", "enabled": false }
  ]
}
```

---

### 3.2 EP-USER-005 — Update Notification Preferences

| Field | Value |
| --- | --- |
| **Method** | PUT |
| **URL** | `/v1/users/me/preferences` |
| **Idempotency** | Required |

**Request Body:**

```
{
  "preferences": [
    { "channel": "email", "eventType": "order.shipped", "enabled": true },
    { "channel": "email", "eventType": "marketing.newsletter", "enabled": true }
  ]
}
```

**Response `200 OK`:** Updated preferences.

**Business Rule:** BR-NOT-006: Marketing requires opt-in.

---

## 4. Address Book

### 4.1 EP-ADDR-001 — List Addresses

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/users/me/addresses` |
| **Authentication** | Yes |
| **Related Entity** | address |

**Query Parameters:**

| Name | Type | Description |
| --- | --- | --- |
| `limit` | int | Default 20, max 100 |
| `sort` | string | `createdAt`, `-createdAt`, `isDefault` |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "label": "Home",
      "fullName": "Nguyễn Văn A",
      "phone": "+84912345678",
      "province": "Thành phố Hồ Chí Minh",
      "district": "Quận 1",
      "ward": "Phường Bến Nghé",
      "street": "123 Nguyễn Huệ",
      "country": "VN",
      "isDefault": true,
      "createdAt": "..."
    }
  ],
  "meta": { "pagination": { ... } }
}
```

---

### 4.2 EP-ADDR-002 — Create Address

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/users/me/addresses` |
| **Idempotency** | Required |
| **Audit** | `user.address_created` |

**Request Body:**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `label` | string | No | Max 50 |
| `fullName` | string | Yes | Max 100 |
| `phone` | string | Yes | +84 format |
| `province` | string | Yes | Must match directory |
| `district` | string | Yes | Within province |
| `ward` | string | Yes | Within district |
| `street` | string | Yes | Max 255 |
| `country` | string | No | Default "VN" |
| `isDefault` | boolean | No | Default false |

**Response `201 Created`:** Address object.

**Business Rule:** BR-ID-006: First address auto-default.

---

### 4.3 EP-ADDR-003 — Get Address

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/users/me/addresses/{addressId}` |

**Response `200 OK`:** Address object.

**Errors:** `ADDRESS_NOT_FOUND` (404), `FORBIDDEN` (403, not own)

---

### 4.4 EP-ADDR-004 — Replace Address

| Field | Value |
| --- | --- |
| **Method** | PUT |
| **URL** | `/v1/users/me/addresses/{addressId}` |
| **Audit** | `user.address_updated` |

Request: Same fields as create (full replacement).

**Response `200 OK`:** Address object.

---

### 4.5 EP-ADDR-005 — Patch Address

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/users/me/addresses/{addressId}` |

Request: Any subset of address fields.

**Response `200 OK`:** Address object.

---

### 4.6 EP-ADDR-006 — Delete Address

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/users/me/addresses/{addressId}` |
| **Audit** | `user.address_deleted` |

**Response:** `204 No Content`

**Business Rule:** Cannot delete address that is the default for active orders (use a different address as default first).

---

### 4.7 EP-ADDR-007 — Set Default Address

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/users/me/addresses/{addressId}/default` |
| **Audit** | `user.default_address_changed` |

**Response `200 OK`:** Updated address (with `isDefault: true`); previous default unflagged.

---

## 5. PDPD Rights

### 5.1 EP-USER-009 — Export Personal Data

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/users/me/export` |
| **Audit** | `user.data_export_requested` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `format` | enum | `json` | `csv` | (default `json`) |
| `sections` | array | Default: `["profile", "orders", "addresses", "reviews", "notifications"]` |

**Response `202 Accepted`:**

```
{
  "data": {
    "exportId": "uuid",
    "estimatedReadyAt": "2026-07-04T15:30:00Z",
    "downloadUrl": null,
    "notificationChannel": "email"
  }
}
```

> Export processed asynchronously. Email sent when ready (download link valid for 7 days).

---

## 6. Cross-References

| Field | Reference |
| --- | --- |
| Use Cases | UC-ID-003..008 |
| Business Rules | BR-ID-001..013 |
| Workflows | WF-CUST-01..05 |
| Features | SF-ID-001..013 |
| Acceptance Criteria | AC-ID-001..005 |
| Entities | user, address, notification_preference, cookie_consent |

---

## 7. Response Examples

### 7.1 User Profile (Own)

```
{
  "data": {
    "id": "0192ca3e-c5d8-7e1f-a012-3456789abcde",
    "email": "user@example.com",
    "firstName": "Nguyễn",
    "lastName": "Văn A",
    "phone": "+84912345678",
    "status": "active",
    "emailVerifiedAt": "2026-07-01T08:00:00Z",
    "locale": "vi-VN",
    "defaultAddressId": "uuid",
    "createdAt": "2026-06-15T10:30:00Z",
    "updatedAt": "2026-07-03T15:30:00Z",
    "deletedAt": null
  }
}
```

### 7.2 Address

```
{
  "data": {
    "id": "uuid",
    "label": "Văn phòng",
    "fullName": "Nguyễn Văn A",
    "phone": "+84912345678",
    "province": "Thành phố Hồ Chí Minh",
    "provinceCode": "79",
    "district": "Quận 1",
    "districtCode": "760",
    "ward": "Phường Bến Nghé",
    "wardCode": "26734",
    "street": "123 Nguyễn Huệ",
    "country": "VN",
    "countryCode": "VN",
    "isDefault": true,
    "createdAt": "2026-06-15T10:30:00Z",
    "updatedAt": "2026-06-15T10:30:00Z"
  }
}
```

---

## 8. Coverage Validation

| Check | Status |
| --- | --- |
| All profile endpoints defined | ✓ |
| All address endpoints defined | ✓ |
| Notification preferences covered | ✓ |
| PDPD rights (export, delete) covered | ✓ |
| Grace period for account delete covered | ✓ |
| Validation rules documented | ✓ |
| Audit logging specified | ✓ |
| Cross-references resolved | ✓ |

---

## 9. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial user API: 14 endpoints (profile + addresses + PDPD rights) |

---

**End of Document — USER_API.md**
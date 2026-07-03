# NOTIFICATION_API.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document details the **Notification API endpoints** for SmartLight. Covers customer notification preferences, public cookie consent, admin email templates, and notification logs.

---

## 2. Customer Notification Endpoints

### 2.1 EP-NOT-001 — Get Notification Preferences

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/notifications/preferences` |
| **Authentication** | Yes |
| **Related Entity** | notification_preference |

Detailed in `USER_API.md` as `EP-USER-004`.

---

### 2.2 EP-NOT-002 — Update Notification Preferences

| Field | Value |
| --- | --- |
| **Method** | PUT |
| **URL** | `/v1/notifications/preferences` |
| **Idempotency** | Required |

Detailed in `USER_API.md` as `EP-USER-005`.

---

### 2.3 EP-NOT-003 — Get Inbox (V1.5)

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/notifications/inbox` |
| **Authentication** | Yes |
| **Cache** | private, max-age=60 |

> **V1.5+ feature.** V1: email-only; inbox not exposed.

---

### 2.4 EP-NOT-004 — Mark Inbox Read

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/notifications/mark-read` |
| **Authentication** | Yes |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `ids` | array | Optional; if omitted, marks all |

---

## 3. Public Cookie Consent

### 3.1 EP-NOT-011 — Record Cookie Consent

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/notifications/cookie-consent` |
| **Authentication** | None |
| **Idempotency** | Required |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `visitorId` | string | Yes (UUID) |
| `sessionId` | string | Optional |
| `necessary` | boolean | Always `true` |
| `analytics` | boolean | Default false |
| `marketing` | boolean | Default false |

**Response `201 Created`:**

```
{
  "data": {
    "consentId": "uuid",
    "visitorId": "...",
    "consentedAt": "...",
    "expiresAt": "2027-07-03T15:30:00Z"
  }
}
```

**Business Rule:** BR-PLT-008, BR-COMP-001 (PDPD)

---

### 3.2 EP-NOT-012 — Get Consent State

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/notifications/cookie-consent/{visitorId}` |
| **Authentication** | None |

**Response `200 OK`:** Latest consent state.

---

## 4. Admin Email Template Endpoints

### 4.1 EP-ADM-NOT-001 — List Email Templates

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/notifications/templates` |
| **Authentication** | Yes (MarketingManager+) |

**Query Parameters:** `code`, `locale`, `isActive`.

---

### 4.2 EP-ADM-NOT-002 — Get Template

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/notifications/templates/{templateId}` |

---

### 4.3 EP-ADM-NOT-003 — Create Template

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/notifications/templates` |
| **Audit** | `email_template.created` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `code` | string | Yes |
| `subject` | string | Yes |
| `bodyTemplate` | string | Yes (HTML/Markdown) |
| `locale` | string | Default `vi-VN` |
| `isActive` | boolean | Default true |

---

### 4.4 EP-ADM-NOT-004 — Update Template

| Field | Value |
| --- | --- |
| **Method** | PUT |
| **URL** | `/v1/admin/notifications/templates/{templateId}` |
| **Audit** | `email_template.updated` |

> Updates increment `version`.

---

### 4.5 EP-ADM-NOT-005 — Deactivate Template

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/notifications/templates/{templateId}` |
| **Audit** | `email_template.deactivated` |

---

### 4.6 EP-ADM-NOT-006 — Preview Template

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/notifications/templates/{templateId}/preview` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `sampleData` | object | Yes (key-value for template variables) |

**Response `200 OK`:**

```
{
  "data": {
    "subject": "...",
    "bodyHtml": "...",
    "bodyText": "..."
  }
}
```

---

## 5. Admin Notification Log Endpoints

### 5.1 EP-ADM-NOT-011 — List Send Logs

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/notifications/logs` |
| **Authentication** | Yes (MarketingManager+) |

**Query Parameters:** `status`, `templateCode`, `recipientEmail`, `from`, `to`, etc.

---

### 5.2 EP-ADM-NOT-012 — Retry Failed Send

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/notifications/logs/{logId}/retry` |
| **Audit** | `notification.retried` |

Resends a failed notification (increment attempts counter).

---

## 6. Support Ticket Endpoints (Cross-Reference)

Detailed in `ADMIN_API.md`.

| EP-ID | Method | URL |
| --- | --- | --- |
| EP-SUP-001 | GET | `/v1/support/tickets` |
| EP-SUP-002 | POST | `/v1/support/tickets` |
| EP-SUP-003 | GET | `/v1/support/tickets/{ticketId}` |
| EP-SUP-004 | POST | `/v1/support/tickets/{ticketId}/messages` |
| EP-SUP-005 | GET | `/v1/support/tickets/{ticketId}/messages` |
| EP-SUP-006 | POST | `/v1/support/tickets/{ticketId}/close` |

---

## 7. Cross-References

| Field | Reference |
| --- | --- |
| Use Cases | UC-NOT-001..005, UC-SUP-001..005 |
| Business Rules | BR-NOT-001..006, BR-SUP-001..007, BR-COMP-001 |
| Workflows | WF-NOT-01..05, WF-SUP-01..02 |
| Features | SF-NOT-001..005, SF-SUP-001..007 |
| Entities | email_template, notification_log, notification_preference, cookie_consent, support_ticket, ticket_message |

---

## 8. Coverage Validation

| Check | Status |
| --- | --- |
| Customer preferences covered | ✓ |
| Cookie consent covered | ✓ |
| Admin template CRUD covered | ✓ |
| Admin template preview covered | ✓ |
| Admin log + retry covered | ✓ |
| Support tickets referenced | ✓ |
| Audit logging specified | ✓ |

---

## 9. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial notification API: 14 endpoints (4 customer + 2 cookie + 8 admin) |

---

**End of Document — NOTIFICATION_API.md**
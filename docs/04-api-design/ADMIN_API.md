# ADMIN_API.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document details **admin-only endpoints** that don't fit naturally into a single business module. Includes dashboard, RBAC management, admin user management, audit logs, feature flags, and platform configuration.

---

## 2. Dashboard & Analytics

### 2.1 EP-ADM-DASH-001 — Get High-Level Stats

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/dashboard/stats` |
| **Authentication** | Yes (admin) |
| **Cache** | private, max-age=60 |

**Response `200 OK`:**

```
{
  "data": {
    "period": { "from": "2026-07-01", "to": "2026-07-03" },
    "revenue": {
      "total": 12500000000,
      "currency": "VND",
      "changePercent": 12.5
    },
    "orders": {
      "total": 245,
      "pending": 12,
      "processing": 45,
      "shipped": 89,
      "delivered": 75,
      "cancelled": 24
    },
    "customers": {
      "newSignups": 89,
      "activeUsers": 1234
    },
    "lowStockAlerts": 12,
    "pendingReturns": 5,
    "failedPayments": 3
  }
}
```

---

### 2.2 EP-ADM-DASH-002 — Revenue Chart

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/dashboard/revenue` |

**Query:** `from`, `to`, `granularity` (`day` | `week` | `month`).

**Response:** Time-series revenue data.

---

### 2.3 EP-ADM-DASH-003 — Order Metrics

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/dashboard/orders` |

Detailed order pipeline.

---

### 2.4 EP-ADM-DASH-004 — Inventory Alerts

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/dashboard/inventory-alerts` |

Low-stock items count + recent restock needs.

---

## 3. RBAC Management

### 3.1 EP-ADM-RBAC-001 — List Roles

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/rbac/roles` |
| **Authentication** | Yes (admin) |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "name": "CatalogManager",
      "description": "...",
      "isSystem": true,
      "permissions": ["catalog.product.update", "catalog.product.publish"],
      "userCount": 3
    }
  ]
}
```

---

### 3.2 EP-ADM-RBAC-002 — Get Role

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/rbac/roles/{roleId}` |

---

### 3.3 EP-ADM-RBAC-003 — Create Role

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/rbac/roles` |
| **Authorization** | SuperAdmin |
| **Audit** | `role.created` |

**Request:**

| Field | Type | Required |
| --- | --- | --- |
| `name` | string | Yes |
| `description` | string | No |
| `permissionIds` | array | Yes |

---

### 3.4 EP-ADM-RBAC-004 — Update Role

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/rbac/roles/{roleId}` |
| **Authorization** | SuperAdmin |
| **Audit** | `role.updated` |

Cannot update system roles (only `isSystem: false`).

---

### 3.5 EP-ADM-RBAC-005 — Delete Role

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/rbac/roles/{roleId}` |
| **Authorization** | SuperAdmin |
| **Audit** | `role.deleted` |

**Constraint:** Cannot delete role with assigned admins (error `ROLE_HAS_USERS`).

---

### 3.6 EP-ADM-RBAC-011 — List Permissions

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/rbac/permissions` |

System-managed; not creatable.

---

### 3.7 EP-ADM-RBAC-021 — Get Admin Roles

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/rbac/admins/{adminId}/roles` |

---

### 3.8 EP-ADM-RBAC-022 — Assign Role

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/rbac/admins/{adminId}/roles` |
| **Authorization** | SuperAdmin |
| **Audit** | `admin_user.role_assigned` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `roleId` | string | Yes |

---

### 3.9 EP-ADM-RBAC-023 — Revoke Role

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/rbac/admins/{adminId}/roles/{roleId}` |
| **Authorization** | SuperAdmin |
| **Audit** | `admin_user.role_revoked` |

---

## 4. Admin User Management

### 4.1 EP-ADM-USR-001 — List Admins

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/admins` |
| **Authorization** | SuperAdmin |

Includes MFA status, last login.

---

### 4.2 EP-ADM-USR-002 — Create Admin

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/admins` |
| **Authorization** | SuperAdmin |
| **Audit** | `admin_user.created` |

**Request:**

| Field | Type | Required |
| --- | --- | --- |
| `email` | string | Yes |
| `password` | string | Yes (temp; must change on first login) |
| `displayName` | string | Yes |
| `roleIds` | array | Yes |

**Side Effects:** Invitation email sent.

---

### 4.3 EP-ADM-USR-003 — Get Admin

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/admins/{adminId}` |

---

### 4.4 EP-ADM-USR-004 — Update Admin

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/admins/{adminId}` |
| **Audit** | `admin_user.updated` |

---

### 4.5 EP-ADM-USR-005 — Soft-Delete Admin

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/admins/{adminId}` |
| **Audit** | `admin_user.deleted` |

---

### 4.6 EP-ADM-USR-006 — Suspend Admin

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/admins/{adminId}/suspend` |
| **Audit** | `admin_user.suspended` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `reason` | string | Yes |

---

### 4.7 EP-ADM-USR-007 — Activate Admin

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/admins/{adminId}/activate` |
| **Audit** | `admin_user.activated` |

---

## 5. Audit Logs

### 5.1 EP-ADM-AUD-001 — List Audit Logs

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/audit/logs` |
| **Authentication** | Yes (admin) |

**Query Parameters:**

| Name | Description |
| --- | --- |
| `actorType` | Filter (User, AdminUser, System, Webhook) |
| `actorId` | Filter by actor |
| `action` | Filter by action code |
| `entityType` | Filter by entity |
| `entityId` | Filter by entity |
| `from`, `to` | Date range |
| `severity` | `info`, `warning`, `critical` |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "actor": { "type": "AdminUser", "id": "uuid", "displayName": "..." },
      "action": "refund.issued",
      "entity": { "type": "Refund", "id": "uuid" },
      "metadata": { ... },
      "ipAddress": "...",
      "requestId": "...",
      "createdAt": "..."
    }
  ],
  "meta": { "pagination": { ... } }
}
```

---

### 5.2 EP-ADM-AUD-002 — Get Audit Detail

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/audit/logs/{auditId}` |

**Response:** Includes `before` and `after` JSON snapshots.

---

### 5.3 EP-ADM-AUD-003 — Export Audit Logs

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/audit/logs/export` |
| **Format** | CSV streaming |

**Audit:** `audit.export_requested`

---

## 6. Feature Flags

### 6.1 EP-ADM-FLG-001 — List Flags

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/feature-flags` |

**Response:** All flags with effective values.

---

### 6.2 EP-ADM-FLG-002 — Create Flag

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/feature-flags` |
| **Authorization** | SuperAdmin |
| **Audit** | `feature_flag.created` |

**Request:**

| Field | Type | Required |
| --- | --- | --- |
| `key` | string | Yes; URL-safe |
| `description` | string | No |
| `valueType` | enum | `boolean`, `string`, `number`, `json` |
| `defaultValue` | string | Yes |
| `enabled` | boolean | Default false |

---

### 6.3 EP-ADM-FLG-003 — Update Flag

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/feature-flags/{flagId}` |
| **Authorization** | SuperAdmin |
| **Audit** | `feature_flag.updated` |

---

### 6.4 EP-ADM-FLG-004 — Soft-Delete Flag

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/feature-flags/{flagId}` |
| **Audit** | `feature_flag.deleted` |

---

### 6.5 EP-ADM-FLG-005 — List Overrides

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/feature-flags/{flagId}/overrides` |

Per-user or per-segment overrides.

---

### 6.6 EP-ADM-FLG-006 — Add Override

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/feature-flags/{flagId}/overrides` |
| **Audit** | `feature_flag.override_added` |

**Request:**

| Field | Type | Required |
| --- | --- | --- |
| `targetType` | enum | `user`, `segment`, `percentage` |
| `targetId` | string | Yes |
| `value` | string | Yes |
| `expiresAt` | datetime | No |

---

### 6.7 EP-ADM-FLG-007 — Remove Override

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/feature-flags/{flagId}/overrides/{overrideId}` |
| **Audit** | `feature_flag.override_removed` |

---

## 7. Platform Configuration

### 7.1 EP-ADM-CFG-001 — Get System Configs

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/config/system` |
| **Authentication** | Yes (admin) |
| **Authorization** | SuperAdmin for sensitive keys |

**Response:** Grouped by category.

---

### 7.2 EP-ADM-CFG-002 — Set System Config

| Field | Value |
| --- | --- |
| **Method** | PUT |
| **URL** | `/v1/admin/config/system/{key}` |
| **Authorization** | SuperAdmin |
| **Audit** | `system_config.updated` |

**Request:**

| Field | Type | Required |
| --- | --- | --- |
| `value` | string | Yes |
| `valueType` | enum | Yes |

---

### 7.3 EP-ADM-CFG-011..014 — Static Pages

CRUD for static content (terms, privacy, FAQ).

See `docs/02-system-analysis/` and reference implementations in `MEDIA_API.md` for uploads.

---

## 8. Cross-References

| Field | Reference |
| --- | --- |
| Use Cases | UC-ADM-001..010 |
| Business Rules | BR-ADM-001..010 |
| Workflows | WF-ADM-01..05 |
| Features | SF-ADM-001..010 |
| Entities | admin_user, role, permission, admin_user_role, role_permission, audit_log, feature_flag, system_config, static_page |

---

## 9. Coverage Validation

| Check | Status |
| --- | --- |
| Dashboard covered | ✓ |
| RBAC CRUD covered | ✓ |
| Admin user management covered | ✓ |
| Audit log browse + export covered | ✓ |
| Feature flag CRUD + override covered | ✓ |
| System config covered | ✓ |
| Static page CRUD covered | ✓ |
| Audit logging specified | ✓ |
| Authorization documented | ✓ |

---

## 10. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial admin API: 27 endpoints (dashboard, RBAC, admin users, audit, flags, config) |

---

**End of Document — ADMIN_API.md**
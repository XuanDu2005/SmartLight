# SOFT_DELETE_STRATEGY.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal Database Architect

---

## 1. Purpose

This document defines how SmartLight handles **soft delete** vs **hard delete**. It specifies:
- Which entities support soft delete
- The `deletedAt` column convention
- Visibility behavior
- Restoration process
- Purge policy
- Business rules

This is **design only** — no SQL is generated.

---

## 2. Strategy Overview

SmartLight uses **soft delete as default** for user-facing data. Hard delete is reserved for:
- Transient data (sessions, tokens, expired reservations)
- PDPD right-to-be-forgotten (with anonymization)
- GDPR-style data subject requests
- Test data (dev/staging only)

### 2.1 Decision Matrix

| Data Type | Soft Delete? | Hard Delete Allowed? | Reason |
| --- | --- | --- | --- |
| Customer profile | Yes | No (anonymize only) | PDPD |
| Customer orders | No | No | Financial record (7 years) |
| Products | Yes | No | Recover from accidental delete |
| Categories | Yes | No | Recover from accidental delete |
| Brands | Yes | No | Recover |
| Product variants | Yes | No | Recover |
| Cart | Yes (TTL) | Yes after 90 days | Transient |
| Checkout sessions | No (TTL) | Yes after expiry | Transient |
| Payments | No | No | Financial record (7 years) |
| Refunds | No | No | Financial record |
| Shipments | Yes | No | Operational |
| Returns | Yes | No | Operational + audit |
| Reviews | Yes | No (anonymize on user delete) | User content |
| Email templates | Yes | No | Re-usable |
| Notification logs | No | Yes after 1 year | Transient |
| Support tickets | Yes | No (anonymize on user delete) | Customer service |
| Audit logs | No (immutable) | No | Compliance |
| Feature flags | Yes | No | Recover |
| Static pages | Yes | No | Recover |
| Refresh tokens | No | Yes | Security |
| User sessions | No | Yes | Security |
| MFA recovery codes | No | Yes | Security |
| Stock reservations | No | Yes after 30 days post-release | Transient |
| Stock movements | No | No | Append-only audit |
| Webhook events | No | Yes after 90 days | Idempotency TTL |

---

## 3. Soft Delete Implementation

### 3.1 DeletedAt Column

Every soft-deletable entity has:

```
deleted_at  TIMESTAMP NULL
```

- **NULL** = active (not deleted)
- **Non-NULL** = soft-deleted; UTC timestamp of deletion

### 3.2 Read Patterns

Default read: **exclude soft-deleted rows** unless explicitly requested.

```
SELECT * FROM product WHERE deleted_at IS NULL
```

Prisma default:
```
prisma.product.findMany({ where: { deletedAt: null } })
```

### 3.3 Soft Delete Operation

When soft-deleting an entity:

1. Set `deletedAt = NOW()`
2. Update `updatedAt = NOW()`
3. Trigger domain event `EntityDeleted`
4. Other modules observe and react (cache invalidation, etc.)

### 3.4 Restoration Operation

When restoring (admin action):

1. Set `deletedAt = NULL`
2. Update `updatedAt = NOW()`
3. Verify no other constraints violated (e.g., no duplicate slug after restore)
4. Trigger `EntityRestored`

---

## 4. Per-Entity Soft Delete Rules

### 4.1 User

| Rule | Value |
| --- | --- |
| Soft delete? | Yes (via `deleted_at`) |
| When deleted | Anonymize PII (email, name, phone) per PDPD |
| Restore allowed? | No (anonymization is destructive) |
| Hard delete? | Yes after 30 days post-anonymization |
| Business rule | BR-ID-007, BR-COMP-001 |

### 4.2 AdminUser

| Rule | Value |
| --- | --- |
| Soft delete? | Yes |
| When deleted | Cannot restore if MFA secrets still active; revoke all sessions |
| Restore allowed? | Admin only; with audit |
| Hard delete? | Yes after 30 days |
| Business rule | BR-ADM-002 |

### 4.3 Product

| Rule | Value |
| --- | --- |
| Soft delete? | Yes |
| When deleted | Hidden from storefront; reservations cancelled; cart items removed |
| Restore allowed? | Yes, by Admin |
| Hard delete? | No |
| Business rule | BR-CAT-001 |

### 4.4 Category

| Rule | Value |
| --- | --- |
| Soft delete? | Yes |
| When deleted | Children must be moved first; products cannot be in deleted category |
| Restore allowed? | Yes |
| Hard delete? | No |
| Business rule | BR-CAT-001 |

### 4.5 Brand

| Rule | Value |
| --- | --- |
| Soft delete? | Yes |
| When deleted | Products cannot be in deleted brand; reassign first |
| Restore allowed? | Yes |
| Hard delete? | No |
| Business rule | BR-CAT-002 |

### 4.6 ProductVariant

| Rule | Value |
| --- | --- |
| Soft delete? | Yes |
| When deleted | Inventory released; active carts updated to remove item; active orders retain snapshot |
| Restore allowed? | Yes |
| Hard delete? | No |
| Business rule | BR-CAT-005 |

### 4.7 Cart

| Rule | Value |
| --- | --- |
| Soft delete? | Yes (via `deleted_at` + status = 'Abandoned') |
| When deleted | Stock reservations released |
| Restore allowed? | Yes if not expired |
| Hard delete? | Yes after 90 days |
| Business rule | BR-CRT-005 |

### 4.8 Order

| Rule | Value |
| --- | --- |
| Soft delete? | **No** — financial record retention required (7 years) |
| Alternative | Use status='Cancelled' instead of delete |
| Hard delete? | No |
| Business rule | BR-ORD-002 |

### 4.9 Payment, Refund

| Rule | Value |
| --- | --- |
| Soft delete? | **No** — financial record retention required |
| Hard delete? | No |
| Business rule | BR-PAY-002 |

### 4.10 Shipment

| Rule | Value |
| --- | --- |
| Soft delete? | Yes (operational) |
| When deleted | Retain tracking events |
| Restore allowed? | Yes |
| Hard delete? | After 7 years |

### 4.11 Return

| Rule | Value |
| --- | --- |
| Soft delete? | Yes |
| When deleted | Anonymize customer reference; restock state preserved |
| Restore allowed? | Yes |
| Hard delete? | After 2 years |
| Business rule | BR-RTN-007 |

### 4.12 Review

| Rule | Value |
| --- | --- |
| Soft delete? | Yes (via `deleted_at`) |
| When deleted | Hide from public; product rating recalculated |
| Restore allowed? | Yes |
| Hard delete? | Anonymize user reference; retain aggregate stats |
| Business rule | BR-RVW-005 |

### 4.13 EmailTemplate

| Rule | Value |
| --- | --- |
| Soft delete? | Yes |
| When deleted | NotificationLog references preserved (templateId still valid) |
| Restore allowed? | Yes |
| Hard delete? | No |

### 4.14 NotificationLog

| Rule | Value |
| --- | --- |
| Soft delete? | No |
| Hard delete? | Yes after 1 year |
| Reason | Operational data; no business value after retention period |

### 4.15 NotificationPreference

| Rule | Value |
| --- | --- |
| Soft delete? | Yes |
| When deleted | With owner (User/AdminUser) |
| Restore allowed? | Yes if owner restored |

### 4.16 CookieConsent

| Rule | Value |
| --- | --- |
| Soft delete? | No |
| Hard delete? | Yes after 1 year |
| Reason | Transient privacy record |

### 4.17 SupportTicket

| Rule | Value |
| --- | --- |
| Soft delete? | Yes (via `deleted_at`) |
| When deleted | Customer reference anonymized; messages preserved |
| Restore allowed? | Yes if within 2 years |
| Hard delete? | After 2 years (anonymized) |
| Business rule | BR-SUP-006 |

### 4.18 AuditLog

| Rule | Value |
| --- | --- |
| Soft delete? | **No — append-only** |
| Hard delete? | **Never** |
| Retention | 7 years (regulatory) |

### 4.19 FeatureFlag

| Rule | Value |
| --- | --- |
| Soft delete? | Yes |
| Restore allowed? | Yes |
| Hard delete? | No (audit trail of flag existence valuable) |

### 4.20 StaticPage

| Rule | Value |
| --- | --- |
| Soft delete? | Yes |
| Restore allowed? | Yes |
| Hard delete? | No |

---

## 5. Cascade Soft Delete

When a parent is soft-deleted, child behavior is determined by relationship:

| Relationship | Behavior on Parent Soft-Delete |
| --- | --- |
| Product → ProductVariant | Children SOFT-deleted together |
| Product → ProductImage | Children SOFT-deleted together |
| Category → Category (self) | Children must be moved first (RESTRICT) |
| Cart → CartItem | Items removed (HARD) on cart abandonment |
| Order → OrderItem | N/A — Order is not soft-deletable |
| Return → ReturnItem | Children SOFT-deleted |
| Review → ReviewReply | Children SOFT-deleted |

> **Implementation:** Application-level; not database FK cascades. Children soft-delete is performed in a transaction with parent.

---

## 6. Visibility Behavior

### 6.1 Storefront

| Entity | Visibility to Customer |
| --- | --- |
| Product | Show if `deletedAt IS NULL AND status = 'Published'` |
| Category | Show if `deletedAt IS NULL AND isActive` |
| Brand | Show if `deletedAt IS NULL AND isActive` |
| Variant | Show if `deletedAt IS NULL AND isActive` |
| Order | Customer sees only their own orders, regardless of status |
| Review | Show if `status = 'Published' AND deletedAt IS NULL` |

### 6.2 Admin

| Entity | Visibility |
| --- | --- |
| All | Admin sees soft-deleted rows (with explicit toggle to filter) |
| Audit | All audit entries (never deleted) |

### 6.3 Customer (Self-Service)

| Entity | Visibility |
| --- | --- |
| Account | Cannot see after deletion; can request restore (within 30 days) |
| Orders | See all own orders |
| Reviews | Can see own (including soft-deleted) |
| Addresses | See all own |

---

## 7. Restoration Process

### 7.1 Allowed Restorations

| Entity | Allowed By | Time Limit |
| --- | --- | --- |
| Product | Admin | None |
| Category | Admin | None |
| Brand | Admin | None |
| Variant | Admin | None |
| Cart | System (TTL restore) | Before abandonment |
| Order | N/A (not soft-deletable) | — |
| Review | Admin | None |
| SupportTicket | Support | Before 2-year hard delete |
| FeatureFlag | Admin | None |
| StaticPage | Admin | None |

### 7.2 Restoration Workflow

```
1. Admin opens "Deleted Items" view
2. Admin selects entity to restore
3. System validates restoration is allowed:
   - No constraint violations (e.g., duplicate slug)
   - Parent exists and not deleted
4. Set deletedAt = NULL
5. updatedAt = NOW()
6. Trigger EntityRestored event
7. Cache invalidation
8. Notify any subscribers
```

### 7.3 Restoration Conflicts

| Conflict | Resolution |
| --- | --- |
| Slug now in use by another entity | Auto-suffix with timestamp or block |
| Category has children that were re-parented | Warn admin; confirm |
| User with same email registered | Block; require explicit handling |

---

## 8. Purge Policy

### 8.1 Scheduled Purge Job

A daily cron job (`purge.service.ts`) handles hard-delete of eligible soft-deleted records.

### 8.2 Purge Schedule

| Entity | Soft-Delete Wait Period | Hard Delete Trigger |
| --- | --- | --- |
| User (anonymized) | 30 days | Anonymization + 30 days |
| AdminUser | 30 days | After admin offboarding |
| Cart | 90 days | Status = 'Abandoned' |
| CheckoutSession | 30 days post-expiry | Status = 'Expired' |
| RefreshToken | 30 days post-revoke | Expired + 30 days |
| UserSession | 30 days post-end | Expired + 30 days |
| MFA RecoveryCode | With MFA secret | With secret |
| WebhookEvent | 90 days post-processed | ReceivedAt + 90 days |
| StockReservation | 30 days post-release | Released + 30 days |
| NotificationLog | 1 year post-send | SentAt + 1 year |
| CookieConsent | 1 year post-consent | Expires + grace |
| ReturnImage | With return hard-delete | 2 years post-closure |
| ReviewHelpfulVote | With review hard-delete | — |

### 8.3 Anonymization vs Hard Delete

For PDPD compliance, **user data is anonymized, not hard-deleted** until the retention period expires. This balances:
- Audit trail preservation
- User privacy rights

Anonymization strategy:
- Replace email with `deleted_<uuid>@anonymized.local`
- Replace name with "Deleted User"
- Replace phone with NULL
- Keep: order references, payment references (financial trail)
- Set `deletedAt` timestamp

---

## 9. Business Rules

| ID | Rule |
| --- | --- |
| BR-SD-001 | Default soft delete; hard delete requires admin + audit |
| BR-SD-002 | Cascade soft delete within aggregate |
| BR-SD-003 | Storefront excludes soft-deleted rows by default |
| BR-SD-004 | Admin views include soft-deleted rows (toggle to filter) |
| BR-SD-005 | Restoration restores timestamps; createdAt remains original |
| BR-SD-006 | PDPD anonymization replaces PII; retains aggregate statistics |
| BR-SD-007 | Hard delete only after retention period expires |
| BR-SD-008 | Audit logs never hard-deleted |
| BR-SD-009 | Soft delete sets `deletedAt = NOW()` and `updatedAt = NOW()` atomically |
| BR-SD-010 | Domain event emitted on every soft-delete |

---

## 10. Implementation Patterns

### 10.1 Repository Pattern (Future)

Every repository has:

```
- findActive(filter)      // excludes deletedAt
- findAll(filter)         // includes deletedAt
- findById(id, includeDeleted = false)
- softDelete(id, actor)
- restore(id, actor)
- hardDelete(id, actor)   // admin only
```

### 10.2 Service Layer

Soft delete operations are service-level:

```
await productService.delete(productId, actor)
// internally: sets deletedAt, emits event, invalidates cache
```

### 10.3 Prisma Middleware (Future)

Centralized soft-delete via Prisma middleware that:
- Auto-filters `deletedAt: null` on read
- Sets `deletedAt: new Date()` on `delete` calls
- Exposes `deleteMany` for admin operations

> **Prisma middleware is V2 territory**; in V1, repositories handle soft delete manually.

---

## 11. Coverage Validation

| Check | Status |
| --- | --- |
| Every entity classified (soft/hard/never) | ✓ |
| Cascade rules documented | ✓ |
| Visibility rules per role documented | ✓ |
| Restoration workflow defined | ✓ |
| Purge schedule defined | ✓ |
| PDPD anonymization covered | ✓ |
| Business rules documented | ✓ |

---

## 12. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal Database Architect | Initial soft delete strategy: 20 entities classified, purge schedule, PDPD anonymization, restoration workflow |

---

**End of Document — SOFT_DELETE_STRATEGY.md**
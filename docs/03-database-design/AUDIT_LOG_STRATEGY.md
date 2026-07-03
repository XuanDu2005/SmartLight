# AUDIT_LOG_STRATEGY.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal Database Architect

---

## 1. Purpose

This document defines the **audit log strategy** for SmartLight. It specifies:
- Which entities are tracked
- Which actions are audited
- How immutable records are ensured
- Retention policy
- PDPD/GDPR considerations

This is **design only** — no SQL is generated.

---

## 2. Audit Principles

1. **Append-only:** Audit rows are never updated or deleted.
2. **Comprehensive:** All sensitive actions are logged.
3. **Tamper-evident:** Changes to audit schema require DB-level permissions.
4. **Queryable:** Indexed by actor, entity, action, and time.
5. **Separable:** Audit data can be exported/migrated independently.
6. **Async-friendly:** Use outbox pattern for performance.

---

## 3. AuditLog Entity

### 3.1 Definition

| Attribute | Type | Description |
| --- | --- | --- |
| `id` | UUID | Audit row ID |
| `actorType` | enum (User, AdminUser, System, Anonymous) | Who acted |
| `actorId` | UUID nullable | FK to actor (User or AdminUser) |
| `action` | string | Action code (e.g., "order.cancelled", "refund.issued") |
| `entityType` | string | Affected entity (e.g., "Order", "Payment") |
| `entityId` | UUID nullable | FK to affected entity |
| `before` | JSONB | Snapshot before change (nullable for creates) |
| `after` | JSONB | Snapshot after change (nullable for deletes) |
| `ipAddress` | string | Client IP |
| `userAgent` | string | Client user agent |
| `requestId` | UUID | Correlation with logs |
| `sessionId` | UUID nullable | FK to UserSession |
| `reason` | string | Optional reason |
| `metadata` | JSONB | Additional context |
| `createdAt` | timestamp | Audit timestamp (UTC) |

### 3.2 Indexes (see INDEX_STRATEGY.md)

- `idx_audit_logs_actor` on (actorType, actorId)
- `idx_audit_logs_entity` on (entityType, entityId)
- `idx_audit_logs_action` on (action)
- `idx_audit_logs_created` on (createdAt DESC)
- `brin_audit_logs_created` BRIN on (createdAt)
- `gin_audit_logs_metadata` GIN on (metadata)

---

## 4. Tracked Entities and Actions

### 4.1 Identity

| Entity | Tracked Actions | Notes |
| --- | --- | --- |
| User | `user.registered`, `user.email_verified`, `user.password_changed`, `user.mfa_enabled`, `user.deleted`, `user.anonymized` | All login events |
| AdminUser | `admin_user.created`, `admin_user.suspended`, `admin_user.password_changed`, `admin_user.deleted` | All admin lifecycle |
| Role | `role.created`, `role.updated`, `role.deleted`, `permission.granted`, `permission.revoked` | RBAC changes |
| MfaSecret | `mfa.enabled`, `mfa.disabled`, `mfa.reset` | MFA lifecycle |

### 4.2 Catalog

| Entity | Tracked Actions |
| --- | --- |
| Product | `product.created`, `product.updated`, `product.published`, `product.unpublished`, `product.deleted`, `product.restored` |
| Category | `category.created`, `category.updated`, `category.deleted`, `category.restored` |
| Brand | `brand.created`, `brand.updated`, `brand.deleted` |
| ProductVariant | `variant.created`, `variant.updated`, `variant.deleted`, `variant.price_changed` |

### 4.3 Inventory

| Entity | Tracked Actions |
| --- | --- |
| Inventory | `inventory.adjusted` (manual), `inventory.low_stock_detected` |
| InventoryAdjustment | All (every adjustment) |

> Stock movements are themselves an audit log; no separate AuditLog entry needed for routine order-driven movements.

### 4.4 Cart

| Entity | Tracked Actions |
| --- | --- |
| Cart | `cart.abandoned`, `cart.merged` (guest → user) |

### 4.5 Checkout

| Entity | Tracked Actions |
| --- | --- |
| CheckoutSession | `checkout.started`, `checkout.abandoned`, `checkout.completed` |

### 4.6 Promotion

| Entity | Tracked Actions |
| --- | --- |
| Promotion | `promotion.created`, `promotion.updated`, `promotion.activated`, `promotion.deactivated`, `promotion.deleted` |
| Voucher | `voucher.created`, `voucher.updated`, `voucher.deleted` |

### 4.7 Tax

| Entity | Tracked Actions |
| --- | --- |
| TaxRate | `tax_rate.created`, `tax_rate.updated`, `tax_rate.exemption_marked` |
| TaxExemption | `tax_exemption.marked`, `tax_exemption.removed` |

### 4.8 Order

| Entity | Tracked Actions |
| --- | --- |
| Order | `order.created`, `order.status_changed`, `order.cancelled`, `order.refunded` |
| OrderItem | (covered by Order) |
| OrderAddress | (covered by Order) |

### 4.9 Payment

| Entity | Tracked Actions |
| --- | --- |
| Payment | `payment.intent_created`, `payment.authorized`, `payment.captured`, `payment.failed`, `payment.cancelled` |
| Refund | `refund.requested`, `refund.processed`, `refund.failed` |
| WebhookEvent | `webhook.received`, `webhook.failed_signature`, `webhook.duplicate` |

### 4.10 Shipping

| Entity | Tracked Actions |
| --- | --- |
| Shipment | `shipment.created`, `shipment.dispatched`, `shipment.delivered`, `shipment.lost` |
| ShippingZone | `shipping_zone.created`, `shipping_zone.updated`, `shipping_zone.deleted` |

### 4.11 Returns

| Entity | Tracked Actions |
| --- | --- |
| Return | `return.requested`, `return.approved`, `return.rejected`, `return.received`, `return.inspected`, `return.refunded` |

### 4.12 Reviews

| Entity | Tracked Actions |
| --- | --- |
| Review | `review.submitted`, `review.moderated_approved`, `review.moderated_rejected`, `review.deleted` |
| ReviewReply | `review_reply.added`, `review_reply.deleted` |

### 4.13 Notifications

| Entity | Tracked Actions |
| --- | --- |
| EmailTemplate | `email_template.created`, `email_template.updated`, `email_template.activated`, `email_template.deprecated` |

### 4.14 Support

| Entity | Tracked Actions |
| --- | --- |
| SupportTicket | `ticket.created`, `ticket.responded`, `ticket.resolved`, `ticket.closed`, `ticket.escalated` |

### 4.15 Platform

| Entity | Tracked Actions |
| --- | --- |
| FeatureFlag | `feature_flag.changed`, `feature_flag.enabled`, `feature_flag.disabled` |
| StaticPage | `page.created`, `page.updated`, `page.published` |
| SystemConfig | `config.updated` |

---

## 5. Action Code Conventions

### 5.1 Format

`<entity>.<verb>` (lowercase, snake_case)

| Verb | Meaning |
| --- | --- |
| `created` | First creation |
| `updated` | Modification |
| `deleted` | Soft or hard delete |
| `restored` | After soft delete |
| `activated` / `deactivated` | State change |
| `enabled` / `disabled` | Toggle |
| `approved` / `rejected` | Approval flow |
| `cancelled` | Cancellation |
| `submitted` | Customer action |
| `requested` | Request flow start |
| `processed` | Completed |
| `failed` | Error |
| `verified` | Email/identity verification |
| `changed` | Generic state change |

### 5.2 Examples

| Action | Meaning |
| --- | --- |
| `order.created` | Order created |
| `order.status_changed` | Order transitioned |
| `order.cancelled` | Order cancelled |
| `payment.captured` | Payment captured |
| `refund.processed` | Refund processed |
| `user.mfa_enabled` | User enabled MFA |
| `user.deleted` | User soft-deleted |
| `product.published` | Product published |

---

## 6. Immutable Records

### 6.1 Database-Level Immutability

To enforce immutability:

1. **No UPDATE permission** on AuditLog table for application role.
2. **No DELETE permission** on AuditLog table for application role.
3. Only a dedicated `audit_writer` role has INSERT.
4. Only DBAs (offline) can modify schema.

### 6.2 Application-Level

- Repository interface has only `create()` method.
- No `update()` or `delete()` methods exposed.

### 6.3 Tamper Evidence (V2)

- **Hash chaining:** Each row stores `prevHash` = SHA256 of previous row. Detects insertion/deletion.
- **Merkle root:** Periodic snapshots exported to immutable store (S3 with object lock).
- **Out-of-band verification:** Daily cron verifies hash chain integrity.

### 6.4 V1 Simplified

V1 implements:
- Application-level immutability
- DB role permissions
- Daily backup with retention

V2 adds:
- Hash chaining
- Merkle root snapshots
- SIEM forwarding

---

## 7. Retention Policy

### 7.1 Retention Duration

| Audit Type | Retention |
| --- | --- |
| Authentication events | 2 years |
| Financial transactions (orders, payments, refunds) | **7 years** (Vietnamese accounting law) |
| Admin actions | 7 years |
| Catalog changes | 5 years |
| Inventory adjustments | 7 years |
| Return/refund events | 7 years |
| User PII changes | 2 years |
| Feature flag changes | 3 years |

### 7.2 Implementation

- **V1:** All audit rows retained 7 years regardless of type (simpler).
- **V2:** Differentiated retention by type, with archival job moving to cold storage.

### 7.3 Storage Strategy

- Hot storage: PostgreSQL main tables (0-1 year)
- Warm storage: PostgreSQL same DB, older partitions (V2 partitioning)
- Cold storage: S3 with Glacier tier (V2)

---

## 8. PDPD/GDPR Considerations

### 8.1 Personal Data in AuditLog

Audit logs may contain PII (e.g., user email in `after` snapshot).

### 8.2 Right to be Forgotten

When a user requests deletion:
1. Audit rows are **NOT deleted** (legal/regulatory requirement).
2. PII fields (`after` snapshot containing email/name) are anonymized.
3. An additional `user.anonymized` audit row is created.
4. Original `actorId` may be replaced with hashed/anonymized reference.

### 8.3 Anonymization Strategy

For audit rows containing user PII:

```
{
  "id": "...",
  "actorType": "User",
  "actorId": "<hashed-id>",   // not the actual user.id
  "action": "user.anonymized",
  "before": { "email": "user@example.com", ... },  // preserved for legal compliance
  "after": { "email": null, "name": null },
  "metadata": {
    "anonymizationReason": "PDPD request",
    "anonymizedAt": "2026-07-03T..."
  }
}
```

> **Note:** Some audit data MUST be retained for legal compliance (financial, fraud). PDPD right-to-be-forgotten is balanced against legal retention.

### 8.4 Pseudonymization

For non-financial audits:
- Replace `actorId` with HMAC-SHA256(secret, user.id)
- Allow correlation within the audit table without exposing identity

---

## 9. Outbox Pattern for Audit

To avoid audit logging blocking business transactions:

```
Transaction:
  1. Update business entity (e.g., update Order status)
  2. INSERT into OutboxMessage (audit entry + delivery)

Background Worker:
  1. Read unpublished OutboxMessages
  2. INSERT into AuditLog
  3. Mark OutboxMessage as published
```

This ensures:
- Atomic business + audit intent
- No lost audit entries on crash
- Decoupled audit from business transaction speed

### 9.1 V1 Implementation

For MVP, audit can be **synchronously written** in the same transaction as the business change, OR via **outbox**.

Recommendation: Use synchronous for sensitive actions (financial, PII), outbox for high-volume (cart updates).

---

## 10. Query Patterns

### 10.1 Admin Audit UI

| Query | Pattern |
| --- | --- |
| Recent audit entries | ORDER BY createdAt DESC LIMIT 50 |
| Per-actor audit | WHERE actorType = ? AND actorId = ? |
| Per-entity audit | WHERE entityType = ? AND entityId = ? |
| Per-action audit | WHERE action = ? |
| Time-range audit | WHERE createdAt BETWEEN ? AND ? |

### 10.2 Compliance Reports

| Report | Query |
| --- | --- |
| All admin actions last 30 days | WHERE actorType = 'AdminUser' AND createdAt >= NOW() - 30 days |
| All financial changes last 90 days | WHERE entityType IN ('Payment', 'Refund', 'Order') AND createdAt >= NOW() - 90 days |
| Failed payment webhooks | WHERE action = 'webhook.failed_signature' AND createdAt >= ? |
| PDPD deletion requests | WHERE action = 'user.anonymized' |

---

## 11. Performance Considerations

### 11.1 Write Volume

Estimated audit writes per day (V1 startup):
- Order events: ~100-500/day
- Payment events: ~200-1000/day
- Admin actions: ~50-200/day
- Authentication: ~500-2000/day
- Total: ~1000-4000 audit rows/day

> V1 handles this without partitioning. V2 (high volume) introduces partitioning.

### 11.2 Storage Estimate

Per row: ~1-2 KB (with JSONB snapshots).
At 4000 rows/day × 7 years: ~10-20 GB total.

---

## 12. Business Rules

| ID | Rule |
| --- | --- |
| BR-AUD-001 | AuditLog rows are append-only (no UPDATE, no DELETE) |
| BR-AUD-002 | All sensitive actions logged with before/after snapshots |
| BR-AUD-003 | Audit retention is 7 years for financial events |
| BR-AUD-004 | User anonymization preserves audit trail but pseudonymizes actor |
| BR-AUD-005 | Admin actions always logged (no opt-out) |
| BR-AUD-006 | Webhook signature failures always logged |
| BR-AUD-007 | Failed payment attempts always logged |
| BR-AUD-008 | MFA changes always logged with IP and user agent |

---

## 13. Coverage Validation

| Check | Status |
| --- | --- |
| Every entity with sensitive actions has audit | ✓ |
| Every action code follows convention | ✓ |
| Append-only enforced | ✓ |
| Retention policy defined | ✓ |
| PDPD anonymization covered | ✓ |
| Index strategy aligned | ✓ |
| Outbox pattern referenced | ✓ |

---

## 14. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal Database Architect | Initial audit strategy: AuditLog entity, 15 entity groups tracked, action code convention, immutability, retention, PDPD handling |

---

**End of Document — AUDIT_LOG_STRATEGY.md**
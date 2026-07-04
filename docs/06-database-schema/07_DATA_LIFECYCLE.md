# 07 — Data Lifecycle

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04
**Author:** Principal Database Architect

---

## 1. Purpose

This document defines **how SmartLight data lives and dies**:

- Creation source and rationale
- Active stage duration
- Soft-deletion stage
- Retention and archival
- Hard delete / purge
- PDPD (Vietnam personal data protection) impact

The lifecycle policy is **pilot for compliance** with PDPD, the Vietnamese Law on Personal Data Protection (effective 2023-2026 framework).

---

## 2. Lifecycle Stage Map

```
[CREATED]
   │
   ▼
[ACTIVE]  ← normal operations
   │
   ▼
[SOFT-DELETED]  ← deleted_at set; excluded from business queries
   │
   ▼
[ARCHIVED]  ← moved to cold storage or shadow rows (V2 with partitioning)
   │
   ▼
[PURGED]    ← physical DELETE; no PII retained
```

Each entity type maps to one of the lifecycles below.

---

## 3. Per-Entity Lifecycle Policy

### 3.1 Identity

| Entity | Active retention | After soft delete | Hard delete |
|---|---|---|---|
| `User` | Indefinite (until user requests closure or inactivity > 24 months) | `gdprAnonymizedAt` triggers PII purge (see §6) | After 30 days post-gdpr_anonymized_at |
| `AdminUser` | Until offboarded + 90 days | Soft delete retained for audit 7 years | After audit retention |
| `RefreshToken` | Until `expires_at` | n/a (revoked = dead) | Daily sweep: `DELETE WHERE expires_at < now()` |
| `UserSession` | 30 days active list | Soft revoke | `DELETE WHERE expires_at < now() - 30d` |
| `MfaSecret` | Account lifetime | Removed when account removed | Hard delete with User |
| `RecoveryCode` | Until used | n/a | Cleanup on MFA disable |
| `Address` | Account lifetime | Soft delete; order addresses retain copy | Tied to User purge |
| `CookieConsent` | 12 months active display | n/a | `DELETE WHERE accepted_at < now() - 12 months` |

### 3.2 Catalog

| Entity | Active retention | After soft delete | Hard delete |
|---|---|---|---|
| `Category` | Indefinite | `ARCHIVED` then soft delete | After 12 months with no children |
| `Brand` | Indefinite | `INACTIVE` then soft delete | After 24 months inactive |
| `Product` | Indefinite | `ARCHIVED` then soft delete | After 24 months archived and no orders |
| `ProductVariant` | Tied to Product | Soft delete | Tied to Product purge |
| `ProductImage` | Tied to Product | Tied | Cascade delete with Product |
| `ProductAttribute` | Indefinite | `DEPRECATED` flag | n/a (lookups need history) |
| `ProductAttributeValue` | Tied to Product | Tied | Cascade |

### 3.3 Inventory

| Entity | Active retention | After soft delete | Hard delete |
|---|---|---|---|
| `Inventory` | While variant exists | n/a | Cascade with ProductVariant |
| `StockMovement` | **Append-only — never deleted** | n/a | Partitioned (V1.5) by month; archived partitions > 12 months |
| `StockReservation` | Until consumed/released/expired | n/a | `DELETE WHERE status='EXPIRED' AND expires_at < now() - 7d` |
| `InventoryAdjustment` | 24 months | n/a | Partitioned by month; archived > 24 months |

### 3.4 Media

| Entity | Active retention | After soft delete | Hard delete |
|---|---|---|---|
| `MediaFile` | Indefinite (referenced) | Soft delete + remote storage delete (Cloudinary) | After 30 days grace if no references |

### 3.5 Cart & Checkout

| Entity | Active retention | After soft delete | Hard delete |
|---|---|---|---|
| `Cart` (active) | 30 days inactivity | `ABANDONED` after 7 days no activity | `EXPIRED` after 30 days, hard delete after 90 days |
| `CartItem` | Same as Cart | Cascade | Cascade |
| `CheckoutSession` | 15 minutes (TTL on `expires_at`) | `EXPIRED` if not completed | `DELETE WHERE status='EXPIRED' AND expires_at < now() - 7d` |

### 3.6 Orders

| Entity | Active retention | After soft delete | Hard delete |
|---|---|---|---|
| `Order` | **Never hard-deleted** | n/a | Preserved 7 years (Vietnamese commercial law) then archive |
| `OrderItem` | Per Order | Append-only | Same as Order |
| `OrderAddress` | Per Order | Append-only | Same as Order |
| `OrderStatusHistory` | **Append-only** | n/a | Partitioned by year (V1.5) |

### 3.7 Payment

| Entity | Active retention | After soft delete | Hard delete |
|---|---|---|---|
| `Payment` | 7 years (legal) | n/a | Preserved |
| `PaymentTransaction` | 7 years | n/a | Preserved |
| `WebhookEvent` | 90 days active, then `archivedAt` | n/a | `DELETE WHERE archived_at < now() - 365d` |
| `Refund` | 7 years | n/a | Preserved |

### 3.8 Shipping

| Entity | Active retention | After soft delete | Hard delete |
|---|---|---|---|
| `Shipment` | 7 years | n/a | Preserved |
| `TrackingEvent` | 24 months | n/a | `DELETE WHERE created_at < now() - 24 months` |
| `ShippingZone` / `ShippingRate` | Indefinite | Soft delete inactive | n/a |

### 3.9 Returns

| Entity | Active retention | After soft delete | Hard delete |
|---|---|---|---|
| `Return` | 7 years | n/a | Preserved |
| `ReturnItem` | 7 years | n/a | Preserved |
| `ReturnInspection` | 7 years | n/a | Preserved |

### 3.10 Reviews

| Entity | Active retention | After soft delete | Hard delete |
|---|---|---|---|
| `Review` | Indefinite | Soft delete | Purged after 5 years if author requests |
| `ReviewReply` | Indefinite | Soft delete | Cascade |
| `ReviewHelpfulVote` | Indefinite | Cascade | Cascade |

### 3.11 Notifications

| Entity | Active retention | After soft delete | Hard delete |
|---|---|---|---|
| `EmailTemplate` | All versions retained | Old versions kept, not active | Hard delete after 5 years |
| `NotificationLog` | 24 months | n/a | `DELETE WHERE created_at < now() - 24 months` (partitioned V2) |
| `NotificationPreference` | While user | Soft delete with user | Cascade |
| `CookieConsent` | 12 months | n/a | Same as §3.1 |

### 3.12 Support

| Entity | Active retention | After soft delete | Hard delete |
|---|---|---|---|
| `SupportTicket` | 24 months after close | n/a | Preserved (PII); anonymized at expiry |
| `TicketMessage` | Same | Append-only | Same |

### 3.13 Audit

| Entity | Active retention | After soft delete | Hard delete |
|---|---|---|---|
| `AuditLog` | **7 years** (legal, PCI, GDPR) | n/a | Partitioned by year; cold-archived after 2 years |

### 3.14 Platform

| Entity | Active retention | After soft delete | Hard delete |
|---|---|---|---|
| `FeatureFlag` / `Override` | Indefinite | n/a | Hard delete when flag retired > 1y |
| `StaticPage` | Indefinite | Soft delete | Hard delete 1 year after soft delete |
| `SystemConfig` | Indefinite | n/a | n/a |

### 3.15 Cross-cutting

| Entity | Active retention | After soft delete | Hard delete |
|---|---|---|---|
| `IdempotencyRecord` | Until `expires_at` (24h typical) | n/a | `DELETE WHERE expires_at < now()` |
| `OutboxMessage` | Until dispatched | n/a | `DELETE WHERE status='DISPATCHED' AND dispatched_at < now() - 7d` |

---

## 4. Retention Schedule (Implementation Reference)

| Frequency | Task |
|---|---|
| Daily (cron 02:00) | `DELETE FROM refresh_token WHERE expires_at < now();` |
| Daily | `DELETE FROM stock_reservation WHERE status='EXPIRED' AND expires_at < now() - 7d;` |
| Daily | `DELETE FROM cart WHERE status IN ('ABANDONED','EXPIRED') AND updated_at < now() - 90 days;` |
| Daily | `DELETE FROM idempotency_record WHERE expires_at < now();` |
| Daily | `DELETE FROM outbox_message WHERE status='DISPATCHED' AND dispatched_at < now() - 7d;` |
| Daily | `DELETE FROM webhook_event WHERE archived_at IS NOT NULL AND archived_at < now() - 365d;` |
| Weekly | `DELETE FROM notification_log WHERE created_at < now() - 24 months;` |
| Weekly | `DELETE FROM tracking_event WHERE created_at < now() - 24 months;` |
| Weekly | `DELETE FROM cookie_consent WHERE accepted_at < now() - 12 months;` |
| Monthly | Partition rotation for `audit_log`, `stock_movement`, `notification_log` (V1.5+) |

---

## 5. PDPD Compliance — Right to Erasure

Vietnam's PDPD grants data subjects the right to erasure of personal data, subject to legal retention exceptions (tax, accounting, fraud prevention).

### 5.1 What Erasure Means in SmartLight

| Data class | Erasure action |
|---|---|
| Direct identifiers (email, phone, name) | Replace with `anonymized_<hash>` tokens |
| Password hash | Null out |
| MFA secrets | Hard delete |
| Refresh tokens (active) | Revoke + delete |
| Sessions | Revoke + delete |
| Addresses | Hard delete (city/province stored on OrderAddress — retained) |
| Marketing preferences | Hard delete |
| Order data | **RETAINED** — required by commercial law (7 years); only PII fields anonymized via ship-to snapshot if needed |

### 5.2 Anonymization Script

The implementation of GDPR/PDPD erasure follows the sequence:

```sql
BEGIN
  -- mark user
  UPDATE "user" SET
    email = 'anonymized_' || id || '@smartlight.local',
    password_hash = 'X',
    first_name = NULL,
    last_name = NULL,
    phone = NULL,
    "gdprAnonymizedAt" = now(),
    status = 'ANONYMIZED'
  WHERE id = :userId;
  -- purge refresh tokens
  DELETE FROM refresh_token WHERE user_id = :userId;
  DELETE FROM user_session WHERE user_id = :userId;
  DELETE FROM mfa_secret WHERE user_id = :userId;
  DELETE FROM address WHERE user_id = :userId;
  DELETE FROM notification_preference WHERE user_id = :userId;
  -- keep orders, reviews, etc.
  -- log the erasure
  INSERT INTO audit_log (category='DATA_DELETE', entity_type='user', entity_id=:userId, ...)
COMMIT;
```

### 5.3 Data Export (Right of Access)

API endpoint `GET /v1/users/me/data-export` produces a JSON of:

- Profile data
- Orders
- Reviews
- Returns
- Notifications
- Audit trace (own actions)

Generated asynchronously via BullMQ; email link delivered when ready.

---

## 6. Recovery Window

| Data class | Window |
|---|---|
| Cart restoration from soft delete | 30 days (admin support) |
| Order data | 7 years (immutable archive) |
| Refund requests | 30 days after final state (admin replay window) |
| Customer service tickets | 24 months |

---

## 7. Cold Storage

Cold-archival model (V1.5+):

- Active hot data → primary Postgres
- Cold archival → S3-compatible bucket with columnar JSON (Parquet)
- Index table maps IDs ↔ archive location
- Access via dedicated read API

**MVP shortcut:** keep all in primary DB; defer cold storage until table sizes justify.

---

## 8. Anonymization vs. Pseudonymization

| Strategy | Use case |
|---|---|
| Anonymization | Data subject erasure: full PII purged |
| Pseudonymization | Analytics: keep user ID, hash PII |
| Hashing | Marketing data: sha256(email) for cohort |

The implementation phase will provide `anonymizeUser(userId)` and `pseudonymizeUser(userId)` procedures.

---

## 9. Lifecycle Triggers (Pseudo-code)

```ts
// Daily cleanup worker (BullMQ repeatable)
async function dailyCleanup() {
  await tx.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await tx.outboxMessage.deleteMany({
    where: { status: 'DISPATCHED', dispatchedAt: { lt: subDays(new Date(), 7) } },
  });
  // ...
}
```

---

## 10. Data Subject Rights — Endpoint Map

| Right | Endpoint | Status |
|---|---|---|
| Access | `GET /v1/users/me/data-export` | V1 |
| Erasure | `POST /v1/users/me/erase` (verify email) | V1 |
| Portability | Same as Access (JSON download) | V1 |
| Rectification | `PATCH /v1/users/me/profile` | V1 |
| Object to processing | `PATCH /v1/users/me/notifications` | V1 |

---

## 11. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial lifecycle policy |

---

**End of 07_DATA_LIFECYCLE.md**

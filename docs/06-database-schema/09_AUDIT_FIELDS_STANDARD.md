# 09 — Audit Fields Standard

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04
**Author:** Principal Database Architect

---

## 1. Purpose

This document standardizes the **audit fields** every table carries:

- When they are populated
- Who populates them
- How they are queried
- Examples per entity

It ensures traceability across the system without ad-hoc `created_by` columns proliferating.

---

## 2. The Standard Set

### 2.1 Universal (Every Table)

| Field | Type | Default | Notes |
|---|---|---|---|
| `created_at` | `DateTime` (UTC, `timestamptz(6)`) | `now()` | Set once at insert |
| `updated_at` | `DateTime` (UTC, `timestamptz(6)`) | `now()` and bumped via Prisma `@updatedAt` | Last mutation timestamp |

### 2.2 Optional — Soft Delete

| Field | Type | Default | Notes |
|---|---|---|---|
| `deleted_at` | `DateTime?` | NULL | See `08_SOFT_DELETE_STRATEGY.md` |

### 2.3 Optional — Actor Tracking

These fields are present on **user-mutable** entities:

| Field | Type | Map | Notes |
|---|---|---|---|
| `created_by_id` | `String?` | `created_by_id` | UUID of the actor creating the row |
| `updated_by_id` | `String?` | `updated_by_id` | UUID of the actor mutating the row last |

> Actor can be polymorphic (USER, ADMIN_USER, SYSTEM, WEBHOOK). For simple cases, `created_by_id` references whichever actor type. When polymorphic, see §3.2.

### 2.4 Optional — Domain Specific

| Field | Type | Used on | Purpose |
|---|---|---|---|
| `created_by_type` | `ActorType enum` | `StockMovement`, `OrderStatusHistory`, `AuditLog` | Distinguishes actor when no FK |

---

## 3. Conventions

### 3.1 UTC Always

All timestamps stored in UTC (`timestamptz`). Display layer converts to Asia/Ho_Chi_Minh.

### 3.2 `createdByType / createdById` (Polymorphic)

When a row can be created by either a User or AdminUser, we model:

```
createdByType  ActorType   (enum: USER, ADMIN_USER, SYSTEM, WEBHOOK)
createdById    String
```

Already used on `StockMovement`, `OrderStatusHistory`, and `AuditLog`.

### 3.3 Auto-Increment

- `createdAt` is set by DB `DEFAULT now()`.
- `updatedAt` is bumped by Prisma `@updatedAt` which translates to a Postgres trigger in raw mode.

### 3.4 Updated-At Trigger Pattern

Prisma's `@updatedAt` translates to:

```sql
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

For every soft-deletable model, the trigger is created in V1.1 migration.

### 3.5 Insert Source

`createdAt` is set once. Application never overrides it on UPDATE.

---

## 4. Audit Field Inventory Per Table

| Table | `createdAt` | `updatedAt` | `deletedAt` | `createdById` | `createdByType` | `updatedById` | Other |
|---|---|---|---|---|---|---|---|
| `User` | ✅ | ✅ | ✅ | (FK self / NULL by REG) | — | — | `emailVerifiedAt`, `gdprAnonymizedAt` |
| `AdminUser` | ✅ | ✅ | ✅ | — | — | — | `lastLoginAt`, `lastLoginIp` |
| `Role` | ✅ | ✅ | ✅ | — | — | — | — |
| `Permission` | ✅ | — | — | — | — | — | immutable |
| `AdminUserRole` | ✅(`assignedAt`) | — | — | `assignedBy` | — | `revokedAt` | — |
| `RolePermission` | ✅ | — | — | — | — | — | immutable |
| `Address` | ✅ | ✅ | ✅ | — | — | — | — |
| `MfaSecret` | ✅ | — | — | — | — | — | `enabledAt`, `lastUsedAt` |
| `RecoveryCode` | ✅(`at`) | — | — | — | — | — | `usedAt` |
| `RefreshToken` | ✅(`at`) | — | — | — | — | — | `issuedAt`, `expiresAt`, `revokedAt` |
| `UserSession` | ✅(`at`) | — | — | — | — | — | `issuedAt`, `lastSeenAt`, `expiresAt`, `revokedAt` |
| `Category` | ✅ | ✅ | ✅ | — | — | — | — |
| `Brand` | ✅ | ✅ | ✅ | — | — | — | — |
| `Product` | ✅ | ✅ | ✅ | — | — | — | `publishedAt` |
| `ProductVariant` | ✅ | ✅ | ✅ | — | — | — | — |
| `ProductImage` | ✅ | ✅ | — | — | — | — | — |
| `ProductAttribute` | ✅ | ✅ | ✅ | — | — | — | — |
| `ProductAttributeValue` | ✅ | — | — | — | — | — | — |
| `Inventory` | ✅ | ✅ | — | — | — | — | `lastCountedAt` |
| `StockMovement` | ✅ | — | — | `createdById` | ✅ | — | append-only |
| `StockReservation` | ✅ | ✅ | — | — | — | — | `consumedAt`, `releasedAt`, `expiresAt` |
| `InventoryAdjustment` | ✅ | — | — | `adminUserId` / `customerId` | (via FKs) | — | append-only |
| `MediaFile` | ✅(`uploadedAt`) | — | ✅ | `createdById` | — | — | — |
| `Cart` | ✅ | ✅ | ✅ | — | — | — | `lastActivityAt`, `expiresAt` |
| `CartItem` | ✅ | ✅ | ✅ | — | — | — | — |
| `CheckoutSession` | ✅ | ✅ | — | — | — | — | `completedAt`, `cancelledAt`, `expiresAt` |
| `Coupon` | ✅ | ✅ | ✅ | — | — | — | `startsAt`, `endsAt` |
| `Promotion` | ✅ | ✅ | ✅ | — | — | — | `startsAt`, `endsAt` |
| `VoucherUsage` | ✅(`usedAt`) | — | — | — | — | — | append-only |
| `PromotionUsage` | ✅(`usedAt`) | — | — | — | — | — | append-only |
| `TaxRate` | ✅ | ✅ | ✅ | — | — | — | `effectiveFrom`, `effectiveTo` |
| `TaxExemption` | ✅ | — | ✅ | — | — | `approvedBy` | `effectiveFrom`, `effectiveTo` |
| `Order` | ✅ | ✅ | ✅ | `createdById` | — | — | `paidAt`, `cancelledAt` |
| `OrderItem` | ✅ | — | — | — | — | — | append-only |
| `OrderAddress` | ✅ | — | — | — | — | — | append-only |
| `OrderStatusHistory` | ✅ | — | — | `changedById` | ✅ | — | append-only |
| `Payment` | ✅ | ✅ | — | — | — | — | `authorizedAt`, `capturedAt`, `failedAt`, `expiresAt` |
| `PaymentTransaction` | ✅ | — | — | — | — | — | append-only |
| `WebhookEvent` | ✅(`receivedAt`) | — | — | — | — | — | `processedAt`, `archivedAt` |
| `Refund` | ✅ | ✅ | — | `requestedById` | ✅ | — | `processedAt` |
| `Shipment` | ✅ | ✅ | — | — | — | — | `pickedUpAt`, `deliveredAt` |
| `TrackingEvent` | ✅ | — | — | — | — | — | `occurredAt` |
| `ShippingZone` | ✅ | ✅ | — | — | — | — | — |
| `ShippingRate` | ✅ | ✅ | ✅ | — | — | — | — |
| `Return` | ✅ | ✅ | ✅ | — | — | — | `approvedAt`, `receivedAt`, `closedAt` |
| `ReturnItem` | ✅ | — | — | — | — | — | — |
| `ReturnInspection` | ✅(`inspectedAt`) | — | — | `inspectorId` | — | — | — |
| `Review` | ✅ | ✅ | ✅ | — | — | `moderatedById` | `moderatedAt` |
| `ReviewReply` | ✅ | ✅ | ✅ | — | — | `authorId` | — |
| `ReviewHelpfulVote` | ✅ | — | — | — | — | — | — |
| `EmailTemplate` | ✅ | ✅ | — | — | — | — | — |
| `NotificationLog` | ✅ | — | — | — | — | — | `sentAt`, `deliveredAt`, `failedAt` |
| `NotificationPreference` | ✅ | ✅ | — | — | — | — | — |
| `CookieConsent` | ✅(`acceptedAt`) | — | — | — | — | — | `withdrawnAt` |
| `SupportTicket` | ✅ | ✅ | — | — | — | — | `closedAt` |
| `TicketMessage` | ✅ | — | — | — | — | — | append-only |
| `AuditLog` | ✅ | — | — | `actorUserId`/`actorAdminId` | ✅ | — | append-only |
| `FeatureFlag` | ✅ | ✅ | — | — | — | `updatedById` | — |
| `FeatureFlagOverride` | ✅ | — | — | — | — | — | `expiresAt` |
| `StaticPage` | ✅ | ✅ | ✅ | — | — | `updatedById` | `publishedAt` |
| `SystemConfig` | ✅ | ✅ | — | — | — | `updatedById` | — |
| `IdempotencyRecord` | ✅ | ✅ | — | — | — | — | `expiresAt` |
| `OutboxMessage` | ✅ | — | — | — | — | — | `availableAt`, `dispatchedAt` |

---

## 5. Implementation Hints

### 5.1 Prisma `@updatedAt`

For columns named `updatedAt`, Prisma emits a trigger in `prisma migrate` raw mode.

For columns named differently (e.g., `assignedAt`, `receivedAt`, `inspectedAt`), define a Postgres trigger manually:

```sql
-- Example for OrderStatusHistory (append-only; no updatedAt)
-- Already handled by append-only rule.
```

### 5.2 Middleware (Set `updatedById`)

A NestJS middleware can populate `updatedById` from the JWT subject:

```ts
@Injectable()
export class AuditFieldsInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    return next.handle().pipe(
      tap(() => {
        // additional logic when needed
      }),
    );
  }
}
```

Prisma `update` middleware sets the column where applicable.

### 5.3 Setting `createdById`

Done in service layer on creation:

```ts
const product = await prisma.product.create({
  data: { ...data, createdById: actor.id },
});
```

---

## 6. How Audit Fields Are Queried

### 6.1 Common Filters

- `WHERE created_at >= :start AND created_at < :end`
- `WHERE updated_at >= :since` (e.g., "what changed recently")
- `WHERE deleted_at IS NULL`

### 6.2 Admin Tools — Recent Changes

```sql
SELECT 'product' AS entity, id, updated_at, updated_by_id FROM product
WHERE updated_at >= now() - INTERVAL '7 days'
UNION ALL
SELECT 'order', id, updated_at, NULL FROM "order"
WHERE updated_at >= now() - INTERVAL '7 days';
```

### 6.3 Reporting

| Question | Source |
|---|---|
| Daily new users | `user.created_at` indexed |
| Revenue in window | `order.paid_at` indexed |
| Total orders per day | `order(created_at)` indexed |
| Recent admin activity | `audit_log.created_at` indexed |

---

## 7. Anti-Patterns to Avoid

| Anti-pattern | Why bad |
|---|---|
| Storing timezone as text | Always `timestamptz` |
| Comparing with `<` on timestamps from app | Use DB-direct (avoid clock skew) |
| Manually updating `createdAt` | Forbidden |
| Adding more actor columns per consumer | Polymorphic model preferred |
| Storing actor in `actorUserId` only when actor may be Admin | Use polymorphic pair |

---

## 8. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial audit-field standard |

---

**End of 09_AUDIT_FIELDS_STANDARD.md**

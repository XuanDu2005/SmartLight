# 07 — Authorization Architecture

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document defines the **Role-Based Access Control (RBAC)** model for SmartLight: roles, permissions, enforcement strategy, and how the system scales to additional roles in the future.

---

## 2. Authorization Principles

1. **Role-Based** — primary mechanism.
2. **Resource-Based** — ownership checks at the application layer.
3. **Deny by Default** — no permission granted unless explicitly allowed.
4. **Separation of Concerns** — authN (auth) and authZ (permission) are separate.
5. **Audit Friendly** — every denied action is logged.

---

## 3. Role Catalog

### 3.1 Customer-Facing Roles

| Role | Description |
|---|---|
| `guest` | Unauthenticated visitor; read-only public catalog |
| `customer` | Authenticated shopper; standard capabilities |
| `vip_customer` | (V1.5+) High-value customer; higher rate limits |

### 3.2 Admin-Facing Roles

| Role | Description |
|---|---|
| `support_agent` | Read orders; respond to tickets; issue refunds within limit |
| `catalog_manager` | Manage products, brands, categories, attributes, media |
| `inventory_manager` | Manage stock, adjustments, low-stock alerts |
| `order_manager` | Manage orders, shipments, returns, cancellations |
| `finance_manager` | Manage payments, refunds, reconciliation, tax rates |
| `marketing_manager` | Manage promotions, vouchers, email templates, reviews moderation |
| `analyst` | (V1.5+) Read-only dashboards |
| `admin` | Broad admin access (composite of above minus RBAC) |
| `super_admin` | Full access incl. RBAC and audit |

### 3.3 Future Roles

| Role | Description |
|---|---|
| `seller` | (V2 multi-vendor) Vendor access to own products/orders |
| `auditor` | (V2) Read-only access to audit log + compliance reports |
| `developer` | (V1.5+) API key access for integrations |

---

## 4. Permission Catalog

Permissions are strings in the format `{resource}.{action}`.

### 4.1 Customer Permissions

```
catalog.product.read
catalog.category.read
catalog.brand.read
catalog.review.read
cart.read
cart.write
cart.merge
checkout.write
order.read.own
order.cancel.own
order.track
payment.create.own
payment.read.own
refund.request.own
review.write
review.read.own
user.profile.read.own
user.profile.write.own
address.read.own
address.write.own
notification.preferences.read.own
notification.preferences.write.own
support.ticket.create
support.ticket.read.own
media.upload
```

### 4.2 Admin Permissions (Sample)

```
# Catalog
catalog.product.read.all
catalog.product.write.all
catalog.product.publish.all
catalog.category.write.all
catalog.brand.write.all
catalog.attribute.write.all

# Inventory
inventory.read.all
inventory.adjust
inventory.bulk_adjust
inventory.movement.read

# Orders
order.read.all
order.write.all
order.cancel.all
order.status.change
order.export

# Payments / Refunds
payment.read.all
payment.capture.manual
payment.refund.manual
refund.read.all
refund.process
refund.approve

# Shipping
shipping.zone.write
shipping.rate.write
shipment.dispatch
shipment.mark_delivered

# Promotion
promotion.write.all
voucher.write.all
tax.write.all

# Review
review.moderate
review.delete

# Notification
email_template.write
notification.retry

# Support
support.ticket.read.all
support.ticket.respond
support.ticket.assign
support.ticket.resolve

# Admin / RBAC
admin.dashboard.read
admin.reports.read
rbac.role.read
rbac.role.write
admin_user.read
admin_user.write

# Audit
audit.read
audit.export

# System
feature_flag.write
system_config.write
```

---

## 5. Role → Permission Mapping

### 5.1 Customer Roles

| Role | Permissions |
|---|---|
| `guest` | catalog.product.read, catalog.category.read, catalog.brand.read, catalog.review.read, cart.read |
| `customer` | All `*.own`, cart.*, checkout.write, payment.create.own, review.write, support.*, media.upload |

### 5.2 Admin Roles

| Role | Permissions |
|---|---|
| `support_agent` | order.read.all, refund.request, support.ticket.* |
| `catalog_manager` | catalog.*.write.all, catalog.*.read.all, media.upload |
| `inventory_manager` | inventory.* |
| `order_manager` | order.*.all, shipping.*, shipment.* |
| `finance_manager` | payment.*.all, refund.*, tax.write.all, order.read.all, order.export |
| `marketing_manager` | promotion.*, voucher.*, review.moderate, email_template.*, notification.retry |
| `admin` | (composite) catalog, inventory, order, payment, shipping, promotion, review, notification, support, dashboard — **except rbac.**, audit.*, feature_flag.*, system_config.* |
| `super_admin` | All (including rbac, audit, system_config) |

> Roles are **additive** — a user with multiple roles gets the union of permissions.

---

## 6. Enforcement Layers

### 6.1 Layer 1 — Authentication (Identity)

```
AuthGuard
  ↓
  Validates JWT
  ↓
  Loads user (id, roles)
  ↓
  Attaches to Request.user
```

### 6.2 Layer 2 — Role Check (RolesGuard)

```
@Roles('admin', 'finance_manager')
@UseGuards(JwtAuthGuard, RolesGuard)

@Controller(...)
class PaymentAdminController { ... }
```

### 6.3 Layer 3 — Permission Check (PermissionGuard)

```
@RequirePermission('refund.approve')
@UseGuards(JwtAuthGuard, PermissionGuard)

class RefundAdminController { ... }
```

### 6.4 Layer 4 — Resource Ownership (Application Service)

```
// In OrderService.findById(orderId, userId):
if (order.userId !== userId && !user.hasRole('admin')) {
  throw new ForbiddenException();
}
```

### 6.5 Layer 5 — Field-Level (Response DTO)

```
class UserProfileResponseDto {
  @Expose() id: string;
  @Expose() email: string;
  @Expose() firstName: string;
  // No passwordHash, no mfaSecret
}
```

---

## 7. Permission Model Implementation

### 7.1 Permission Representation

```
// common/auth/permissions.ts
export const PERMISSIONS = {
  CATALOG_PRODUCT_READ: 'catalog.product.read',
  CATALOG_PRODUCT_WRITE: 'catalog.product.write',
  // ...
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
```

### 7.2 Decorator Usage

```
@RequirePermission(PERMISSIONS.REFUND_APPROVE)
@Post('/admin/refunds/:id/approve')
async approveRefund(@Param('id') id: string) { ... }
```

### 7.3 Guard Implementation (Pseudo)

```
@Injectable()
class PermissionGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    const required = this.reflector.get('permission', ctx.getHandler());
    
    if (!user) throw new UnauthorizedException();
    if (!required) return true;
    
    const userPermissions = await this.rbacService.getUserPermissions(user.id);
    
    if (!userPermissions.includes(required) && !userPermissions.includes('*')) {
      throw new ForbiddenException('Insufficient permissions');
    }
    
    return true;
  }
}
```

---

## 8. RLS (Row-Level Security)

In V2, with PostgreSQL, RLS policies on shared tables may be used as a defense-in-depth:

```
-- Example: order table RLS
ALTER TABLE "order" ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_user_isolation ON "order"
  USING (
    user_id = current_setting('app.user_id')::uuid
    OR current_setting('app.is_admin')::boolean = true
  );
```

> V1 keeps authorization at the application layer. RLS is an additional layer in V2.

---

## 9. Permission Caching

User permissions loaded on JWT issuance are cached in Redis with short TTL:

```
Key: rbac:user:{userId}:permissions
TTL: 15 minutes (matches JWT TTL)
```

On role change, the cache is invalidated via domain event:

```
@OnEvent('admin_user.role_assigned')
async invalidatePermissions(adminUserId: string) {
  await this.cache.del(`rbac:user:${adminUserId}:permissions`);
}
```

---

## 10. Admin MFA Enforcement

| Action | MFA Required |
|---|---|
| Login | Yes (after enrollment) |
| View dashboard | No |
| Edit low-risk resource | No |
| Approve refund > threshold | **Yes** |
| Disable MFA | **Yes** (re-auth) |
| View audit log | **Yes** (sensitive) |
| Change system config | **Yes** |

> Re-authentication via short-lived JWT (5 min) for high-risk actions.

---

## 11. Ownership Enforcement Examples

### 11.1 Order Read

```
GET /v1/orders/:orderId
→ user.role in ['order_manager', 'finance_manager', 'admin', 'super_admin'] → allow
→ order.userId === authenticatedUserId → allow
→ otherwise → 403
```

### 11.2 Address Update

```
PATCH /v1/users/me/addresses/:addressId
→ address.userId === authenticatedUserId → allow
→ otherwise → 403
```

### 11.3 Refund Approval

```
POST /v1/admin/refunds/:refundId/approve
→ user has 'refund.approve' permission → allow
→ otherwise → 403
```

---

## 12. Role Hierarchy (Optional)

SmartLight does **not** use role hierarchy (Role > SubRole). All roles are flat and additive.

> Hierarchy can lead to confusion and hidden behavior. Explicit role assignment is preferred.

---

## 13. Future Multi-Vendor Authorization (V2)

When multi-vendor is added:

- New `seller` role
- Sellers own products, orders within their scope
- RLS enforces isolation
- New permission namespace: `seller.*`

---

## 14. Audit and Monitoring

Every authorization decision is recorded:

| Event | Log |
|---|---|
| Access granted | INFO |
| Access denied | WARN |
| Multiple denials (5+ in 5 min) | ALERT |
| Role changed | AUDIT (record event) |
| Permission cache invalidation | DEBUG |

---

## 15. Testing Authorization

### 15.1 Unit Tests

- Each role has expected permissions
- Guards reject missing roles
- Resource ownership enforced

### 15.2 Integration Tests

- Each endpoint tested with: no auth, wrong role, right role
- Resource ownership scenarios

### 15.3 E2E Tests

- Customer flow
- Admin flow per role
- MFA flow

---

## 16. Coverage Validation

| Check | Status |
|---|---|
| Customer roles defined | ✓ |
| Admin roles defined | ✓ |
| Permission catalog complete | ✓ |
| Role → Permission mapping | ✓ |
| 5-layer enforcement documented | ✓ |
| Permission caching strategy | ✓ |
| MFA enforcement documented | ✓ |
| Ownership enforcement examples | ✓ |
| Audit logging specified | ✓ |
| Testing strategy | ✓ |

---

## 17. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial authorization architecture: RBAC + permissions + MFA |

---

**End of 07_AUTHORIZATION_ARCHITECTURE.md**
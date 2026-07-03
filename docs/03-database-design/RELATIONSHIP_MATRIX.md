# RELATIONSHIP_MATRIX.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal Database Architect

---

## 1. Purpose

This document enumerates **every relationship** between SmartLight entities. For each relationship it specifies:

- Parent entity
- Child entity
- Cardinality (1:1, 1:N, N:M)
- Cascade rule (logical only — V1 has no actual DB FK constraints)
- Delete strategy (logical soft-delete vs hard-delete)

This is **design only**. No SQL, no FK constraints in V1.

---

## 2. Cascade Rule Vocabulary

| Code | Meaning |
| --- | --- |
| `RESTRICT` | Cannot delete parent while children exist |
| `SOFT_DELETE_PARENT` | Parent soft-delete; children remain |
| `SOFT_DELETE_CHILDREN` | Parent soft-delete triggers child soft-delete |
| `ANONYMIZE_CHILDREN` | Children retain row, PII fields nulled |
| `NO_ACTION` | Logical reference; no enforcement |
| `CASCADE_HARD` | Hard delete children (rare; only for transient data) |

---

## 3. Identity Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 1 | User | Address | 1:N | RESTRICT (if order) / SOFT_DELETE_PARENT | Address hard-deleted only if no orders |
| 2 | AdminUser | Address | 1:N | SOFT_DELETE_PARENT | Same |
| 3 | User | RefreshToken | 1:N | CASCADE_HARD | All tokens deleted |
| 4 | AdminUser | RefreshToken | 1:N | CASCADE_HARD | All tokens deleted |
| 5 | User | MfaSecret | 1:1 | CASCADE_HARD | Delete with user |
| 6 | AdminUser | MfaSecret | 1:1 | CASCADE_HARD | Mandatory for admin |
| 7 | MfaSecret | RecoveryCode | 1:N | CASCADE_HARD | With MFA reset |
| 8 | User | UserSession | 1:N | CASCADE_HARD | On logout all sessions |
| 9 | AdminUser | UserSession | 1:N | CASCADE_HARD | On logout |
| 10 | AdminUser | AdminUserRole | 1:N | CASCADE_HARD | On admin deletion |
| 11 | Role | AdminUserRole | 1:N | RESTRICT | Cannot delete role with assignments |
| 12 | Role | RolePermission | 1:N | CASCADE_HARD | Role deletion removes perms |
| 13 | Permission | RolePermission | 1:N | RESTRICT | Cannot delete perm in use |

---

## 4. Catalog Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 14 | Category | Category | 1:N (self) | SOFT_DELETE_CHILDREN | Children must be moved |
| 15 | Category | Product | 1:N | RESTRICT | Cannot delete with products |
| 16 | Brand | Product | 1:N | RESTRICT | Cannot delete with products |
| 17 | Brand | MediaFile | 1:1 (logo) | NO_ACTION | Brand deletion nulls logo |
| 18 | Product | ProductVariant | 1:N | SOFT_DELETE_CHILDREN | Variants soft-deleted together |
| 19 | Product | ProductImage | 1:N | SOFT_DELETE_CHILDREN | Images soft-deleted |
| 20 | ProductVariant | ProductImage | 1:N (optional) | SOFT_DELETE_CHILDREN | Same |
| 21 | MediaFile | ProductImage | 1:N | RESTRICT | Cannot delete media in use |
| 22 | Product | ProductAttributeValue | 1:N | SOFT_DELETE_CHILDREN | Cleanup with product |
| 23 | ProductVariant | ProductAttributeValue | 1:N | SOFT_DELETE_CHILDREN | Cleanup with variant |
| 24 | ProductAttribute | ProductAttributeValue | 1:N | RESTRICT | Cannot delete attr in use |

---

## 5. Inventory Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 25 | ProductVariant | Inventory | 1:1 | CASCADE_HARD | Inventory deleted with variant |
| 26 | ProductVariant | StockReservation | 1:N | CASCADE_HARD | All reservations released |
| 27 | Cart | StockReservation | 1:N | CASCADE_HARD | Released on cart clear |
| 28 | Order | StockReservation | 1:N | CASCADE_HARD | Consumed on confirm |
| 29 | ProductVariant | StockMovement | 1:N | NO_ACTION | Append-only; never deleted |
| 30 | ProductVariant | InventoryAdjustment | 1:N | NO_ACTION | Retained for audit |

---

## 6. Cart Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 31 | User | Cart | 1:N | SOFT_DELETE_CHILDREN | All carts soft-deleted |
| 32 | Cart | CartItem | 1:N | CASCADE_HARD | Items removed |
| 33 | ProductVariant | CartItem | 1:N | RESTRICT | Cannot delete variant in cart |
| 34 | StockReservation | CartItem | 1:1 (optional) | CASCADE_HARD | With cart item |
| 35 | User | Wishlist | 1:N | SOFT_DELETE_CHILDREN (V1.1) | V1.1 |
| 36 | Wishlist | WishlistItem | 1:N | CASCADE_HARD (V1.1) | V1.1 |

---

## 7. Checkout Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 37 | User | CheckoutSession | 1:N | CASCADE_HARD | Expired sessions purged |
| 38 | Cart | CheckoutSession | 1:1 | NO_ACTION | Cart may persist |
| 39 | Address | CheckoutSession | 1:N (shipping) | NO_ACTION | Address may persist |

---

## 8. Promotion Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 40 | Promotion | PromotionUsage | 1:N | NO_ACTION | Retained for audit |
| 41 | User | PromotionUsage | 1:N | NO_ACTION | With user (anonymize on delete) |
| 42 | Order | PromotionUsage | 1:N | NO_ACTION | With order |
| 43 | Promotion | Voucher | 1:N | SOFT_DELETE_CHILDREN | Vouchers soft-deleted |
| 44 | Voucher | VoucherUsage | 1:N | NO_ACTION | Retained |
| 45 | User | VoucherUsage | 1:N | NO_ACTION | Anonymize on user delete |
| 46 | Order | VoucherUsage | 1:N | NO_ACTION | With order |

---

## 9. Tax Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 47 | Category | TaxExemption | 1:1 | CASCADE_HARD | With category |
| 48 | TaxRate | Category | 1:N (default) | NO_ACTION | Default reference only |

---

## 10. Order Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 49 | User | Order | 1:N | SOFT_DELETE_PARENT | Orders retained for 7 years |
| 50 | Order | OrderItem | 1:N | SOFT_DELETE_CHILDREN | With order |
| 51 | ProductVariant | OrderItem | 1:N | NO_ACTION | Variant snapshot |
| 52 | Product | OrderItem | 1:N | NO_ACTION | Product snapshot |
| 53 | Order | OrderAddress | 1:N | SOFT_DELETE_CHILDREN | With order |
| 54 | Order | OrderStatusHistory | 1:N | SOFT_DELETE_CHILDREN | With order |
| 55 | Order | Payment | 1:1 (active) | NO_ACTION | Payment may outlive order (refunds) |
| 56 | Order | Shipment | 1:1 | SOFT_DELETE_CHILDREN | With order |
| 57 | Order | Voucher | N:1 | NO_ACTION | Voucher reference |
| 58 | Order | Promotion | N:1 | NO_ACTION | Promotion reference |

---

## 11. Payment Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 59 | Payment | PaymentTransaction | 1:N | SOFT_DELETE_CHILDREN | With payment |
| 60 | Payment | WebhookEvent | 1:N | NO_ACTION | Idempotency retention 90 days |
| 61 | Payment | Refund | 1:N | SOFT_DELETE_CHILDREN | With payment |
| 62 | Order | Refund | 1:N | SOFT_DELETE_CHILDREN | With order |
| 63 | AdminUser | Refund | N:1 (requestedBy) | NO_ACTION | Reference |

---

## 12. Shipping Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 64 | Order | Shipment | 1:1 | SOFT_DELETE_CHILDREN | With order |
| 65 | Shipment | TrackingEvent | 1:N | CASCADE_HARD | With shipment (or archive) |
| 66 | ShippingZone | Shipment | 1:N | RESTRICT | Zone in use |
| 67 | ShippingZone | ShippingRate | 1:N | CASCADE_HARD | With zone |

---

## 13. Returns Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 68 | Order | Return | 1:N | RESTRICT | Order cannot be deleted |
| 69 | User | Return | 1:N | SOFT_DELETE_PARENT | Retained for 2 years |
| 70 | Return | ReturnItem | 1:N | SOFT_DELETE_CHILDREN | With return |
| 71 | OrderItem | ReturnItem | 1:N | NO_ACTION | Reference |
| 72 | ProductVariant | ReturnItem | 1:N | NO_ACTION | Reference |
| 73 | Return | ReturnInspection | 1:N | SOFT_DELETE_CHILDREN | With return |
| 74 | ReturnItem | ReturnInspection | 1:1 (optional) | CASCADE_HARD | With item |
| 75 | AdminUser | ReturnInspection | N:1 (inspector) | NO_ACTION | Reference |
| 76 | Return | ReturnImage | 1:N | CASCADE_HARD | With return |
| 77 | MediaFile | ReturnImage | 1:N | RESTRICT | Cannot delete media |

---

## 14. Reviews Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 78 | Product | Review | 1:N | SOFT_DELETE_CHILDREN | Reviews retained for analytics |
| 79 | ProductVariant | Review | 1:N (optional) | NO_ACTION | Reference |
| 80 | User | Review | 1:N | ANONYMIZE_CHILDREN | PII removed on user deletion |
| 81 | OrderItem | Review | 1:1 (optional) | RESTRICT | Cannot delete order item with review |
| 82 | Review | ReviewReply | 1:1 (optional) | SOFT_DELETE_CHILDREN | With review |
| 83 | AdminUser | ReviewReply | N:1 | NO_ACTION | Reference |
| 84 | Review | ReviewHelpfulVote | 1:N | CASCADE_HARD | With review |
| 85 | User | ReviewHelpfulVote | 1:N | ANONYMIZE_CHILDREN | PII removed |

---

## 15. Notifications Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 86 | EmailTemplate | NotificationLog | 1:N | RESTRICT | Cannot delete template in use |
| 87 | User | NotificationLog | 1:N | ANONYMIZE_CHILDREN | Email anonymized |
| 88 | AdminUser | NotificationLog | 1:N | NO_ACTION | Reference |
| 89 | User | NotificationPreference | 1:N | CASCADE_HARD | With user |
| 90 | AdminUser | NotificationPreference | 1:N | CASCADE_HARD | With admin |

---

## 16. Support Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 91 | User | SupportTicket | 1:N | ANONYMIZE_CHILDREN | PII removed |
| 92 | Order | SupportTicket | 1:N | NO_ACTION | Reference |
| 93 | SupportTicket | TicketMessage | 1:N | SOFT_DELETE_CHILDREN | Retained 2 years |
| 94 | AdminUser | SupportTicket | N:1 (assignedTo) | NO_ACTION | Reference |
| 95 | User | TicketMessage | 1:N | ANONYMIZE_CHILDREN | PII removed |
| 96 | AdminUser | TicketMessage | 1:N | NO_ACTION | Reference |

---

## 17. Audit Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 97 | User | AuditLog | 1:N | NO_ACTION | Immutable; audit preserved |
| 98 | AdminUser | AuditLog | 1:N | NO_ACTION | Immutable |

---

## 18. Platform Relationships

| # | Parent | Child | Cardinality | Cascade Rule | Delete Strategy |
| --- | --- | --- | --- | --- | --- |
| 99 | FeatureFlag | FeatureFlagOverride | 1:N | CASCADE_HARD | With flag |

---

## 19. Polymorphic Reference Matrix

Some entities reference owners polymorphically. These relationships have **logical FK only**:

| Owner Entity | Polymorphic Owner Column | Children |
| --- | --- | --- |
| User / AdminUser | Address.ownerType + ownerId | Address |
| User / AdminUser | MfaSecret.ownerType + ownerId | MfaSecret |
| User / AdminUser | RefreshToken.ownerType + ownerId | RefreshToken |
| User / AdminUser | UserSession.ownerType + ownerId | UserSession |
| User / AdminUser | NotificationPreference.ownerType + ownerId | NotificationPreference |
| User / AdminUser / System | AuditLog.actorType + actorId | AuditLog |
| User / AdminUser / Guest | NotificationLog.recipientType + recipientId | NotificationLog |
| User / AdminUser | TicketMessage.senderType + senderId | TicketMessage |

> **Implementation:** Two columns (`ownerType` enum + `ownerId` text). Application enforces referential integrity.

---

## 20. Cross-Aggregate References (Logical Only)

These references use **ID-only** with NO actual FK constraint:

| Source Entity | Target Aggregate | Column | Reason |
| --- | --- | --- | --- |
| CartItem | ProductVariant | variantId | No FK to enable easy V2 split |
| CartItem | StockReservation | reservationId | Reservation lifecycle independent |
| OrderItem | ProductVariant | variantId | Snapshot reference |
| OrderItem | Product | productId | Snapshot reference |
| OrderAddress | (embedded) | — | Snapshot, no FK |
| Payment | Order | orderId | Cross-aggregate |
| Refund | Order | orderId | Cross-aggregate |
| Shipment | Order | orderId | Cross-aggregate |
| Return | Order | orderId | Cross-aggregate |
| ReturnItem | OrderItem | orderItemId | Cross-aggregate |
| Review | OrderItem | orderItemId | Verified-purchase check |
| TrackingEvent | Shipment | shipmentId | Same aggregate (FK allowed) |
| NotificationLog | User | userId | Cross-aggregate |

---

## 21. Within-Aggregate Allowed FK Constraints

These can have actual DB FK constraints (within the same aggregate):

| Within Aggregate | FK |
| --- | --- |
| Order aggregate | OrderItem.orderId → Order.id, OrderAddress.orderId → Order.id, OrderStatusHistory.orderId → Order.id |
| Cart aggregate | CartItem.cartId → Cart.id |
| Payment aggregate | PaymentTransaction.paymentId → Payment.id, Refund.paymentId → Payment.id |
| Shipment aggregate | TrackingEvent.shipmentId → Shipment.id |
| Return aggregate | ReturnItem.returnId → Return.id, ReturnInspection.returnId → Return.id |
| Review aggregate | ReviewReply.reviewId → Review.id, ReviewHelpfulVote.reviewId → Review.id |
| SupportTicket aggregate | TicketMessage.ticketId → SupportTicket.id |
| Notification aggregate | NotificationLog.templateId → EmailTemplate.id |
| Audit aggregate | (none — append only) |
| Inventory aggregate | (none — StockMovement/Adjustment are append-only) |
| RefreshToken aggregate | RecoveryCode.mfaSecretId → MfaSecret.id |

---

## 22. Many-to-Many Resolutions

| Original M:N | Resolved Via | Cardinality |
| --- | --- | --- |
| AdminUser ↔ Role | AdminUserRole | 1:N |
| Role ↔ Permission | RolePermission | 1:N |
| Product ↔ Attribute | ProductAttributeValue | 1:N |
| Variant ↔ Attribute | ProductAttributeValue | 1:N |
| Variant ↔ Image (some) | ProductImage.variantId | 1:N |
| Promotion ↔ User | PromotionUsage | 1:N |
| Voucher ↔ User | VoucherUsage | 1:N |
| Review ↔ User (helpful) | ReviewHelpfulVote | 1:N |

---

## 23. Delete Strategy Summary

| Strategy | Used For | Count |
| --- | --- | --- |
| CASCADE_HARD | Cart items, tokens, reservations, sessions, recovery codes, tracking events | ~20 |
| SOFT_DELETE_PARENT | Products, categories, brands, admin/users, support tickets | ~10 |
| SOFT_DELETE_CHILDREN | Order aggregates, return aggregates, review aggregates, shipment aggregates | ~15 |
| ANONYMIZE_CHILDREN | User deletion (PDPD right to be forgotten) | ~5 |
| NO_ACTION | Audit logs, append-only movement records | ~15 |
| RESTRICT | Cannot delete when children exist (e.g., role with assignments) | ~10 |

---

## 24. Coverage Validation

| Check | Status |
| --- | --- |
| Every entity has at least one relationship defined | ✓ |
| Every cross-aggregate ref uses ID-only | ✓ |
| Every within-aggregate FK is documented | ✓ |
| Polymorphic references documented | ✓ |
| M:N resolutions specified | ✓ |
| Cascade rules match business rules | ✓ |
| PDPD anonymization strategy covered | ✓ |

---

## 25. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal Database Architect | Initial relationship matrix: 99 relationships, M:N resolution, polymorphic refs, cascade rules |

---

**End of Document — RELATIONSHIP_MATRIX.md**
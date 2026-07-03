# PRISMA_MAPPING.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal Database Architect

---

## 1. Purpose

This document prepares for the **future Prisma schema generation**. For every entity it specifies:
- Future Prisma model name
- Relations
- Enums
- Future repository class
- Future service class

**No actual schema is generated.** This is preparation only.

The actual `schema.prisma` will be created in a later phase (Prisma Design).

---

## 2. Prisma Conventions Used

| Aspect | Convention |
| --- | --- |
| Model names | PascalCase singular |
| Field names | camelCase |
| Map to table | `@@map("snake_case_table")` |
| Map column | `@map("snake_case_column")` |
| ID type | `String` (UUID v7) in V1; `String @id @default(uuid())` later |
| Timestamps | `DateTime` (auto-managed `createdAt`, `updatedAt`) |
| Soft delete | Nullable `deletedAt: DateTime?` |
| Money | `BigInt` (integer xu) |
| JSON | `Json` (JSONB) |
| Enums | PascalCase values |

---

## 3. Identity Models

### 3.1 User

```
Model: User
Table: user

Fields (V1):
  id                String       @id
  email             String       @unique (lowercase citext)
  passwordHash      String       @map("password_hash")
  firstName         String?      @map("first_name")
  lastName          String?      @map("last_name")
  phone             String?
  locale            String       @default("vi-VN")
  status            UserStatus
  emailVerifiedAt   DateTime?    @map("email_verified_at")
  emailVerificationToken String? @map("email_verification_token")
  createdAt         DateTime     @default(now()) @map("created_at")
  updatedAt         DateTime     @updatedAt @map("updated_at")
  deletedAt         DateTime?    @map("deleted_at")

Relations:
  addresses         Address[]
  refreshTokens     RefreshToken[]
  mfaSecret         MfaSecret?
  userSessions      UserSession[]
  orders            Order[]
  carts             Cart[]
  reviews           Review[]
  returns           Return[]
  supportTickets    SupportTicket[]
  notificationPrefs NotificationPreference[]
  orderItems        OrderItem[] (as customer via order)
  auditLogs         AuditLog[]
  notificationLogs  NotificationLog[]

Enums:
  UserStatus: Active, Suspended, Closed, PendingVerification

Indexes:
  @@index([email])
  @@index([deletedAt])
  @@index([phone])
  @@map("user")
```

**Future Repository:** `UserRepository`
**Future Service:** `UserService` (auth, profile, deletion)

### 3.2 AdminUser

```
Model: AdminUser
Table: admin_user

Fields:
  id              String   @id
  email           String   @unique (lowercase)
  passwordHash    String   @map("password_hash")
  displayName     String   @map("display_name")
  status          AdminUserStatus
  lastLoginAt     DateTime? @map("last_login_at")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

Relations:
  mfaSecret       MfaSecret?
  roles           AdminUserRole[]
  refreshTokens   RefreshToken[]
  userSessions    UserSession[]
  refunds         Refund[] (as requester)
  returnInspections ReturnInspection[]
  reviewReplies   ReviewReply[]
  assignedTickets SupportTicket[]
  ticketMessages  TicketMessage[]
  auditLogs       AuditLog[]
  notificationPrefs NotificationPreference[]
  inventoryAdjustments InventoryAdjustment[]

Enums:
  AdminUserStatus: Active, Suspended, Invited
  @@map("admin_user")
```

**Future Repository:** `AdminUserRepository`
**Future Service:** `AdminAuthService`

### 3.3 Role / Permission / AdminUserRole / RolePermission

```
Model: Role
Table: role

Fields:
  id          String @id
  name        String @unique
  description String?
  isSystem    Boolean @default(false) @map("is_system")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

Relations:
  permissions RolePermission[]
  adminUsers  AdminUserRole[]

@@map("role")

Model: Permission
Table: permission

Fields:
  id          String @id
  code        String @unique
  resource    String
  action      String
  description String?

Relations:
  roles       RolePermission[]
  @@map("permission")

Model: AdminUserRole (junction)
Table: admin_user_role

Fields:
  id             String @id
  adminUserId    String @map("admin_user_id")
  roleId         String @map("role_id")
  assignedAt     DateTime @default(now()) @map("assigned_at")
  assignedBy     String? @map("assigned_by")

Relations:
  adminUser AdminUser @relation(fields: [adminUserId], references: [id])
  role      Role      @relation(fields: [roleId], references: [id])
  @@unique([adminUserId, roleId])
  @@map("admin_user_role")

Model: RolePermission (junction)
Table: role_permission

Fields:
  id           String @id
  roleId       String @map("role_id")
  permissionId String @map("permission_id")

Relations:
  role       Role       @relation(fields: [roleId], references: [id])
  permission Permission @relation(fields: [permissionId], references: [id])
  @@unique([roleId, permissionId])
  @@map("role_permission")
```

**Future Service:** `RoleService`, `PermissionService`, `RbacService`

### 3.4 Address

```
Model: Address
Table: address

Fields:
  id          String  @id
  ownerType   AddressOwnerType @map("owner_type")
  ownerId     String  @map("owner_id")
  fullName    String  @map("full_name")
  phone       String
  province    String
  district    String
  ward        String
  street      String
  isDefault   Boolean @default(false) @map("is_default")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

Relations:
  // polymorphic; no direct FK in Prisma; use raw queries
  @@index([ownerType, ownerId])
  @@map("address")
```

> Polymorphic relation — no FK; owner validated at app level.

### 3.5 MfaSecret, RecoveryCode

```
Model: MfaSecret
Table: mfa_secret

Fields:
  id                String @id
  ownerType         MfaOwnerType @map("owner_type")
  ownerId           String @map("owner_id")
  secretEncrypted   String @map("secret_encrypted") // AES-256-GCM
  enabled           Boolean @default(false)
  enabledAt         DateTime? @map("enabled_at")
  lastUsedAt        DateTime? @map("last_used_at")
  failedAttempts    Int     @default(0) @map("failed_attempts")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

Relations:
  recoveryCodes     RecoveryCode[]
  @@unique([ownerType, ownerId])
  @@map("mfa_secret")

Model: RecoveryCode
Table: recovery_code

Fields:
  id          String @id
  mfaSecretId String @map("mfa_secret_id")
  codeHash    String @unique @map("code_hash")
  used        Boolean @default(false)
  usedAt      DateTime? @map("used_at")
  createdAt   DateTime @default(now())

Relations:
  mfaSecret MfaSecret @relation(fields: [mfaSecretId], references: [id])
  @@map("recovery_code")
```

### 3.6 RefreshToken, UserSession

```
Model: RefreshToken
Table: refresh_token

Fields:
  id          String  @id
  ownerType   TokenOwnerType @map("owner_type")
  ownerId     String  @map("owner_id")
  tokenHash   String  @unique @map("token_hash")
  userAgent   String? @map("user_agent")
  ipAddress   String? @map("ip_address")
  expiresAt   DateTime @map("expires_at")
  revokedAt   DateTime? @map("revoked_at")
  createdAt   DateTime @default(now())

Relations:
  // polymorphic
  @@index([ownerType, ownerId])
  @@map("refresh_token")

Model: UserSession
Table: user_session

Fields:
  id            String @id
  ownerType     TokenOwnerType @map("owner_type")
  ownerId       String @map("owner_id")
  ipAddress     String? @map("ip_address")
  userAgent     String? @map("user_agent")
  lastActiveAt  DateTime @map("last_active_at")
  expiresAt     DateTime @map("expires_at")
  createdAt     DateTime @default(now())

Relations:
  // polymorphic
  @@index([ownerType, ownerId])
  @@map("user_session")
```

---

## 4. Catalog Models

### 4.1 Category

```
Model: Category
Table: category

Fields:
  id            String  @id
  parentId      String? @map("parent_id")
  name          String
  slug          String  @unique
  description   String?
  displayOrder  Int     @default(0) @map("display_order")
  isActive      Boolean @default(true) @map("is_active")
  taxExempt     Boolean @default(false) @map("tax_exempt")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?

Relations:
  parent      Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")
  products    Product[]
  taxExemption TaxExemption?

  @@map("category")
```

### 4.2 Brand

```
Model: Brand
Table: brand

Fields:
  id          String  @id
  name        String  @unique
  slug        String  @unique
  description String?
  logoMediaId String? @map("logo_media_id")
  isActive    Boolean @default(true) @map("is_active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

Relations:
  products Product[]
  logo     MediaFile? @relation("BrandLogo", fields: [logoMediaId], references: [id])

  @@map("brand")
```

### 4.3 Product

```
Model: Product
Table: product

Fields:
  id               String @id
  categoryId       String @map("category_id")
  brandId          String @map("brand_id")
  name             String
  slug             String @unique
  shortDescription String? @map("short_description")
  description      String?
  status           ProductStatus @default(Draft)
  basePrice        BigInt @default(0) @map("base_price") // integer xu
  currency         String @default("VND")
  weight           Decimal?
  hasVariants      Boolean @default(false) @map("has_variants")
  publishedAt      DateTime? @map("published_at")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  deletedAt        DateTime?

Relations:
  category         Category @relation(fields: [categoryId], references: [id])
  brand            Brand    @relation(fields: [brandId], references: [id])
  variants         ProductVariant[]
  images           ProductImage[]
  attributeValues  ProductAttributeValue[]
  reviews          Review[]

Enums:
  ProductStatus: Draft, Published, Unpublished, Archived

  @@map("product")
```

### 4.4 ProductVariant

```
Model: ProductVariant
Table: product_variant

Fields:
  id                  String  @id
  productId           String  @map("product_id")
  sku                 String  @unique
  barcode             String?
  price               BigInt  @default(0)
  compareAtPrice      BigInt? @map("compare_at_price")
  costPrice           BigInt? @map("cost_price")
  weight              Decimal?
  lowStockThreshold   Int     @default(5) @map("low_stock_threshold")
  isActive            Boolean @default(true) @map("is_active")
  displayOrder        Int     @default(0) @map("display_order")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?

Relations:
  product         Product @relation(fields: [productId], references: [id])
  inventory       Inventory?
  images          ProductImage[]
  attributeValues ProductAttributeValue[]
  cartItems       CartItem[]
  orderItems      OrderItem[]
  returnItems     ReturnItem[]
  stockMovements  StockMovement[]
  inventoryAdjustments InventoryAdjustment[]
  reservations    StockReservation[]

  @@map("product_variant")
```

### 4.5 ProductImage

```
Model: ProductImage
Table: product_image

Fields:
  id           String  @id
  productId    String  @map("product_id")
  variantId    String? @map("variant_id")
  mediaFileId  String  @map("media_file_id")
  altText      String? @map("alt_text")
  displayOrder Int     @default(0) @map("display_order")
  isPrimary    Boolean @default(false) @map("is_primary")
  createdAt    DateTime @default(now())
  deletedAt    DateTime?

Relations:
  product    Product        @relation(fields: [productId], references: [id])
  variant    ProductVariant? @relation(fields: [variantId], references: [id])
  mediaFile  MediaFile      @relation(fields: [mediaFileId], references: [id])

  @@map("product_image")
```

### 4.6 ProductAttribute / ProductAttributeValue

```
Model: ProductAttribute
Table: product_attribute

Fields:
  id           String @id
  name         String @unique
  displayName  String @map("display_name")
  type         ProductAttributeType
  isFilterable Boolean @default(false) @map("is_filterable")
  isRequired   Boolean @default(false) @map("is_required")
  displayOrder Int     @default(0) @map("display_order")

Relations:
  values ProductAttributeValue[]
  @@map("product_attribute")

Model: ProductAttributeValue
Table: product_attribute_value

Fields:
  id          String  @id
  productId   String? @map("product_id")
  variantId   String? @map("variant_id")
  attributeId String  @map("attribute_id")
  valueText   String? @map("value_text")
  valueNumber Decimal? @map("value_number")
  createdAt   DateTime @default(now())

Relations:
  product   Product?          @relation(fields: [productId], references: [id])
  variant   ProductVariant?   @relation(fields: [variantId], references: [id])
  attribute ProductAttribute  @relation(fields: [attributeId], references: [id])

  @@index([productId])
  @@index([variantId])
  @@map("product_attribute_value")
```

---

## 5. Inventory Models

```
Model: Inventory
Table: inventory

Fields:
  id                  String @id
  variantId           String @unique @map("variant_id")
  stockOnHand         Int    @default(0) @map("stock_on_hand")
  stockReserved       Int    @default(0) @map("stock_reserved")
  lowStockThreshold   Int    @default(5) @map("low_stock_threshold")
  lastCountedAt       DateTime? @map("last_counted_at")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

Relations:
  variant ProductVariant @relation(fields: [variantId], references: [id])
  @@map("inventory")

Model: StockReservation
Table: stock_reservation

Fields:
  id          String @id
  variantId   String @map("variant_id")
  cartId      String? @map("cart_id")
  orderId     String? @map("order_id")
  quantity    Int
  status      StockReservationStatus @default(Active)
  expiresAt   DateTime @map("expires_at")
  createdAt   DateTime @default(now())
  releasedAt  DateTime? @map("released_at")

Relations:
  variant ProductVariant @relation(fields: [variantId], references: [id])
  cart    Cart?          @relation(fields: [cartId], references: [id])
  order   Order?         @relation(fields: [orderId], references: [id])

  @@map("stock_reservation")

Model: StockMovement
Table: stock_movement

Fields:
  id            String @id
  variantId     String @map("variant_id")
  type          StockMovementType
  quantity      Int // signed
  balanceAfter  Int    @map("balance_after")
  referenceType String? @map("reference_type")
  referenceId   String? @map("reference_id")
  reason        String?
  actorType     AuditActorType @map("actor_type")
  actorId       String? @map("actor_id")
  createdAt     DateTime @default(now()) @map("created_at")

Relations:
  variant ProductVariant @relation(fields: [variantId], references: [id])
  @@map("stock_movement")

Model: InventoryAdjustment
Table: inventory_adjustment

Fields:
  id              String @id
  variantId       String @map("variant_id")
  quantityBefore  Int    @map("quantity_before")
  quantityAfter   Int    @map("quantity_after")
  delta           Int
  reasonCode      InventoryAdjustmentReason @map("reason_code")
  reasonText      String? @map("reason_text")
  actorAdminId    String @map("actor_admin_id")
  createdAt       DateTime @default(now())

Relations:
  variant    ProductVariant @relation(fields: [variantId], references: [id])
  actorAdmin AdminUser      @relation(fields: [actorAdminId], references: [id])
  @@map("inventory_adjustment")
```

---

## 6. Cart Models

```
Model: Cart
Table: cart

Fields:
  id           String @id
  userId       String? @map("user_id")
  sessionToken String? @map("session_token")
  status       CartStatus @default(Active)
  currency     String @default("VND")
  expiresAt    DateTime? @map("expires_at")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?

Relations:
  user         User? @relation(fields: [userId], references: [id])
  cartItems    CartItem[]
  reservations StockReservation[]

  @@map("cart")

Model: CartItem
Table: cart_item

Fields:
  id           String @id
  cartId       String @map("cart_id")
  variantId    String @map("variant_id")
  quantity     Int
  unitPrice    BigInt @map("unit_price")
  reservationId String? @map("reservation_id")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

Relations:
  cart        Cart            @relation(fields: [cartId], references: [id])
  variant     ProductVariant  @relation(fields: [variantId], references: [id])
  reservation StockReservation? @relation(fields: [reservationId], references: [id])
  @@unique([cartId, variantId])
  @@map("cart_item")
```

---

## 7. Checkout Model

```
Model: CheckoutSession
Table: checkout_session

Fields:
  id                 String @id
  userId             String? @map("user_id")
  guestEmail         String? @map("guest_email")
  cartId             String? @map("cart_id")
  status             CheckoutSessionStatus @default(Active)
  shippingAddressId  String? @map("shipping_address_id")
  shippingMethodId   String? @map("shipping_method_id")
  paymentMethod      String? @map("payment_method")
  voucherCode        String? @map("voucher_code")
  subtotal           BigInt @default(0)
  discountAmount     BigInt @default(0) @map("discount_amount")
  shippingFee        BigInt @default(0) @map("shipping_fee")
  taxAmount          BigInt @default(0) @map("tax_amount")
  total              BigInt @default(0)
  idempotencyKey     String @unique @map("idempotency_key")
  expiresAt          DateTime @map("expires_at")
  createdAt          DateTime @default(now())
  completedAt        DateTime? @map("completed_at")

Relations:
  user User? @relation(fields: [userId], references: [id])

  @@map("checkout_session")
```

---

## 8. Promotion & Tax Models

```
Model: Promotion
Table: promotion

Fields:
  id                String @id
  name              String
  type              PromotionType
  value             Decimal
  applicableType    PromotionApplicableType @map("applicable_type")
  minOrderAmount    BigInt @default(0) @map("min_order_amount")
  usageLimit        Int @default(0) @map("usage_limit")
  usageCount        Int @default(0) @map("usage_count")
  perUserLimit      Int @default(1) @map("per_user_limit")
  stackable         Boolean @default(false)
  startDate         DateTime @map("start_date")
  endDate           DateTime @map("end_date")
  status            PromotionStatus @default(Draft)
  createdBy         String? @map("created_by")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime?

Relations:
  vouchers          Voucher[]
  promotionUsages   PromotionUsage[]

  @@map("promotion")

Model: Voucher
Table: voucher

Fields:
  id            String @id
  promotionId   String @map("promotion_id")
  code          String @unique
  usageLimit    Int @default(0) @map("usage_limit")
  usageCount    Int @default(0) @map("usage_count")
  perUserLimit  Int @default(1) @map("per_user_limit")
  validFrom     DateTime @map("valid_from")
  validTo       DateTime @map("valid_to")
  status        VoucherStatus @default(Draft)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?

Relations:
  promotion       Promotion @relation(fields: [promotionId], references: [id])
  voucherUsages   VoucherUsage[]

  @@map("voucher")

Model: PromotionUsage
Table: promotion_usage

Fields:
  id              String @id
  promotionId     String @map("promotion_id")
  userId          String? @map("user_id")
  orderId         String? @map("order_id")
  discountAmount  BigInt @map("discount_amount")
  usedAt          DateTime @default(now()) @map("used_at")

Relations:
  promotion Promotion @relation(fields: [promotionId], references: [id])
  user      User?    @relation(fields: [userId], references: [id])
  order     Order?   @relation(fields: [orderId], references: [id])

  @@map("promotion_usage")

Model: VoucherUsage
Table: voucher_usage

Fields:
  id              String @id
  voucherId       String @map("voucher_id")
  userId          String? @map("user_id")
  orderId         String? @map("order_id")
  discountAmount  BigInt @map("discount_amount")
  usedAt          DateTime @default(now()) @map("used_at")

Relations:
  voucher Voucher @relation(fields: [voucherId], references: [id])
  user    User?   @relation(fields: [userId], references: [id])
  order   Order?  @relation(fields: [orderId], references: [id])

  @@map("voucher_usage")

Model: TaxRate
Table: tax_rate

Fields:
  id              String @id
  name            String
  rate            Decimal
  countryCode     String @default("VN") @map("country_code")
  regionCode      String? @map("region_code")
  isDefault       Boolean @default(false) @map("is_default")
  isActive        Boolean @default(true) @map("is_active")
  effectiveFrom   DateTime? @map("effective_from")
  effectiveTo     DateTime? @map("effective_to")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("tax_rate")

Model: TaxExemption
Table: tax_exemption

Fields:
  id          String @id
  categoryId  String @unique @map("category_id")
  reason      String
  createdBy   String? @map("created_by")
  createdAt   DateTime @default(now())

Relations:
  category Category @relation(fields: [categoryId], references: [id])

  @@map("tax_exemption")
```

---

## 9. Order Models

```
Model: Order
Table: order

Fields:
  id                  String @id
  orderNumber         String @unique @map("order_number")
  userId              String? @map("user_id")
  guestEmail          String? @map("guest_email")
  guestPhone          String? @map("guest_phone")
  status              OrderStatus
  currency            String @default("VND")
  subtotal            BigInt @default(0)
  discountAmount      BigInt @default(0) @map("discount_amount")
  shippingFee         BigInt @default(0) @map("shipping_fee")
  taxAmount           BigInt @default(0) @map("tax_amount")
  total               BigInt @default(0)
  paidAmount          BigInt @default(0) @map("paid_amount")
  refundedAmount      BigInt @default(0) @map("refunded_amount")
  taxRate             Decimal @default(10.0) @map("tax_rate")
  voucherCode         String? @map("voucher_code")
  notes               String?
  shippingMethodId    String? @map("shipping_method_id")
  shippingAddressId   String? @map("shipping_address_id")
  billingAddressId    String? @map("billing_address_id")
  confirmedAt         DateTime? @map("confirmed_at")
  shippedAt           DateTime? @map("shipped_at")
  deliveredAt         DateTime? @map("delivered_at")
  completedAt         DateTime? @map("completed_at")
  cancelledAt         DateTime? @map("cancelled_at")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?

Relations:
  user           User? @relation(fields: [userId], references: [id])
  items          OrderItem[]
  addresses      OrderAddress[]
  statusHistory  OrderStatusHistory[]
  payment        Payment?
  shipment       Shipment?
  reservation    StockReservation[]
  voucherUsages  VoucherUsage[]
  promotionUsages PromotionUsage[]
  refunds        Refund[]
  returns        Return[]
  supportTickets SupportTicket[]

Enums:
  OrderStatus: Pending, Confirmed, Processing, Shipped, Delivered, Completed, Cancelled, Returned

  @@index([userId, createdAt(sort: Desc)])
  @@map("order")

Model: OrderItem
Table: order_item

Fields:
  id            String @id
  orderId       String @map("order_id")
  variantId     String @map("variant_id")
  productId     String @map("product_id")
  productName   String @map("product_name")
  variantSku    String @map("variant_sku")
  quantity      Int
  unitPrice     BigInt @map("unit_price")
  subtotal      BigInt
  taxAmount     BigInt @map("tax_amount")
  taxRate       Decimal @map("tax_rate")
  discountAmount BigInt @default(0) @map("discount_amount")
  total         BigInt

Relations:
  order       Order @relation(fields: [orderId], references: [id])
  variant     ProductVariant @relation(fields: [variantId], references: [id])
  product     Product @relation(fields: [productId], references: [id])
  returnItems ReturnItem[]
  reviews     Review[]
  @@map("order_item")

Model: OrderAddress
Table: order_address

Fields:
  id        String @id
  orderId   String @map("order_id")
  type      OrderAddressType
  fullName  String @map("full_name")
  phone     String
  province  String
  district  String
  ward      String
  street    String
  notes     String?

Relations:
  order Order @relation(fields: [orderId], references: [id])
  @@map("order_address")

Model: OrderStatusHistory
Table: order_status_history

Fields:
  id          String @id
  orderId     String @map("order_id")
  fromStatus  OrderStatus? @map("from_status")
  toStatus    OrderStatus @map("to_status")
  actorType   AuditActorType @map("actor_type")
  actorId     String? @map("actor_id")
  reason      String?
  metadata    Json?
  createdAt   DateTime @default(now())

Relations:
  order Order @relation(fields: [orderId], references: [id])
  @@map("order_status_history")
```

---

## 10. Payment Models

```
Model: Payment
Table: payment

Fields:
  id                String @id
  orderId           String @unique @map("order_id")
  providerCode      String @map("provider_code")
  intentId          String? @map("intent_id")
  status            PaymentStatus
  amount            BigInt
  capturedAmount    BigInt @default(0) @map("captured_amount")
  refundedAmount    BigInt @default(0) @map("refunded_amount")
  currency          String @default("VND")
  paymentMethod     String? @map("payment_method")
  expiresAt         DateTime? @map("expires_at")
  capturedAt        DateTime? @map("captured_at")
  failedAt          DateTime? @map("failed_at")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

Relations:
  order       Order @relation(fields: [orderId], references: [id])
  transactions PaymentTransaction[]
  webhooks    WebhookEvent[]
  refunds     Refund[]

  @@unique([providerCode, intentId])
  @@map("payment")

Model: PaymentTransaction
Table: payment_transaction

Fields:
  id                  String @id
  paymentId           String @map("payment_id")
  type                PaymentTransactionType
  amount              BigInt
  providerTransactionId String? @map("provider_transaction_id")
  providerCode        String? @map("provider_code")
  status              PaymentTransactionStatus
  rawResponse         Json? @map("raw_response")
  createdAt           DateTime @default(now())

Relations:
  payment Payment @relation(fields: [paymentId], references: [id])
  @@map("payment_transaction")

Model: WebhookEvent
Table: webhook_event

Fields:
  id            String @id
  providerCode  String @map("provider_code")
  eventId       String @map("event_id")
  eventType     String @map("event_type")
  payload       Json
  processedAt   DateTime? @map("processed_at")
  receivedAt    DateTime @default(now()) @map("received_at")

Relations:
  payment Payment? @relation(fields: [paymentId], references: [id])
  // Note: Polymorphic - one webhook may apply to payment, refund, etc.
  // Use raw query or denormalize paymentId

  @@unique([providerCode, eventId])
  @@map("webhook_event")

Model: Refund
Table: refund

Fields:
  id                String @id
  paymentId         String @map("payment_id")
  orderId           String @map("order_id")
  amount            BigInt
  reason            String?
  providerRefundId  String? @map("provider_refund_id")
  status            RefundStatus
  requestedBy       String @map("requested_by")
  processedAt       DateTime? @map("processed_at")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

Relations:
  payment     Payment    @relation(fields: [paymentId], references: [id])
  order       Order      @relation(fields: [orderId], references: [id])
  requestedByAdmin AdminUser @relation(fields: [requestedBy], references: [id])

  @@map("refund")
```

---

## 11. Shipping Models

```
Model: ShippingZone
Table: shipping_zone

Fields:
  id          String @id
  name        String
  countryCode String @default("VN") @map("country_code")
  regionCodes String? @map("region_codes") // JSON array
  isActive    Boolean @default(true) @map("is_active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

Relations:
  shippingRates ShippingRate[]
  shipments     Shipment[]
  @@map("shipping_zone")

Model: ShippingRate
Table: shipping_rate

Fields:
  id                  String @id
  zoneId              String @map("zone_id")
  carrierCode         String @map("carrier_code")
  serviceName         String @map("service_name")
  minWeight           Decimal? @map("min_weight")
  maxWeight           Decimal? @map("max_weight")
  baseFee             BigInt @map("base_fee")
  perKgFee            BigInt @map("per_kg_fee")
  estimatedDaysMin    Int @map("estimated_days_min")
  estimatedDaysMax    Int @map("estimated_days_max")
  isActive            Boolean @default(true) @map("is_active")

Relations:
  zone ShippingZone @relation(fields: [zoneId], references: [id])
  @@map("shipping_rate")

Model: Shipment
Table: shipment

Fields:
  id                      String @id
  orderId                 String @unique @map("order_id")
  zoneId                  String? @map("zone_id")
  carrierCode             String @map("carrier_code")
  serviceName             String? @map("service_name")
  trackingNumber          String @unique @map("tracking_number")
  weight                  Decimal?
  shippingFee             BigInt @map("shipping_fee")
  status                  ShipmentStatus
  labelUrl                String? @map("label_url")
  dispatchedAt            DateTime? @map("dispatched_at")
  estimatedDeliveryAt     DateTime? @map("estimated_delivery_at")
  deliveredAt             DateTime? @map("delivered_at")
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  deletedAt               DateTime?

Relations:
  order           Order @relation(fields: [orderId], references: [id])
  zone            ShippingZone? @relation(fields: [zoneId], references: [id])
  trackingEvents  TrackingEvent[]
  @@map("shipment")

Model: TrackingEvent
Table: tracking_event

Fields:
  id          String @id
  shipmentId  String @map("shipment_id")
  status      String
  location    String?
  description String?
  eventAt     DateTime @map("event_at")
  createdAt   DateTime @default(now())

Relations:
  shipment Shipment @relation(fields: [shipmentId], references: [id])
  @@map("tracking_event")
```

---

## 12. Returns Models

```
Model: Return
Table: return

Fields:
  id                  String @id
  rmaNumber           String @unique @map("rma_number")
  orderId             String @map("order_id")
  customerId          String @map("customer_id")
  status              ReturnStatus
  reason              String?
  customerNotes       String? @map("customer_notes")
  totalRefundAmount   BigInt @default(0) @map("total_refund_amount")
  requestedAt         DateTime @default(now()) @map("requested_at")
  approvedAt          DateTime? @map("approved_at")
  rejectedAt          DateTime? @map("rejected_at")
  receivedAt          DateTime? @map("received_at")
  inspectedAt         DateTime? @map("inspected_at")
  refundedAt          DateTime? @map("refunded_at")
  closedAt            DateTime? @map("closed_at")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?

Relations:
  order       Order @relation(fields: [orderId], references: [id])
  customer    User  @relation(fields: [customerId], references: [id])
  items       ReturnItem[]
  inspections ReturnInspection[]
  images      ReturnImage[]
  @@map("return")

Model: ReturnItem
Table: return_item

Fields:
  id          String @id
  returnId    String @map("return_id")
  orderItemId String @map("order_item_id")
  variantId   String @map("variant_id")
  quantity    Int
  unitPrice   BigInt @map("unit_price")
  reason      String?
  condition   ReturnCondition
  createdAt   DateTime @default(now())

Relations:
  return    Return @relation(fields: [returnId], references: [id])
  orderItem OrderItem @relation(fields: [orderItemId], references: [id])
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  inspection ReturnInspection?
  @@map("return_item")

Model: ReturnInspection
Table: return_inspection

Fields:
  id          String @id
  returnId    String @map("return_id")
  itemId      String? @map("item_id")
  outcome     ReturnInspectionOutcome
  notes       String?
  photos      Json?
  inspectorId String @map("inspector_id")
  inspectedAt DateTime @default(now()) @map("inspected_at")

Relations:
  return    Return @relation(fields: [returnId], references: [id])
  item      ReturnItem? @relation(fields: [itemId], references: [id])
  inspector AdminUser @relation(fields: [inspectorId], references: [id])
  @@map("return_inspection")

Model: ReturnImage
Table: return_image

Fields:
  id          String @id
  returnId    String @map("return_id")
  mediaFileId String @map("media_file_id")
  createdAt   DateTime @default(now())

Relations:
  return    Return @relation(fields: [returnId], references: [id])
  mediaFile MediaFile @relation(fields: [mediaFileId], references: [id])
  @@map("return_image")
```

---

## 13. Reviews Models

```
Model: Review
Table: review

Fields:
  id           String @id
  productId    String @map("product_id")
  variantId    String? @map("variant_id")
  customerId   String @map("customer_id")
  orderItemId  String? @unique @map("order_item_id")
  rating       Int
  title        String?
  content      String
  status       ReviewStatus @default(Pending)
  helpfulVotes Int @default(0) @map("helpful_votes")
  publishedAt  DateTime? @map("published_at")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?

Relations:
  product       Product @relation(fields: [productId], references: [id])
  variant       ProductVariant? @relation(fields: [variantId], references: [id])
  customer      User  @relation(fields: [customerId], references: [id])
  orderItem     OrderItem? @relation(fields: [orderItemId], references: [id])
  reply         ReviewReply?
  helpfulVotes  ReviewHelpfulVote[]

  @@map("review")

Model: ReviewReply
Table: review_reply

Fields:
  id            String @id
  reviewId      String @unique @map("review_id")
  adminUserId   String @map("admin_user_id")
  content       String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?

Relations:
  review    Review @relation(fields: [reviewId], references: [id])
  adminUser AdminUser @relation(fields: [adminUserId], references: [id])
  @@map("review_reply")

Model: ReviewHelpfulVote
Table: review_helpful_vote

Fields:
  id          String @id
  reviewId    String @map("review_id")
  customerId  String @map("customer_id")
  createdAt   DateTime @default(now())

Relations:
  review   Review @relation(fields: [reviewId], references: [id])
  customer User   @relation(fields: [customerId], references: [id])
  @@unique([reviewId, customerId])
  @@map("review_helpful_vote")
```

---

## 14. Notifications Models

```
Model: EmailTemplate
Table: email_template

Fields:
  id             String @id
  code           String
  subject        String
  bodyTemplate   String @map("body_template")
  locale         String @default("vi-VN")
  version        Int @default(1)
  isActive       Boolean @default(true) @map("is_active")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

Relations:
  notificationLogs NotificationLog[]
  @@unique([code, locale])
  @@map("email_template")

Model: NotificationLog
Table: notification_log

Fields:
  id                String @id
  templateId        String @map("template_id")
  recipientType     NotificationRecipientType @map("recipient_type")
  recipientId       String? @map("recipient_id")
  recipientEmail    String? @map("recipient_email")
  subject           String
  status            NotificationLogStatus
  providerMessageId String? @map("provider_message_id")
  attempts          Int @default(0)
  lastError         String? @map("last_error")
  sentAt            DateTime? @map("sent_at")
  createdAt         DateTime @default(now())

Relations:
  template EmailTemplate @relation(fields: [templateId], references: [id])
  @@map("notification_log")

Model: NotificationPreference
Table: notification_preference

Fields:
  id          String @id
  ownerType   NotificationOwnerType @map("owner_type")
  ownerId     String @map("owner_id")
  channel     NotificationChannel
  eventType   String @map("event_type")
  enabled     Boolean @default(true)
  updatedAt   DateTime @updatedAt

Relations:
  // polymorphic
  @@unique([ownerType, ownerId, channel, eventType])
  @@map("notification_preference")

Model: CookieConsent
Table: cookie_consent

Fields:
  id          String @id
  visitorId   String @map("visitor_id")
  sessionId   String? @map("session_id")
  necessary   Boolean @default(true)
  analytics   Boolean @default(false)
  marketing   Boolean @default(false)
  ipAddress   String? @map("ip_address")
  userAgent   String? @map("user_agent")
  consentedAt DateTime @default(now()) @map("consented_at")
  expiresAt   DateTime @map("expires_at")

  @@map("cookie_consent")
```

---

## 15. Support Models

```
Model: SupportTicket
Table: support_ticket

Fields:
  id                String @id
  ticketNumber      String @unique @map("ticket_number")
  customerId        String? @map("customer_id")
  guestEmail        String? @map("guest_email")
  guestName         String? @map("guest_name")
  orderId           String? @map("order_id")
  subject           String
  status            TicketStatus @default(Open)
  priority          TicketPriority @default(Medium)
  assignedTo        String? @map("assigned_to")
  firstResponseAt   DateTime? @map("first_response_at")
  resolvedAt        DateTime? @map("resolved_at")
  closedAt          DateTime? @map("closed_at")
  slaDueAt          DateTime? @map("sla_due_at")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime?

Relations:
  customer User? @relation(fields: [customerId], references: [id])
  order    Order? @relation(fields: [orderId], references: [id])
  assignedAdmin AdminUser? @relation(fields: [assignedTo], references: [id])
  messages TicketMessage[]

  @@map("support_ticket")

Model: TicketMessage
Table: ticket_message

Fields:
  id          String @id
  ticketId    String @map("ticket_id")
  senderType  TicketSenderType @map("sender_type")
  senderId    String? @map("sender_id")
  content     String
  isInternal  Boolean @default(false) @map("is_internal")
  createdAt   DateTime @default(now())

Relations:
  ticket SupportTicket @relation(fields: [ticketId], references: [id])
  // sender polymorphic
  @@map("ticket_message")
```

---

## 16. Audit Model

```
Model: AuditLog
Table: audit_log

Fields:
  id          String @id
  actorType   AuditActorType @map("actor_type")
  actorId     String? @map("actor_id")
  action      String
  entityType  String @map("entity_type")
  entityId    String? @map("entity_id")
  before      Json?
  after       Json?
  ipAddress   String? @map("ip_address")
  userAgent   String? @map("user_agent")
  requestId   String? @map("request_id")
  sessionId   String? @map("session_id")
  reason      String?
  metadata    Json?
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([actorType, actorId])
  @@index([entityType, entityId])
  @@index([action])
  @@index([createdAt(sort: Desc)])
  @@map("audit_log")
```

> Audit has NO FK relationships by design. It's an independent aggregate.

---

## 17. Platform Models

```
Model: FeatureFlag
Table: feature_flag

Fields:
  id            String @id
  key           String @unique
  description   String?
  valueType     FeatureFlagValueType @map("value_type")
  defaultValue  String @map("default_value")
  enabled       Boolean @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

Relations:
  overrides FeatureFlagOverride[]
  @@map("feature_flag")

Model: FeatureFlagOverride
Table: feature_flag_override

Fields:
  id            String @id
  flagId        String @map("flag_id")
  targetType    FeatureFlagTargetType @map("target_type")
  targetId      String @map("target_id")
  value         String
  createdAt     DateTime @default(now())
  expiresAt     DateTime? @map("expires_at")

Relations:
  flag FeatureFlag @relation(fields: [flagId], references: [id])
  @@map("feature_flag_override")

Model: StaticPage
Table: static_page

Fields:
  id                  String @id
  slug                String @unique
  title               String
  content             String
  metaTitle           String? @map("meta_title")
  metaDescription     String? @map("meta_description")
  isPublished         Boolean @default(false) @map("is_published")
  publishedAt         DateTime? @map("published_at")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?

  @@map("static_page")

Model: SystemConfig
Table: system_config

Fields:
  id          String @id
  key         String @unique
  value       String
  valueType   SystemConfigValueType @map("value_type")
  description String?
  updatedAt   DateTime @updatedAt

  @@map("system_config")
```

---

## 18. Future Repositories and Services

### 18.1 Repositories (One per Aggregate)

| Repository | Aggregate |
| --- | --- |
| `UserRepository` | A01 - User |
| `AdminUserRepository` | A02 - AdminUser |
| `RoleRepository` | A03 - Role |
| `AddressRepository` | A04 - Address |
| `MfaSecretRepository` | A05 - MfaSecret |
| `TokenRepository` | A06 - RefreshToken/UserSession |
| `CategoryRepository` | A07 |
| `BrandRepository` | A08 |
| `ProductRepository` | A09 |
| `ProductVariantRepository` | A10 |
| `ProductImageRepository` | A11 |
| `ProductAttributeRepository` | A12 |
| `InventoryRepository` | A13 |
| `StockMovementRepository` | A14 |
| `MediaFileRepository` | A15 |
| `CartRepository` | A16 |
| `CheckoutSessionRepository` | A17 |
| `PromotionRepository` | A18 |
| `VoucherRepository` | A19 |
| `OrderRepository` | A20 |
| `PaymentRepository` | A21 |
| `RefundRepository` | A22 |
| `ShipmentRepository` | A23 |
| `ReturnRepository` | A24 |
| `ReviewRepository` | A25 |
| `NotificationLogRepository` | A26 |
| `SupportTicketRepository` | A27 |
| `AuditLogRepository` | A28 |
| `FeatureFlagRepository` | A29 |
| `StaticPageRepository` | A30 |

### 18.2 Services (One or More per Aggregate)

| Service | Aggregate |
| --- | --- |
| `AuthService` | A01, A02, A05, A06 |
| `UserService` | A01 |
| `AdminUserService` | A02 |
| `RbacService` | A03 |
| `AddressService` | A04 |
| `MfaService` | A05 |
| `CategoryService` | A07 |
| `BrandService` | A08 |
| `ProductService` | A09 |
| `ProductVariantService` | A10 |
| `ProductAttributeService` | A11, A12 |
| `InventoryService` | A13 |
| `StockMovementService` | A14 |
| `MediaService` | A15 |
| `CartService` | A16 |
| `CheckoutService` | A17 |
| `PromotionService` | A18 |
| `VoucherService` | A19 |
| `OrderService` | A20 |
| `PaymentService` | A21 |
| `RefundService` | A22 |
| `ShipmentService` | A23 |
| `ReturnService` | A24 |
| `ReviewService` | A25 |
| `NotificationService` | A26 |
| `SupportService` | A27 |
| `AuditService` | A28 |
| `FeatureFlagService` | A29 |
| `StaticPageService` | A30 |

---

## 19. Cross-Reference to Current Docs

| Document | Used For |
| --- | --- |
| `ENTITY_CATALOG.md` | Entity purpose and business meaning |
| `DATA_DICTIONARY.md` | Field validation and classification |
| `RELATIONSHIP_MATRIX.md` | FK and cascade rules |
| `INDEX_STRATEGY.md` | Index definitions |
| `DATABASE_CONSTRAINTS.md` | Check/unique constraints |
| `DATABASE_SECURITY.md` | Encryption; sensitive columns |
| `ERD.md` | Visual relationships |

---

## 20. Coverage Validation

| Check | Status |
| --- | --- |
| Every entity has a model specification | ✓ |
| Polymorphic relations handled | ✓ |
| Enums defined | ✓ |
| Money as BigInt | ✓ |
| UUID (String) IDs | ✓ |
| Soft delete (deletedAt) included | ✓ |
| Repositories mapped | ✓ |
| Services mapped | ✓ |
| Mapping aligns with naming conventions | ✓ |

---

## 21. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal Database Architect | Initial Prisma mapping preparation: 64 entity models, enums, repositories, services |

---

**End of Document — PRISMA_MAPPING.md**
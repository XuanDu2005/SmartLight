/**
 * Centralized types for the admin dashboard.
 *
 * Mirrors backend DTOs. Keep these in sync when the API surface changes.
 */

// ===========================================================================
//  Common
// ===========================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

export interface PaginatedEnvelope<T> {
  data: T[];
  meta?: {
    pagination?: PaginationMeta;
    filters?: Record<string, unknown>;
    sort?: Array<{ field: string; order: 'asc' | 'desc' }>;
  };
}

/**
 * Convenience view matching the old `{ items, total, page, limit }` shape
 * so existing pages don't have to be rewritten when consuming a paginated
 * endpoint. Built from the `{ data, meta.pagination }` envelope returned
 * by all list endpoints.
 */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ===========================================================================
//  Catalog
// ===========================================================================

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'OUT_OF_STOCK';

export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string | null;
  position: number;
  isThumbnail: boolean;
  isVideo?: boolean;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode?: string | null;
  price: MoneyAmount;
  compareAtPrice?: MoneyAmount | null;
  cost?: MoneyAmount | null;
  color?: string | null;
  size?: string | null;
  attributes?: Record<string, string> | null;
  weightGrams?: number | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface BrandRef {
  id: string;
  name: string;
  slug: string;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  status: ProductStatus;
  isFeatured: boolean;
  thumbnail?: string | null;
  priceFrom: MoneyAmount;
  priceTo: MoneyAmount;
  category?: CategoryRef | null;
  brand?: BrandRef | null;
  variantCount: number;
  totalStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetail extends ProductSummary {
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string[] | null;
  categoryId: string;
  brandId?: string | null;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface ListProductsAdminParams extends PaginationParams {
  status?: ProductStatus;
  categoryId?: string;
  brandId?: string;
  isFeatured?: boolean;
  includeDeleted?: boolean;
}

export interface CreateProductDto {
  name: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  status?: ProductStatus;
  isFeatured?: boolean;
  categoryId: string;
  brandId?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  variants: CreateVariantDto[];
  images?: CreateProductImageDto[];
}

export interface UpdateProductDto {
  name?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  status?: ProductStatus;
  isFeatured?: boolean;
  categoryId?: string;
  brandId?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
}

export interface CreateVariantDto {
  sku: string;
  barcode?: string;
  price: number;
  compareAtPrice?: number;
  cost?: number;
  color?: string;
  size?: string;
  attributes?: Record<string, string>;
  weightGrams?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
}

export interface UpdateVariantDto {
  sku?: string;
  barcode?: string;
  price?: number;
  compareAtPrice?: number;
  cost?: number;
  color?: string;
  size?: string;
  attributes?: Record<string, string>;
  weightGrams?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
}

export interface CreateProductImageDto {
  url: string;
  alt?: string;
  position?: number;
  isThumbnail?: boolean;
  isVideo?: boolean;
}

// ===========================================================================
//  Categories
// ===========================================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  displayOrder: number;
  isActive: boolean;
  imageUrl?: string | null;
  isFeatured?: boolean;
  metaTitle?: string | null;
  metaDesc?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
  productCount?: number;
}

/**
 * Payload sent to the server. The actual API DTO uses `displayOrder`
 * + `isActive` (not `position` + `status`) and `metaDesc` (not
 * `metaDescription`). The page form layer mirrors the legacy names for
 * readability and translates before submit.
 */
export interface CreateCategoryDto {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
  displayOrder?: number;
  isActive?: boolean;
  imageUrl?: string;
  metaTitle?: string;
  metaDesc?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string;
  displayOrder?: number;
  isActive?: boolean;
  imageUrl?: string;
  metaTitle?: string;
  metaDesc?: string;
}

// ===========================================================================
//  Brands
// ===========================================================================

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo?: { url: string; altText: string | null } | null;
  logoUrl?: string | null;
  isActive: boolean;
  isFeatured?: boolean;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandDto {
  name: string;
  slug?: string;
  description?: string;
  logoMediaId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface UpdateBrandDto {
  name?: string;
  slug?: string;
  description?: string;
  logoMediaId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

// ===========================================================================
//  Inventory
// ===========================================================================

export interface InventoryStock {
  id: string;
  variantId: string;
  productName: string;
  productSlug: string;
  variantSku: string;
  variantLabel?: string | null;
  onHand: number;
  available: number;
  reserved: number;
  lowStockThreshold: number;
  warehouseId?: string | null;
  updatedAt: string;
}

export interface InventoryListParams extends PaginationParams {
  warehouseId?: string;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
}

export interface StockMovement {
  id: string;
  variantId: string;
  variantSku: string;
  type: 'IMPORT' | 'ADJUSTMENT' | 'RESERVATION' | 'RELEASE' | 'SALE';
  quantity: number;
  balanceAfter: number;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  actorName?: string | null;
  createdAt: string;
}

export interface ListMovementsParams extends PaginationParams {
  type?: StockMovement['type'];
  from?: string;
  to?: string;
}

export interface ImportStockDto {
  variantId: string;
  quantity: number;
  warehouseId?: string;
  reason?: string;
}

export interface StockAdjustmentDto {
  quantity: number;
  reason: string;
}

export interface BulkAdjustmentItem {
  variantId: string;
  adjustment: StockAdjustmentDto;
}
export interface BulkAdjustmentDto {
  items: BulkAdjustmentItem[];
}

export interface UpdateThresholdDto {
  threshold: number;
}

// ===========================================================================
//  Orders
// ===========================================================================

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  variantSku: string;
  variantLabel?: string | null;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: MoneyAmount;
  lineTotal: MoneyAmount;
}

export interface OrderAddress {
  fullName: string;
  phone: string;
  email?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  ward?: string | null;
  district: string;
  province: string;
  country: string;
  postalCode?: string | null;
}

export interface OrderStatusEvent {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note?: string | null;
  actorName?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  code: string;
  status: OrderStatus;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  subtotal: MoneyAmount;
  discount: MoneyAmount;
  shipping: MoneyAmount;
  tax: MoneyAmount;
  total: MoneyAmount;
  items: OrderItem[];
  shippingAddress: OrderAddress;
  billingAddress?: OrderAddress | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  shipmentStatus?: string | null;
  shipmentTrackingNumber?: string | null;
  trackingNumber?: string | null;
  notes?: string | null;
  history: OrderStatusEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ListOrdersAdminParams extends PaginationParams {
  status?: OrderStatus;
  customerId?: string;
  from?: string;
  to?: string;
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
  note?: string;
}

// ===========================================================================
//  Payments
// ===========================================================================

export type PaymentProvider = 'MOMO' | 'VNPAY' | 'PAYPAL';
export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

export interface PaymentSummary {
  id: string;
  orderId: string;
  orderCode: string;
  provider: PaymentProvider;
  amount: MoneyAmount;
  status: PaymentStatus;
  transactionId?: string | null;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  paymentId: string;
  type: 'CHARGE' | 'REFUND' | 'VOID';
  amount: MoneyAmount;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  providerReference?: string | null;
  rawResponse?: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaymentWebhookEvent {
  id: string;
  paymentId: string;
  provider: PaymentProvider;
  eventType: string;
  processed: boolean;
  signatureValid: boolean;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface PaymentDetail extends PaymentSummary {
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  description?: string | null;
  failureReason?: string | null;
  refundedAmount?: MoneyAmount | null;
  transactions: PaymentTransaction[];
  webhooks: PaymentWebhookEvent[];
  updatedAt: string;
}

export interface ListPaymentsAdminParams extends PaginationParams {
  status?: PaymentStatus;
  provider?: PaymentProvider;
  orderId?: string;
}

// ===========================================================================
//  Promotions
// ===========================================================================

export type PromotionType =
  | 'PERCENT_OFF'
  | 'AMOUNT_OFF'
  | 'BUY_X_GET_Y'
  | 'FREE_SHIPPING';

export type PromotionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export interface Promotion {
  id: string;
  name: string;
  description?: string | null;
  type: PromotionType;
  status: PromotionStatus;
  priority: number;
  startsAt: string;
  endsAt: string;
  minimumOrderAmount?: MoneyAmount | null;
  maximumDiscountAmount?: MoneyAmount | null;
  usageLimit?: number | null;
  usageCount: number;
  perUserLimit?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Voucher {
  id: string;
  promotionId: string;
  code: string;
  status: 'ACTIVE' | 'DISABLED';
  startsAt: string;
  expiresAt: string;
  maxRedemptions?: number | null;
  redeemedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromotionDto {
  name: string;
  description?: string;
  type: PromotionType;
  status?: PromotionStatus;
  priority?: number;
  startsAt: string;
  endsAt: string;
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  discountValue?: number;
}

export interface UpdatePromotionDto {
  name?: string;
  description?: string;
  type?: PromotionType;
  status?: PromotionStatus;
  priority?: number;
  startsAt?: string;
  endsAt?: string;
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  discountValue?: number;
}

export interface CreateVoucherDto {
  promotionId: string;
  code: string;
  startsAt: string;
  expiresAt: string;
  maxRedemptions?: number;
}

export interface UpdateVoucherDto {
  code?: string;
  status?: 'ACTIVE' | 'DISABLED';
  startsAt?: string;
  expiresAt?: string;
  maxRedemptions?: number;
}

export interface VoucherUsage {
  id: string;
  voucherId: string;
  voucherCode: string;
  userId: string;
  userEmail: string;
  orderId: string;
  orderCode: string;
  discountApplied: MoneyAmount;
  createdAt: string;
}

// ===========================================================================
//  Dashboard / KPIs
// ===========================================================================

export interface DashboardSummary {
  revenueToday: MoneyAmount;
  revenueThisMonth: MoneyAmount;
  revenueTotal: MoneyAmount;
  ordersToday: number;
  ordersThisMonth: number;
  ordersTotal: number;
  pendingOrders: number;
  customersTotal: number;
  newCustomersThisMonth: number;
  productsActive: number;
  inventoryLowStock: number;
  inventoryOutOfStock: number;
}

export interface DashboardTimePoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  productSlug: string;
  thumbnail?: string | null;
  unitsSold: number;
  revenue: number;
}

export interface TopCategory {
  categoryId: string;
  categoryName: string;
  revenue: number;
  unitsSold: number;
}

export interface LatestOrder extends OrderSummaryLite {}
export interface OrderSummaryLite {
  id: string;
  code: string;
  status: OrderStatus;
  total: MoneyAmount;
  customerName: string;
  createdAt: string;
}

export interface LatestCustomer {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
  orderCount: number;
}

// ===========================================================================
//  Reports
// ===========================================================================

export interface ReportFilters {
  from: string;
  to: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface RevenueReportRow {
  date: string;
  grossRevenue: number;
  netRevenue: number;
  orderCount: number;
}

export interface OrdersReportRow {
  date: string;
  orderCount: number;
  paidCount: number;
  cancelledCount: number;
  refundedCount: number;
}

export interface ProductsReportRow {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  stockRemaining: number;
}

export interface CustomersReportRow {
  customerId: string;
  email: string;
  fullName: string;
  orderCount: number;
  totalSpend: number;
  lastOrderAt: string | null;
}

export interface InventoryReportRow {
  variantId: string;
  productName: string;
  sku: string;
  onHand: number;
  reserved: number;
  available: number;
  threshold: number;
  status: 'OK' | 'LOW' | 'OUT';
}
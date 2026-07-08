/**
 * Order response DTOs.
 *
 * Money values are `number` at the API boundary for client compatibility.
 * All internal math uses Prisma.Decimal.
 */

export interface OrderTotalsDto {
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
}

export interface ShippingAddressDto {
  fullName: string | null;
  phone: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  detail: string | null;
}

export interface BillingAddressDto {
  fullName: string | null;
  phone: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  detail: string | null;
}

export interface OrderItemResponseDto {
  id: string;
  productVariantId: string;
  productName: string;
  variantName: string;
  sku: string;
  productSlug: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  taxAmount: number;
  weightGrams: number | null;
}

export interface OrderStatusHistoryEntryDto {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedByType: string;
  changedById: string | null;
  changedByName: string | null;
  reason: string | null;
  createdAt: string;
}

export interface OrderResponseDto {
  id: string;
  orderNumber: string;
  userId: string;
  checkoutSessionId: string | null;
  cartId: string | null;
  status: string;
  paymentStatus: string;
  currency: string;
  items: OrderItemResponseDto[];
  statusHistory: OrderStatusHistoryEntryDto[];
  shippingAddress: ShippingAddressDto | null;
  billingAddress: BillingAddressDto | null;
  totals: OrderTotalsDto;
  couponCode: string | null;
  customerNotes: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderSummaryDto {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  itemCount: number;
  grandTotal: number;
  currency: string;
  createdAt: string;
}

export interface OrderCreateResponseDto {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  currency: string;
  createdAt: string;
}

export interface AdminOrderListItemDto {
  id: string;
  orderNumber: string;
  userId: string;
  userEmail: string | null;
  status: string;
  paymentStatus: string;
  itemCount: number;
  grandTotal: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
}

export interface AdminOrderListResponseDto {
  items: AdminOrderListItemDto[];
  total: number;
  page: number;
  limit: number;
}
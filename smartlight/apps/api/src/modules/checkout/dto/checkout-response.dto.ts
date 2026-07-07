/**
 * Checkout response DTOs.
 *
 * Money values are `number` at the API boundary for client compatibility.
 * All internal math uses Prisma.Decimal.
 */

export interface CheckoutTotalsDto {
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
}

export interface CheckoutItemResponseDto {
  id: string;
  sessionId: string;
  productVariantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  taxAmount: number;
  inStock: boolean;
  availableQuantity: number;
}

export interface ReservationResponseDto {
  id: string;
  status: string;
  expiresAt: string | null;
  items: ReservationItemDto[];
}

export interface ReservationItemDto {
  productVariantId: string;
  quantity: number;
  productName: string;
  variantName: string;
  sku: string;
}

export interface CheckoutResponseDto {
  id: string;
  cartId: string;
  userId: string;
  status: string;
  currency: string;
  items: CheckoutItemResponseDto[];
  reservation: ReservationResponseDto | null;
  shippingAddress: ShippingAddressDto | null;
  billingAddress: BillingAddressDto | null;
  couponCode: string | null;
  totals: CheckoutTotalsDto;
  expiresAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface CheckoutSummaryDto {
  id: string;
  cartId: string;
  status: string;
  itemCount: number;
  grandTotal: number;
  currency: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface CheckoutCreateResponseDto {
  id: string;
  status: string;
  expiresAt: string;
  itemCount: number;
  totals: CheckoutTotalsDto;
}

export interface AdminCheckoutListItemDto {
  id: string;
  cartId: string;
  userId: string;
  status: string;
  itemCount: number;
  grandTotal: number;
  currency: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface AdminCheckoutListResponseDto {
  items: AdminCheckoutListItemDto[];
  total: number;
  page: number;
  limit: number;
}

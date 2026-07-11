/**
 * Cart response DTOs.
 *
 * Money values are returned as **number** to the API boundary (most clients
 * don't handle Prisma's Decimal serialization well) but all internal math uses
 * Prisma Decimal — so totals are accurate to the limits of the database
 * column precision (4 decimal places).
 */

export interface CartTotalsDto {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  estimatedShipping: number;
  grandTotal: number;
  selectedSubtotal: number;
  currency: string;
}

export interface CartItemResponseDto {
  id: string;
  cartId: string;
  productVariantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  color: string | null;
  size: string | null;
  quantity: number;
  unitPrice: number;
  discountSnapshot: number;
  subtotal: number;
  inStock: boolean;
  availableQuantity: number;
  isSelected: boolean;
  isProductActive: boolean;
  isVariantActive: boolean;
  maxQuantityPerOrder: number;
  notes: string | null;
  addedAt: string;
  updatedAt: string;
}

export interface CartResponseDto {
  id: string;
  userId: string;
  status: string;
  currency: string;
  itemCount: number;
  selectedItemCount: number;
  items: CartItemResponseDto[];
  couponCode: string | null;
  totals: CartTotalsDto;
  lastActivityAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CartMergeResultDto {
  mergedItems: number;
  keptSeparate: number;
  skipped: number;
  cart: CartResponseDto;
}

export interface AdminCartListItemDto {
  id: string;
  userId: string;
  userEmail: string | null;
  status: string;
  itemCount: number;
  subtotal: number;
  grandTotal: number;
  currency: string;
  lastActivityAt: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface AdminCartListResponseDto {
  items: AdminCartListItemDto[];
  total: number;
  page: number;
  limit: number;
}

export interface CartSummaryDto {
  id: string;
  status: string;
  itemCount: number;
  selectedItemCount: number;
  subtotal: number;
  grandTotal: number;
  currency: string;
}


/**
 * Cart API client — wraps /v1/cart/* endpoints.
 */
import { apiClient } from './api-client';

export interface CartItemDto {
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

export interface CartDto {
  id: string;
  userId: string | null;
  status: string;
  currency: string;
  itemCount: number;
  selectedItemCount: number;
  items: CartItemDto[];
  couponCode: string | null;
  totals: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    shippingTotal: number;
    estimatedShipping: number;
    grandTotal: number;
    selectedSubtotal: number;
    currency: string;
  };
  lastActivityAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddCartItemInput {
  variantId: string;
  quantity: number;
}

export interface UpdateCartItemInput {
  quantity: number;
}

export const cartApi = {
  async getCart(): Promise<CartDto> {
    const res = await apiClient.get<CartDto>('/cart');
    return res.data;
  },

  async addItem(input: AddCartItemInput): Promise<CartDto> {
    const res = await apiClient.post<CartDto>('/cart/items', input);
    return res.data;
  },

  async updateItem(itemId: string, input: UpdateCartItemInput): Promise<CartDto> {
    const res = await apiClient.patch<CartDto>(`/cart/items/${itemId}`, input);
    return res.data;
  },

  async removeItem(itemId: string): Promise<CartDto> {
    const res = await apiClient.delete<CartDto>(`/cart/items/${itemId}`);
    return res.data;
  },

  async clear(): Promise<CartDto> {
    const res = await apiClient.post<CartDto>('/cart/clear');
    return res.data;
  },
};
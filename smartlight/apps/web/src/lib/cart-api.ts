/**
 * Cart API client — wraps /v1/cart/* endpoints.
 */
import { apiClient } from './api-client';

export interface CartItemVariant {
  id: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  price: number;
  currency: 'VND';
}

export interface CartItemProduct {
  id: string;
  name: string;
  slug: string;
}

export interface CartItemDto {
  id: string;
  productVariantId: string;
  product: CartItemProduct;
  variant: CartItemVariant;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  currency: 'VND';
}

export interface CartDto {
  id: string;
  userId: string | null;
  status: string;
  currency: 'VND';
  items: CartItemDto[];
  totals: {
    subtotal: number;
    itemCount: number;
    discountAmount: number;
    grandTotal: number;
    currency: 'VND';
  };
  updatedAt: string;
}

export interface AddCartItemInput {
  productVariantId: string;
  quantity: number;
}

export interface UpdateCartItemInput {
  quantity: number;
}

export const cartApi = {
  async getCart(): Promise<CartDto> {
    const res = await apiClient.get<{ data: CartDto }>('/cart');
    return res.data.data;
  },

  async addItem(input: AddCartItemInput): Promise<CartDto> {
    const res = await apiClient.post<{ data: CartDto }>('/cart/items', input);
    return res.data.data;
  },

  async updateItem(itemId: string, input: UpdateCartItemInput): Promise<CartDto> {
    const res = await apiClient.patch<{ data: CartDto }>(`/cart/items/${itemId}`, input);
    return res.data.data;
  },

  async removeItem(itemId: string): Promise<CartDto> {
    const res = await apiClient.delete<{ data: CartDto }>(`/cart/items/${itemId}`);
    return res.data.data;
  },

  async clear(): Promise<CartDto> {
    const res = await apiClient.post<{ data: CartDto }>('/cart/clear');
    return res.data.data;
  },
};
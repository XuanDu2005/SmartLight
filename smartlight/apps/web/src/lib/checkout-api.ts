/**
 * Checkout API client — wraps /v1/checkout/* endpoints.
 *
 * Backend returns raw DTOs (no `{ data: ... }` wrapper), matching axios
 * `AxiosResponse<T>` semantics where `res.data` IS the payload.
 */
import { apiClient } from './api-client';

export interface CheckoutAddress {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detail: string;
}

export interface CheckoutTotals {
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
}

export interface CheckoutSessionDto {
  id: string;
  userId: string;
  cartId: string;
  status: 'CREATED' | 'PENDING_RESERVATION' | 'RESERVED' | 'EXPIRED' | 'CONVERTED';
  currency: string;
  shippingAddress: CheckoutAddress | null;
  couponCode: string | null;
  totals: CheckoutTotals;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export const checkoutApi = {
  async createSession(idempotencyKey?: string): Promise<CheckoutSessionDto> {
    const res = await apiClient.post<CheckoutSessionDto>('/checkout', {
      idempotencyKey,
    });
    return res.data;
  },

  async getSession(id: string): Promise<CheckoutSessionDto> {
    const res = await apiClient.get<CheckoutSessionDto>(`/checkout/${id}`);
    return res.data;
  },

  async updateAddress(id: string, address: CheckoutAddress): Promise<CheckoutSessionDto> {
    const res = await apiClient.post<CheckoutSessionDto>(
      `/checkout/${id}/address`,
      address,
    );
    return res.data;
  },

  async reserveInventory(id: string): Promise<CheckoutSessionDto> {
    const res = await apiClient.post<CheckoutSessionDto>(
      `/checkout/${id}/reserve`,
      {},
    );
    return res.data;
  },

  async applyCoupon(id: string, code: string): Promise<CheckoutSessionDto> {
    const res = await apiClient.post<CheckoutSessionDto>(
      `/checkout/${id}/coupon`,
      { code },
    );
    return res.data;
  },

  async removeCoupon(id: string): Promise<CheckoutSessionDto> {
    const res = await apiClient.delete<CheckoutSessionDto>(
      `/checkout/${id}/coupon`,
    );
    return res.data;
  },
};
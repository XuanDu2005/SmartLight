/**
 * Orders API client — wraps /v1/orders/* endpoints.
 *
 * Backend returns raw DTOs (no `{ data: ... }` wrapper).
 */
import { apiClient } from './api-client';

export interface OrderItemDto {
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
}

export interface OrderTotalsDto {
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
}

export interface OrderAddressDto {
  fullName: string | null;
  phone: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  detail: string | null;
}

export interface OrderStatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedByType: string;
  changedByName: string | null;
  reason: string | null;
  createdAt: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  itemCount: number;
  grandTotal: number;
  currency: string;
  createdAt: string;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  currency: string;
  items: OrderItemDto[];
  totals: OrderTotalsDto;
  statusHistory: OrderStatusHistoryEntry[];
  shippingAddress: OrderAddressDto | null;
  billingAddress: OrderAddressDto | null;
  couponCode: string | null;
  customerNotes: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export const ordersApi = {
  async listMyOrders(): Promise<OrderSummary[]> {
    const res = await apiClient.get<{ items: OrderSummary[] } | OrderSummary[]>('/orders');
    const body: any = res.data;
    if (Array.isArray(body)) return body;
    if (body && Array.isArray((body as any).items)) return (body as any).items;
    if (body && Array.isArray((body as any).data)) return (body as any).data;
    return [];
  },

  async getOrder(id: string): Promise<OrderDto> {
    const res = await apiClient.get<OrderDto>(`/orders/${id}`);
    return res.data;
  },

  async createFromCheckout(checkoutSessionId: string, customerNotes?: string): Promise<OrderDto> {
    const res = await apiClient.post<OrderDto>('/orders', {
      checkoutSessionId,
      customerNotes,
    });
    return res.data;
  },

  async cancelOrder(id: string, reason?: string): Promise<OrderDto> {
    const res = await apiClient.post<OrderDto>(`/orders/${id}/cancel`, { reason });
    return res.data;
  },
};
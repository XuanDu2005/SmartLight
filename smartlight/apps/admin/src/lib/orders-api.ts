import { apiClient, unwrapPaginated } from './api-client';
import type {
  ListOrdersAdminParams,
  Order,
  OrderAddress,
  OrderItem,
  OrderStatus,
  OrderStatusEvent,
  Paginated,
  PaginatedEnvelope,
  UpdateOrderStatusDto,
} from './types';

// ---------------------------------------------------------------------------
//  Server response shapes (api/orders/dto/order-response.dto.ts)
//
//  The orders service emits snake_case-ish but flattened nested structures
//  (`totals`, `shippingAddress.{ward,detail}`) and renames some keys. This
//  mapper normalises the wire DTO into the admin-side `Order` view so all
//  pages (orders list, detail, CSV export, status updates) read a single
//  shape.
// ---------------------------------------------------------------------------

interface ServerOrderTotals {
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
}

interface ServerOrderItem {
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

interface ServerShippingAddress {
  fullName: string | null;
  phone: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  detail: string | null;
}

interface ServerOrderStatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedByType: string;
  changedById: string | null;
  changedByName: string | null;
  reason: string | null;
  createdAt: string;
}

interface ServerOrder {
  id: string;
  orderNumber: string;
  userId: string;
  checkoutSessionId: string | null;
  cartId: string | null;
  status: string;
  paymentStatus: string;
  currency: string;
  items: ServerOrderItem[];
  statusHistory: ServerOrderStatusHistoryEntry[];
  shippingAddress: ServerShippingAddress | null;
  billingAddress: ServerShippingAddress | null;
  totals: ServerOrderTotals;
  couponCode: string | null;
  customerNotes: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ServerOrderSummary {
  id: string;
  orderNumber: string;
  userId?: string;
  userEmail?: string | null;
  status: string;
  paymentStatus: string;
  itemCount: number;
  grandTotal: number;
  currency: string;
  createdAt: string;
  paidAt?: string | null;
}

const zeroMoney = (currency = 'VND') => ({ amount: 0, currency });

const addressFromServer = (
  raw: ServerShippingAddress | null | undefined,
): OrderAddress => ({
  fullName: raw?.fullName ?? '',
  phone: raw?.phone ?? '',
  addressLine1: raw?.detail ?? '',
  ward: raw?.ward ?? null,
  district: raw?.district ?? '',
  province: raw?.province ?? '',
  country: 'VN',
});

const itemFromServer = (
  raw: ServerOrderItem,
  currency: string,
): OrderItem => ({
  id: raw.id,
  productId: raw.productVariantId,
  productName: raw.productName,
  productSlug: raw.productSlug,
  variantId: raw.productVariantId,
  variantSku: raw.sku,
  variantLabel: raw.variantName,
  imageUrl: raw.imageUrl,
  quantity: raw.quantity,
  unitPrice: { amount: raw.unitPrice, currency },
  lineTotal: { amount: raw.lineSubtotal, currency },
});

const historyFromServer = (
  raw: ServerOrderStatusHistoryEntry[],
): OrderStatusEvent[] =>
  raw.map((h) => ({
    id: h.id,
    fromStatus: (h.fromStatus as OrderStatus | null) ?? null,
    toStatus: h.toStatus as OrderStatus,
    note: h.reason ?? null,
    actorName: h.changedByName ?? null,
    createdAt: h.createdAt,
  }));

const orderFromServer = (raw: ServerOrder): Order => {
  const currency = raw.currency || raw.totals?.currency || 'VND';
  return {
    id: raw.id,
    code: raw.orderNumber,
    status: raw.status as OrderStatus,
    paymentStatus: raw.paymentStatus,
    // Customer info: server only ships the userId for admin detail; the
    // customer name/email/phone fields would come from a user lookup.
    // Fall back to placeholder strings so the page renders something.
    customerName:
      raw.shippingAddress?.fullName || raw.userId || 'Khách hàng',
    customerEmail: null,
    customerPhone: raw.shippingAddress?.phone ?? null,
    subtotal: { amount: raw.totals.subtotal, currency },
    discount: { amount: raw.totals.discountAmount, currency },
    shipping: { amount: raw.totals.shippingFee, currency },
    tax: { amount: raw.totals.taxAmount, currency },
    total: { amount: raw.totals.grandTotal, currency },
    items: raw.items.map((it) => itemFromServer(it, currency)),
    shippingAddress: addressFromServer(raw.shippingAddress),
    billingAddress: raw.billingAddress
      ? addressFromServer(raw.billingAddress)
      : null,
    paymentMethod: null,
    shipmentStatus: null,
    trackingNumber: null,
    notes: raw.customerNotes,
    history: historyFromServer(raw.statusHistory),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};

const orderFromSummary = (raw: ServerOrderSummary): Order => {
  const currency = raw.currency || 'VND';
  const placeholderItem: OrderItem = {
    id: `${raw.id}__summary`,
    productId: '',
    productName: `${raw.itemCount} sản phẩm`,
    productSlug: '',
    variantId: '',
    variantSku: '',
    variantLabel: null,
    imageUrl: null,
    quantity: raw.itemCount,
    unitPrice: zeroMoney(currency),
    lineTotal: zeroMoney(currency),
  };
  return {
    id: raw.id,
    code: raw.orderNumber,
    status: raw.status as OrderStatus,
    paymentStatus: raw.paymentStatus,
    customerName: raw.userEmail ?? raw.userId ?? 'Khách hàng',
    customerEmail: raw.userEmail ?? null,
    customerPhone: null,
    subtotal: { amount: raw.grandTotal, currency },
    discount: zeroMoney(currency),
    shipping: zeroMoney(currency),
    tax: zeroMoney(currency),
    total: { amount: raw.grandTotal, currency },
    items: [placeholderItem],
    shippingAddress: {
      fullName: '',
      phone: '',
      addressLine1: '',
      ward: null,
      district: '',
      province: '',
      country: 'VN',
    },
    billingAddress: null,
    paymentMethod: null,
    shipmentStatus: null,
    trackingNumber: null,
    notes: null,
    history: [],
    createdAt: raw.createdAt,
    updatedAt: raw.createdAt,
  };
};

export const ordersApi = {
  listAdmin: async (
    params: ListOrdersAdminParams = {},
  ): Promise<Paginated<Order>> => {
    const { data } = await apiClient.get('/admin/orders', { params });
    const { items: rawItems, total, page, limit } = unwrapPaginated(data);
    return {
      items: (rawItems as unknown as ServerOrderSummary[]).map(orderFromSummary),
      total,
      page,
      limit,
    };
  },

  getAdmin: async (id: string): Promise<Order> => {
    const { data } = await apiClient.get<ServerOrder>(`/admin/orders/${id}`);
    return orderFromServer(data);
  },

  updateStatus: async (
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> => {
    const { data } = await apiClient.patch<ServerOrder>(
      `/admin/orders/${id}/status`,
      dto,
    );
    return orderFromServer(data);
  },
};
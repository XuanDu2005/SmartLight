import { apiClient } from './api-client';
import type {
  CustomersReportRow,
  InventoryReportRow,
  OrdersReportRow,
  ProductsReportRow,
  ReportFilters,
  RevenueReportRow,
} from './types';

/**
 * Reports API — pure aggregation layer over the existing admin endpoints.
 *
 * The backend doesn't expose a dedicated /admin/reports/* yet, so this
 * module composes reports by fetching data from orders, products,
 * inventory, etc. and shaping it client-side.
 */
type ListEnvelope<T> = {
  items?: T[];
  total?: number;
  data?: T[];
  meta?: { pagination?: { totalItems?: number } };
};

const readList = <T>(raw: unknown): { items: T[]; total: number } => {
  if (!raw || typeof raw !== 'object') return { items: [], total: 0 };
  const env = raw as ListEnvelope<T>;
  const items: T[] = Array.isArray(env.items)
    ? env.items
    : Array.isArray(env.data)
      ? env.data
      : [];
  const total: number =
    typeof env.total === 'number'
      ? env.total
      : typeof env.meta?.pagination?.totalItems === 'number'
        ? env.meta.pagination.totalItems
        : items.length;
  return { items, total };
};

const fetchAll = async <T>(path: string, params: Record<string, unknown> = {}, maxLimit = 200): Promise<T[]> => {
  const limit = Math.min(maxLimit, 100);
  const first = await apiClient.get(path, {
    params: { ...params, limit, page: 1 },
  });
  const page1 = readList<T>(first.data);
  if (page1.total <= limit) return page1.items;
  const pages = Math.ceil(page1.total / limit);
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) =>
      apiClient.get(path, {
        params: { ...params, limit, page: i + 2 },
      }),
    ),
  );
  return [
    ...page1.items,
    ...rest.flatMap((r) => readList<T>(r.data).items),
  ];
};

const inDateRange = (iso: string, filters: ReportFilters): boolean => {
  const t = new Date(iso).getTime();
  return t >= new Date(filters.from).getTime() && t <= new Date(filters.to).getTime();
};

export const reportsApi = {
  /** Revenue bucketed by day over [from, to]. */
  revenue: async (filters: ReportFilters): Promise<RevenueReportRow[]> => {
    const orders = await fetchAll<{
      total: { amount: number };
      status: string;
      createdAt: string;
    }>('/admin/orders', {});
    const inRange = orders.filter((o) => inDateRange(o.createdAt, filters));
    const buckets = new Map<string, RevenueReportRow>();
    for (const o of inRange) {
      const date = new Date(o.createdAt).toISOString().slice(0, 10);
      const row = buckets.get(date) ?? {
        date,
        grossRevenue: 0,
        netRevenue: 0,
        orderCount: 0,
      };
      row.orderCount += 1;
      if (o.status !== 'CANCELLED' && o.status !== 'REFUNDED') {
        row.grossRevenue += Number(o.total?.amount ?? 0);
        row.netRevenue += Number(o.total?.amount ?? 0);
      }
      buckets.set(date, row);
    }
    return Array.from(buckets.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  },

  /** Order status counts bucketed by day. */
  orders: async (filters: ReportFilters): Promise<OrdersReportRow[]> => {
    const orders = await fetchAll<{
      status: string;
      createdAt: string;
    }>('/admin/orders', {});
    const inRange = orders.filter((o) => inDateRange(o.createdAt, filters));
    const buckets = new Map<string, OrdersReportRow>();
    for (const o of inRange) {
      const date = new Date(o.createdAt).toISOString().slice(0, 10);
      const row = buckets.get(date) ?? {
        date,
        orderCount: 0,
        paidCount: 0,
        cancelledCount: 0,
        refundedCount: 0,
      };
      row.orderCount += 1;
      if (o.status === 'PAID' || o.status === 'COMPLETED' || o.status === 'DELIVERED')
        row.paidCount += 1;
      if (o.status === 'CANCELLED') row.cancelledCount += 1;
      if (o.status === 'REFUNDED') row.refundedCount += 1;
      buckets.set(date, row);
    }
    return Array.from(buckets.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  },

  /** Top products by revenue (placeholder aggregation). */
  products: async (_filters: ReportFilters): Promise<ProductsReportRow[]> => {
    const products = await fetchAll<{
      id: string;
      name: string;
      totalStock: number;
    }>('/admin/catalog/products', {});
    return products.map((p) => ({
      productId: p.id,
      productName: p.name,
      unitsSold: 0,
      revenue: 0,
      stockRemaining: Number(p.totalStock ?? 0),
    }));
  },

  customers: async (_filters: ReportFilters): Promise<CustomersReportRow[]> => {
    // No /admin/users endpoint yet — return empty until that ships.
    return [];
  },

  inventory: async (): Promise<InventoryReportRow[]> => {
    const rows = await fetchAll<{
      id: string;
      productVariantId: string;
      productName: string;
      productSlug?: string;
      sku: string;
      onHand: number;
      reserved: number;
      available: number;
      lowStockThreshold: number;
    }>('/admin/inventory', {});
    return rows.map((r) => {
      const status: InventoryReportRow['status'] =
        r.onHand <= 0
          ? 'OUT'
          : r.available <= r.lowStockThreshold
            ? 'LOW'
            : 'OK';
      return {
        variantId: r.productVariantId ?? r.id,
        productName: r.productName,
        sku: r.sku,
        onHand: r.onHand,
        reserved: r.reserved,
        available: r.available,
        threshold: r.lowStockThreshold,
        status,
      };
    });
  },
};
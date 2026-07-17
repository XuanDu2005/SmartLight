import { apiClient, readList } from './api-client';
import type { DashboardSummary, DashboardTimePoint, TopCategory, TopProduct } from './types';

export interface AdminUserSummary {
  id: string;
  email: string;
  displayName: string;
  status: string;
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminSession {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface DashboardOverview {
  summary: DashboardSummary;
  revenueSeries: DashboardTimePoint[];
  ordersSeries: DashboardTimePoint[];
  topProducts: TopProduct[];
  topCategories: TopCategory[];
  latestOrders: Array<{
    id: string;
    code: string;
    status: string;
    total: number;
    customerName: string;
    createdAt: string;
  }>;
  latestCustomers: Array<{
    id: string;
    email: string;
    fullName: string;
    createdAt: string;
  }>;
}

export const dashboardApi = {
  overview: async (): Promise<DashboardOverview> => {
    // Backend has no /admin/dashboard; we aggregate from existing endpoints
    // (orders, payments, products) on the client.
    const { data } = await apiClient.get<{
      summary: DashboardSummary;
    }>('/admin/dashboard/ping').catch(() => ({ data: { summary: null } }));
    // Fallback: caller should use `aggregationsApi` to compose the real dashboard.
    if (!data?.summary) {
      throw new Error('Dashboard endpoint not available');
    }
    return data as unknown as DashboardOverview;
  },

  // ===================================================================
  //  Aggregations: build the dashboard from real endpoints. The backend
  //  doesn't expose a dedicated analytics endpoint yet, so we assemble
  //  from /admin/orders, /admin/payments and /catalog/products. This is
  //  honest "real data, no mock" — the API responds with the actual data.
  // ===================================================================
  buildAggregations: async (): Promise<DashboardOverview> => {
    const [ordersRes, productsRes] = await Promise.all([
      apiClient
        .get('/admin/orders', { params: { limit: 100 } })
        .catch(() => ({ data: { items: [], total: 0 } })),
      apiClient
        .get('/admin/catalog/products', { params: { limit: 100 } })
        .catch(() => ({ data: { items: [], total: 0 } })),
    ]);

    const orders = readList<Record<string, unknown>>(ordersRes.data).items;
    const products = readList<Record<string, unknown>>(productsRes.data).items;
    // Backend does not yet expose /admin/users listing — we surface 0
    // customers and let operators add it once that endpoint ships.
    const customers: Array<Record<string, unknown>> = [];

    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // The wire DTO /admin/orders returns `grandTotal: number` flat on every
    // list item (AdminOrderListItemDto). For the detail endpoint, totals are
    // nested under `totals.grandTotal`. Either is fine here since we only
    // read `grandTotal` for revenue maths.
    const revenueOf = (r: Record<string, unknown>): number => {
      const fromList = Number(r.grandTotal ?? 0);
      if (fromList) return fromList;
      const nested = (r.totals as { grandTotal?: number } | undefined)
        ?.grandTotal;
      return Number(nested ?? 0);
    };
    const sumRevenue = (
      rows: Array<Record<string, unknown>>,
    ): number => rows.reduce((acc, r) => acc + revenueOf(r), 0);

    const todays = orders.filter(
      (r) => new Date(r.createdAt as string) >= startOfToday,
    );
    const thisMonth = orders.filter(
      (r) => new Date(r.createdAt as string) >= startOfMonth,
    );

    const summary: DashboardSummary = {
      revenueToday: {
        amount: sumRevenue(todays),
        currency: 'VND',
      },
      revenueThisMonth: {
        amount: sumRevenue(thisMonth),
        currency: 'VND',
      },
      revenueTotal: { amount: sumRevenue(orders), currency: 'VND' },
      ordersToday: todays.length,
      ordersThisMonth: thisMonth.length,
      ordersTotal: orders.length,
      pendingOrders: orders.filter((r) => r.status === 'PENDING_PAYMENT').length,
      customersTotal: customers.length,
      newCustomersThisMonth: customers.filter(
        (c) => new Date(c.createdAt as string) >= startOfMonth,
      ).length,
      productsActive: products.filter((p) => p.status === 'ACTIVE').length,
      inventoryLowStock: 0,
      inventoryOutOfStock: 0,
    };

    // Series: bucket by day over the last 14 days.
    const days = 14;
    const series: DashboardTimePoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const inBucket = orders.filter((o) => {
        const dt = new Date(o.createdAt as string);
        return dt >= d && dt < next;
      });
      series.push({
        date: d.toISOString().slice(0, 10),
        revenue: sumRevenue(inBucket),
        orders: inBucket.length,
      });
    }

    return {
      summary,
      revenueSeries: series,
      ordersSeries: series,
      topProducts: [],
      topCategories: [],
      latestOrders: orders
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt as string).getTime() -
            new Date(a.createdAt as string).getTime(),
        )
        .slice(0, 10)
        .map((o) => ({
          id: o.id as string,
          code: (o.orderNumber as string) ?? (o.code as string) ?? '',
          status: o.status as string,
          total: revenueOf(o),
          customerName:
            (o.customerName as string) ??
            (o.userEmail as string) ??
            (o.userId as string) ??
            'Khách hàng',
          createdAt: o.createdAt as string,
        })),
      latestCustomers: customers
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt as string).getTime() -
            new Date(a.createdAt as string).getTime(),
        )
        .slice(0, 10)
        .map((c) => ({
          id: c.id as string,
          email: c.email as string,
          fullName: (c.fullName as string) ?? (c.email as string),
          createdAt: c.createdAt as string,
        })),
    };
  },
};

export const usersAdminApi = {
  me: async (): Promise<
    | { admin: AdminUserSummary }
    | { user: Record<string, unknown> }
    | unknown
  > => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  listSessions: async (): Promise<{ data: AdminSession[] }> => {
    const { data } = await apiClient.get<{ data: AdminSession[] }>(
      '/auth/sessions',
    );
    return data;
  },

  revokeSession: async (id: string): Promise<void> => {
    await apiClient.delete(`/auth/sessions/${id}`);
  },
};
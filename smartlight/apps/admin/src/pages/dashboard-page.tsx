import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Breadcrumb,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  Spinner,
  StatusPill,
} from '@smartlight/ui';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardApi, type DashboardOverview } from '../lib/dashboard-api';
import { formatVND } from '../lib/format';

export const DashboardPage = (): JSX.Element => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const result = await dashboardApi.buildAggregations();
        if (!cancelled) setData(result);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="container-page py-6">
      <Breadcrumb
        items={[{ label: 'Admin', href: '/' }, { label: 'Dashboard' }]}
        className="mb-3"
      />
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-2xl font-semibold">Tổng quan</h1>
        <Badge variant="info">Dashboard</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Doanh thu hôm nay"
          value={data ? formatVND(data.summary.revenueToday.amount) : null}
        />
        <KpiCard
          label="Doanh thu tháng này"
          value={data ? formatVND(data.summary.revenueThisMonth.amount) : null}
        />
        <KpiCard
          label="Đơn hàng hôm nay"
          value={data?.summary.ordersToday ?? null}
        />
        <KpiCard
          label="Tổng đơn hàng"
          value={data?.summary.ordersTotal ?? null}
        />
        <KpiCard
          label="Đơn chờ thanh toán"
          value={data?.summary.pendingOrders ?? null}
        />
        <KpiCard
          label="Khách hàng"
          value={data?.summary.customersTotal ?? null}
        />
        <KpiCard
          label="Sản phẩm đang bán"
          value={data?.summary.productsActive ?? null}
        />
        <KpiCard
          label="Doanh thu tích luỹ"
          value={data ? formatVND(data.summary.revenueTotal.amount) : null}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Doanh thu 14 ngày qua</CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : data ? (
              <ResponsiveContainer width="100%" height={288}>
                <LineChart data={data.revenueSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
                  <YAxis
                    tickFormatter={(v: number) =>
                      `${Math.round(v / 1000)}k`
                    }
                  />
                  <Tooltip
                    formatter={(v) => formatVND(Number(v) || 0)}
                    labelFormatter={(v) => `Ngày ${v}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Doanh thu"
                    stroke="#0f766e"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Không có dữ liệu" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Đơn hàng 14 ngày qua</CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : data ? (
              <ResponsiveContainer width="100%" height={288}>
                <BarChart data={data.ordersSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="orders"
                    name="Đơn hàng"
                    fill="#0f766e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Không có dữ liệu" />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Đơn hàng mới nhất</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <Spinner />
            ) : !data || data.latestOrders.length === 0 ? (
              <EmptyState title="Chưa có đơn hàng" />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {data.latestOrders.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <Link
                        to={`/orders/${o.id}`}
                        className="font-medium text-smart-700 hover:underline"
                      >
                        {o.code}
                      </Link>
                      <span className="text-xs text-neutral-500">
                        {o.customerName}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="tabular-nums">{formatVND(o.total ?? 0)}</p>
                      <p className="text-xs text-neutral-500">
                        {new Date(o.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                      <StatusPill
                        status={o.status}
                        variant={
                          o.status === 'COMPLETED' || o.status === 'DELIVERED'
                            ? 'success'
                            : o.status === 'PENDING_PAYMENT'
                              ? 'warning'
                              : o.status === 'CANCELLED' ||
                                  o.status === 'REFUNDED'
                                ? 'danger'
                                : 'info'
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sản phẩm nổi bật</CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <Spinner />
            ) : !data || data.topProducts.length === 0 ? (
              <EmptyState
                title="Chưa có dữ liệu"
                description="Số liệu sẽ hiển thị khi có đơn hàng hoàn tất."
              />
            ) : (
              <ul className="space-y-2 text-sm">
                {data.topProducts.slice(0, 10).map((p) => (
                  <li
                    key={p.productId}
                    className="flex items-center justify-between"
                  >
                    <Link
                      to={`/products/${p.productId}`}
                      className="hover:text-smart-700"
                    >
                      {p.productName}
                    </Link>
                    <span className="text-xs text-neutral-500">
                      {p.unitsSold} sp · {formatVND(p.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </section>
  );
};

interface KpiCardProps {
  label: string;
  value: string | number | null;
}
const KpiCard = ({ label, value }: KpiCardProps): JSX.Element => (
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium text-neutral-500">
        {label}
      </CardTitle>
    </CardHeader>
    {value === null ? (
      <Skeleton className="h-9 w-24" />
    ) : (
      <div className="text-2xl font-semibold tabular-nums text-neutral-900">
        {value}
      </div>
    )}
  </Card>
);
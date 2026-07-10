/**
 * Admin Dashboard — `/` (alias) and `/dashboard`.
 *
 * Lightweight summary tiles. Real KPIs will be wired to a dedicated
 * admin analytics endpoint once it ships.
 */
import { Badge, Card, CardHeader, CardTitle } from '@smartlight/ui';

const kpis = [
  { label: 'Doanh thu hôm nay', value: '—', hint: 'API sẽ được wire tới admin/orders' },
  { label: 'Đơn hàng mới', value: '—', hint: 'API sẽ được wire tới admin/orders' },
  { label: 'Khách hàng mới', value: '—', hint: 'API sẽ được wire tới admin/users' },
  { label: 'Sản phẩm sắp hết', value: '—', hint: 'API sẽ được wire tới admin/inventory' },
];

export const DashboardPage = (): JSX.Element => (
  <section className="container-page py-6">
    <div className="mb-6 flex items-center gap-2">
      <h1 className="text-2xl font-semibold text-neutral-900">Tổng quan</h1>
      <Badge variant="info">Dashboard</Badge>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <Card key={k.label}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-500">
              {k.label}
            </CardTitle>
          </CardHeader>
          <div className="text-3xl font-semibold text-neutral-900">{k.value}</div>
          <p className="mt-1 text-xs text-neutral-400">{k.hint}</p>
        </Card>
      ))}
    </div>

    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Đơn hàng gần đây</CardTitle>
        </CardHeader>
        <p className="text-sm text-neutral-500">
          Bảng đơn hàng thời gian thực sẽ được wire tới admin/orders.
        </p>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tồn kho thấp</CardTitle>
        </CardHeader>
        <p className="text-sm text-neutral-500">
          Cảnh báo tồn kho sẽ được wire tới admin/inventory.
        </p>
      </Card>
    </div>
  </section>
);
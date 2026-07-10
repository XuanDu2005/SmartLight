import { Badge, Card, CardHeader, CardTitle } from '@smartlight/ui';

export const DashboardPage = (): JSX.Element => (
  <section className="container-page py-6">
    <div className="mb-6 flex items-center gap-2">
      <h1 className="text-2xl font-semibold text-neutral-900">Tổng quan</h1>
      <Badge variant="info">v0.1.0</Badge>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: 'Doanh thu hôm nay', value: '—', hint: 'API chưa wire' },
        { label: 'Đơn hàng mới', value: '—', hint: 'API chưa wire' },
        { label: 'Khách hàng mới', value: '—', hint: 'API chưa wire' },
        { label: 'Sản phẩm sắp hết', value: '—', hint: 'API chưa wire' },
      ].map((k) => (
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
  </section>
);
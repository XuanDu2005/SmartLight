import { EmptyState } from '@smartlight/ui';

export const OrdersPage = (): JSX.Element => (
  <section className="container-page py-6">
    <h1 className="mb-4 text-2xl font-semibold text-neutral-900">Đơn hàng</h1>
    <EmptyState
      title="Sắp ra mắt"
      description="Trang quản lý đơn hàng sẽ kết nối với /v1/admin/orders/* ở giai đoạn tiếp theo."
    />
  </section>
);
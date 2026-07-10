import { EmptyState } from '@smartlight/ui';

export const ProductsPage = (): JSX.Element => (
  <section className="container-page py-6">
    <h1 className="mb-4 text-2xl font-semibold text-neutral-900">Sản phẩm</h1>
    <EmptyState
      title="Sắp ra mắt"
      description="Trang quản lý catalog sẽ kết nối với /v1/admin/catalog/* ở giai đoạn tiếp theo."
    />
  </section>
);
import { EmptyState } from '@smartlight/ui';

export const UsersPage = (): JSX.Element => (
  <section className="container-page py-6">
    <h1 className="mb-4 text-2xl font-semibold text-neutral-900">Người dùng</h1>
    <EmptyState
      title="Sắp ra mắt"
      description="Trang quản lý người dùng sẽ kết nối với /v1/admin/users/* ở giai đoạn tiếp theo."
    />
  </section>
);
import { EmptyState } from '@smartlight/ui';

export const AuditLogPage = (): JSX.Element => (
  <section className="container-page py-6">
    <h1 className="mb-4 text-2xl font-semibold text-neutral-900">Audit Log</h1>
    <EmptyState
      title="Sắp ra mắt"
      description="Trang nhật ký hoạt động sẽ kết nối với /v1/admin/audit-log ở giai đoạn tiếp theo."
    />
  </section>
);
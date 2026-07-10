import { Breadcrumb, EmptyState } from '@smartlight/ui';

export const AuditLogPage = (): JSX.Element => (
  <section className="container-page py-6">
    <Breadcrumb
      items={[{ label: 'Admin', href: '/' }, { label: 'Audit Log' }]}
      className="mb-3"
    />
    <h1 className="mb-4 text-2xl font-semibold">Audit Log</h1>
    <EmptyState
      title="Chưa có endpoint"
      description="Backend chưa expose /v1/admin/audit. Khi endpoint được bổ sung, trang này sẽ liệt kê các thao tác của admin kèm metadata."
    />
  </section>
);
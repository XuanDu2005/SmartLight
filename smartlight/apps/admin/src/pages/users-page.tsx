import { useEffect, useState } from 'react';
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
  Spinner,
  StatusPill,
  useToast,
} from '@smartlight/ui';
import {
  type AdminSession,
  type AdminUserSummary,
  usersAdminApi,
} from '../lib/dashboard-api';

export const UsersPage = (): JSX.Element => {
  const { push } = useToast();
  const [me, setMe] = useState<AdminUserSummary | null>(null);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [toRevoke, setToRevoke] = useState<AdminSession | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async (): Promise<void> => {
    setLoading(true);
    try {
      const [meRes, sessionsRes] = await Promise.all([
        usersAdminApi.me(),
        usersAdminApi.listSessions(),
      ]);
      if (
        meRes &&
        typeof meRes === 'object' &&
        'admin' in meRes &&
        (meRes as { admin: AdminUserSummary }).admin
      ) {
        setMe((meRes as { admin: AdminUserSummary }).admin);
      }
      setSessions(sessionsRes.data);
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi tải thông tin',
        description: e instanceof Error ? e.message : '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevoke = async (): Promise<void> => {
    if (!toRevoke) return;
    setBusy(true);
    try {
      await usersAdminApi.revokeSession(toRevoke.id);
      push({ variant: 'success', title: 'Đã thu hồi phiên' });
      setToRevoke(null);
      await reload();
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi',
        description: e instanceof Error ? e.message : '',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="container-page py-6">
      <Breadcrumb
        items={[{ label: 'Admin', href: '/' }, { label: 'Người dùng' }]}
        className="mb-3"
      />
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Người dùng</h1>
        <p className="text-sm text-neutral-500">
          Thông tin tài khoản quản trị và phiên đăng nhập
        </p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <h2 className="font-semibold">Tài khoản hiện tại</h2>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              {me ? (
                <>
                  <p className="text-lg font-medium">{me.displayName}</p>
                  <p className="text-neutral-500">{me.email}</p>
                  <div className="flex flex-wrap gap-1">
                    {me.roles.map((r) => (
                      <Badge key={r} variant="info">
                        {r}
                      </Badge>
                    ))}
                  </div>
                  <div className="pt-2">
                    <StatusPill
                      status={me.status}
                      variant={me.status === 'ACTIVE' ? 'success' : 'danger'}
                    />
                    {me.mustChangePassword && (
                      <Badge variant="warning">Đổi mật khẩu</Badge>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    Tạo: {new Date(me.createdAt).toLocaleString('vi-VN')}
                  </p>
                  {me.lastLoginAt && (
                    <p className="text-xs text-neutral-500">
                      Đăng nhập gần nhất:{' '}
                      {new Date(me.lastLoginAt).toLocaleString('vi-VN')}
                    </p>
                  )}
                </>
              ) : (
                <EmptyState title="Không có thông tin" />
              )}
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="font-semibold">Phiên đăng nhập</h2>
            </CardHeader>
            <CardBody className="p-0">
              <DataTable>
                <DataTableHead>
                  <DataTableRow density="compact">
                    <DataTableHeaderCell>Thiết bị</DataTableHeaderCell>
                    <DataTableHeaderCell>IP</DataTableHeaderCell>
                    <DataTableHeaderCell>Hoạt động cuối</DataTableHeaderCell>
                    <DataTableHeaderCell className="text-right">Hành động</DataTableHeaderCell>
                  </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                  {sessions.length === 0 ? (
                    <DataTableRow>
                      <DataTableCell colSpan={4}>
                        <EmptyState title="Chưa có phiên" />
                      </DataTableCell>
                    </DataTableRow>
                  ) : (
                    sessions.map((s) => (
                      <DataTableRow key={s.id}>
                        <DataTableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {s.userAgent ?? 'Thiết bị không xác định'}
                            </span>
                            {s.isCurrent && (
                              <Badge variant="success">Phiên hiện tại</Badge>
                            )}
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <code className="text-xs">
                            {s.ipAddress ?? '—'}
                          </code>
                        </DataTableCell>
                        <DataTableCell className="text-xs text-neutral-600">
                          {new Date(s.lastActiveAt).toLocaleString('vi-VN')}
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          {!s.isCurrent && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setToRevoke(s)}
                            >
                              Thu hồi
                            </Button>
                          )}
                        </DataTableCell>
                      </DataTableRow>
                    ))
                  )}
                </DataTableBody>
              </DataTable>
            </CardBody>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toRevoke)}
        onClose={() => setToRevoke(null)}
        onConfirm={() => void handleRevoke()}
        title="Thu hồi phiên"
        description={
          toRevoke
            ? `Thu hồi phiên từ ${toRevoke.ipAddress ?? 'thiết bị này'}?`
            : ''
        }
        confirmText="Thu hồi"
        variant="danger"
        isLoading={busy}
      />

      <Card className="mt-4">
        <CardHeader>
          <h2 className="font-semibold">Quản lý khách hàng</h2>
        </CardHeader>
        <CardBody>
          <EmptyState
            title="Chưa có endpoint"
            description="Backend chưa expose /v1/admin/users/* để liệt kê customers. Tính năng sẽ hoạt động khi endpoint được bổ sung ở backend V1.1."
          />
        </CardBody>
      </Card>
    </section>
  );
};
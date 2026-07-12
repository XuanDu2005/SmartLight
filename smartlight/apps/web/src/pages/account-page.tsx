/**
 * Account page — profile + saved addresses.
 *
 * Wires to `/v1/users/me/*`. Shows personal info and quick links
 * to the orders list.
 */
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  FormField,
  Input,
  Spinner,
  useToast,
} from '@smartlight/ui';
import { useAuth } from '../contexts/auth-context';
import { accountApi, type AccountProfile } from '../lib/account-api';

export const AccountPage = (): JSX.Element => {
  const { isAuthenticated, isBootstrapping, user } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setErr(null);
    accountApi
      .getMe()
      .then(setProfile)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Lỗi'))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (isBootstrapping) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: '/account' }} />;
  }

  const onSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await accountApi.updateMe({
        firstName: profile.firstName ?? undefined,
        lastName: profile.lastName ?? undefined,
        phone: profile.phone ?? undefined,
      });
      setProfile(updated);
      toast.push('Đã lưu thông tin', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi';
      toast.push(msg, 'info');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="container-page py-8">
      <h1 className="mb-4 text-2xl font-semibold text-neutral-900">
        Tài khoản của tôi
      </h1>

      {loading && (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && err && (
        <EmptyState title="Không tải được thông tin" description={err} />
      )}

      {!loading && profile && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Thông tin cá nhân</CardTitle>
                <CardDescription>
                  Cập nhật thông tin để đặt hàng nhanh hơn.
                </CardDescription>
              </div>
              <Badge variant={profile.emailVerified ? 'success' : 'warning'}>
                {profile.emailVerified ? 'Đã xác minh' : 'Chưa xác minh'}
              </Badge>
            </CardHeader>
            <form onSubmit={onSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Họ" htmlFor="lastName">
                  <Input
                    id="lastName"
                    value={profile.lastName ?? ''}
                    onChange={(e) =>
                      setProfile({ ...profile, lastName: e.currentTarget.value })
                    }
                  />
                </FormField>
                <FormField label="Tên" htmlFor="firstName">
                  <Input
                    id="firstName"
                    value={profile.firstName ?? ''}
                    onChange={(e) =>
                      setProfile({ ...profile, firstName: e.currentTarget.value })
                    }
                  />
                </FormField>
              </div>
              <FormField label="Email" htmlFor="email">
                <Input id="email" value={profile.email} disabled />
              </FormField>
              <FormField label="Số điện thoại" htmlFor="phone">
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone ?? ''}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.currentTarget.value })
                  }
                />
              </FormField>
              <Button type="submit" variant="primary" isLoading={saving}>
                Lưu thay đổi
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lối tắt</CardTitle>
            </CardHeader>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/orders" className="text-smart-700 hover:underline">
                  → Đơn hàng của tôi
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-smart-700 hover:underline">
                  → Giỏ hàng
                </Link>
              </li>
              <li>
                <span className="text-neutral-500">Đăng nhập với: {user?.email}</span>
              </li>
            </ul>
          </Card>
        </div>
      )}
    </section>
  );
};
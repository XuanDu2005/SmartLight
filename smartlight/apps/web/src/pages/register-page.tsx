/**
 * Register page — new customer sign-up.
 *
 * Wires to `/v1/auth/register` (handled by `authApi.register`).
 * Mirrors the login page UX for a consistent flow.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  useToast,
} from '@smartlight/ui';
import { ApiError } from '../lib/api-client';

export const RegisterPage = (): JSX.Element => {
  const navigate = useNavigate();
  const toast = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErr(null);

    if (password !== confirm) {
      setErr('Mật khẩu nhập lại không khớp');
      return;
    }
    if (!acceptTerms) {
      setErr('Bạn cần đồng ý với điều khoản sử dụng');
      return;
    }
    if (password.length < 8) {
      setErr('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/v1/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            firstName,
            lastName,
            acceptTerms: true,
          }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: { code?: string; message?: string } }
          | null;
        throw new ApiError(
          body?.error?.code ?? 'REGISTER_FAILED',
          body?.error?.message ?? 'Đăng ký thất bại',
          res.status,
        );
      }
      toast.push('Đăng ký thành công! Vui lòng đăng nhập.', 'success');
      navigate('/login', { replace: true });
    } catch (e) {
      if (e instanceof ApiError) setErr(e.message);
      else setErr('Đăng ký thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="container-page py-12">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Tạo tài khoản</CardTitle>
              <CardDescription>
                Đăng ký để theo dõi đơn hàng và nhận ưu đãi.
              </CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Họ" htmlFor="lastName">
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.currentTarget.value)}
                  autoComplete="family-name"
                />
              </FormField>
              <FormField label="Tên" htmlFor="firstName">
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.currentTarget.value)}
                  autoComplete="given-name"
                />
              </FormField>
            </div>
            <FormField label="Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                autoComplete="email"
              />
            </FormField>
            <FormField label="Mật khẩu" htmlFor="password" required>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                autoComplete="new-password"
              />
            </FormField>
            <FormField label="Nhập lại mật khẩu" htmlFor="confirm" required>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.currentTarget.value)}
                required
                autoComplete="new-password"
              />
            </FormField>
            <label className="flex items-start gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.currentTarget.checked)}
                className="mt-0.5"
              />
              <span>
                Tôi đồng ý với{' '}
                <a className="text-smart-700 underline" href="#">
                  điều khoản sử dụng
                </a>{' '}
                và{' '}
                <a className="text-smart-700 underline" href="#">
                  chính sách bảo mật
                </a>
                .
              </span>
            </label>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={submitting}
            >
              Tạo tài khoản
            </Button>
            <p className="text-center text-sm text-neutral-600">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-smart-700 underline">
                Đăng nhập
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </section>
  );
};
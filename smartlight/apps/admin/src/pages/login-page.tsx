import { useState } from 'react';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
} from '@smartlight/ui';
import { useAdminAuth } from '../contexts/auth-context';
import { ApiError } from '../lib/api-client';

interface LocationState {
  from?: string;
}

export const LoginPage = (): JSX.Element => {
  const { login, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation() as Location & { state: LocationState | null };
  const [email, setEmail] = useState('admin@smartlight.vn');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (isAuthenticated) {
    navigate('/', { replace: true });
  }

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      await login(email, password);
      const from = location.state?.from ?? '/';
      navigate(from, { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message);
      } else {
        setErr('Đăng nhập thất bại');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-neutral-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div>
            <CardTitle>SmartLight Admin</CardTitle>
            <CardDescription>Đăng nhập bằng tài khoản quản trị.</CardDescription>
          </div>
          <Badge variant="info">v0.1.0</Badge>
        </CardHeader>
        <form onSubmit={onSubmit} className="space-y-4">
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
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                autoComplete="current-password"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-neutral-500 transition-colors hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-smart-500"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </FormField>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <Button type="submit" variant="primary" fullWidth isLoading={submitting}>
            Đăng nhập
          </Button>
        </form>
      </Card>
    </section>
  );
};
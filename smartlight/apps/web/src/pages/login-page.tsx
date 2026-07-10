import { useState } from 'react';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
} from '@smartlight/ui';
import { useAuth } from '../contexts/auth-context';
import { ApiError } from '../lib/api-client';

interface LocationState {
  from?: string;
}

export const LoginPage = (): JSX.Element => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as Location & { state: LocationState | null };
  const [email, setEmail] = useState('demo@smartlight.vn');
  const [password, setPassword] = useState('');
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
      await login(email, password, true);
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
    <section className="container-page py-12">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Đăng nhập</CardTitle>
              <CardDescription>Đăng nhập để mua sắm nhanh hơn.</CardDescription>
            </div>
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
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                autoComplete="current-password"
              />
            </FormField>
            {err && (
              <p className="text-sm text-red-600">{err}</p>
            )}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={submitting}
            >
              Đăng nhập
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
};
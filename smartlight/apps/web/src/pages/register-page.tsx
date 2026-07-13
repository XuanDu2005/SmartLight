/**
 * Register page — new customer sign-up.
 *
 * Wires to `/v1/auth/register` (handled by `authApi.register`).
 * Mirrors the login page UX for a consistent flow.
 */
import { useMemo, useState } from 'react';
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

// Mirror of the backend `password-policy.ts` rules so users get
// instant feedback instead of waiting for a 422 round-trip.
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  '12345678',
  'qwerty123',
  'admin123',
  'letmein',
  'welcome1',
  'iloveyou',
  'smartlight',
]);

interface PasswordChecks {
  length: boolean;
  lowercase: boolean;
  uppercase: boolean;
  digit: boolean;
  symbol: boolean;
  common: boolean;
}

function checkPassword(pwd: string): PasswordChecks {
  return {
    length: pwd.length >= 8 && pwd.length <= 128,
    lowercase: /[a-z]/.test(pwd),
    uppercase: /[A-Z]/.test(pwd),
    digit: /[0-9]/.test(pwd),
    symbol: /[^A-Za-z0-9]/.test(pwd),
    common: pwd.length > 0 && COMMON_PASSWORDS.has(pwd.toLowerCase()),
  };
}

function isStrongEnough(pwd: string): boolean {
  const c = checkPassword(pwd);
  if (!c.length || c.common) return false;
  let classes = 0;
  if (c.lowercase) classes += 1;
  if (c.uppercase) classes += 1;
  if (c.digit) classes += 1;
  if (c.symbol) classes += 1;
  return classes >= 3;
}

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

  const pwChecks = useMemo(() => checkPassword(password), [password]);
  const pwStrong = useMemo(() => isStrongEnough(password), [password]);

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
    if (!pwChecks.length) {
      setErr('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    if (pwChecks.common) {
      setErr('Mật khẩu quá phổ biến, vui lòng chọn mật khẩu khác');
      return;
    }
    if (!pwStrong) {
      setErr(
        'Mật khẩu phải có ít nhất 3/4 loại ký tự: chữ thường, chữ HOA, số và ký tự đặc biệt',
      );
      return;
    }
    if (!firstName.trim()) {
      setErr('Vui lòng nhập tên');
      return;
    }
    if (!lastName.trim()) {
      setErr('Vui lòng nhập họ');
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      setErr('Email không hợp lệ');
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
          | {
              error?: {
                code?: string;
                message?: string;
                fieldErrors?: Array<{ field?: string; message?: string }>;
              };
            }
          | null;
        const fieldErrors = body?.error?.fieldErrors ?? [];
        const detail =
          fieldErrors.length > 0
            ? fieldErrors
                .map((fe) => {
                  const field = fe.field ?? '';
                  if (
                    /INVALID_EMAIL/i.test(fe.message ?? '') ||
                    /email/i.test(field)
                  )
                    return 'Email không hợp lệ';
                  if (
                    /WEAK_PASSWORD/i.test(fe.message ?? '') ||
                    /password/i.test(field)
                  )
                    return 'Mật khẩu phải có ít nhất 8 ký tự';
                  if (/firstName/i.test(field))
                    return 'Vui lòng nhập tên';
                  if (/lastName/i.test(field))
                    return 'Vui lòng nhập họ';
                  if (/acceptTerms/i.test(field))
                    return 'Bạn cần đồng ý với điều khoản sử dụng';
                  return fe.message ?? 'Thông tin không hợp lệ';
                })
                .join('; ')
            : body?.error?.message ?? 'Đăng ký thất bại';
        throw new ApiError(
          body?.error?.code ?? 'REGISTER_FAILED',
          detail,
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
              <FormField label="Họ" htmlFor="lastName" required>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.currentTarget.value)}
                  required
                  autoComplete="family-name"
                />
              </FormField>
              <FormField label="Tên" htmlFor="firstName" required>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.currentTarget.value)}
                  required
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
                aria-describedby="pw-rules"
              />
              {password.length > 0 && (
                <div id="pw-rules" className="mt-2 space-y-1 text-xs">
                  <div className="grid grid-cols-2 gap-1 text-neutral-600">
                    <Rule ok={pwChecks.length}>Ít nhất 8 ký tự</Rule>
                    <Rule ok={pwChecks.lowercase}>Chữ thường (a-z)</Rule>
                    <Rule ok={pwChecks.uppercase}>Chữ HOA (A-Z)</Rule>
                    <Rule ok={pwChecks.digit}>Chữ số (0-9)</Rule>
                    <Rule ok={pwChecks.symbol}>Ký tự đặc biệt (!@#…)</Rule>
                    <Rule ok={!pwChecks.common}>Không quá phổ biến</Rule>
                  </div>
                  <p
                    className={`pt-1 font-medium ${
                      pwStrong ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {pwStrong
                      ? 'Mật khẩu đủ mạnh'
                      : 'Cần thêm ít nhất 1 loại ký tự nữa (chữ HOA, số, hoặc ký tự đặc biệt) để đạt 3/4 loại'}
                  </p>
                </div>
              )}
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
              {confirm.length > 0 && password !== confirm && (
                <p className="mt-1 text-xs text-red-600">
                  Mật khẩu nhập lại chưa khớp
                </p>
              )}
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

interface RuleProps {
  ok: boolean;
  children: React.ReactNode;
}
const Rule = ({ ok, children }: RuleProps): JSX.Element => (
  <span
    className={`flex items-center gap-1 ${
      ok ? 'text-emerald-600' : 'text-neutral-500'
    }`}
  >
    <span aria-hidden className="inline-block w-3 text-center">
      {ok ? '✓' : '○'}
    </span>
    {children}
  </span>
);
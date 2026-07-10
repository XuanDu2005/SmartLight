/**
 * Checkout page — `/checkout`.
 *
 * Multi-step flow: address → coupon → reserve → create order.
 * Backed by checkout-api + orders-api.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCart } from '../store/cart-slice';
import { checkoutApi, type CheckoutSessionDto } from '../lib/checkout-api';
import { ordersApi } from '../lib/orders-api';
import { formatVND } from '../lib/format';
import type { CartItemDto } from '../lib/cart-api';

export const CheckoutPage = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { cart, status } = useAppSelector((s) => s.cart);

  const [session, setSession] = useState<CheckoutSessionDto | null>(null);
  const [step, setStep] = useState<'address' | 'coupon' | 'review'>('address');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Address form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [detail, setDetail] = useState('');

  // Coupon form
  const [coupon, setCoupon] = useState('');

  useEffect(() => {
    if (!cart) void dispatch(fetchCart());
  }, [cart, dispatch]);

  const ensureSession = async (): Promise<CheckoutSessionDto> => {
    if (session) return session;
    const created = await checkoutApi.createSession();
    setSession(created);
    return created;
  };

  const onSaveAddress = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const sess = await ensureSession();
      const updated = await checkoutApi.updateAddress(sess.id, {
        fullName,
        phone,
        province,
        district,
        ward,
        detail,
      });
      setSession(updated);
      setStep('coupon');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lỗi');
    } finally {
      setBusy(false);
    }
  };

  const onApplyCoupon = async (): Promise<void> => {
    if (!session || !coupon.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const updated = await checkoutApi.applyCoupon(session.id, coupon.trim());
      setSession(updated);
      toast.push('Áp dụng mã thành công', 'success');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Mã không hợp lệ');
    } finally {
      setBusy(false);
    }
  };

  const onReserve = async (): Promise<void> => {
    if (!session) return;
    setBusy(true);
    setErr(null);
    try {
      const updated = await checkoutApi.reserveInventory(session.id);
      setSession(updated);
      setStep('review');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lỗi');
    } finally {
      setBusy(false);
    }
  };

  const onPlaceOrder = async (): Promise<void> => {
    if (!session) return;
    setBusy(true);
    setErr(null);
    try {
      const order = await ordersApi.createFromCheckout(session.id);
      toast.push('Đặt hàng thành công!', 'success');
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Đặt hàng thất bại');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading' && !cart) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!cart || cart.items.length === 0) {
    return (
      <section className="container-page py-12">
        <EmptyState
          title="Giỏ hàng trống"
          description="Vui lòng thêm sản phẩm vào giỏ trước khi thanh toán."
        />
      </section>
    );
  }

  return (
    <section className="container-page py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Thanh toán</h1>

      <div className="mb-6 flex items-center gap-2 text-sm">
        <Step n={1} active={step === 'address'} done={!!session?.shippingAddress}>
          Địa chỉ
        </Step>
        <span className="text-neutral-300">→</span>
        <Step n={2} active={step === 'coupon'} done={step === 'review'}>
          Mã giảm giá
        </Step>
        <span className="text-neutral-300">→</span>
        <Step n={3} active={step === 'review'} done={false}>
          Xác nhận
        </Step>
      </div>

      {err && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{err}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {step === 'address' && (
            <Card>
              <CardHeader>
                <CardTitle>Địa chỉ giao hàng</CardTitle>
              </CardHeader>
              <form onSubmit={onSaveAddress} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Họ tên" htmlFor="fullName" required>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.currentTarget.value)}
                      required
                    />
                  </FormField>
                  <FormField label="Số điện thoại" htmlFor="phone" required>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.currentTarget.value)}
                      required
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <FormField label="Tỉnh/TP" htmlFor="province" required>
                    <Input
                      id="province"
                      value={province}
                      onChange={(e) => setProvince(e.currentTarget.value)}
                      required
                    />
                  </FormField>
                  <FormField label="Quận/Huyện" htmlFor="district" required>
                    <Input
                      id="district"
                      value={district}
                      onChange={(e) => setDistrict(e.currentTarget.value)}
                      required
                    />
                  </FormField>
                  <FormField label="Phường/Xã" htmlFor="ward" required>
                    <Input
                      id="ward"
                      value={ward}
                      onChange={(e) => setWard(e.currentTarget.value)}
                      required
                    />
                  </FormField>
                </div>
                <FormField label="Địa chỉ chi tiết" htmlFor="detail" required>
                  <Input
                    id="detail"
                    value={detail}
                    onChange={(e) => setDetail(e.currentTarget.value)}
                    required
                  />
                </FormField>
                <Button type="submit" variant="primary" isLoading={busy}>
                  Tiếp tục
                </Button>
              </form>
            </Card>
          )}

          {step === 'coupon' && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Mã giảm giá (tuỳ chọn)</CardTitle>
                  <CardDescription>Nhập WELCOME10 để giảm 10% cho đơn từ 200.000đ.</CardDescription>
                </div>
              </CardHeader>
              <div className="flex gap-2">
                <Input
                  value={coupon}
                  onChange={(e) => setCoupon(e.currentTarget.value)}
                  placeholder="WELCOME10"
                  className="flex-1"
                />
                <Button onClick={onApplyCoupon} isLoading={busy}>
                  Áp dụng
                </Button>
              </div>
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={() => setStep('address')}>
                  ← Quay lại
                </Button>
                <Button variant="primary" onClick={onReserve} isLoading={busy}>
                  Giữ hàng & tiếp tục
                </Button>
              </div>
            </Card>
          )}

          {step === 'review' && session && (
            <Card>
              <CardHeader>
                <CardTitle>Xác nhận đơn hàng</CardTitle>
                <CardDescription>
                  Đơn hàng sẽ được tạo sau khi bạn xác nhận.
                </CardDescription>
              </CardHeader>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Giao đến:</strong> {session.shippingAddress?.fullName} ·{' '}
                  {session.shippingAddress?.phone}
                </div>
                <div>
                  {session.shippingAddress?.detail}, {session.shippingAddress?.ward},{' '}
                  {session.shippingAddress?.district},{' '}
                  {session.shippingAddress?.province}
                </div>
                {session.couponCode && (
                  <div>
                    <strong>Mã giảm giá:</strong> {session.couponCode}
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={() => setStep('coupon')}>
                  ← Quay lại
                </Button>
                <Button variant="primary" onClick={onPlaceOrder} isLoading={busy}>
                  Đặt hàng
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <h3 className="mb-3 text-base font-semibold text-neutral-900">
              Tóm tắt
            </h3>
            <ul className="space-y-2 text-sm">
              {cart.items.map((item: CartItemDto) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="line-clamp-2 text-neutral-700">
                    {item.product.name} × {item.quantity}
                  </span>
                  <span className="text-neutral-900">
                    {formatVND(item.lineSubtotal)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-neutral-100 pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Tạm tính</dt>
                <dd>{formatVND(cart.totals.subtotal)}</dd>
              </div>
              {session?.totals && session.totals.discountAmount > 0 && (
                <div className="flex justify-between text-green-700">
                  <dt>Giảm giá</dt>
                  <dd>-{formatVND(session.totals.discountAmount)}</dd>
                </div>
              )}
              {session?.totals && (
                <div className="flex justify-between border-t border-neutral-100 pt-2 text-base font-semibold">
                  <dt>Thành tiền</dt>
                  <dd className="text-smart-700">
                    {formatVND(session.totals.grandTotal)}
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </section>
  );
};

const Step = ({
  n,
  active,
  done,
  children,
}: {
  n: number;
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}): JSX.Element => (
  <span
    className={[
      'rounded-full px-3 py-1 text-xs',
      done
        ? 'bg-green-100 text-green-700'
        : active
          ? 'bg-smart-600 text-white'
          : 'bg-neutral-100 text-neutral-500',
    ].join(' ')}
  >
    {n}. {children}
  </span>
);
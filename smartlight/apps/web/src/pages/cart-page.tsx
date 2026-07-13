/**
 * Cart page — `/cart`.
 *
 * Reads cart state from Redux store. Item mutations dispatch the
 * cart-slice thunks which call the cart API and update local state.
 */
import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  SmartImage,
  Spinner,
  useToast,
} from '@smartlight/ui';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchCart,
  removeCartItem,
  updateCartItem,
  clearCart,
} from '../store/cart-slice';
import { formatVND } from '../lib/format';
import { useAuth } from '../contexts/auth-context';
import type { CartItemDto } from '../lib/cart-api';

export const CartPage = (): JSX.Element => {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { cart, status, error } = useAppSelector((s) => s.cart);

  useEffect(() => {
    if (isAuthenticated) {
      void dispatch(fetchCart());
    }
  }, [dispatch, isAuthenticated]);

  if (isBootstrapping) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: '/cart' }} />;
  }

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
        <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Giỏ hàng</h1>
        <EmptyState
          title="Giỏ hàng của bạn đang trống"
          description="Thêm sản phẩm vào giỏ để bắt đầu mua sắm."
          action={
            <Link to="/products">
              <Button variant="primary">Khám phá sản phẩm</Button>
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="container-page py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Giỏ hàng</h1>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card padded={false}>
          <ul className="divide-y divide-neutral-100">
            {cart.items.map((item: CartItemDto) => (
              <li key={item.id} className="flex items-center gap-4 p-4">
                <Link
                  to={`/products/${item.productSlug}`}
                  className="h-20 w-20 flex-shrink-0"
                >
                  <SmartImage
                    src={item.imageUrl}
                    alt={item.productName}
                    aspectRatio="square"
                  />
                </Link>
                <div className="flex-1">
                  <Link
                    to={`/products/${item.productSlug}`}
                    className="text-sm font-medium text-neutral-900 hover:text-smart-700"
                  >
                    {item.productName}
                  </Link>
                  <div className="text-xs text-neutral-500">
                    {item.variantName} · SKU: {item.sku}
                  </div>
                  <div className="mt-1 text-sm font-medium text-smart-700">
                    {formatVND(item.unitPrice)}
                  </div>
                </div>
                <FormField label="SL" htmlFor={`qty-${item.id}`}>
                  <Input
                    id={`qty-${item.id}`}
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => {
                      const next = Math.max(1, Number(e.currentTarget.value) || 1);
                      void dispatch(updateCartItem({ itemId: item.id, quantity: next }));
                    }}
                    className="w-20"
                  />
                </FormField>
                <div className="w-28 text-right text-sm font-semibold text-neutral-900">
                  {formatVND(item.subtotal)}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void dispatch(removeCartItem(item.id));
                    toast.push('Đã xóa sản phẩm', 'info');
                  }}
                >
                  Xóa
                </Button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-base font-semibold text-neutral-900">
              Tổng đơn hàng
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Tạm tính</dt>
                <dd>{formatVND(cart.totals.subtotal)}</dd>
              </div>
              {cart.totals.discountTotal > 0 && (
                <div className="flex justify-between text-green-700">
                  <dt>Giảm giá</dt>
                  <dd>-{formatVND(cart.totals.discountTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-neutral-100 pt-2 text-base font-semibold">
                <dt>Thành tiền</dt>
                <dd className="text-smart-700">
                  {formatVND(cart.totals.grandTotal)}
                </dd>
              </div>
            </dl>
            <Link to="/checkout" className="mt-4 block">
              <Button variant="primary" fullWidth size="lg">
                Tiến hành thanh toán
              </Button>
            </Link>
            <Button
              variant="ghost"
              fullWidth
              size="sm"
              className="mt-2"
              onClick={() => {
                if (confirm('Xóa toàn bộ giỏ hàng?')) {
                  void dispatch(clearCart());
                }
              }}
            >
              Xóa giỏ hàng
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
};
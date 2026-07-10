/**
 * Order detail page — `/orders/:id`.
 *
 * Shows items, totals, shipping/billing address and status timeline.
 */
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  SmartImage,
  Spinner,
} from '@smartlight/ui';
import { useAuth } from '../contexts/auth-context';
import { ordersApi, type OrderDto } from '../lib/orders-api';
import { formatVND } from '../lib/format';

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'neutral'> = {
  PENDING_PAYMENT: 'warning',
  PAID: 'success',
  PROCESSING: 'info',
  PACKED: 'info',
  SHIPPED: 'info',
  DELIVERING: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
  RETURN_REQUESTED: 'warning',
  RETURNED: 'neutral',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PROCESSING: 'Đang xử lý',
  PACKED: 'Đã đóng gói',
  SHIPPED: 'Đã gửi',
  DELIVERING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Hoàn tiền',
  RETURN_REQUESTED: 'Yêu cầu trả',
  RETURNED: 'Đã trả',
};

export const OrderDetailPage = (): JSX.Element => {
  const { id = '' } = useParams<{ id: string }>();
  const { isAuthenticated, isBootstrapping } = useAuth();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !id) return;
    setLoading(true);
    ordersApi
      .getOrder(id)
      .then(setOrder)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Lỗi'))
      .finally(() => setLoading(false));
  }, [id, isAuthenticated]);

  if (isBootstrapping) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `/orders/${id}` }} />;
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (err || !order) {
    return (
      <section className="container-page py-12">
        <EmptyState
          title="Không tìm thấy đơn hàng"
          description={err ?? 'Đơn hàng không tồn tại hoặc đã bị xóa.'}
          action={
            <Link to="/orders" className="text-smart-700 underline">
              Quay lại danh sách
            </Link>
          }
        />
      </section>
    );
  }

  const canCancel = ['PENDING_PAYMENT', 'PAID', 'PROCESSING'].includes(order.status);

  const onCancel = async (): Promise<void> => {
    if (!confirm('Bạn chắc chắn muốn hủy đơn hàng này?')) return;
    setCancelling(true);
    try {
      const updated = await ordersApi.cancelOrder(order.id, 'Khách hàng yêu cầu hủy');
      setOrder(updated);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <section className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Đơn hàng {order.orderNumber}
          </h1>
          <p className="text-sm text-neutral-500">
            Đặt lúc {new Date(order.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[order.status] ?? 'neutral'}>
            {STATUS_LABEL[order.status] ?? order.status}
          </Badge>
          <Badge variant={order.paymentStatus === 'PAID' ? 'success' : 'warning'}>
            {order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
          </Badge>
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              isLoading={cancelling}
              onClick={onCancel}
            >
              Hủy đơn
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Sản phẩm ({order.items.length})</CardTitle>
            </CardHeader>
            <ul className="divide-y divide-neutral-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-3">
                  <div className="h-16 w-16 flex-shrink-0">
                    <SmartImage
                      src={item.imageUrl}
                      alt={item.productName}
                      aspectRatio="square"
                    />
                  </div>
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
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-neutral-900">
                      {formatVND(item.unitPrice)} × {item.quantity}
                    </div>
                    <div className="text-sm text-neutral-500">
                      = {formatVND(item.lineSubtotal)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lịch sử trạng thái</CardTitle>
            </CardHeader>
            <ol className="space-y-3">
              {order.statusHistory.map((h) => (
                <li key={h.id} className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-smart-600" />
                  <div>
                    <div className="text-sm font-medium text-neutral-900">
                      {h.fromStatus ? `${STATUS_LABEL[h.fromStatus] ?? h.fromStatus} → ` : ''}
                      {STATUS_LABEL[h.toStatus] ?? h.toStatus}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {new Date(h.createdAt).toLocaleString('vi-VN')}
                      {h.changedByName ? ` · bởi ${h.changedByName}` : ''}
                    </div>
                    {h.reason && (
                      <div className="mt-1 text-xs text-neutral-600">Lý do: {h.reason}</div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tổng cộng</CardTitle>
            </CardHeader>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Tạm tính</dt>
                <dd>{formatVND(order.totals.subtotal)}</dd>
              </div>
              {order.totals.discountAmount > 0 && (
                <div className="flex justify-between text-green-700">
                  <dt>Giảm giá</dt>
                  <dd>-{formatVND(order.totals.discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-neutral-500">Phí vận chuyển</dt>
                <dd>{formatVND(order.totals.shippingFee)}</dd>
              </div>
              {order.totals.taxAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Thuế</dt>
                  <dd>{formatVND(order.totals.taxAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-neutral-100 pt-2 text-base font-semibold">
                <dt>Thành tiền</dt>
                <dd className="text-smart-700">{formatVND(order.totals.grandTotal)}</dd>
              </div>
            </dl>
            {order.couponCode && (
              <div className="mt-3 rounded bg-green-50 p-2 text-xs text-green-800">
                Đã áp dụng mã <strong>{order.couponCode}</strong>
              </div>
            )}
          </Card>

          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle>Địa chỉ giao hàng</CardTitle>
              </CardHeader>
              <CardDescription>
                <div className="font-medium text-neutral-900">
                  {order.shippingAddress.fullName} · {order.shippingAddress.phone}
                </div>
                <div className="mt-1">
                  {order.shippingAddress.detail}, {order.shippingAddress.ward},{' '}
                  {order.shippingAddress.district}, {order.shippingAddress.province}
                </div>
              </CardDescription>
            </Card>
          )}

          {order.customerNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Ghi chú</CardTitle>
              </CardHeader>
              <p className="text-sm text-neutral-700">{order.customerNotes}</p>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
};
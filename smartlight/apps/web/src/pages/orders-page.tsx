/**
 * Orders list page — `/orders`.
 *
 * Lists the current customer's orders with status pills.
 */
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Badge,
  Card,
  EmptyState,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@smartlight/ui';
import { useAuth } from '../contexts/auth-context';
import { ordersApi, type OrderSummary } from '../lib/orders-api';
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

export const OrdersPage = (): JSX.Element => {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    ordersApi
      .listMyOrders()
      .then(setOrders)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Lỗi'))
      .finally(() => undefined);
  }, [isAuthenticated]);

  if (isBootstrapping) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: '/orders' }} />;
  }

  return (
    <section className="container-page py-8">
      <h1 className="mb-4 text-2xl font-semibold text-neutral-900">
        Đơn hàng của tôi
      </h1>

      {err && <EmptyState title="Lỗi tải đơn hàng" description={err} />}

      {!err && orders && orders.length === 0 && (
        <EmptyState
          title="Bạn chưa có đơn hàng nào"
          description="Hãy khám phá các sản phẩm và đặt đơn đầu tiên."
          action={
            <Link to="/products" className="text-smart-700 underline">
              Đến cửa hàng
            </Link>
          }
        />
      )}

      {!err && orders && orders.length > 0 && (
        <Card padded={false}>
          <Table>
            <THead>
              <TR>
                <TH>Mã đơn</TH>
                <TH>Ngày đặt</TH>
                <TH>Số SP</TH>
                <TH>Tổng cộng</TH>
                <TH>Trạng thái</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {orders.map((o) => (
                <TR key={o.id}>
                  <TD>
                    <Link
                      to={`/orders/${o.id}`}
                      className="font-medium text-smart-700 hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </TD>
                  <TD>{new Date(o.createdAt).toLocaleString('vi-VN')}</TD>
                  <TD>{o.itemCount}</TD>
                  <TD>{formatVND(o.grandTotal)}</TD>
                  <TD>
                    <Badge variant={STATUS_VARIANT[o.status] ?? 'neutral'}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </Badge>
                  </TD>
                  <TD>
                    <Link
                      to={`/orders/${o.id}`}
                      className="text-sm text-smart-700 hover:underline"
                    >
                      Xem →
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </section>
  );
};
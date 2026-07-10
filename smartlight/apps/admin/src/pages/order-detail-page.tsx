import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardBody,
  CardHeader,
  Drawer,
  EmptyState,
  FormField,
  Spinner,
  StatusPill,
  Tabs,
  Textarea,
  useToast,
} from '@smartlight/ui';
import { ordersApi } from '../lib/orders-api';
import { formatVND } from '../lib/format';
import type { Order, OrderStatus, UpdateOrderStatusDto } from '../lib/types';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['COMPLETED', 'REFUNDED'],
  COMPLETED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

const statusLabel = (s: OrderStatus): string =>
  ({
    PENDING_PAYMENT: 'Chờ thanh toán',
    PAID: 'Đã thanh toán',
    PROCESSING: 'Đang xử lý',
    SHIPPED: 'Đang giao',
    DELIVERED: 'Đã giao',
    COMPLETED: 'Hoàn tất',
    CANCELLED: 'Đã huỷ',
    REFUNDED: 'Hoàn tiền',
  }[s]);

export const OrderDetailPage = (): JSX.Element => {
  const params = useParams<{ id: string }>();
  const { push } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('items');
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = async (): Promise<void> => {
    if (!params.id) return;
    setLoading(true);
    try {
      const data = await ordersApi.getAdmin(params.id);
      setOrder(data);
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi tải đơn hàng',
        description: e instanceof Error ? e.message : '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleTransition = async (): Promise<void> => {
    if (!order || !nextStatus) return;
    setBusy(true);
    try {
      await ordersApi.updateStatus(order.id, {
        status: nextStatus,
        note: note || undefined,
      } as UpdateOrderStatusDto);
      push({ variant: 'success', title: `Đã chuyển sang ${statusLabel(nextStatus)}` });
      setTransitionOpen(false);
      setNextStatus(null);
      setNote('');
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!order) {
    return (
      <section className="container-page py-6">
        <EmptyState title="Không tìm thấy đơn hàng" />
      </section>
    );
  }

  const allowed = TRANSITIONS[order.status] ?? [];

  return (
    <section className="container-page py-6">
      <Breadcrumb
        items={[
          { label: 'Admin', href: '/' },
          { label: 'Đơn hàng', href: '/orders' },
          { label: order.code },
        ]}
        className="mb-3"
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{order.code}</h1>
            <StatusPill
              status={statusLabel(order.status)}
              variant={
                order.status === 'COMPLETED' || order.status === 'DELIVERED'
                  ? 'success'
                  : order.status === 'PENDING_PAYMENT'
                    ? 'warning'
                    : order.status === 'CANCELLED' || order.status === 'REFUNDED'
                      ? 'danger'
                      : 'info'
              }
            />
          </div>
          <p className="text-sm text-neutral-500">
            Tạo lúc {new Date(order.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {allowed.length > 0 && (
            <Button onClick={() => setTransitionOpen(true)}>
              Cập nhật trạng thái
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              // CSV invoice export (single-row for now)
              const csv = [
                'Mã đơn,Khách hàng,SĐT,Email,Tổng tiền,Trạng thái,Ngày',
                [
                  order.code,
                  order.customerName,
                  order.customerPhone ?? '',
                  order.customerEmail ?? '',
                  order.total?.amount ?? 0,
                  statusLabel(order.status),
                  order.createdAt,
                ]
                  .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                  .join(','),
              ].join('\n');
              const blob = new Blob([`\uFEFF${csv}`], {
                type: 'text/csv;charset=utf-8',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `invoice-${order.code}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Xuất hoá đơn (CSV)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-semibold">Chi tiết</h2>
          </CardHeader>
          <CardBody>
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { key: 'items', label: 'Sản phẩm', count: order.items.length },
                { key: 'history', label: 'Lịch sử', count: order.history.length },
                { key: 'shipping', label: 'Vận chuyển' },
              ]}
            >
              {tab === 'items' && (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-2 py-2 text-left">Sản phẩm</th>
                      <th className="px-2 py-2 text-right">SL</th>
                      <th className="px-2 py-2 text-right">Đơn giá</th>
                      <th className="px-2 py-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it) => (
                      <tr key={it.id} className="border-t border-neutral-100">
                        <td className="px-2 py-2">
                          <div className="flex flex-col">
                            <span className="font-medium">{it.productName}</span>
                            <code className="text-xs text-neutral-500">
                              {it.variantSku}
                            </code>
                            {it.variantLabel && (
                              <span className="text-xs text-neutral-500">
                                {it.variantLabel}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right">{it.quantity}</td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {formatVND(it.unitPrice?.amount ?? 0)}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {formatVND(it.lineTotal?.amount ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === 'history' && (
                <ol className="space-y-3 border-l border-neutral-200 pl-4 text-sm">
                  {order.history.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-smart-500" />
                      <p className="font-medium">{statusLabel(h.toStatus)}</p>
                      <p className="text-xs text-neutral-500">
                        {h.fromStatus
                          ? `Từ: ${statusLabel(h.fromStatus)} · `
                          : ''}
                        {h.actorName ? `${h.actorName} · ` : ''}
                        {new Date(h.createdAt).toLocaleString('vi-VN')}
                      </p>
                      {h.note && (
                        <p className="mt-1 text-neutral-700">{h.note}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}

              {tab === 'shipping' && (
                <div className="space-y-3 text-sm">
                  <div>
                    <Badge variant="info">
                      {order.shipmentStatus ?? 'Chưa vận chuyển'}
                    </Badge>
                    {order.trackingNumber && (
                      <span className="ml-2 text-neutral-600">
                        Mã vận đơn: {order.trackingNumber}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{order.shippingAddress?.fullName}</p>
                    <p>{order.shippingAddress?.phone}</p>
                    <p>
                      {order.shippingAddress?.addressLine1},{' '}
                      {order.shippingAddress?.district},{' '}
                      {order.shippingAddress?.province}
                    </p>
                  </div>
                </div>
              )}
            </Tabs>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Khách hàng</h2>
            </CardHeader>
            <CardBody className="space-y-1 text-sm">
              <p className="font-medium">{order.customerName}</p>
              <p>{order.customerPhone}</p>
              <p className="text-neutral-500">{order.customerEmail}</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Thanh toán</h2>
            </CardHeader>
            <CardBody className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Tạm tính</span>
                <span className="tabular-nums">
                  {formatVND(order.subtotal?.amount ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Giảm giá</span>
                <span className="tabular-nums">
                  {formatVND(order.discount?.amount ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Vận chuyển</span>
                <span className="tabular-nums">
                  {formatVND(order.shipping?.amount ?? 0)}
                </span>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold">
                <span>Tổng</span>
                <span className="tabular-nums">
                  {formatVND(order.total?.amount ?? 0)}
                </span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {transitionOpen && (
        <Drawer
          open
          onClose={() => setTransitionOpen(false)}
          title="Cập nhật trạng thái đơn hàng"
          footer={
            <>
              <Button variant="ghost" onClick={() => setTransitionOpen(false)}>
                Huỷ
              </Button>
              <Button onClick={() => void handleTransition()} isLoading={busy}>
                Cập nhật
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <FormField label="Trạng thái mới" required>
              <select
                value={nextStatus ?? ''}
                onChange={(e) =>
                  setNextStatus((e.target.value || null) as OrderStatus | null)
                }
                className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">— Chọn —</option>
                {allowed.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Ghi chú">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </FormField>
          </div>
        </Drawer>
      )}

      <div className="mt-4 text-right text-sm">
        <Link to="/orders" className="text-smart-700 hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    </section>
  );
};
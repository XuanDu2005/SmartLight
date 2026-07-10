import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
  Input,
  Pagination,
  Select,
  Spinner,
  StatusPill,
} from '@smartlight/ui';
import { ordersApi } from '../lib/orders-api';
import { formatVND } from '../lib/format';
import type { ListOrdersAdminParams, Order, OrderStatus } from '../lib/types';

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
];

const statusVariant = (s: OrderStatus): 'success' | 'danger' | 'warning' | 'info' | 'neutral' => {
  switch (s) {
    case 'COMPLETED':
    case 'DELIVERED':
      return 'success';
    case 'PAID':
    case 'PROCESSING':
    case 'SHIPPED':
      return 'info';
    case 'PENDING_PAYMENT':
      return 'warning';
    case 'CANCELLED':
    case 'REFUNDED':
      return 'danger';
  }
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

export const OrdersPage = (): JSX.Element => {
  const [params, setParams] = useState<ListOrdersAdminParams>({
    page: 1,
    limit: 20,
    search: '',
    status: undefined,
  });
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  const [items, setItems] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const reload = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await ordersApi.listAdmin({
        ...params,
        search: debounced || undefined,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.page, params.limit, params.status, debounced]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(total / (params.limit ?? 20))),
    [total, params.limit],
  );

  return (
    <section className="container-page py-6">
      <Breadcrumb
        items={[{ label: 'Admin', href: '/' }, { label: 'Đơn hàng' }]}
        className="mb-3"
      />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Đơn hàng</h1>
          <p className="text-sm text-neutral-500">
            Quản lý tất cả đơn hàng trong hệ thống
          </p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Input
          placeholder="Tìm mã đơn, khách hàng…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={params.status ?? ''}
          onChange={(e) =>
            setParams((p) => ({
              ...p,
              page: 1,
              status: (e.target.value || undefined) as OrderStatus | undefined,
            }))
          }
        >
          <option value="">Tất cả trạng thái</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
        <Select
          value={String(params.limit ?? 20)}
          onChange={(e) =>
            setParams((p) => ({ ...p, page: 1, limit: Number(e.target.value) }))
          }
        >
          <option value="10">10 / trang</option>
          <option value="20">20 / trang</option>
          <option value="50">50 / trang</option>
        </Select>
      </div>

      <DataTable stickyHeader>
        <DataTableHead>
          <DataTableRow density="compact">
            <DataTableHeaderCell>Mã đơn</DataTableHeaderCell>
            <DataTableHeaderCell>Khách hàng</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Tổng tiền</DataTableHeaderCell>
            <DataTableHeaderCell>Trạng thái</DataTableHeaderCell>
            <DataTableHeaderCell>Thanh toán</DataTableHeaderCell>
            <DataTableHeaderCell>Ngày tạo</DataTableHeaderCell>
            <DataTableHeaderCell />
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableRow>
              <DataTableCell colSpan={7} className="text-center">
                <Spinner />
              </DataTableCell>
            </DataTableRow>
          ) : items.length === 0 ? (
            <DataTableRow>
              <DataTableCell colSpan={7}>
                <EmptyState title="Chưa có đơn hàng" />
              </DataTableCell>
            </DataTableRow>
          ) : (
            items.map((o) => (
              <DataTableRow key={o.id}>
                <DataTableCell className="font-medium">
                  <Link
                    to={`/orders/${o.id}`}
                    className="text-smart-700 hover:underline"
                  >
                    {o.code}
                  </Link>
                </DataTableCell>
                <DataTableCell>
                  <div className="flex flex-col">
                    <span>{o.customerName}</span>
                    {o.customerEmail && (
                      <span className="text-xs text-neutral-500">
                        {o.customerEmail}
                      </span>
                    )}
                  </div>
                </DataTableCell>
                <DataTableCell className="text-right tabular-nums">
                  {formatVND(o.total?.amount ?? 0)}
                </DataTableCell>
                <DataTableCell>
                  <StatusPill
                    status={statusLabel(o.status)}
                    variant={statusVariant(o.status)}
                  />
                </DataTableCell>
                <DataTableCell>{o.paymentStatus ?? '—'}</DataTableCell>
                <DataTableCell className="text-xs text-neutral-600">
                  {new Date(o.createdAt).toLocaleString('vi-VN')}
                </DataTableCell>
                <DataTableCell className="text-right">
                  <Link to={`/orders/${o.id}`}>
                    <Button size="sm" variant="ghost">
                      Chi tiết
                    </Button>
                  </Link>
                </DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-neutral-500">
          Tổng: {total} đơn hàng
        </span>
        {pageCount > 1 && (
          <Pagination
            page={params.page ?? 1}
            totalPages={pageCount}
            onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
          />
        )}
      </div>
    </section>
  );
};
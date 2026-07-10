import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
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
import { paymentsApi } from '../lib/payments-api';
import { formatVND } from '../lib/format';
import type {
  ListPaymentsAdminParams,
  PaymentProvider,
  PaymentStatus,
  PaymentSummary,
} from '../lib/types';

const statusVariant = (s: PaymentStatus) => {
  switch (s) {
    case 'SUCCEEDED':
      return 'success' as const;
    case 'PROCESSING':
    case 'PENDING':
      return 'info' as const;
    case 'FAILED':
      return 'danger' as const;
    case 'REFUNDED':
      return 'warning' as const;
    case 'CANCELLED':
      return 'neutral' as const;
  }
};

export const PaymentsPage = (): JSX.Element => {
  const [params, setParams] = useState<ListPaymentsAdminParams>({
    page: 1,
    limit: 20,
    search: '',
  });
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  const [items, setItems] = useState<PaymentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const reload = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await paymentsApi.listAdmin({
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
  }, [params.page, params.limit, params.status, params.provider, debounced]);

  const pageCount = Math.max(1, Math.ceil(total / (params.limit ?? 20)));

  return (
    <section className="container-page py-6">
      <Breadcrumb
        items={[{ label: 'Admin', href: '/' }, { label: 'Thanh toán' }]}
        className="mb-3"
      />
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
        <Input
          placeholder="Tìm mã đơn, mã giao dịch…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={params.provider ?? ''}
          onChange={(e) =>
            setParams((p) => ({
              ...p,
              page: 1,
              provider: (e.target.value || undefined) as
                | PaymentProvider
                | undefined,
            }))
          }
        >
          <option value="">Tất cả provider</option>
          <option value="MOMO">MoMo</option>
          <option value="VNPAY">VNPay</option>
          <option value="PAYPAL">PayPal</option>
        </Select>
        <Select
          value={params.status ?? ''}
          onChange={(e) =>
            setParams((p) => ({
              ...p,
              page: 1,
              status: (e.target.value || undefined) as PaymentStatus | undefined,
            }))
          }
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">Chờ</option>
          <option value="PROCESSING">Đang xử lý</option>
          <option value="SUCCEEDED">Thành công</option>
          <option value="FAILED">Thất bại</option>
          <option value="REFUNDED">Đã hoàn</option>
          <option value="CANCELLED">Đã huỷ</option>
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
            <DataTableHeaderCell>Provider</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Số tiền</DataTableHeaderCell>
            <DataTableHeaderCell>Trạng thái</DataTableHeaderCell>
            <DataTableHeaderCell>Mã giao dịch</DataTableHeaderCell>
            <DataTableHeaderCell>Ngày tạo</DataTableHeaderCell>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableRow>
              <DataTableCell colSpan={6} className="text-center">
                <Spinner />
              </DataTableCell>
            </DataTableRow>
          ) : items.length === 0 ? (
            <DataTableRow>
              <DataTableCell colSpan={6}>
                <EmptyState title="Chưa có thanh toán" />
              </DataTableCell>
            </DataTableRow>
          ) : (
            items.map((p) => (
              <DataTableRow key={p.id}>
                <DataTableCell>
                  <Link
                    to={`/payments/${p.id}`}
                    className="font-medium text-smart-700 hover:underline"
                  >
                    {p.orderCode}
                  </Link>
                </DataTableCell>
                <DataTableCell>
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">
                    {p.provider}
                  </span>
                </DataTableCell>
                <DataTableCell className="text-right tabular-nums">
                  {formatVND(p.amount?.amount ?? 0)}
                </DataTableCell>
                <DataTableCell>
                  <StatusPill
                    status={p.status}
                    variant={statusVariant(p.status)}
                  />
                </DataTableCell>
                <DataTableCell>
                  <code className="text-xs">{p.transactionId ?? '—'}</code>
                </DataTableCell>
                <DataTableCell className="text-xs text-neutral-600">
                  {new Date(p.createdAt).toLocaleString('vi-VN')}
                </DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-neutral-500">
          Tổng: {total} giao dịch
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
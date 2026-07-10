/**
 * Admin Payments — `/payments`.
 *
 * Lists recent payments with status, method and amount.
 */
import { useEffect, useState } from 'react';
import {
  Badge,
  Card,
  EmptyState,
  Pagination,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@smartlight/ui';
import { apiClient } from '../lib/api-client';
import { formatVND } from '../lib/format';

interface PaymentRow {
  id: string;
  orderId: string;
  orderNumber: string;
  method: 'MOMO' | 'VNPAY' | 'PAYPAL' | 'COD' | 'BANK_TRANSFER';
  status: 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  amount: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
}

const STATUS_VARIANT: Record<PaymentRow['status'], 'success' | 'danger' | 'warning' | 'info'> = {
  PENDING: 'warning',
  AUTHORIZED: 'info',
  CAPTURED: 'success',
  FAILED: 'danger',
  REFUNDED: 'warning',
  CANCELLED: 'danger',
};

const STATUS_LABEL: Record<PaymentRow['status'], string> = {
  PENDING: 'Chờ xử lý',
  AUTHORIZED: 'Đã ủy quyền',
  CAPTURED: 'Đã thanh toán',
  FAILED: 'Thất bại',
  REFUNDED: 'Hoàn tiền',
  CANCELLED: 'Đã hủy',
};

const METHOD_LABEL: Record<PaymentRow['method'], string> = {
  MOMO: 'MoMo',
  VNPAY: 'VNPay',
  PAYPAL: 'PayPal',
  COD: 'COD',
  BANK_TRANSFER: 'Chuyển khoản',
};

export const PaymentsPage = (): JSX.Element => {
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    apiClient
      .get<{ data: PaymentRow[] }>('/payments', { params: { page, limit } })
      .then((r) => setRows(r.data.data ?? []))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Lỗi'))
      .finally(() => undefined);
  }, [page]);

  return (
    <section className="container-page py-6">
      <h1 className="mb-4 text-2xl font-semibold text-neutral-900">
        Quản lý thanh toán
      </h1>

      {err && <EmptyState title="Lỗi tải thanh toán" description={err} />}

      {!err && rows === null && (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}

      {!err && rows && rows.length === 0 && (
        <EmptyState
          title="Chưa có giao dịch"
          description="Các giao dịch thanh toán sẽ hiển thị tại đây."
        />
      )}

      {!err && rows && rows.length > 0 && (
        <>
          <Card padded={false}>
            <Table>
              <THead>
                <TR>
                  <TH>Mã đơn</TH>
                  <TH>Phương thức</TH>
                  <TH>Số tiền</TH>
                  <TH>Trạng thái</TH>
                  <TH>Ngày tạo</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-mono text-xs">{p.orderNumber}</TD>
                    <TD>{METHOD_LABEL[p.method] ?? p.method}</TD>
                    <TD className="font-semibold text-neutral-900">
                      {formatVND(p.amount)}
                    </TD>
                    <TD>
                      <Badge variant={STATUS_VARIANT[p.status]}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </Badge>
                    </TD>
                    <TD>{new Date(p.createdAt).toLocaleString('vi-VN')}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
          <div className="mt-4 flex justify-center">
            <Pagination
              page={page}
              totalPages={Math.max(1, Math.ceil(rows.length / limit))}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </section>
  );
};
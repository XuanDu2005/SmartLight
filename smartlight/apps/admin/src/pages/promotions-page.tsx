/**
 * Admin Promotions — `/promotions`.
 *
 * Lists active promotions/vouchers. Edit functionality is intentionally
 * out-of-scope here — Phase 18 focuses on the storefront read paths.
 */
import { useEffect, useState } from 'react';
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
import { apiClient } from '../lib/api-client';
import { formatVND } from '../lib/format';

interface PromotionRow {
  id: string;
  code: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';
  discountValue: number;
  minimumOrderValue: number;
  startsAt: string;
  endsAt: string;
  usedCount: number;
  usageLimit: number | null;
}

const STATUS_VARIANT: Record<PromotionRow['status'], 'success' | 'danger' | 'warning' | 'neutral'> = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  PAUSED: 'warning',
  EXPIRED: 'danger',
};

export const PromotionsPage = (): JSX.Element => {
  const [rows, setRows] = useState<PromotionRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ data: PromotionRow[] }>('/promotions', { params: { limit: 50 } })
      .then((r) => setRows(r.data.data ?? []))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Lỗi'))
      .finally(() => undefined);
  }, []);

  return (
    <section className="container-page py-6">
      <h1 className="mb-4 text-2xl font-semibold text-neutral-900">
        Quản lý khuyến mãi
      </h1>

      {err && <EmptyState title="Lỗi tải khuyến mãi" description={err} />}

      {!err && rows === null && (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}

      {!err && rows && rows.length === 0 && (
        <EmptyState
          title="Chưa có khuyến mãi"
          description="Hãy chạy seed để có khuyến mãi mẫu."
        />
      )}

      {!err && rows && rows.length > 0 && (
        <Card padded={false}>
          <Table>
            <THead>
              <TR>
                <TH>Mã</TH>
                <TH>Tên</TH>
                <TH>Loại</TH>
                <TH>Giá trị</TH>
                <TH>Đơn tối thiểu</TH>
                <TH>Đã dùng</TH>
                <TH>Trạng thái</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((p) => (
                <TR key={p.id}>
                  <TD className="font-mono text-xs">{p.code}</TD>
                  <TD>{p.name}</TD>
                  <TD>
                    {p.type === 'PERCENTAGE'
                      ? 'Phần trăm'
                      : p.type === 'FIXED_AMOUNT'
                        ? 'Số tiền'
                        : 'Free ship'}
                  </TD>
                  <TD>
                    {p.type === 'PERCENTAGE'
                      ? `${p.discountValue}%`
                      : formatVND(p.discountValue)}
                  </TD>
                  <TD>{formatVND(p.minimumOrderValue)}</TD>
                  <TD>
                    {p.usedCount}
                    {p.usageLimit ? ` / ${p.usageLimit}` : ''}
                  </TD>
                  <TD>
                    <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
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
/**
 * Admin Inventory — `/inventory`.
 *
 * Inventory-level visibility: SKU, on-hand, available, reserved.
 * Backend endpoint: /v1/inventory (admin-scoped).
 */
import { useEffect, useState } from 'react';
import {
  Badge,
  Card,
  EmptyState,
  FormField,
  Input,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@smartlight/ui';
import { apiClient } from '../lib/api-client';

interface InventoryRow {
  id: string;
  productVariantId: string;
  sku: string;
  productName: string;
  variantName: string;
  onHand: number;
  available: number;
  reserved: number;
  reorderLevel: number;
  updatedAt: string;
}

export const InventoryPage = (): JSX.Element => {
  const [rows, setRows] = useState<InventoryRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    apiClient
      .get<{ data: InventoryRow[] }>('/inventory')
      .then((r) => setRows(r.data.data ?? []))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Lỗi'))
      .finally(() => undefined);
  }, []);

  const filtered =
    rows?.filter(
      (r) =>
        !filter ||
        r.sku.toLowerCase().includes(filter.toLowerCase()) ||
        r.productName.toLowerCase().includes(filter.toLowerCase()),
    ) ?? [];

  return (
    <section className="container-page py-6">
      <h1 className="mb-4 text-2xl font-semibold text-neutral-900">
        Quản lý tồn kho
      </h1>

      <Card className="mb-4">
        <FormField label="Tìm kiếm" htmlFor="filter">
          <Input
            id="filter"
            placeholder="SKU hoặc tên sản phẩm..."
            value={filter}
            onChange={(e) => setFilter(e.currentTarget.value)}
          />
        </FormField>
      </Card>

      {err && <EmptyState title="Lỗi tải tồn kho" description={err} />}

      {!err && rows === null && (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}

      {!err && rows !== null && rows.length === 0 && (
        <EmptyState
          title="Chưa có dữ liệu tồn kho"
          description="Hãy chạy seed để có dữ liệu mẫu."
        />
      )}

      {!err && rows && rows.length > 0 && (
        <Card padded={false}>
          <Table>
            <THead>
              <TR>
                <TH>SKU</TH>
                <TH>Sản phẩm</TH>
                <TH>Tồn kho</TH>
                <TH>Khả dụng</TH>
                <TH>Đã giữ</TH>
                <TH>Mức đặt lại</TH>
                <TH>Trạng thái</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((r) => {
                const lowStock = r.available <= r.reorderLevel;
                return (
                  <TR key={r.id}>
                    <TD className="font-mono text-xs">{r.sku}</TD>
                    <TD>
                      <div className="font-medium text-neutral-900">
                        {r.productName}
                      </div>
                      <div className="text-xs text-neutral-500">{r.variantName}</div>
                    </TD>
                    <TD>{r.onHand}</TD>
                    <TD>{r.available}</TD>
                    <TD>{r.reserved}</TD>
                    <TD>{r.reorderLevel}</TD>
                    <TD>
                      {lowStock ? (
                        <Badge variant="warning">Sắp hết</Badge>
                      ) : (
                        <Badge variant="success">Ổn định</Badge>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      )}
    </section>
  );
};
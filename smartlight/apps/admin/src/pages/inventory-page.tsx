import { useEffect, useState } from 'react';
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  Drawer,
  EmptyState,
  FormField,
  Input,
  Pagination,
  Select,
  Skeleton,
  SkeletonText,
  Spinner,
  StatusPill,
  Tabs,
  useToast,
} from '@smartlight/ui';
import { inventoryApi } from '../lib/inventory-api';
import type {
  ImportStockDto,
  InventoryListParams,
  InventoryStock,
  ListMovementsParams,
  StockAdjustmentDto,
  StockMovement,
  UpdateThresholdDto,
} from '../lib/types';

export const InventoryPage = (): JSX.Element => {
  const { push } = useToast();

  const [params, setParams] = useState<InventoryListParams>({
    page: 1,
    limit: 20,
    search: '',
  });
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  const [items, setItems] = useState<InventoryStock[]>([]);
  const [total, setTotal] = useState(0);
  const [lowStock, setLowStock] = useState<InventoryStock[]>([]);
  const [loading, setLoading] = useState(true);

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [selected, setSelected] = useState<InventoryStock | null>(null);
  const [drawer, setDrawer] = useState<{
    open: boolean;
    mode: 'import' | 'adjust' | 'threshold' | 'movements';
  }>({ open: false, mode: 'import' });

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const reload = async (): Promise<void> => {
    setLoading(true);
    try {
      const [list, low] = await Promise.all([
        inventoryApi.list({ ...params, search: debounced || undefined }),
        inventoryApi.listLowStock(),
      ]);
      setItems(list.items);
      setTotal(list.total);
      setLowStock(low.items);
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi tải tồn kho',
        description: e instanceof Error ? e.message : '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.page, params.limit, params.lowStockOnly, params.warehouseId, debounced]);

  const pageCount = Math.max(1, Math.ceil(total / (params.limit ?? 20)));

  return (
    <section className="container-page py-6">
      <Breadcrumb
        items={[{ label: 'Admin', href: '/' }, { label: 'Tồn kho' }]}
        className="mb-3"
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tồn kho</h1>
          <p className="text-sm text-neutral-500">
            Theo dõi, nhập kho và điều chỉnh tồn kho
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card>
          <CardBody>
            {loading ? (
              <SkeletonText lines={2} />
            ) : (
              <>
                <p className="text-sm text-neutral-500">Tổng sản phẩm</p>
                <p className="text-2xl font-semibold">{total}</p>
              </>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            {loading ? (
              <SkeletonText lines={2} />
            ) : (
              <>
                <p className="text-sm text-neutral-500">Sắp hết hàng</p>
                <p className="text-2xl font-semibold text-yellow-700">
                  {lowStock.length}
                </p>
              </>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            {loading ? (
              <SkeletonText lines={2} />
            ) : (
              <>
                <p className="text-sm text-neutral-500">Hết hàng</p>
                <p className="text-2xl font-semibold text-red-700">
                  {items.filter((i) => i.onHand <= 0).length}
                </p>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {lowStock.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <h2 className="font-semibold">
              <Badge variant="warning">{lowStock.length}</Badge> sản phẩm sắp hết hàng
            </h2>
          </CardHeader>
          <CardBody>
            <ul className="space-y-1 text-sm">
              {lowStock.slice(0, 5).map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between rounded px-2 py-1 hover:bg-neutral-50"
                >
                  <span>
                    {i.productName}{' '}
                    <code className="ml-1 text-xs text-neutral-500">
                      ({i.variantSku})
                    </code>
                  </span>
                  <span className="text-xs">
                    {i.available}/{i.onHand} (≤ {i.lowStockThreshold})
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Input
          placeholder="Tìm SKU, tên sản phẩm…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={params.lowStockOnly ? '1' : '0'}
          onChange={(e) =>
            setParams((p) => ({
              ...p,
              page: 1,
              lowStockOnly: e.target.value === '1',
            }))
          }
        >
          <option value="0">Tất cả</option>
          <option value="1">Chỉ sắp hết hàng</option>
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
            <DataTableHeaderCell>Sản phẩm / SKU</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Tồn</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Khả dụng</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Đặt trước</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Ngưỡng</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Hành động</DataTableHeaderCell>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <DataTableRow key={i}>
                <DataTableCell colSpan={6}>
                  <SkeletonText lines={1} />
                </DataTableCell>
              </DataTableRow>
            ))
          ) : items.length === 0 ? (
            <DataTableRow>
              <DataTableCell colSpan={6}>
                <EmptyState title="Chưa có dữ liệu tồn kho" />
              </DataTableCell>
            </DataTableRow>
          ) : (
            items.map((i) => (
              <DataTableRow key={i.id}>
                <DataTableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{i.productName}</span>
                    <code className="text-xs text-neutral-500">{i.variantSku}</code>
                  </div>
                </DataTableCell>
                <DataTableCell className="text-right tabular-nums">{i.onHand}</DataTableCell>
                <DataTableCell className="text-right tabular-nums">{i.available}</DataTableCell>
                <DataTableCell className="text-right tabular-nums">{i.reserved}</DataTableCell>
                <DataTableCell className="text-right tabular-nums">{i.lowStockThreshold}</DataTableCell>
                <DataTableCell className="text-right">
                  <div className="inline-flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelected(i);
                        setDrawer({ open: true, mode: 'import' });
                      }}
                    >
                      Nhập
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelected(i);
                        setDrawer({ open: true, mode: 'adjust' });
                      }}
                    >
                      Điều chỉnh
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelected(i);
                        setDrawer({ open: true, mode: 'threshold' });
                      }}
                    >
                      Ngưỡng
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        setSelected(i);
                        setDrawer({ open: true, mode: 'movements' });
                        try {
                          const m = await inventoryApi.movements(i.variantId, {
                            limit: 50,
                          } as ListMovementsParams);
                          setMovements(m.items);
                        } catch (err) {
                          push({
                            variant: 'error',
                            title: 'Lỗi tải lịch sử',
                            description: err instanceof Error ? err.message : '',
                          });
                        }
                      }}
                    >
                      Lịch sử
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-neutral-500">Tổng: {total} bản ghi</span>
        {pageCount > 1 && (
          <Pagination
            page={params.page ?? 1}
            totalPages={pageCount}
            onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
          />
        )}
      </div>

      {drawer.open && selected && (
        <InventoryActionDrawer
          mode={drawer.mode}
          stock={selected}
          movements={movements}
          onClose={() => {
            setDrawer({ open: false, mode: 'import' });
            setMovements([]);
          }}
          onSaved={async () => {
            setDrawer({ open: false, mode: 'import' });
            setMovements([]);
            await reload();
          }}
        />
      )}
    </section>
  );
};

// ============================================================================
//  Drawer with action-specific sub-form
// ============================================================================

interface ActionDrawerProps {
  mode: 'import' | 'adjust' | 'threshold' | 'movements';
  stock: InventoryStock;
  movements: StockMovement[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const InventoryActionDrawer = ({
  mode,
  stock,
  movements,
  onClose,
  onSaved,
}: ActionDrawerProps): JSX.Element => {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [threshold, setThreshold] = useState(stock.lowStockThreshold);

  const handleImport = async (): Promise<void> => {
    setBusy(true);
    try {
      await inventoryApi.import({
        variantId: stock.variantId,
        quantity,
        reason: reason || undefined,
      } as ImportStockDto);
      push({ variant: 'success', title: 'Đã nhập kho' });
      await onSaved();
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

  const handleAdjust = async (): Promise<void> => {
    setBusy(true);
    try {
      await inventoryApi.adjust(stock.variantId, quantity, reason);
      push({ variant: 'success', title: 'Đã điều chỉnh tồn kho' });
      await onSaved();
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

  const handleThreshold = async (): Promise<void> => {
    setBusy(true);
    try {
      await inventoryApi.updateThreshold(stock.variantId, {
        threshold,
      } as UpdateThresholdDto);
      push({ variant: 'success', title: 'Đã cập nhật ngưỡng' });
      await onSaved();
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

  const titleMap = {
    import: 'Nhập kho',
    adjust: 'Điều chỉnh tồn kho',
    threshold: 'Cập nhật ngưỡng',
    movements: 'Lịch sử biến động',
  } as const;

  return (
    <Drawer
      open
      onClose={onClose}
      title={titleMap[mode]}
      description={`${stock.productName} (${stock.variantSku})`}
      size="md"
      footer={
        mode !== 'movements' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Huỷ
            </Button>
            <Button
              onClick={() => {
                if (mode === 'import') void handleImport();
                else if (mode === 'adjust') void handleAdjust();
                else if (mode === 'threshold') void handleThreshold();
              }}
              isLoading={busy}
            >
              Lưu
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        )
      }
    >
      {mode === 'movements' ? (
        <Tabs
          items={[{ key: 'history', label: 'Biến động' }]}
          defaultValue="history"
        >
          {movements.length === 0 ? (
            <EmptyState title="Chưa có biến động" />
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {movements.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">
                      <StatusPill
                        status={m.type}
                        variant={
                          m.type === 'IMPORT'
                            ? 'success'
                            : m.type === 'SALE' || m.type === 'RESERVATION'
                              ? 'info'
                              : m.type === 'RELEASE'
                                ? 'neutral'
                                : 'warning'
                        }
                      />
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">{m.reason ?? ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">
                      {m.quantity > 0 ? '+' : ''}
                      {m.quantity}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {new Date(m.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tabs>
      ) : (
        <div className="space-y-3">
          {mode === 'threshold' ? (
            <FormField label="Ngưỡng cảnh báo" required>
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            </FormField>
          ) : (
            <>
              <FormField label="Số lượng" required>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </FormField>
              <FormField label="Lý do" required>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    mode === 'import'
                      ? 'Nhập từ nhà cung cấp X'
                      : 'Kiểm kê cuối ngày'
                  }
                />
              </FormField>
            </>
          )}
          <p className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-600">
            Tồn hiện tại: {stock.onHand} · Khả dụng: {stock.available} · Đặt trước:{' '}
            {stock.reserved}
          </p>
        </div>
      )}
    </Drawer>
  );
};
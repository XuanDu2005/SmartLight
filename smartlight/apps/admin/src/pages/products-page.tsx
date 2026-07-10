import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Breadcrumb,
  Button,
  ConfirmDialog,
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
  useToast,
} from '@smartlight/ui';
import { formatVND } from '../lib/format';
import { productsApi } from '../lib/products-api';
import type {
  ListProductsAdminParams,
  ProductStatus,
  ProductSummary,
} from '../lib/types';

const statusOptions: Array<{ value: ProductStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Đang bán' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'ARCHIVED', label: 'Đã lưu trữ' },
  { value: 'OUT_OF_STOCK', label: 'Hết hàng' },
];

const variantForStatus = (s: ProductStatus) => {
  switch (s) {
    case 'ACTIVE':
      return 'success' as const;
    case 'DRAFT':
      return 'neutral' as const;
    case 'ARCHIVED':
      return 'warning' as const;
    case 'OUT_OF_STOCK':
      return 'danger' as const;
  }
};

/**
 * Admin Products list — full CRUD entry point.
 * - Server-side pagination, search, status filter.
 * - Bulk publish/unpublish + per-row delete with confirmation.
 */
export const ProductsPage = (): JSX.Element => {
  const { push } = useToast();

  const [params, setParams] = useState<ListProductsAdminParams>({
    page: 1,
    limit: 20,
    search: '',
    status: undefined,
  });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [items, setItems] = useState<ProductSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[]>([]);
  const [toDelete, setToDelete] = useState<ProductSummary | null>(null);
  const [busy, setBusy] = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await productsApi.listAdmin({
          ...params,
          search: debouncedSearch || undefined,
        });
        if (!cancelled) {
          setItems(result.items);
          setTotal(result.total);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Không thể tải danh sách sản phẩm',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, debouncedSearch]);

  const pageCount = Math.max(1, Math.ceil(total / (params.limit ?? 20)));

  const handleDelete = async (): Promise<void> => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await productsApi.remove(toDelete.id);
      push({ variant: 'success', title: 'Đã xoá sản phẩm' });
      setToDelete(null);
      setParams((p) => ({ ...p, page: 1 }));
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi',
        description: e instanceof Error ? e.message : 'Xoá thất bại',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePublish = async (row: ProductSummary): Promise<void> => {
    setBusy(true);
    try {
      if (row.status === 'ACTIVE') {
        await productsApi.unpublish(row.id);
        push({ variant: 'success', title: 'Đã ẩn sản phẩm' });
      } else {
        await productsApi.publish(row.id);
        push({ variant: 'success', title: 'Đã đăng sản phẩm' });
      }
      setParams((p) => ({ ...p }));
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi',
        description: e instanceof Error ? e.message : 'Không thể thay đổi trạng thái',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleBulkPublish = async (publish: boolean): Promise<void> => {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      if (publish) {
        await productsApi.bulkPublish(selected);
        push({ variant: 'success', title: `Đã đăng ${selected.length} sản phẩm` });
      } else {
        await productsApi.bulkUnpublish(selected);
        push({ variant: 'success', title: `Đã ẩn ${selected.length} sản phẩm` });
      }
      setSelected([]);
      setParams((p) => ({ ...p }));
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi',
        description: e instanceof Error ? e.message : 'Không thể cập nhật',
      });
    } finally {
      setBusy(false);
    }
  };

  const toggleAll = (): void => {
    if (selected.length === items.length) {
      setSelected([]);
    } else {
      setSelected(items.map((i) => i.id));
    }
  };

  return (
    <section className="container-page py-6">
      <Breadcrumb
        items={[{ label: 'Admin', href: '/' }, { label: 'Sản phẩm' }]}
        className="mb-3"
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Sản phẩm</h1>
          <p className="text-sm text-neutral-500">
            Quản lý catalog, biến thể và hình ảnh
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selected.length > 0 && (
            <>
              <Badge variant="info">{selected.length} đã chọn</Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void handleBulkPublish(true)}
                isLoading={busy}
              >
                Đăng hàng loạt
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void handleBulkPublish(false)}
                isLoading={busy}
              >
                Ẩn hàng loạt
              </Button>
            </>
          )}
          <Link to="/products/create">
            <Button>+ Thêm sản phẩm</Button>
          </Link>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 rounded-md border border-neutral-200 bg-white p-3 sm:grid-cols-3">
        <Input
          placeholder="Tìm theo tên, slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={params.status ?? ''}
          onChange={(e) =>
            setParams((p) => ({
              ...p,
              page: 1,
              status: (e.target.value || undefined) as ProductStatus | undefined,
            }))
          }
        >
          <option value="">Tất cả trạng thái</option>
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select
          value={String(params.limit ?? 20)}
          onChange={(e) =>
            setParams((p) => ({
              ...p,
              page: 1,
              limit: Number(e.target.value),
            }))
          }
        >
          <option value="10">10 / trang</option>
          <option value="20">20 / trang</option>
          <option value="50">50 / trang</option>
          <option value="100">100 / trang</option>
        </Select>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <DataTable stickyHeader>
        <DataTableHead>
          <DataTableRow density="compact">
            <DataTableHeaderCell className="w-10">
              <input
                type="checkbox"
                aria-label="Chọn tất cả"
                checked={items.length > 0 && selected.length === items.length}
                onChange={toggleAll}
              />
            </DataTableHeaderCell>
            <DataTableHeaderCell>Sản phẩm</DataTableHeaderCell>
            <DataTableHeaderCell>Danh mục</DataTableHeaderCell>
            <DataTableHeaderCell>Giá</DataTableHeaderCell>
            <DataTableHeaderCell>Biến thể</DataTableHeaderCell>
            <DataTableHeaderCell>Trạng thái</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Hành động</DataTableHeaderCell>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableRow>
              <DataTableCell colSpan={7} className="text-center">
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              </DataTableCell>
            </DataTableRow>
          ) : items.length === 0 ? (
            <DataTableRow>
              <DataTableCell colSpan={7}>
                <EmptyState
                  title="Chưa có sản phẩm"
                  description="Tạo sản phẩm đầu tiên của bạn."
                  action={
                    <Link to="/products/create">
                      <Button>+ Thêm sản phẩm</Button>
                    </Link>
                  }
                />
              </DataTableCell>
            </DataTableRow>
          ) : (
            items.map((row) => (
              <DataTableRow key={row.id}>
                <DataTableCell density="compact">
                  <input
                    type="checkbox"
                    aria-label={`Chọn ${row.name}`}
                    checked={selected.includes(row.id)}
                    onChange={() =>
                      setSelected((s) =>
                        s.includes(row.id)
                          ? s.filter((x) => x !== row.id)
                          : [...s, row.id],
                      )
                    }
                  />
                </DataTableCell>
                <DataTableCell>
                  <div className="flex flex-col">
                    <Link
                      to={`/products/${row.id}`}
                      className="font-medium text-neutral-900 hover:text-smart-700 hover:underline"
                    >
                      {row.name}
                    </Link>
                    <span className="text-xs text-neutral-500">{row.slug}</span>
                  </div>
                </DataTableCell>
                <DataTableCell>
                  <span className="text-sm text-neutral-600">
                    {row.category?.name ?? '—'}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <span className="text-sm tabular-nums">
                    {formatVND(row.priceFrom?.amount ?? 0)}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <span className="text-sm">{row.variantCount}</span>
                </DataTableCell>
                <DataTableCell>
                  <StatusPill
                    status={row.status}
                    variant={variantForStatus(row.status)}
                  />
                </DataTableCell>
                <DataTableCell className="text-right">
                  <div className="inline-flex gap-2">
                    <Link to={`/products/${row.id}`}>
                      <Button size="sm" variant="ghost">
                        Xem
                      </Button>
                    </Link>
                    <Link to={`/products/${row.id}/edit`}>
                      <Button size="sm" variant="ghost">
                        Sửa
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleTogglePublish(row)}
                      isLoading={busy}
                    >
                      {row.status === 'ACTIVE' ? 'Ẩn' : 'Đăng'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setToDelete(row)}
                    >
                      Xoá
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-neutral-500">
          {total > 0
            ? `Hiển thị ${items.length} / ${total} sản phẩm`
            : 'Không có sản phẩm'}
        </span>
        {pageCount > 1 && (
          <Pagination
            page={params.page ?? 1}
            totalPages={pageCount}
            onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
          />
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => void handleDelete()}
        title="Xoá sản phẩm"
        description={
          toDelete
            ? `Sản phẩm "${toDelete.name}" sẽ bị xoá. Bạn có chắc chắn?`
            : ''
        }
        confirmText="Xoá"
        variant="danger"
        isLoading={busy}
      />
    </section>
  );
};
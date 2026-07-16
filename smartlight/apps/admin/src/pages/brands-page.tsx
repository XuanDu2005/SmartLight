import { useEffect, useState } from 'react';
import {
  Breadcrumb,
  Button,
  ConfirmDialog,
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
  Spinner,
  StatusPill,
  Textarea,
  useToast,
} from '@smartlight/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { brandsApi } from '../lib/brands-api';
import type { Brand, CreateBrandDto, UpdateBrandDto } from '../lib/types';

const brandSchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean(),
});
type BrandFormValues = z.infer<typeof brandSchema>;

interface DrawerState {
  open: boolean;
  mode: 'create' | 'edit';
  brand: Brand | null;
}

export const BrandsPage = (): JSX.Element => {
  const { push } = useToast();

  const [items, setItems] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<DrawerState>({
    open: false,
    mode: 'create',
    brand: null,
  });
  const [toDelete, setToDelete] = useState<Brand | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const reload = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await brandsApi.list({
        page,
        limit,
        search: debounced || undefined,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi tải thương hiệu',
        description: e instanceof Error ? e.message : '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, debounced]);

  const handleDelete = async (): Promise<void> => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await brandsApi.remove(toDelete.id);
      push({ variant: 'success', title: 'Đã xoá thương hiệu' });
      setToDelete(null);
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

  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <section className="container-page py-6">
      <Breadcrumb
        items={[{ label: 'Admin', href: '/' }, { label: 'Thương hiệu' }]}
        className="mb-3"
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Thương hiệu</h1>
          <p className="text-sm text-neutral-500">
            Quản lý các thương hiệu sản phẩm
          </p>
        </div>
        <Button onClick={() => setDrawer({ open: true, mode: 'create', brand: null })}>
          + Thêm thương hiệu
        </Button>
      </div>

      <div className="mb-3">
        <Input
          placeholder="Tìm thương hiệu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable stickyHeader>
        <DataTableHead>
          <DataTableRow density="compact">
            <DataTableHeaderCell>Logo</DataTableHeaderCell>
            <DataTableHeaderCell>Tên</DataTableHeaderCell>
            <DataTableHeaderCell>Slug</DataTableHeaderCell>
            <DataTableHeaderCell>Trạng thái</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Hành động</DataTableHeaderCell>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableRow>
              <DataTableCell colSpan={5} className="text-center">
                <Spinner />
              </DataTableCell>
            </DataTableRow>
          ) : items.length === 0 ? (
            <DataTableRow>
              <DataTableCell colSpan={5}>
                <EmptyState title="Chưa có thương hiệu" />
              </DataTableCell>
            </DataTableRow>
          ) : (
            items.map((b) => (
              <DataTableRow key={b.id}>
                <DataTableCell>
                  {b.logoUrl ? (
                    <img
                      src={b.logoUrl}
                      alt={b.name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-neutral-200 text-xs text-neutral-500">
                      {b.name.charAt(0)}
                    </div>
                  )}
                </DataTableCell>
                <DataTableCell className="font-medium">{b.name}</DataTableCell>
                <DataTableCell>
                  <code className="text-xs">{b.slug}</code>
                </DataTableCell>
                <DataTableCell>
                  <StatusPill
                    status={b.isActive ? 'ACTIVE' : 'INACTIVE'}
                    variant={b.isActive ? 'success' : 'neutral'}
                  />
                </DataTableCell>
                <DataTableCell className="text-right">
                  <div className="inline-flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDrawer({ open: true, mode: 'edit', brand: b })
                      }
                    >
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setToDelete(b)}
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
          Tổng: {total} thương hiệu
        </span>
        {pageCount > 1 && (
          <Pagination
            page={page}
            totalPages={pageCount}
            onPageChange={setPage}
          />
        )}
      </div>

      <BrandDrawer
        state={drawer}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        onSaved={async () => {
          setDrawer((d) => ({ ...d, open: false }));
          await reload();
        }}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => void handleDelete()}
        title="Xoá thương hiệu"
        description={
          toDelete
            ? `Thương hiệu "${toDelete.name}" sẽ bị xoá.`
            : ''
        }
        confirmText="Xoá"
        variant="danger"
        isLoading={busy}
      />
    </section>
  );
};

interface BrandDrawerProps {
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}
const BrandDrawer = ({ state, onClose, onSaved }: BrandDrawerProps): JSX.Element | null => {
  const { push } = useToast();
  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      logoUrl: '',
      isActive: true,
    },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!state.open) return;
    if (state.mode === 'edit' && state.brand) {
      form.reset({
        name: state.brand.name,
        slug: state.brand.slug,
        description: state.brand.description ?? '',
        logoUrl: state.brand.logoUrl ?? '',
        isActive: state.brand.isActive ?? true,
      });
    } else {
      form.reset({
        name: '',
        slug: '',
        description: '',
        logoUrl: '',
        isActive: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.mode, state.brand]);

  if (!state.open) return null;

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    try {
      const base = {
        name: values.name,
        slug: values.slug || undefined,
        description: values.description || undefined,
        isActive: values.isActive,
      };
      if (state.mode === 'create') {
        await brandsApi.create(base as CreateBrandDto);
        push({ variant: 'success', title: 'Đã tạo thương hiệu' });
      } else if (state.brand) {
        await brandsApi.update(state.brand.id, base as UpdateBrandDto);
        push({ variant: 'success', title: 'Đã cập nhật thương hiệu' });
      }
      await onSaved();
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi',
        description: e instanceof Error ? e.message : '',
      });
    } finally {
      setSaving(false);
    }
  });

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={state.mode === 'create' ? 'Thêm thương hiệu' : 'Chỉnh sửa thương hiệu'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={onSubmit} isLoading={saving}>
            Lưu
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <FormField label="Tên" required error={form.formState.errors.name?.message}>
          <Input {...form.register('name')} />
        </FormField>
        <FormField label="Slug" hint="Để trống sẽ tự sinh">
          <Input {...form.register('slug')} />
        </FormField>
        <FormField label="Logo URL">
          <Input {...form.register('logoUrl')} placeholder="https://..." />
        </FormField>
        <FormField label="Mô tả">
          <Textarea {...form.register('description')} rows={3} />
        </FormField>
        <FormField label="Trạng thái">
          <Select {...form.register('isActive', { setValueAs: (v) => v === 'true' || v === true })}>
            <option value="true">Đang hoạt động</option>
            <option value="false">Ngừng</option>
          </Select>
        </FormField>
      </form>
    </Drawer>
  );
};
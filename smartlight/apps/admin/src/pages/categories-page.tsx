import { useEffect, useMemo, useState } from 'react';
import {
  Breadcrumb,
  Button,
  Card,
  CardBody,
  CardHeader,
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
  Select,
  Spinner,
  StatusPill,
  Textarea,
  useToast,
} from '@smartlight/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { categoriesApi } from '../lib/categories-api';
import { ApiError } from '../lib/api-client';
import type {
  Category,
  CategoryTreeNode,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../lib/types';

const categorySchema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
  slug: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  position: z.coerce.number().optional(),
  isActive: z.boolean(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface DrawerState {
  open: boolean;
  mode: 'create' | 'edit';
  category: Category | null;
}

export const CategoriesPage = (): JSX.Element => {
  const { push } = useToast();

  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [flat, setFlat] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<DrawerState>({
    open: false,
    mode: 'create',
    category: null,
  });
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async (): Promise<void> => {
    setLoading(true);
    try {
      const [treeData, flatData] = await Promise.all([
        categoriesApi.tree(),
        categoriesApi.listPublic({ limit: 100 }),
      ]);
      setTree(treeData);
      setFlat(flatData.items);
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi tải danh mục',
        description: e instanceof Error ? e.message : '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!search) return flat;
    const q = search.toLowerCase();
    return flat.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    );
  }, [flat, search]);

  const handleDelete = async (): Promise<void> => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await categoriesApi.remove(toDelete.id);
      push({ variant: 'success', title: 'Đã xoá danh mục' });
      setToDelete(null);
      await reload();
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

  return (
    <section className="container-page py-6">
      <Breadcrumb
        items={[{ label: 'Admin', href: '/' }, { label: 'Danh mục' }]}
        className="mb-3"
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Danh mục</h1>
          <p className="text-sm text-neutral-500">
            Quản lý cây phân cấp danh mục sản phẩm
          </p>
        </div>
        <Button onClick={() => setDrawer({ open: true, mode: 'create', category: null })}>
          + Thêm danh mục
        </Button>
      </div>

      <div className="mb-3">
        <Input
          placeholder="Tìm danh mục…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="font-semibold">Cây danh mục</h2>
          </CardHeader>
          <CardBody className="text-sm">
            {loading ? (
              <Spinner />
            ) : tree.length === 0 ? (
              <p className="text-neutral-500">Chưa có danh mục.</p>
            ) : (
              <CategoryTreeView
                nodes={tree}
                onSelect={(c) =>
                  setDrawer({ open: true, mode: 'edit', category: c })
                }
              />
            )}
          </CardBody>
        </Card>
        <div className="lg:col-span-2">
          <DataTable stickyHeader>
            <DataTableHead>
              <DataTableRow density="compact">
                <DataTableHeaderCell>Tên</DataTableHeaderCell>
                <DataTableHeaderCell>Slug</DataTableHeaderCell>
                <DataTableHeaderCell>Thứ tự</DataTableHeaderCell>
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
              ) : filtered.length === 0 ? (
                <DataTableRow>
                  <DataTableCell colSpan={5}>
                    <EmptyState
                      title="Chưa có danh mục"
                      description="Tạo danh mục đầu tiên."
                    />
                  </DataTableCell>
                </DataTableRow>
              ) : (
                filtered.map((c) => (
                  <DataTableRow key={c.id}>
                    <DataTableCell>{c.name}</DataTableCell>
                    <DataTableCell>
                      <code className="text-xs">{c.slug}</code>
                    </DataTableCell>
                    <DataTableCell>{c.displayOrder}</DataTableCell>
                    <DataTableCell>
                      <StatusPill
                        status={c.isActive ? 'ACTIVE' : 'INACTIVE'}
                        variant={c.isActive ? 'success' : 'neutral'}
                      />
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setDrawer({ open: true, mode: 'edit', category: c })
                          }
                        >
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setToDelete(c)}
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
        </div>
      </div>

      <CategoryDrawer
        state={drawer}
        categories={flat}
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
        title="Xoá danh mục"
        description={
          toDelete
            ? `Danh mục "${toDelete.name}" sẽ bị xoá. Thao tác này không thể hoàn tác.`
            : ''
        }
        confirmText="Xoá"
        variant="danger"
        isLoading={busy}
      />
    </section>
  );
};

// ============================================================================
//  Tree view (inline recursive component)
// ============================================================================

interface TreeViewProps {
  nodes: CategoryTreeNode[];
  depth?: number;
  onSelect: (c: Category) => void;
}
const CategoryTreeView = ({ nodes, depth = 0, onSelect }: TreeViewProps): JSX.Element => (
  <ul className="space-y-1">
    {nodes.map((n) => (
      <li key={n.id}>
        <button
          type="button"
          onClick={() => onSelect(n)}
          className="flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-neutral-100"
          style={{ paddingLeft: depth * 16 + 8 }}
        >
          <span>{n.name}</span>
          <span className="text-xs text-neutral-400">{n.slug}</span>
        </button>
        {n.children?.length > 0 && (
          <CategoryTreeView nodes={n.children} depth={depth + 1} onSelect={onSelect} />
        )}
      </li>
    ))}
  </ul>
);

// ============================================================================
//  Create / edit drawer
// ============================================================================

interface CategoryDrawerProps {
  state: DrawerState;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}
const CategoryDrawer = ({
  state,
  categories,
  onClose,
  onSaved,
}: CategoryDrawerProps): JSX.Element | null => {
  const { push } = useToast();
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      parentId: '',
      position: 0,
      isActive: true,
      imageUrl: '',
      metaTitle: '',
      metaDescription: '',
    },
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!state.open) return;
    if (state.mode === 'edit' && state.category) {
      const c = state.category;
      form.reset({
        name: c.name,
        slug: c.slug,
        description: c.description ?? '',
        parentId: c.parentId ?? '',
        position: c.displayOrder ?? 0,
        isActive: c.isActive ?? true,
        imageUrl: c.imageUrl ?? '',
        metaTitle: c.metaTitle ?? '',
        metaDescription: c.metaDesc ?? '',
      });
    } else {
      form.reset({
        name: '',
        slug: '',
        description: '',
        parentId: '',
        position: 0,
        isActive: true,
        imageUrl: '',
        metaTitle: '',
        metaDescription: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.mode, state.category]);

  if (!state.open) return null;

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    try {
      // Translate form values (UX-friendly names) into the API DTO
      // (`displayOrder`, `isActive`, `metaDesc`). `parentId` is accepted
      // in create but NOT in update — the backend UpdateCategoryDto has no
      // such field, so omitting it here avoids 400 "property parentId should not exist".
      const payload = {
        name: values.name,
        slug: values.slug || undefined,
        description: values.description || undefined,
        displayOrder: values.position ?? 0,
        isActive: values.isActive,
        imageUrl: values.imageUrl || undefined,
        metaTitle: values.metaTitle || undefined,
        metaDesc: values.metaDescription || undefined,
      };
      if (state.mode === 'create') {
        await categoriesApi.create(payload as CreateCategoryDto);
        push({ variant: 'success', title: 'Đã tạo danh mục' });
      } else if (state.category) {
        await categoriesApi.update(state.category.id, payload as UpdateCategoryDto);
        push({ variant: 'success', title: 'Đã cập nhật danh mục' });
      }
      await onSaved();
    } catch (e) {
      // Surface server-side validation details (e.g. "property X should
      // not exist", "slug already exists") instead of a generic "Lỗi"
      // toast. The envelope's `fieldErrors` array carries the granular
      // reasons so the admin knows what to fix.
      let title = 'Lỗi';
      let description = 'Không thể lưu';
      if (e instanceof ApiError) {
        description = e.message;
        const fieldErrors = (e as ApiError & { fieldErrors?: Array<{ message: string }> }).fieldErrors;
        if (fieldErrors && fieldErrors.length > 0) {
          description = fieldErrors.map((f) => f.message).join(' • ');
        }
        if (e.httpStatus === 400) {
          title = 'Dữ liệu chưa hợp lệ';
        } else if (e.httpStatus === 409) {
          title = 'Xung đột dữ liệu';
        }
      } else if (e instanceof Error) {
        description = e.message;
      }
      push({ variant: 'error', title, description });
    } finally {
      setSaving(false);
    }
  });

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={state.mode === 'create' ? 'Thêm danh mục' : 'Chỉnh sửa danh mục'}
      size="lg"
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
        <FormField label="Slug" hint="Để trống sẽ tự sinh từ tên">
          <Input {...form.register('slug')} />
        </FormField>
        <FormField label="Mô tả">
          <Textarea {...form.register('description')} rows={2} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Danh mục cha">
            <Select {...form.register('parentId')}>
              <option value="">— Gốc —</option>
              {categories
                .filter((c) => c.id !== state.category?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </FormField>
          <FormField label="Thứ tự">
            <Input type="number" {...form.register('position')} />
          </FormField>
        </div>
        <FormField label="Trạng thái">
          <Select {...form.register('isActive', { setValueAs: (v) => v === 'true' || v === true })}>
            <option value="true">Đang hoạt động</option>
            <option value="false">Ngừng</option>
          </Select>
        </FormField>
        <FormField label="Ảnh đại diện (URL)">
          <Input {...form.register('imageUrl')} />
        </FormField>
        <FormField label="Meta title">
          <Input {...form.register('metaTitle')} />
        </FormField>
        <FormField label="Meta description">
          <Textarea {...form.register('metaDescription')} rows={2} />
        </FormField>
      </form>
    </Drawer>
  );
};
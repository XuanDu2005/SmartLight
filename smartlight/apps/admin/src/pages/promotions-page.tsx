import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
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
import { promotionsApi } from '../lib/promotions-api';
import type {
  CreatePromotionDto,
  CreateVoucherDto,
  Promotion,
  PromotionStatus,
  PromotionType,
  UpdatePromotionDto,
  Voucher,
} from '../lib/types';

const promotionSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.enum([
    'PERCENT_OFF',
    'AMOUNT_OFF',
    'BUY_X_GET_Y',
    'FREE_SHIPPING',
  ]),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']),
  priority: z.coerce.number().int().min(0),
  startsAt: z.string().min(1, 'Bắt buộc'),
  endsAt: z.string().min(1, 'Bắt buộc'),
  minimumOrderAmount: z.coerce.number().optional(),
  maximumDiscountAmount: z.coerce.number().optional(),
  usageLimit: z.coerce.number().int().optional(),
  perUserLimit: z.coerce.number().int().optional(),
  discountValue: z.coerce.number().optional(),
});
type PromotionFormValues = z.infer<typeof promotionSchema>;

const voucherSchema = z.object({
  promotionId: z.string().min(1),
  code: z
    .string()
    .min(3, 'Mã tối thiểu 3 ký tự')
    .regex(/^[A-Z0-9_-]+$/, 'Mã chỉ gồm chữ in hoa, số, _ và -'),
  startsAt: z.string().min(1),
  expiresAt: z.string().min(1),
  maxRedemptions: z.coerce.number().int().optional(),
});
type VoucherFormValues = z.infer<typeof voucherSchema>;

const typeLabels: Record<PromotionType, string> = {
  PERCENT_OFF: 'Giảm %',
  AMOUNT_OFF: 'Giảm tiền',
  BUY_X_GET_Y: 'Mua X tặng Y',
  FREE_SHIPPING: 'Miễn phí vận chuyển',
};

const statusVariant = (s: PromotionStatus) => {
  switch (s) {
    case 'ACTIVE':
      return 'success' as const;
    case 'PAUSED':
      return 'warning' as const;
    case 'ARCHIVED':
      return 'neutral' as const;
    case 'DRAFT':
      return 'info' as const;
  }
};

export const PromotionsPage = (): JSX.Element => {
  const { push } = useToast();
  const [items, setItems] = useState<Promotion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    promotion: Promotion | null;
  }>({ open: false, mode: 'create', promotion: null });
  const [voucherDrawer, setVoucherDrawer] = useState<{
    open: boolean;
    promotion: Promotion | null;
  }>({ open: false, promotion: null });
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [toDelete, setToDelete] = useState<Promotion | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await promotionsApi.listAdmin({ page, limit });
      setItems(result.items);
      setTotal(result.total);
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi tải khuyến mãi',
        description: e instanceof Error ? e.message : '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const handleDelete = async (): Promise<void> => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await promotionsApi.remove(toDelete.id);
      push({ variant: 'success', title: 'Đã xoá khuyến mãi' });
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

  const handleTogglePublish = async (p: Promotion): Promise<void> => {
    setBusy(true);
    try {
      if (p.status === 'ACTIVE') {
        await promotionsApi.archive(p.id);
        push({ variant: 'success', title: 'Đã lưu trữ' });
      } else {
        await promotionsApi.publish(p.id);
        push({ variant: 'success', title: 'Đã đăng' });
      }
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

  const openVouchers = async (p: Promotion): Promise<void> => {
    setVoucherDrawer({ open: true, promotion: p });
    try {
      const result = await promotionsApi.listVouchers(p.id);
      setVouchers(result.items);
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi tải voucher',
        description: e instanceof Error ? e.message : '',
      });
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <section className="container-page py-6">
      <Breadcrumb
        items={[{ label: 'Admin', href: '/' }, { label: 'Khuyến mãi' }]}
        className="mb-3"
      />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Khuyến mãi</h1>
          <p className="text-sm text-neutral-500">
            Quản lý chương trình khuyến mãi và mã voucher
          </p>
        </div>
        <Button
          onClick={() =>
            setDrawer({ open: true, mode: 'create', promotion: null })
          }
        >
          + Thêm khuyến mãi
        </Button>
      </div>

      <DataTable stickyHeader>
        <DataTableHead>
          <DataTableRow density="compact">
            <DataTableHeaderCell>Tên</DataTableHeaderCell>
            <DataTableHeaderCell>Loại</DataTableHeaderCell>
            <DataTableHeaderCell>Ưu tiên</DataTableHeaderCell>
            <DataTableHeaderCell>Đã dùng</DataTableHeaderCell>
            <DataTableHeaderCell>Thời gian</DataTableHeaderCell>
            <DataTableHeaderCell>Trạng thái</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Hành động</DataTableHeaderCell>
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
                <EmptyState
                  title="Chưa có khuyến mãi"
                  action={
                    <Button
                      onClick={() =>
                        setDrawer({ open: true, mode: 'create', promotion: null })
                      }
                    >
                      + Tạo khuyến mãi
                    </Button>
                  }
                />
              </DataTableCell>
            </DataTableRow>
          ) : (
            items.map((p) => (
              <DataTableRow key={p.id}>
                <DataTableCell className="font-medium">{p.name}</DataTableCell>
                <DataTableCell>
                  <Badge variant="info">{typeLabels[p.type]}</Badge>
                </DataTableCell>
                <DataTableCell>{p.priority}</DataTableCell>
                <DataTableCell>
                  {p.usageCount}
                  {p.usageLimit ? ` / ${p.usageLimit}` : ''}
                </DataTableCell>
                <DataTableCell className="text-xs text-neutral-600">
                  {new Date(p.startsAt).toLocaleDateString('vi-VN')} →{' '}
                  {new Date(p.endsAt).toLocaleDateString('vi-VN')}
                </DataTableCell>
                <DataTableCell>
                  <StatusPill
                    status={p.status}
                    variant={statusVariant(p.status)}
                  />
                </DataTableCell>
                <DataTableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void openVouchers(p)}
                    >
                      Voucher
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDrawer({ open: true, mode: 'edit', promotion: p })
                      }
                    >
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleTogglePublish(p)}
                      isLoading={busy}
                    >
                      {p.status === 'ACTIVE' ? 'Lưu trữ' : 'Đăng'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setToDelete(p)}
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
        <span className="text-sm text-neutral-500">Tổng: {total}</span>
        {pageCount > 1 && (
          <Pagination
            page={page}
            totalPages={pageCount}
            onPageChange={setPage}
          />
        )}
      </div>

      <PromotionDrawer
        state={drawer}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        onSaved={async () => {
          setDrawer((d) => ({ ...d, open: false }));
          await reload();
        }}
      />

      <VoucherDrawer
        state={voucherDrawer}
        vouchers={vouchers}
        onClose={() => setVoucherDrawer({ open: false, promotion: null })}
        onChanged={async () => {
          if (voucherDrawer.promotion) {
            const result = await promotionsApi.listVouchers(
              voucherDrawer.promotion.id,
            );
            setVouchers(result.items);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => void handleDelete()}
        title="Xoá khuyến mãi"
        description={
          toDelete ? `Khuyến mãi "${toDelete.name}" sẽ bị xoá.` : ''
        }
        confirmText="Xoá"
        variant="danger"
        isLoading={busy}
      />
    </section>
  );
};

// ============================================================================
//  Promotion drawer
// ============================================================================

interface PromotionDrawerProps {
  state: { open: boolean; mode: 'create' | 'edit'; promotion: Promotion | null };
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

const PromotionDrawer = ({
  state,
  onClose,
  onSaved,
}: PromotionDrawerProps): JSX.Element | null => {
  const { push } = useToast();
  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'PERCENT_OFF',
      status: 'DRAFT',
      priority: 0,
      startsAt: '',
      endsAt: '',
    },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!state.open) return;
    if (state.mode === 'edit' && state.promotion) {
      const p = state.promotion;
      form.reset({
        name: p.name,
        description: p.description ?? '',
        type: p.type,
        status: p.status,
        priority: p.priority,
        startsAt: p.startsAt.slice(0, 16),
        endsAt: p.endsAt.slice(0, 16),
        minimumOrderAmount: p.minimumOrderAmount?.amount,
        maximumDiscountAmount: p.maximumDiscountAmount?.amount,
        usageLimit: p.usageLimit ?? undefined,
        perUserLimit: p.perUserLimit ?? undefined,
        discountValue: undefined,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        type: 'PERCENT_OFF',
        status: 'DRAFT',
        priority: 0,
        startsAt: '',
        endsAt: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.mode, state.promotion]);

  if (!state.open) return null;

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    try {
      const base = {
        name: values.name,
        description: values.description || undefined,
        type: values.type,
        status: values.status,
        priority: values.priority,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        minimumOrderAmount: values.minimumOrderAmount,
        maximumDiscountAmount: values.maximumDiscountAmount,
        usageLimit: values.usageLimit,
        perUserLimit: values.perUserLimit,
        discountValue: values.discountValue,
      };
      if (state.mode === 'create') {
        await promotionsApi.create(base as CreatePromotionDto);
        push({ variant: 'success', title: 'Đã tạo khuyến mãi' });
      } else if (state.promotion) {
        await promotionsApi.update(
          state.promotion.id,
          base as UpdatePromotionDto,
        );
        push({ variant: 'success', title: 'Đã cập nhật khuyến mãi' });
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
      title={state.mode === 'create' ? 'Thêm khuyến mãi' : 'Chỉnh sửa khuyến mãi'}
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
        <FormField label="Mô tả">
          <Textarea {...form.register('description')} rows={2} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Loại">
            <Select {...form.register('type')}>
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Trạng thái">
            <Select {...form.register('status')}>
              <option value="DRAFT">Nháp</option>
              <option value="ACTIVE">Đang chạy</option>
              <option value="PAUSED">Tạm dừng</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </Select>
          </FormField>
          <FormField label="Ưu tiên">
            <Input type="number" {...form.register('priority')} />
          </FormField>
          <FormField label="Giá trị giảm (%) hoặc (VND)">
            <Input
              type="number"
              {...form.register('discountValue')}
              placeholder="10 hoặc 50000"
            />
          </FormField>
          <FormField label="Bắt đầu" required>
            <Input type="datetime-local" {...form.register('startsAt')} />
          </FormField>
          <FormField label="Kết thúc" required>
            <Input type="datetime-local" {...form.register('endsAt')} />
          </FormField>
          <FormField label="Đơn tối thiểu (VND)">
            <Input type="number" {...form.register('minimumOrderAmount')} />
          </FormField>
          <FormField label="Giảm tối đa (VND)">
            <Input type="number" {...form.register('maximumDiscountAmount')} />
          </FormField>
          <FormField label="Tổng lượt dùng">
            <Input type="number" {...form.register('usageLimit')} />
          </FormField>
          <FormField label="Lượt dùng / user">
            <Input type="number" {...form.register('perUserLimit')} />
          </FormField>
        </div>
      </form>
    </Drawer>
  );
};

// ============================================================================
//  Voucher drawer
// ============================================================================

interface VoucherDrawerProps {
  state: { open: boolean; promotion: Promotion | null };
  vouchers: Voucher[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}

const VoucherDrawer = ({
  state,
  vouchers,
  onClose,
  onChanged,
}: VoucherDrawerProps): JSX.Element | null => {
  const { push } = useToast();
  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      promotionId: '',
      code: '',
      startsAt: '',
      expiresAt: '',
    },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state.open && state.promotion) {
      form.reset({
        promotionId: state.promotion.id,
        code: '',
        startsAt: '',
        expiresAt: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.promotion]);

  if (!state.open || !state.promotion) return null;

  const handleCreate = form.handleSubmit(async (values) => {
    setSaving(true);
    try {
      await promotionsApi.createVoucher({
        promotionId: values.promotionId,
        code: values.code,
        startsAt: new Date(values.startsAt).toISOString(),
        expiresAt: new Date(values.expiresAt).toISOString(),
        maxRedemptions: values.maxRedemptions,
      } as CreateVoucherDto);
      push({ variant: 'success', title: 'Đã tạo voucher' });
      form.reset({
        promotionId: state.promotion!.id,
        code: '',
        startsAt: '',
        expiresAt: '',
      });
      await onChanged();
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

  const handleToggle = async (v: Voucher): Promise<void> => {
    setSaving(true);
    try {
      await promotionsApi.updateVoucher(v.id, {
        status: v.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
      });
      push({ variant: 'success', title: 'Đã cập nhật voucher' });
      await onChanged();
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi',
        description: e instanceof Error ? e.message : '',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    setSaving(true);
    try {
      await promotionsApi.removeVoucher(id);
      push({ variant: 'success', title: 'Đã xoá voucher' });
      await onChanged();
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi',
        description: e instanceof Error ? e.message : '',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={`Voucher: ${state.promotion.name}`}
      size="lg"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <Card className="mb-4">
        <CardHeader>
          <h3 className="text-sm font-semibold">Tạo voucher mới</h3>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <FormField label="Mã voucher" required>
              <Input
                {...form.register('code')}
                placeholder="WELCOME10"
                className="font-mono uppercase"
              />
            </FormField>
            <FormField label="Tổng lượt dùng">
              <Input type="number" {...form.register('maxRedemptions')} />
            </FormField>
            <FormField label="Bắt đầu" required>
              <Input type="datetime-local" {...form.register('startsAt')} />
            </FormField>
            <FormField label="Hết hạn" required>
              <Input type="datetime-local" {...form.register('expiresAt')} />
            </FormField>
            <div className="col-span-2 flex justify-end">
              <Button type="submit" isLoading={saving}>
                + Tạo voucher
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold">
            Danh sách ({vouchers.length})
          </h3>
        </CardHeader>
        <CardBody>
          {vouchers.length === 0 ? (
            <EmptyState title="Chưa có voucher" />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-2 py-2 text-left">Mã</th>
                  <th className="px-2 py-2 text-left">Trạng thái</th>
                  <th className="px-2 py-2 text-left">Hết hạn</th>
                  <th className="px-2 py-2 text-right">Đã dùng</th>
                  <th className="px-2 py-2 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr key={v.id} className="border-t border-neutral-100">
                    <td className="px-2 py-2 font-mono font-medium">{v.code}</td>
                    <td className="px-2 py-2">
                      <StatusPill
                        status={v.status}
                        variant={v.status === 'ACTIVE' ? 'success' : 'neutral'}
                      />
                    </td>
                    <td className="px-2 py-2 text-xs text-neutral-600">
                      {new Date(v.expiresAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {v.redeemedCount}
                      {v.maxRedemptions ? ` / ${v.maxRedemptions}` : ''}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleToggle(v)}
                        >
                          {v.status === 'ACTIVE' ? 'Tắt' : 'Bật'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleDelete(v.id)}
                        >
                          Xoá
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </Drawer>
  );
};
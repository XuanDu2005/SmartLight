import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Breadcrumb,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  FormField,
  Input,
  Select,
  Spinner,
  Tabs,
  Textarea,
  cn,
  useToast,
} from '@smartlight/ui';
import { categoriesApi } from '../lib/categories-api';
import { brandsApi } from '../lib/brands-api';
import { productsApi } from '../lib/products-api';
import { ApiError } from '../lib/api-client';
import type { Category, Brand } from '../lib/types';

const variantSchema = z.object({
  // Persisted backend id when editing — used to detect create vs update
  // vs delete when syncing variants on save.
  id: z.string().optional(),
  sku: z.string().min(2, 'SKU tối thiểu 2 ký tự'),
  // Variant DTO requires a `name` field (used for display), so default it
  // to the SKU when the user doesn't enter one — the original form only
  // collected color/size and the backend rejected it with 400.
  name: z.string().optional(),
  price: z.coerce.number().min(0, 'Giá phải ≥ 0'),
  compareAtPrice: z.coerce.number().optional(),
  cost: z.coerce.number().optional(),
  barcode: z.string().optional(),
  weightGrams: z.coerce.number().optional(),
  lengthMm: z.coerce.number().optional(),
  widthMm: z.coerce.number().optional(),
  heightMm: z.coerce.number().optional(),
});

const imageSchema = z.object({
  url: z.string().url('URL không hợp lệ'),
  alt: z.string().optional(),
  isThumbnail: z.boolean().optional(),
  isVideo: z.boolean().optional(),
});

const productSchema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug chỉ gồm chữ thường, số và dấu -')
    .optional()
    .or(z.literal('')),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  brandId: z.string().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  isFeatured: z.boolean(),
  isNewArrival: z.boolean().optional(),
  basePrice: z.coerce.number().min(0).optional(),
  metaTitle: z.string().optional(),
  metaKeywords: z.string().optional(),
  variants: z.array(variantSchema).min(1, 'Cần ít nhất 1 biến thể'),
});

type ProductFormValues = z.infer<typeof productSchema>;

const slugify = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

interface ProductFormPageProps {
  mode: 'create' | 'edit';
}

/**
 * Combined Create/Edit product form.
 *
 * Tabs: Thông tin chung | Biến thể | Hình ảnh | SEO
 */
export const ProductFormPage = ({ mode }: ProductFormPageProps): JSX.Element => {
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { push } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
      shortDescription: '',
      description: '',
      categoryId: '',
      brandId: '',
      status: 'DRAFT',
      isFeatured: false,
      isNewArrival: false,
      basePrice: 0,
      metaTitle: '',
      metaKeywords: '',
      variants: [
        {
          sku: '',
          name: '',
          price: 0,
          compareAtPrice: undefined,
          cost: undefined,
          barcode: '',
          weightGrams: undefined,
          lengthMm: undefined,
          widthMm: undefined,
          heightMm: undefined,
        },
      ],
    },
  });

  const variants = useFieldArray({ control: form.control, name: 'variants' });

  // Auto-slug from name when slug is empty
  const name = form.watch('name');
  const slug = form.watch('slug');
  useEffect(() => {
    if (!slug && name) {
      form.setValue('slug', slugify(name), { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [cats, brs, prod] = await Promise.all([
          categoriesApi.listPublic({ limit: 100 }),
          brandsApi.listPublic({ limit: 100 }),
          mode === 'edit' && params.id
            ? productsApi.getAdmin(params.id)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setCategories(cats.items);
        setBrands(brs.items);
        if (mode === 'edit' && prod) {
          form.reset({
            name: prod.name,
            slug: prod.slug,
            shortDescription: prod.shortDescription ?? '',
            description: prod.description ?? '',
            categoryId: prod.category?.id ?? '',
            brandId: prod.brand?.id ?? '',
            status: prod.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
            isFeatured: prod.isFeatured,
            isNewArrival: prod.isNewArrival ?? false,
            basePrice: prod.basePrice,
            metaTitle: prod.metaTitle ?? '',
            metaKeywords: '',
            variants: prod.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              name: v.name ?? v.sku,
              price: v.price,
              compareAtPrice: v.compareAtPrice ?? undefined,
              cost: undefined,
              barcode: v.barcode ?? '',
              weightGrams: v.weightGrams ?? undefined,
              lengthMm: undefined,
              widthMm: undefined,
              heightMm: undefined,
            })),
          });
        }
      } catch (e) {
        push({
          variant: 'error',
          title: 'Lỗi tải dữ liệu',
          description: e instanceof Error ? e.message : 'Không xác định',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, params.id]);

  // Helper: format an error (especially ApiError with fieldErrors) into
  // a human-readable string for the toast.
  const formatServerError = (e: unknown): string => {
    if (e instanceof ApiError) {
      const fieldErrors = (e as ApiError & { fieldErrors?: Array<{ message: string }> }).fieldErrors;
      if (fieldErrors && fieldErrors.length > 0) {
        return fieldErrors.map((f) => f.message).join(' • ');
      }
      return e.message;
    }
    return e instanceof Error ? e.message : 'Vui lòng thử lại';
  };

  // Helper: if the server rejected our slug because it was already taken
  // and we haven't manually typed a different slug, append `-2`, `-3`, ...
  // and retry once. This saves the user from the loop of clicking "Tạo
  // sản phẩm" → "Slug already exists" → tweak slug → retry when they're
  // re-using a product name that's already in the catalog.
  const trySubmitWithUniqueSlug = async (
    basePayload: Record<string, unknown>,
  ): Promise<
    | { kind: 'success'; result: { id: string } }
    | { kind: 'conflict' }
    | { kind: 'other'; title: string; description: string }
  > => {
    const MAX_ATTEMPTS = 5;
    // Capture the form value at the moment of the first submit attempt.
    // After a retry updates the form slug to e.g. "en-led-2", we must NOT
    // treat that as a user-typed value — we only want to auto-suffix
    // slugs that came from the auto-generation logic.
    const originalFormSlug = form.getValues('slug')?.trim() ?? '';
    const isAutoSlug = (slug: string) => slug === originalFormSlug;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const result = await productsApi.create(basePayload as never);
        return { kind: 'success', result: { id: (result as unknown as { id: string }).id } };
      } catch (e) {
        if (e instanceof ApiError && e.httpStatus === 409) {
          const message = (e.message ?? '').toLowerCase();
          const isSlugConflict = message.includes('slug');
          if (!isSlugConflict || !isAutoSlug(basePayload.slug as string)) {
            return { kind: 'conflict' };
          }
          // Always build the suffix off the *original* slug, not the
          // last-failed one. Otherwise we'd get "en-led-2-3-4" and
          // quickly run past the 160-char slug limit.
          const newSlug = `${originalFormSlug}-${attempt + 2}`;
          basePayload.slug = newSlug;
          form.setValue('slug', newSlug, { shouldValidate: false });
          continue;
        }
        return {
          kind: 'other',
          title: 'Không thể lưu',
          description: formatServerError(e),
        };
      }
    }
    return { kind: 'conflict' };
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    try {
      // Backend `CreateProductDto` / `UpdateProductDto` field names diverge
      // from the form schema: `metaDescription` -> `metaDesc`, `images`
      // (URL-based) -> `imageMediaIds` (UUIDs), variants expect `name`
      // (no `color`/`size`/`status`), and `status` uses DRAFT/PUBLISHED/
      // ARCHIVED — not the storefront enum. Translate here so the
      // server doesn't 400.
      const tags = values.metaKeywords
        ? values.metaKeywords.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      // `UpdateProductDto` only carries scalar product fields — variants
      // and status live behind their own endpoints. Build two payloads:
      //   * `productPayload` — DTO-shaped (create: includes variants + status;
      //     update: only the scalar subset).
      //   * `variantPayloads` — only used for create; in update mode we
      //     reconcile variants individually below.
      const firstVariantPrice = values.variants[0]?.price;
      const productPayload: Record<string, unknown> = {
        name: values.name,
        slug: values.slug || undefined,
        shortDescription: values.shortDescription || undefined,
        description: values.description || undefined,
        categoryId: values.categoryId,
        brandId: values.brandId || undefined,
        status: values.status,
        isFeatured: values.isFeatured,
        isNewArrival: values.isNewArrival,
        metaTitle: values.metaTitle || undefined,
        metaDesc: undefined,
        tags,
        basePrice: values.basePrice ?? firstVariantPrice ?? 0,
      };

      if (mode === 'create') {
        productPayload.variants = values.variants.map((v) => ({
          sku: v.sku,
          name: v.name || v.sku,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          cost: v.cost,
          barcode: v.barcode || undefined,
          weightGrams: v.weightGrams,
          lengthMm: v.lengthMm,
          widthMm: v.widthMm,
          heightMm: v.heightMm,
        }));
        const result = await trySubmitWithUniqueSlug(productPayload);
        if (result.kind === 'success') {
          push({ variant: 'success', title: 'Đã tạo sản phẩm' });
          // The API returns the resource directly (envelope already
          // stripped by `productsApi.create`). Fall back to /products
          // if the response shape ever changes again so we never
          // navigate to `/products/undefined`.
          const newId = result.result.id ?? '';
          if (!newId) {
            push({
              variant: 'error',
              title: 'Tạo thành công nhưng không lấy được ID',
              description: 'Vui lòng mở danh sách sản phẩm để xem sản phẩm mới.',
            });
            navigate('/products');
          } else {
            navigate(`/products/${newId}`);
          }
        } else if (result.kind === 'conflict') {
          push({
            variant: 'error',
            title: 'Xung đột dữ liệu',
            description: 'Slug đã tồn tại — hãy đổi slug hoặc tên sản phẩm khác',
          });
        } else {
          push({ variant: 'error', title: result.title, description: result.description });
        }
        return;
      }

      if (mode === 'edit' && params.id) {
        // 1) PATCH the product scalars only. The backend's
        //    `UpdateProductDto` rejects `variants` / `images` with 400,
        //    so they MUST NOT be sent here — variants are reconciled
        //    through their own endpoints below.
        const updatedProduct = await productsApi.update(params.id, productPayload as never);

        // 2) Reconcile variants: diff the form state against the
        //    variants that came back from the server. Variants without
        //    an `id` are new (POST), with an id are updates (PATCH),
        //    and ids missing from the form are deletes (DELETE).
        const originalIds = new Set(
          (updatedProduct.variants ?? []).map((v) => v.id),
        );
        const keptIds = new Set<string>();
        for (const v of values.variants) {
          const body = {
            sku: v.sku,
            name: v.name || v.sku,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            cost: v.cost,
            barcode: v.barcode || undefined,
            weightGrams: v.weightGrams,
            lengthMm: v.lengthMm,
            widthMm: v.widthMm,
            heightMm: v.heightMm,
          };
          if (v.id) {
            keptIds.add(v.id);
            await productsApi.updateVariant(params.id, v.id, body as never);
          } else {
            await productsApi.createVariant(params.id, body as never);
          }
        }
        // Delete variants the user removed from the form.
        for (const originalId of originalIds) {
          if (!keptIds.has(originalId)) {
            await productsApi.deleteVariant(params.id, originalId);
          }
        }

        push({ variant: 'success', title: 'Đã cập nhật sản phẩm' });
        window.location.href = `/products/${params.id}`;
      }
    } catch (e) {
      // Surface validation details (e.g. "name should not be empty",
      // "categoryId must be a UUID") instead of an opaque "Lỗi" toast.
      let title = 'Không thể lưu';
      let description = 'Vui lòng thử lại';
      if (e instanceof ApiError) {
        description = e.message;
        const fieldErrors = (e as ApiError & { fieldErrors?: Array<{ message: string }> }).fieldErrors;
        if (fieldErrors && fieldErrors.length > 0) {
          description = fieldErrors.map((f) => f.message).join(' • ');
        }
        if (e.httpStatus === 400) title = 'Dữ liệu chưa hợp lệ';
        else if (e.httpStatus === 409) title = 'Xung đột dữ liệu';
        else if (e.httpStatus === 404) title = 'Không tìm thấy';
      } else if (e instanceof Error) {
        description = e.message;
      }
      push({ variant: 'error', title, description });
    } finally {
      setSaving(false);
    }
  });

  const slugPreview = useMemo(
    () => `${window.location.origin}/products/${slug || slugify(name) || 'ten-san-pham'}`,
    [slug, name],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <section className="container-page py-6">
      <Breadcrumb
        items={[
          { label: 'Admin', href: '/' },
          { label: 'Sản phẩm', href: '/products' },
          {
            label: mode === 'create' ? 'Thêm mới' : 'Chỉnh sửa',
          },
        ]}
        className="mb-3"
      />

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold">
              {mode === 'create' ? 'Thêm sản phẩm' : 'Chỉnh sửa sản phẩm'}
            </h1>
          </CardHeader>
          <CardBody>
            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              items={[
                { key: 'general', label: 'Thông tin chung' },
                {
                  key: 'variants',
                  label: 'Biến thể',
                  count: variants.fields.length,
                },
                { key: 'images', label: 'Hình ảnh' },
                { key: 'seo', label: 'SEO' },
              ]}
            >
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    label="Tên sản phẩm"
                    required
                    error={form.formState.errors.name?.message}
                  >
                    <Input
                      {...form.register('name')}
                      placeholder="Đèn LED âm trần SmartLight X1"
                    />
                  </FormField>
                  <FormField
                    label="Slug"
                    hint="Để trống để tự động tạo từ tên"
                    error={form.formState.errors.slug?.message}
                  >
                    <Input
                      {...form.register('slug')}
                      placeholder="den-led-am-tran-smartlight-x1"
                    />
                    <div className="mt-1 truncate text-xs text-neutral-500">
                      URL: <span className="text-smart-700">{slugPreview}</span>
                    </div>
                  </FormField>
                  <FormField
                    label="Danh mục"
                    required
                    error={form.formState.errors.categoryId?.message}
                  >
                    <Select {...form.register('categoryId')}>
                      <option value="">— Chọn danh mục —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Thương hiệu">
                    <Select {...form.register('brandId')}>
                      <option value="">— Không —</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Trạng thái">
                    <Select {...form.register('status')}>
                      <option value="DRAFT">Nháp</option>
                      <option value="PUBLISHED">Đang bán</option>
                      <option value="ARCHIVED">Lưu trữ</option>
                    </Select>
                  </FormField>
                  <FormField label="Nổi bật">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" {...form.register('isFeatured')} />
                      <span>Hiển thị trong danh sách nổi bật</span>
                    </label>
                  </FormField>
                  <FormField label="Giá cơ bản (VND)">
                    <Input
                      type="number"
                      {...form.register('basePrice')}
                      placeholder="100000"
                    />
                  </FormField>
                  <FormField
                    label="Mô tả ngắn"
                    className="md:col-span-2"
                  >
                    <Textarea
                      {...form.register('shortDescription')}
                      rows={2}
                    />
                  </FormField>
                  <FormField
                    label="Mô tả chi tiết"
                    className="md:col-span-2"
                  >
                    <Textarea
                      {...form.register('description')}
                      rows={6}
                    />
                  </FormField>
                </div>
              )}

              {activeTab === 'variants' && (
                <div className="space-y-3">
                  {variants.fields.map((field, i) => (
                    <Card key={field.id} className="bg-neutral-50/50">
                      <CardBody className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">Biến thể #{i + 1}</h3>
                          {variants.fields.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              type="button"
                              onClick={() => variants.remove(i)}
                            >
                              Xoá biến thể
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <FormField
                            label="SKU"
                            required
                            error={form.formState.errors.variants?.[i]?.sku?.message}
                          >
                            <Input
                              {...form.register(`variants.${i}.sku` as const)}
                            />
                          </FormField>
                          <FormField
                            label="Tên biến thể"
                            hint="Để trống sẽ dùng SKU"
                          >
                            <Input
                              {...form.register(`variants.${i}.name` as const)}
                            />
                          </FormField>
                          <FormField
                            label="Mã vạch"
                          >
                            <Input
                              {...form.register(`variants.${i}.barcode` as const)}
                            />
                          </FormField>
                          <FormField
                            label="Giá (VND)"
                            required
                            error={form.formState.errors.variants?.[i]?.price?.message}
                          >
                            <Input
                              type="number"
                              {...form.register(`variants.${i}.price` as const)}
                            />
                          </FormField>
                          <FormField
                            label="Giá so sánh"
                          >
                            <Input
                              type="number"
                              {...form.register(
                                `variants.${i}.compareAtPrice` as const,
                              )}
                            />
                          </FormField>
                          <FormField
                            label="Giá vốn"
                          >
                            <Input
                              type="number"
                              {...form.register(
                                `variants.${i}.cost` as const,
                              )}
                            />
                          </FormField>
                          <FormField
                            label="Khối lượng (g)"
                          >
                            <Input
                              type="number"
                              {...form.register(
                                `variants.${i}.weightGrams` as const,
                              )}
                            />
                          </FormField>
                          <FormField
                            label="Dài (mm)"
                          >
                            <Input
                              type="number"
                              {...form.register(
                                `variants.${i}.lengthMm` as const,
                              )}
                            />
                          </FormField>
                          <FormField
                            label="Rộng (mm)"
                          >
                            <Input
                              type="number"
                              {...form.register(
                                `variants.${i}.widthMm` as const,
                              )}
                            />
                          </FormField>
                          <FormField
                            label="Cao (mm)"
                          >
                            <Input
                              type="number"
                              {...form.register(
                                `variants.${i}.heightMm` as const,
                              )}
                            />
                          </FormField>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      variants.append({
                        sku: '',
                        name: '',
                        price: 0,
                      })
                    }
                  >
                    + Thêm biến thể
                  </Button>
                </div>
              )}

              {activeTab === 'images' && (
                <div className="rounded-md border border-dashed border-neutral-200 bg-neutral-50/50 p-6 text-sm text-neutral-600">
                  <p className="font-medium text-neutral-800">
                    Hình ảnh hiện chưa hỗ trợ tải lên trong form này.
                  </p>
                  <p className="mt-1">
                    Sau khi tạo sản phẩm, bạn có thể liên kết Media (ảnh / video)
                    thông qua module <code className="rounded bg-white px-1 py-0.5 text-xs">media-files</code>.
                    Mỗi sản phẩm có thể đính kèm nhiều <code className="rounded bg-white px-1 py-0.5 text-xs">imageMediaId</code> UUID.
                  </p>
                </div>
              )}

              {activeTab === 'seo' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    label="Meta title"
                  >
                    <Input
                      {...form.register('metaTitle')}
                      placeholder="Tiêu đề SEO"
                    />
                  </FormField>
                  <FormField
                    label="Meta keywords (phân cách bằng dấu phẩy)"
                    hint="Sẽ lưu thành mảng tags trong DB"
                  >
                    <Input
                      {...form.register('metaKeywords')}
                      placeholder="đèn led, âm trần, smartlight"
                    />
                  </FormField>
                  <FormField
                    label="Meta description"
                    className="md:col-span-2"
                    hint="Đang được lưu vào trường metaDesc — backend chưa hỗ trợ thêm field riêng"
                  >
                    <Textarea rows={3} disabled placeholder="(backend chưa nhận)" />
                  </FormField>
                </div>
              )}
            </Tabs>
          </CardBody>
          <CardFooter className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(-1)}
            >
              Huỷ
            </Button>
            <Button type="submit" isLoading={saving}>
              {mode === 'create' ? 'Tạo sản phẩm' : 'Lưu thay đổi'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </section>
  );
};

// (The previous inline ImageGalleryEditor component was removed in favour
// of a static note in the Images tab — the server DTO doesn't accept URL-
// based image lists yet, only `imageMediaIds` (UUIDs from Media module).)
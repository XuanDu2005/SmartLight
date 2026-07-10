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
import type { Category, Brand, ProductStatus } from '../lib/types';

const variantSchema = z.object({
  sku: z.string().min(2, 'SKU tối thiểu 2 ký tự'),
  price: z.coerce.number().min(0, 'Giá phải ≥ 0'),
  compareAtPrice: z.coerce.number().optional(),
  cost: z.coerce.number().optional(),
  barcode: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  weightGrams: z.coerce.number().optional(),
  lengthMm: z.coerce.number().optional(),
  widthMm: z.coerce.number().optional(),
  heightMm: z.coerce.number().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']),
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
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'OUT_OF_STOCK']),
  isFeatured: z.boolean(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  variants: z.array(variantSchema).min(1, 'Cần ít nhất 1 biến thể'),
  images: z.array(imageSchema).optional(),
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
      metaTitle: '',
      metaDescription: '',
      metaKeywords: '',
      variants: [
        {
          sku: '',
          price: 0,
          compareAtPrice: undefined,
          cost: undefined,
          color: '',
          size: '',
          weightGrams: undefined,
          lengthMm: undefined,
          widthMm: undefined,
          heightMm: undefined,
          status: 'ACTIVE',
        },
      ],
      images: [],
    },
  });

  const variants = useFieldArray({ control: form.control, name: 'variants' });
  const images = useFieldArray({ control: form.control, name: 'images' });

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
            categoryId: prod.categoryId,
            brandId: prod.brandId ?? '',
            status: prod.status as ProductStatus,
            isFeatured: prod.isFeatured,
            metaTitle: prod.metaTitle ?? '',
            metaDescription: prod.metaDescription ?? '',
            metaKeywords: prod.metaKeywords?.join(', ') ?? '',
            variants: prod.variants.map((v) => ({
              sku: v.sku,
              price: v.price.amount,
              compareAtPrice: v.compareAtPrice?.amount,
              cost: v.cost?.amount,
              barcode: v.barcode ?? '',
              color: v.color ?? '',
              size: v.size ?? '',
              weightGrams: v.weightGrams ?? undefined,
              lengthMm: v.lengthMm ?? undefined,
              widthMm: v.widthMm ?? undefined,
              heightMm: v.heightMm ?? undefined,
              status: v.status,
            })),
            images: prod.images.map((i) => ({
              url: i.url,
              alt: i.alt ?? '',
              isThumbnail: i.isThumbnail,
              isVideo: Boolean(i.isVideo),
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

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    try {
      const payload = {
        name: values.name,
        slug: values.slug || undefined,
        shortDescription: values.shortDescription || undefined,
        description: values.description || undefined,
        categoryId: values.categoryId,
        brandId: values.brandId || undefined,
        status: values.status,
        isFeatured: values.isFeatured,
        metaTitle: values.metaTitle || undefined,
        metaDescription: values.metaDescription || undefined,
        metaKeywords: values.metaKeywords
          ? values.metaKeywords.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        variants: values.variants.map((v) => ({
          sku: v.sku,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          cost: v.cost,
          barcode: v.barcode || undefined,
          color: v.color || undefined,
          size: v.size || undefined,
          weightGrams: v.weightGrams,
          lengthMm: v.lengthMm,
          widthMm: v.widthMm,
          heightMm: v.heightMm,
          status: v.status,
        })),
        images: values.images?.map((i) => ({
          url: i.url,
          alt: i.alt || undefined,
          isThumbnail: i.isThumbnail ?? false,
          isVideo: i.isVideo ?? false,
        })),
      };

      if (mode === 'create') {
        const created = await productsApi.create(payload as never);
        push({ variant: 'success', title: 'Đã tạo sản phẩm' });
        navigate(`/products/${created.id}`);
      } else if (params.id) {
        await productsApi.update(params.id, payload as never);
        push({ variant: 'success', title: 'Đã cập nhật sản phẩm' });
        navigate(`/products/${params.id}`);
      }
    } catch (e) {
      push({
        variant: 'error',
        title: 'Không thể lưu',
        description: e instanceof Error ? e.message : 'Vui lòng thử lại',
      });
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
                {
                  key: 'images',
                  label: 'Hình ảnh',
                  count: images.fields.length,
                },
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
                      <option value="ACTIVE">Đang bán</option>
                      <option value="ARCHIVED">Lưu trữ</option>
                      <option value="OUT_OF_STOCK">Hết hàng</option>
                    </Select>
                  </FormField>
                  <FormField label="Nổi bật">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" {...form.register('isFeatured')} />
                      <span>Hiển thị trong danh sách nổi bật</span>
                    </label>
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
                            label="Mã vạch"
                          >
                            <Input
                              {...form.register(`variants.${i}.barcode` as const)}
                            />
                          </FormField>
                          <FormField
                            label="Trạng thái"
                          >
                            <Select
                              {...form.register(
                                `variants.${i}.status` as const,
                              )}
                            >
                              <option value="ACTIVE">Đang bán</option>
                              <option value="INACTIVE">Ngừng bán</option>
                              <option value="OUT_OF_STOCK">Hết hàng</option>
                            </Select>
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
                            label="Màu sắc"
                          >
                            <Input
                              {...form.register(
                                `variants.${i}.color` as const,
                              )}
                            />
                          </FormField>
                          <FormField
                            label="Kích thước"
                          >
                            <Input
                              {...form.register(
                                `variants.${i}.size` as const,
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
                        price: 0,
                        status: 'ACTIVE',
                        color: '',
                        size: '',
                      })
                    }
                  >
                    + Thêm biến thể
                  </Button>
                </div>
              )}

              {activeTab === 'images' && (
                <ImageGalleryEditor
                  fields={images.fields}
                  register={form.register}
                  watch={form.watch}
                  append={(value) =>
                    images.append({
                      url: value.url,
                      alt: value.alt ?? '',
                      isThumbnail: value.isThumbnail ?? false,
                      isVideo: value.isVideo ?? false,
                    })
                  }
                  remove={(i) => images.remove(i)}
                  move={(from, to) => images.move(from, to)}
                  errors={form.formState.errors.images as never}
                />
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
                  >
                    <Input
                      {...form.register('metaKeywords')}
                      placeholder="đèn led, âm trần, smartlight"
                    />
                  </FormField>
                  <FormField
                    label="Meta description"
                    className="md:col-span-2"
                  >
                    <Textarea
                      {...form.register('metaDescription')}
                      rows={3}
                    />
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

// ============================================================================
//  Image gallery editor (inline component for the Images tab)
// ============================================================================

interface ImageGalleryEditorProps {
  fields: Array<{ id: string }>;
  register: ReturnType<typeof useForm<ProductFormValues>>['register'];
  watch: ReturnType<typeof useForm<ProductFormValues>>['watch'];
  append: (value: {
    url: string;
    alt?: string;
    isThumbnail?: boolean;
    isVideo?: boolean;
  }) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
  errors: unknown;
}
const ImageGalleryEditor = ({
  fields,
  register,
  watch,
  append,
  remove,
  move,
}: ImageGalleryEditorProps): JSX.Element => {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [isVideo, setIsVideo] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const onDrop = (targetIdx: number): void => {
    if (dragIndex === null || dragIndex === targetIdx) return;
    move(dragIndex, targetIdx);
    setDragIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <Input
          placeholder="URL hình ảnh hoặc video"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Input
          placeholder="Mô tả (alt)"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
        />
        <div className="flex gap-2">
          <label className="inline-flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={isVideo}
              onChange={(e) => setIsVideo(e.target.checked)}
            />
            Video
          </label>
          <Button
            type="button"
            onClick={() => {
              if (!url) return;
              append({ url, alt: alt || undefined, isVideo });
              setUrl('');
              setAlt('');
              setIsVideo(false);
            }}
          >
            + Thêm
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {fields.map((field, i) => {
          const imageUrl = (watch(`images.${i}.url` as const) ?? '') as string;
          const isThumb = Boolean(
            watch(`images.${i}.isThumbnail` as const),
          );
          return (
            <div
              key={field.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              className={cn(
                'rounded-md border bg-white p-2',
                isThumb ? 'border-smart-500 ring-1 ring-smart-200' : 'border-neutral-200',
              )}
            >
              <input type="hidden" {...register(`images.${i}.url` as const)} />
              <input type="hidden" {...register(`images.${i}.alt` as const)} />
              <input
                type="hidden"
                {...register(`images.${i}.isThumbnail` as const)}
              />
              <input
                type="hidden"
                {...register(`images.${i}.isVideo` as const)}
              />
              <div className="relative aspect-square overflow-hidden rounded bg-neutral-100">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                    Không có ảnh
                  </div>
                )}
              </div>
              <div className="mt-1 flex items-center justify-between gap-1">
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => remove(i)}
                >
                  Xoá
                </Button>
                <span className="text-xs text-neutral-400">#{i + 1}</span>
              </div>
            </div>
          );
        })}
        {fields.length === 0 && (
          <div className="col-span-full rounded-md border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
            Chưa có hình ảnh. Thêm URL ở trên.
          </div>
        )}
      </div>
    </div>
  );
};
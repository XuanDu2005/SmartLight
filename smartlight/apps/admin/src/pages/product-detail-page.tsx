import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Spinner,
  StatusPill,
  Tabs,
} from '@smartlight/ui';
import { inventoryApi } from '../lib/inventory-api';
import { productsApi } from '../lib/products-api';
import { ApiError } from '../lib/api-client';
import { formatVND } from '../lib/format';
import type { InventoryStock, ProductDetail, ProductStatus, ProductVariant } from '../lib/types';

const variantStatusMap: Record<
  ProductVariant['status'],
  'success' | 'danger' | 'neutral'
> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  OUT_OF_STOCK: 'danger',
};

const productStatusMap: Record<ProductStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  ACTIVE: 'success',
  DRAFT: 'neutral',
  ARCHIVED: 'warning',
  OUT_OF_STOCK: 'danger',
};

export const ProductDetailPage = (): JSX.Element => {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [stockByVariant, setStockByVariant] = useState<Record<string, InventoryStock | null>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const prod = await productsApi.getAdmin(params.id!);
        if (cancelled) return;
        setProduct(prod);
        const stockEntries = await Promise.all(
          prod.variants.map(async (v) => {
            try {
              const stock = await inventoryApi.get(v.id);
              return [v.id, stock] as const;
            } catch {
              // Some legacy variants were created before the backend
              // started auto-seeding an inventory row, so this 404s.
              // The UI renders '—' for the missing stock and the admin
              // can seed it from /inventory if they need a real number.
              return [v.id, null] as const;
            }
          }),
        );
        if (!cancelled) {
          setStockByVariant(Object.fromEntries(stockEntries));
        }
      } catch (e) {
        if (cancelled) return;
        // The admin console can devolve into "Uncaught (in promise)" if a
        // rejection is thrown and nothing handles it. Catch + surface a
        // friendly Vietnamese message instead.
        if (e instanceof ApiError) {
          setLoadError(
            e.httpStatus === 404
              ? 'Sản phẩm không tồn tại hoặc đã bị xoá.'
              : e.message,
          );
        } else if (e instanceof Error) {
          setLoadError(e.message);
        } else {
          setLoadError('Không thể tải sản phẩm');
        }
        setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!product) {
    return (
      <section className="container-page py-6">
        <EmptyState
          title="Không tìm thấy sản phẩm"
          description={
            loadError ??
            'Sản phẩm đã bị xoá hoặc không tồn tại.'
          }
          action={
            <Link to="/products">
              <Button>Quay lại danh sách</Button>
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="container-page py-6">
      <Breadcrumb
        items={[
          { label: 'Admin', href: '/' },
          { label: 'Sản phẩm', href: '/products' },
          { label: product.name },
        ]}
        className="mb-3"
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <StatusPill
              status={product.status}
              variant={productStatusMap[product.status]}
            />
            {product.isFeatured && <Badge variant="info">Nổi bật</Badge>}
          </div>
          <p className="text-sm text-neutral-500">/{product.slug}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/products/${product.id}/edit`}>
            <Button>Chỉnh sửa</Button>
          </Link>
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { key: 'overview', label: 'Tổng quan' },
          {
            key: 'variants',
            label: 'Biến thể',
            count: product.variants.length,
          },
          {
            key: 'images',
            label: 'Hình ảnh',
            count: product.images.length,
          },
          { key: 'seo', label: 'SEO' },
        ]}
      >
        {tab === 'overview' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Thông tin chung</h2>
              </CardHeader>
              <CardBody className="space-y-2 text-sm">
                <div>
                  <span className="text-neutral-500">Danh mục:</span>{' '}
                  {product.category?.name ?? '—'}
                </div>
                <div>
                  <span className="text-neutral-500">Thương hiệu:</span>{' '}
                  {product.brand?.name ?? '—'}
                </div>
                <div>
                  <span className="text-neutral-500">Giá từ:</span>{' '}
                  {formatVND(product.priceFrom?.amount ?? 0)}
                </div>
                <div>
                  <span className="text-neutral-500">Giá đến:</span>{' '}
                  {formatVND(product.priceTo?.amount ?? 0)}
                </div>
                <div>
                  <span className="text-neutral-500">Ngày tạo:</span>{' '}
                  {new Date(product.createdAt).toLocaleString('vi-VN')}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Mô tả</h2>
              </CardHeader>
              <CardBody className="space-y-2 text-sm">
                {product.shortDescription && (
                  <p className="font-medium">{product.shortDescription}</p>
                )}
                <p className="whitespace-pre-line text-neutral-700">
                  {product.description || 'Chưa có mô tả chi tiết.'}
                </p>
              </CardBody>
            </Card>
          </div>
        )}

        {tab === 'variants' && (
          <div className="overflow-x-auto rounded-md border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2 text-left">SKU</th>
                  <th className="px-4 py-2 text-left">Màu</th>
                  <th className="px-4 py-2 text-left">Kích thước</th>
                  <th className="px-4 py-2 text-right">Giá</th>
                  <th className="px-4 py-2 text-right">Tồn kho</th>
                  <th className="px-4 py-2 text-left">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((v) => {
                  const stock = stockByVariant[v.id];
                  return (
                    <tr key={v.id} className="border-t border-neutral-100">
                      <td className="px-4 py-3 font-medium">{v.sku}</td>
                      <td className="px-4 py-3">{v.color ?? '—'}</td>
                      <td className="px-4 py-3">{v.size ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatVND(v.price.amount)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {stock
                          ? `${stock.available} / ${stock.onHand}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill
                          status={v.status}
                          variant={variantStatusMap[v.status]}
                        />
                      </td>
                    </tr>
                  );
                })}
                {product.variants.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-neutral-500"
                    >
                      Sản phẩm chưa có biến thể.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'images' && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {product.images.map((img) => (
              <div
                key={img.id}
                className="overflow-hidden rounded-md border border-neutral-200 bg-white"
              >
                <div className="aspect-square bg-neutral-100">
                  {img.url ? (
                    <img
                      src={img.url}
                      alt={img.alt ?? ''}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="px-2 py-1 text-xs">
                  {img.isThumbnail && (
                    <Badge variant="info">Thumbnail</Badge>
                  )}
                  {img.isVideo && <Badge variant="warning">Video</Badge>}
                </div>
              </div>
            ))}
            {product.images.length === 0 && (
              <div className="col-span-full rounded-md border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
                Sản phẩm chưa có hình ảnh.
              </div>
            )}
          </div>
        )}

        {tab === 'seo' && (
          <Card>
            <CardBody className="space-y-2 text-sm">
              <div>
                <span className="text-neutral-500">Meta title:</span>{' '}
                {product.metaTitle || '—'}
              </div>
              <div>
                <span className="text-neutral-500">Meta description:</span>{' '}
                {product.metaDescription || '—'}
              </div>
              <div>
                <span className="text-neutral-500">Meta keywords:</span>{' '}
                {product.metaKeywords?.join(', ') || '—'}
              </div>
            </CardBody>
          </Card>
        )}
      </Tabs>
    </section>
  );
};
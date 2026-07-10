import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  SmartImage,
  Spinner,
} from '@smartlight/ui';
import { catalogApi } from '../lib/catalog-api';
import { formatVND } from '../lib/format';
import type { ProductDetail, ProductVariantDto } from '../lib/api-types';

export const ProductDetailPage = (): JSX.Element => {
  const { slug = '' } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    catalogApi
      .getProductBySlug(slug)
      .then((p) => {
        setProduct(p);
        const def = p.variants.find((v) => v.isDefault) ?? p.variants[0];
        setActiveVariantId(def?.id ?? null);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Lỗi'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (err || !product) {
    return (
      <section className="container-page py-12">
        <EmptyState
          title="Không tìm thấy sản phẩm"
          description={err ?? `Slug không tồn tại: ${slug}`}
          action={
            <Link to="/products">
              <Button variant="primary">Quay lại danh sách</Button>
            </Link>
          }
        />
      </section>
    );
  }

  const activeVariant =
    product.variants.find((v) => v.id === activeVariantId) ?? null;

  return (
    <section className="container-page py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <SmartImage
            src={product.primaryImage?.url}
            alt={product.name}
            aspectRatio="square"
            className="rounded-lg"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            {product.isFeatured && <Badge variant="info">Nổi bật</Badge>}
            {product.isNewArrival && <Badge variant="success">Mới</Badge>}
            {product.brand && (
              <Link
                to={`/products?brandSlug=${product.brand.slug}`}
                className="text-sm text-neutral-500 hover:text-smart-700"
              >
                {product.brand.name}
              </Link>
            )}
          </div>

          <h1 className="text-2xl font-semibold text-neutral-900">
            {product.name}
          </h1>

          {product.shortDescription && (
            <p className="text-sm text-neutral-500">{product.shortDescription}</p>
          )}

          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-neutral-900">
              {formatVND(product.basePrice)}
            </span>
            {product.compareAtPrice &&
              product.compareAtPrice > product.basePrice && (
                <span className="text-base text-neutral-400 line-through">
                  {formatVND(product.compareAtPrice)}
                </span>
              )}
          </div>

          {product.variants.length > 0 && (
            <FormField label="Phiên bản">
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <VariantChip
                    key={v.id}
                    variant={v}
                    active={v.id === activeVariantId}
                    onClick={() => setActiveVariantId(v.id)}
                  />
                ))}
              </div>
            </FormField>
          )}

          {activeVariant && (
            <div className="flex items-center gap-2">
              <Badge variant={activeVariant.inStock ? 'success' : 'danger'}>
                {activeVariant.inStock
                  ? `Còn ${activeVariant.stockCount} sản phẩm`
                  : 'Hết hàng'}
              </Badge>
              {activeVariant.attributes.map((a) => (
                <span
                  key={a.name}
                  className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
                >
                  {a.name}: {a.value}
                </span>
              ))}
            </div>
          )}

          <FormField label="Số lượng" className="mt-2">
            <div className="flex w-32 items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                −
              </Button>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Number(e.currentTarget.value) || 1))
                }
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </Button>
            </div>
          </FormField>

          <div className="mt-2 flex gap-3">
            <Button
              variant="primary"
              size="lg"
              disabled={!activeVariant?.inStock}
              onClick={() => {
                window.alert('Add to cart chưa được wire tới cart API');
              }}
            >
              Thêm vào giỏ hàng
            </Button>
            <Button variant="outline" size="lg">
              Mua ngay
            </Button>
          </div>

          {/* Attributes */}
          {product.attributes.length > 0 && (
            <Card className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-neutral-900">
                Thông số kỹ thuật
              </h3>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {product.attributes.map((a) => (
                  <div key={a.attributeId} className="flex justify-between">
                    <dt className="text-neutral-500">{a.displayName}</dt>
                    <dd className="text-neutral-900">
                      {a.value} {a.unit ?? ''}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>
      </div>

      {product.description && (
        <Card className="mt-8">
          <h2 className="mb-2 text-lg font-semibold text-neutral-900">
            Mô tả sản phẩm
          </h2>
          <p className="whitespace-pre-line text-sm text-neutral-700">
            {product.description}
          </p>
        </Card>
      )}
    </section>
  );
};

const VariantChip = ({
  variant,
  active,
  onClick,
}: {
  variant: ProductVariantDto;
  active: boolean;
  onClick: () => void;
}): JSX.Element => (
  <button
    type="button"
    onClick={onClick}
    className={[
      'rounded-md border px-3 py-1.5 text-sm transition-colors',
      active
        ? 'border-smart-600 bg-smart-50 text-smart-700'
        : 'border-neutral-300 bg-white text-neutral-700 hover:border-smart-500',
    ].join(' ')}
  >
    {variant.name}
    <span className="ml-2 text-xs text-neutral-500">
      {formatVND(variant.price)}
    </span>
  </button>
);

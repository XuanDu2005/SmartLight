import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  SmartImage,
  Spinner,
  useToast,
} from '@smartlight/ui';
import { catalogApi } from '../lib/catalog-api';
import { useAppDispatch } from '../store/hooks';
import { addCartItem } from '../store/cart-slice';
import { formatVND } from '../lib/format';
import { ApiError } from '../lib/api-client';
import type { ProductDetail, ProductVariantDto } from '../lib/api-types';

export const ProductDetailPage = (): JSX.Element => {
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { slug = '' } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(localStorage.getItem('smartlight.access')));
  }, []);

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

          <FormField
            label="Số lượng"
            className="mt-2"
            hint={
              activeVariant?.inStock
                ? `Tối đa ${Math.min(activeVariant.stockCount, 999)} sản phẩm`
                : undefined
            }
          >
            <div className="flex w-44 items-stretch gap-2">
              <Button
                size="md"
                variant="outline"
                disabled={quantity <= 1}
                aria-label="Giảm số lượng"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </Button>
              <Input
                type="number"
                inputSize="lg"
                min={1}
                value={quantity}
                className="flex-1 min-w-[5rem] text-center text-lg font-semibold"
                onChange={(e) => {
                  const raw = Number(e.currentTarget.value);
                  const cap =
                    activeVariant?.inStock
                      ? Math.min(activeVariant.stockCount, 999)
                      : 1;
                  if (!Number.isFinite(raw)) {
                    // Empty / invalid: keep current quantity visible.
                    // React will re-sync value={quantity} on next render.
                    return;
                  }
                  const next = Math.max(1, Math.min(cap, Math.floor(raw)));
                  setQuantity(next);
                  // Force the DOM to reflect the clamped value if user typed beyond cap.
                  if (String(next) !== e.currentTarget.value) {
                    e.currentTarget.value = String(next);
                  }
                }}
                onBlur={(e) => {
                  // Final clamp on blur — guarantees a sane display value.
                  const cap =
                    activeVariant?.inStock
                      ? Math.min(activeVariant.stockCount, 999)
                      : 1;
                  const raw = Number(e.currentTarget.value);
                  const safe = Number.isFinite(raw) && raw >= 1
                    ? Math.max(1, Math.min(cap, Math.floor(raw)))
                    : Math.max(1, quantity);
                  if (e.currentTarget.value !== String(safe)) {
                    e.currentTarget.value = String(safe);
                  }
                  setQuantity(safe);
                }}
              />
              <Button
                size="md"
                variant="outline"
                disabled={
                  activeVariant?.inStock
                    ? quantity >= Math.min(activeVariant.stockCount, 999)
                    : true
                }
                aria-label="Tăng số lượng"
                onClick={() => {
                  const cap =
                    activeVariant?.inStock
                      ? Math.min(activeVariant.stockCount, 999)
                      : 1;
                  setQuantity((q) => Math.min(cap, q + 1));
                }}
              >
                +
              </Button>
            </div>
          </FormField>

          <div className="mt-2 flex gap-3">
            <Button
              variant="primary"
              size="lg"
              disabled={!activeVariant?.inStock || adding}
              isLoading={adding}
              onClick={async () => {
                if (!activeVariant) return;
                if (!hasToken) {
                  toast.push('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng', 'info');
                  navigate('/login');
                  return;
                }
                setAdding(true);
                try {
                  await dispatch(
                    addCartItem({ variantId: activeVariant.id, quantity }),
                  ).unwrap();
                  toast.push(
                    quantity > 1
                      ? `Đã thêm ${quantity} sản phẩm vào giỏ hàng`
                      : 'Đã thêm vào giỏ hàng',
                    'success',
                  );
                } catch (e) {
                  let msg = 'Không thể thêm vào giỏ hàng';
                  if (e instanceof ApiError) {
                    switch (e.code) {
                      case 'CART_QUANTITY_EXCEEDS_STOCK':
                        msg = `Số lượng vượt quá tồn kho (tối đa ${e.details && typeof e.details === 'object' && 'available' in e.details ? (e.details as { available?: number }).available : '?'})`;
                        break;
                      case 'CART_VARIANT_UNAVAILABLE':
                        msg = 'Biến thể này hiện không khả dụng';
                        break;
                      case 'PRODUCT_INACTIVE':
                      case 'VARIANT_INACTIVE':
                        msg = 'Sản phẩm tạm ngừng bán';
                        break;
                      case 'AUTH_REQUIRED':
                      case 'UNAUTHORIZED':
                        msg = 'Vui lòng đăng nhập lại';
                        break;
                      default:
                        msg = e.message;
                    }
                  }
                  toast.push(msg, 'error');
                } finally {
                  setAdding(false);
                }
              }}
            >
              Thêm vào giỏ hàng
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={!activeVariant?.inStock || adding}
              isLoading={adding}
              onClick={async () => {
                if (!activeVariant) return;
                if (!hasToken) {
                  navigate('/login');
                  return;
                }
                setAdding(true);
                try {
                  await dispatch(
                    addCartItem({ variantId: activeVariant.id, quantity }),
                  ).unwrap();
                  navigate('/cart');
                } catch {
                  toast.push('Không thể mua ngay', 'error');
                } finally {
                  setAdding(false);
                }
              }}
            >
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

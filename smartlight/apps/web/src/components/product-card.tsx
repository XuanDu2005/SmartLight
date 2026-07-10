import { Link } from 'react-router-dom';
import { Badge, Button, SmartImage } from '@smartlight/ui';
import { formatVND } from '../lib/format';
import type { ProductListItem } from '../lib/api-types';

export interface ProductCardProps {
  product: ProductListItem;
}

export const ProductCard = ({ product }: ProductCardProps): JSX.Element => {
  const onSale =
    product.compareAtPrice !== null && product.compareAtPrice > product.basePrice;
  const range =
    product.priceRange && product.priceRange.min !== product.priceRange.max
      ? `${formatVND(product.priceRange.min)} – ${formatVND(product.priceRange.max)}`
      : formatVND(product.basePrice);

  return (
    <article className="flex h-full flex-col rounded-lg border border-neutral-200 bg-white shadow-card transition hover:shadow-elevated">
      <Link to={`/products/${product.slug}`} className="block">
        <SmartImage
          src={product.primaryImage?.url}
          alt={product.name}
          aspectRatio="square"
          className="rounded-t-lg"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/products/${product.slug}`}
            className="line-clamp-2 text-sm font-medium text-neutral-900 hover:text-smart-700"
          >
            {product.name}
          </Link>
          {product.isNewArrival && <Badge variant="info">Mới</Badge>}
        </div>
        {product.brand && (
          <span className="text-xs text-neutral-500">{product.brand.name}</span>
        )}
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-base font-semibold text-neutral-900">{range}</span>
          {onSale && (
            <span className="text-xs text-neutral-400 line-through">
              {formatVND(product.compareAtPrice as number)}
            </span>
          )}
        </div>
        <div className="mt-auto pt-2">
          {product.inStock ? (
            <Badge variant="success">Còn hàng</Badge>
          ) : (
            <Badge variant="danger">Hết hàng</Badge>
          )}
        </div>
      </div>
    </article>
  );
};

export interface AddToCartCellProps {
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Small reusable "add to cart" CTA. Kept here because it's used by both
 * the listing (ripple up) and the detail page.
 */
export const AddToCartCell = ({
  onClick,
  label = 'Thêm vào giỏ',
  disabled = false,
}: AddToCartCellProps): JSX.Element => (
  <Button
    size="sm"
    variant="primary"
    fullWidth
    onClick={onClick}
    disabled={disabled}
  >
    {label}
  </Button>
);

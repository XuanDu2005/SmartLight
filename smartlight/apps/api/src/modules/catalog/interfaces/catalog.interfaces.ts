export interface PaginationMeta {
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
}

export interface CursorMeta {
  pagination: {
    limit: number;
    hasNext: boolean;
    nextCursor: string | null;
    prevCursor: string | null;
  };
}

export interface AppliedFilters {
  [key: string]: unknown;
}

export interface FilterMeta {
  filters: {
    appliedFilters: AppliedFilters;
  };
}

export interface SortMeta {
  sort: Array<{ field: string; order: 'asc' | 'desc' }>;
}

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta & FilterMeta & SortMeta;
};

export type CursorPaginatedResponse<T> = {
  data: T[];
  meta: CursorMeta;
};

export interface ImageVariants {
  thumbnail?: { url: string; width: number };
  medium?: { url: string; width: number };
  large?: { url: string; width: number };
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  brand: { id: string; name: string; slug: string } | null;
  category: { id: string; name: string; slug: string };
  primaryImage: { url: string; altText: string | null } | null;
  basePrice: string;
  compareAtPrice: string | null;
  currency: string;
  hasVariants: boolean;
  priceRange: { min: string; max: string; currency: string } | null;
  inStock: boolean;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
  publishedAt: string | null;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    displayOrder: number;
    isPrimary: boolean;
    variants: ImageVariants | null;
  }>;
  variants: VariantSummary[];
  attributes: Array<{
    id: string;
    name: string;
    displayName: string;
    value: string | number | boolean | null;
    unit: string | null;
  }>;
}

export interface VariantSummary {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  price: string;
  compareAtPrice: string | null;
  currency: string;
  weight: number | null;
  inStock: boolean;
  stockCount: number;
  lowStock: boolean;
  attributes: Array<{ name: string; value: string }>;
  imageUrl: string | null;
  isDefault: boolean;
}

export interface CategorySummary {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  level: number;
  isActive: boolean;
  productCount: number;
  imageUrl: string | null;
  isFeatured: boolean;
}

export interface CategoryTree {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  children: CategoryTree[];
}

export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: { url: string; altText: string | null } | null;
  isActive: boolean;
  productCount: number;
  isFeatured: boolean;
}

export interface ProductFilterInput {
  q?: string;
  categoryId?: string;
  categorySlug?: string;
  brandId?: string;
  brandSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  newArrival?: boolean;
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
  attribute?: Record<string, string>;
}

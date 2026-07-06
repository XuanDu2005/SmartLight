// Response DTOs (TypeScript interfaces — no class-validator needed for responses).

export interface CategoryResponseDto {
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
  metaTitle: string | null;
  metaDesc: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTreeNodeDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  children: CategoryTreeNodeDto[];
}

export interface BrandResponseDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: { url: string; altText: string | null } | null;
  isActive: boolean;
  productCount: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImageVariantsDto {
  thumbnail?: { url: string; width: number };
  medium?: { url: string; width: number };
  large?: { url: string; width: number };
}

export interface ProductVariantResponseDto {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  weightGrams: number | null;
  inStock: boolean;
  stockCount: number;
  lowStock: boolean;
  attributes: Array<{ name: string; value: string }>;
  imageUrl: string | null;
  isDefault: boolean;
  status: string;
}

export interface ProductAttributeResponseDto {
  id: string;
  code: string;
  displayName: string;
  dataType: string;
  unit: string | null;
  isFilterable: boolean;
  isRequired: boolean;
  values: Array<{
    productId: string;
    value: string | number | boolean | null;
  }>;
}

export interface ProductListItemDto {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  brand: { id: string; name: string; slug: string } | null;
  category: { id: string; name: string; slug: string };
  primaryImage: { url: string; altText: string | null } | null;
  basePrice: number;
  compareAtPrice: number | null;
  currency: string;
  hasVariants: boolean;
  priceRange: { min: number; max: number; currency: string } | null;
  inStock: boolean;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
  publishedAt: string | null;
  tags: string[];
}

export interface ProductDetailDto extends ProductListItemDto {
  description: string | null;
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    displayOrder: number;
    isPrimary: boolean;
    variants: ImageVariantsDto | null;
  }>;
  variants: ProductVariantResponseDto[];
  attributes: Array<{
    attributeId: string;
    name: string;
    displayName: string;
    value: string | number | boolean | null;
    unit: string | null;
  }>;
  metaTitle: string | null;
  metaDesc: string | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  updatedAt: string;
}

export interface BulkOperationResultDto {
  succeeded: string[];
  failed: Array<{ id: string; reason: string }>;
}

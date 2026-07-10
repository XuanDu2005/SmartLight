/**
 * Storefront API DTO shapes \u2014 mirrors the NestJS response envelopes.
 *
 * Keep these declarations minimal and only as wide as the storefront needs.
 */
import type { apiClient } from './api-client';

export interface PaginatedResult<T> {
  data: T[];
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
      nextPage: number | null;
      prevPage: number | null;
    };
    filters?: Record<string, unknown>;
    sort?: Array<{ field: string; order: string }>;
  };
}

export interface MoneyNumber {
  basePrice: number;
  compareAtPrice: number | null;
  currency: 'VND';
}

export interface BrandRef {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface ProductImageRef {
  url: string;
  altText: string | null;
}

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  brand: BrandRef | null;
  category: CategoryRef;
  primaryImage: ProductImageRef | null;
  basePrice: number;
  compareAtPrice: number | null;
  currency: 'VND';
  hasVariants: boolean;
  priceRange: { min: number; max: number; currency: 'VND' } | null;
  inStock: boolean;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
  publishedAt: string | null;
  tags: string[];
  isFeatured: boolean;
  isNewArrival: boolean;
}

export interface ProductVariantDto {
  id: string;
  sku: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  currency: 'VND';
  inStock: boolean;
  stockCount: number;
  attributes: Array<{ name: string; value: string }>;
  imageUrl: string | null;
  isDefault: boolean;
}

export interface ProductAttributeDto {
  attributeId: string;
  name: string;
  displayName: string;
  value: string | number | boolean | null;
  unit: string | null;
}

export interface ProductDetail extends ProductListItem {
  description: string | null;
  variants: ProductVariantDto[];
  attributes: ProductAttributeDto[];
  metaTitle: string | null;
  metaDesc: string | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  updatedAt: string;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  children: CategoryTreeNode[];
}

export interface CategoryRefDetail {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  level: number;
  isActive: boolean;
  productCount: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrandRefDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  isActive: boolean;
  productCount: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogPaths {
  products: '/catalog/products';
  productById: '/catalog/products/:id';
  productBySlug: '/catalog/products/slug/:slug';
  featured: '/catalog/products/featured';
  bestSellers: '/catalog/products/best-sellers';
  newArrivals: '/catalog/products/new-arrivals';
  variants: '/catalog/products/:productId/variants';
  categories: '/catalog/categories';
  categoryTree: '/catalog/categories/tree';
  brands: '/catalog/brands';
}

export type ApiClient = typeof apiClient;
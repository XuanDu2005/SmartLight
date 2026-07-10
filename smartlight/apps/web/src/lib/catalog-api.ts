/**
 * Catalog API \u2014 high-level wrappers over the storefront endpoints.
 */
import { apiClient } from './api-client';
import type {
  BrandRefDetail,
  CategoryRefDetail,
  CategoryTreeNode,
  PaginatedResult,
  ProductDetail,
  ProductListItem,
} from './api-types';

export interface ListProductsFilters {
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
  sort?: 'priceAsc' | 'priceDesc' | 'nameAsc' | 'nameDesc' | 'createdDesc';
  page?: number;
  limit?: number;
}

export const catalogApi = {
  /** GET /v1/catalog/products */
  listProducts(filters: ListProductsFilters = {}) {
    const params = cleanParams(filters as Record<string, unknown>);
    return apiClient
      .get<{ data: ProductListItem[]; meta: PaginatedResult<ProductListItem>['meta'] }>(
        '/catalog/products',
        { params },
      )
      .then((r) => r.data);
  },

  /** GET /v1/catalog/products/slug/:slug */
  getProductBySlug(slug: string) {
    return apiClient
      .get<{ data: ProductDetail }>(`/catalog/products/slug/${encodeURIComponent(slug)}`)
      .then((r) => r.data.data);
  },

  /** GET /v1/catalog/products/:id */
  getProductById(id: string) {
    return apiClient
      .get<{ data: ProductDetail }>(`/catalog/products/${encodeURIComponent(id)}`)
      .then((r) => r.data.data);
  },

  /** GET /v1/catalog/products/featured */
  listFeatured(limit = 8) {
    return apiClient
      .get<{ data: ProductListItem[] }>('/catalog/products/featured', {
        params: { limit },
      })
      .then((r) => r.data.data);
  },

  /** GET /v1/catalog/products/best-sellers */
  listBestSellers(limit = 8) {
    return apiClient
      .get<{ data: ProductListItem[] }>('/catalog/products/best-sellers', {
        params: { limit },
      })
      .then((r) => r.data.data);
  },

  /** GET /v1/catalog/products/new-arrivals */
  listNewArrivals(limit = 8) {
    return apiClient
      .get<{ data: ProductListItem[] }>('/catalog/products/new-arrivals', {
        params: { limit },
      })
      .then((r) => r.data.data);
  },

  /** GET /v1/catalog/categories/tree */
  getCategoryTree() {
    return apiClient
      .get<{ data: CategoryTreeNode[] }>('/catalog/categories/tree')
      .then((r) => r.data.data);
  },

  /** GET /v1/catalog/categories */
  listCategories() {
    return apiClient
      .get<{ data: CategoryRefDetail[]; meta: Record<string, unknown> }>(
        '/catalog/categories',
        { params: { limit: 100 } },
      )
      .then((r) => r.data.data);
  },

  /** GET /v1/catalog/brands */
  listBrands() {
    return apiClient
      .get<{ data: BrandRefDetail[] }>('/catalog/brands', {
        params: { limit: 100 },
      })
      .then((r) => r.data.data);
  },
};

function cleanParams<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj) as Array<keyof T>) {
    const v = obj[key];
    if (v !== undefined && v !== null && v !== '') {
      out[key as string] = v;
    }
  }
  return out;
}

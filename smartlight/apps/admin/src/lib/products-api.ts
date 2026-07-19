import { apiClient, unwrapPaginated } from './api-client';
import type {
  BrandRef,
  CategoryRef,
  CreateProductDto,
  CreateVariantDto,
  ListProductsAdminParams,
  MoneyAmount,
  Paginated,
  PaginatedEnvelope,
  ProductDetail,
  ProductSummary,
  ProductVariant,
  UpdateProductDto,
  UpdateVariantDto,
} from './types';

export interface ListProductsPublicParams {
  page?: number;
  limit?: number;
  search?: string;
  categorySlug?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PublicProductListResponse {
  items: ProductSummary[];
  total: number;
  page: number;
  limit: number;
}

// Helpers to defensively unwrap the server's `{ data, meta }` envelope.
// The API standardises on a list endpoint that wraps items in
// `{ data, meta }`. The earlier client code expected endpoints to return
// the resource directly, which silently made `id` undefined for callers
// that did `created.id` after `apiClient.post(...)`. These two helpers
// hide the envelope from callers: pass `apiClient.post<T>()`'s response
// and get the inner resource back.
function unwrapResource<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in (response as Record<string, unknown>)) {
    return (response as { data: T }).data;
  }
  return response as T;
}

function unwrapList<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === 'object' && Array.isArray((response as { data?: T[] }).data)) {
    return ((response as { data: T[] }).data) as T[];
  }
  return [];
}

export const productsApi = {
  // =====================================================================
  //  Public storefront (used to fetch category/brand reference data)
  // =====================================================================
  listPublic: async (
    params: ListProductsPublicParams = {},
  ): Promise<PublicProductListResponse> => {
    const { data } = await apiClient.get<PublicProductListResponse>(
      '/catalog/products',
      { params },
    );
    return data;
  },

  getPublicBySlug: async (slug: string): Promise<ProductDetail> => {
    const { data } = await apiClient.get<ProductDetail>(
      `/catalog/products/slug/${slug}`,
    );
    return unwrapResource<ProductDetail>(data);
  },

  getPublicById: async (id: string): Promise<ProductDetail> => {
    const { data } = await apiClient.get<ProductDetail>(
      `/catalog/products/${id}`,
    );
    return unwrapResource<ProductDetail>(data);
  },

  // =====================================================================
  //  Admin CRUD
  // =====================================================================
  listAdmin: async (
    params: ListProductsAdminParams = {},
  ): Promise<Paginated<ProductSummary>> => {
    // Backend's `AdminListProductsQueryDto` exposes the filter as
    // `featured` (matches the public `listProducts` query) but the admin
    // type uses `isFeatured` to mirror the product field name. Translate
    // here so callers can use the clearer name without 400ing on the
    // server.
    const wireParams: Record<string, unknown> = { ...params };
    if ('isFeatured' in wireParams) {
      wireParams.featured = wireParams.isFeatured;
      delete wireParams.isFeatured;
    }
    const response = await apiClient.get(
      '/admin/catalog/products',
      { params: wireParams },
    );
    return unwrapPaginated(response.data);
  },

  getAdmin: async (id: string): Promise<ProductDetail> => {
    const { data } = await apiClient.get<ProductDetail>(
      `/admin/catalog/products/${id}`,
    );
    return unwrapResource<ProductDetail>(data);
  },

  create: async (dto: CreateProductDto): Promise<ProductDetail> => {
    const { data } = await apiClient.post<ProductDetail>(
      '/admin/catalog/products',
      dto,
    );
    return unwrapResource<ProductDetail>(data);
  },

  update: async (id: string, dto: UpdateProductDto): Promise<ProductDetail> => {
    const { data } = await apiClient.patch<ProductDetail>(
      `/admin/catalog/products/${id}`,
      dto,
    );
    return unwrapResource<ProductDetail>(data);
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/catalog/products/${id}`);
  },

  publish: async (id: string): Promise<ProductDetail> => {
    const { data } = await apiClient.post<ProductDetail>(
      `/admin/catalog/products/${id}/publish`,
    );
    return unwrapResource<ProductDetail>(data);
  },

  unpublish: async (id: string): Promise<ProductDetail> => {
    const { data } = await apiClient.post<ProductDetail>(
      `/admin/catalog/products/${id}/unpublish`,
    );
    return unwrapResource<ProductDetail>(data);
  },

  restore: async (id: string): Promise<ProductDetail> => {
    const { data } = await apiClient.post<ProductDetail>(
      `/admin/catalog/products/${id}/restore`,
    );
    return unwrapResource<ProductDetail>(data);
  },

  bulkPublish: async (ids: string[]): Promise<{ processed: number }> => {
    const { data } = await apiClient.post<{ processed: number }>(
      '/admin/catalog/products/bulk-publish',
      { ids },
    );
    return unwrapResource<{ processed: number }>(data);
  },

  bulkUnpublish: async (ids: string[]): Promise<{ processed: number }> => {
    const { data } = await apiClient.post<{ processed: number }>(
      '/admin/catalog/products/bulk-unpublish',
      { ids },
    );
    return unwrapResource<{ processed: number }>(data);
  },

  // =====================================================================
  //  Variants
  // =====================================================================
  listVariants: async (productId: string): Promise<ProductVariant[]> => {
    const { data } = await apiClient.get<ProductVariant[]>(
      `/catalog/products/${productId}/variants`,
    );
    return unwrapList<ProductVariant>(data);
  },

  getVariant: async (
    productId: string,
    variantId: string,
  ): Promise<ProductVariant> => {
    const { data } = await apiClient.get<ProductVariant>(
      `/catalog/products/${productId}/variants/${variantId}`,
    );
    return unwrapResource<ProductVariant>(data);
  },

  createVariant: async (
    productId: string,
    dto: CreateVariantDto,
  ): Promise<ProductVariant> => {
    const { data } = await apiClient.post<ProductVariant>(
      `/admin/catalog/products/${productId}/variants`,
      dto,
    );
    return unwrapResource<ProductVariant>(data);
  },

  updateVariant: async (
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ): Promise<ProductVariant> => {
    const { data } = await apiClient.patch<ProductVariant>(
      `/admin/catalog/products/${productId}/variants/${variantId}`,
      dto,
    );
    return unwrapResource<ProductVariant>(data);
  },

  deleteVariant: async (productId: string, variantId: string): Promise<void> => {
    await apiClient.delete(
      `/admin/catalog/products/${productId}/variants/${variantId}`,
    );
  },
};

// Re-export so we can group types cleanly from a single place later.
export type { BrandRef, CategoryRef, MoneyAmount };
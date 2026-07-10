import { apiClient } from './api-client';
import type {
  BrandRef,
  CategoryRef,
  CreateProductDto,
  CreateVariantDto,
  ListProductsAdminParams,
  MoneyAmount,
  Paginated,
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
    return data;
  },

  getPublicById: async (id: string): Promise<ProductDetail> => {
    const { data } = await apiClient.get<ProductDetail>(
      `/catalog/products/${id}`,
    );
    return data;
  },

  // =====================================================================
  //  Admin CRUD
  // =====================================================================
  listAdmin: async (
    params: ListProductsAdminParams = {},
  ): Promise<Paginated<ProductSummary>> => {
    const { data } = await apiClient.get<Paginated<ProductSummary>>(
      '/admin/catalog/products',
      { params },
    );
    return data;
  },

  getAdmin: async (id: string): Promise<ProductDetail> => {
    const { data } = await apiClient.get<ProductDetail>(
      `/admin/catalog/products/${id}`,
    );
    return data;
  },

  create: async (dto: CreateProductDto): Promise<ProductDetail> => {
    const { data } = await apiClient.post<ProductDetail>(
      '/admin/catalog/products',
      dto,
    );
    return data;
  },

  update: async (id: string, dto: UpdateProductDto): Promise<ProductDetail> => {
    const { data } = await apiClient.patch<ProductDetail>(
      `/admin/catalog/products/${id}`,
      dto,
    );
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/catalog/products/${id}`);
  },

  publish: async (id: string): Promise<ProductDetail> => {
    const { data } = await apiClient.post<ProductDetail>(
      `/admin/catalog/products/${id}/publish`,
    );
    return data;
  },

  unpublish: async (id: string): Promise<ProductDetail> => {
    const { data } = await apiClient.post<ProductDetail>(
      `/admin/catalog/products/${id}/unpublish`,
    );
    return data;
  },

  restore: async (id: string): Promise<ProductDetail> => {
    const { data } = await apiClient.post<ProductDetail>(
      `/admin/catalog/products/${id}/restore`,
    );
    return data;
  },

  bulkPublish: async (ids: string[]): Promise<{ processed: number }> => {
    const { data } = await apiClient.post<{ processed: number }>(
      '/admin/catalog/products/bulk-publish',
      { ids },
    );
    return data;
  },

  bulkUnpublish: async (ids: string[]): Promise<{ processed: number }> => {
    const { data } = await apiClient.post<{ processed: number }>(
      '/admin/catalog/products/bulk-unpublish',
      { ids },
    );
    return data;
  },

  // =====================================================================
  //  Variants
  // =====================================================================
  listVariants: async (productId: string): Promise<ProductVariant[]> => {
    const { data } = await apiClient.get<ProductVariant[]>(
      `/catalog/products/${productId}/variants`,
    );
    return data;
  },

  getVariant: async (
    productId: string,
    variantId: string,
  ): Promise<ProductVariant> => {
    const { data } = await apiClient.get<ProductVariant>(
      `/catalog/products/${productId}/variants/${variantId}`,
    );
    return data;
  },

  createVariant: async (
    productId: string,
    dto: CreateVariantDto,
  ): Promise<ProductVariant> => {
    const { data } = await apiClient.post<ProductVariant>(
      `/admin/catalog/products/${productId}/variants`,
      dto,
    );
    return data;
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
    return data;
  },

  deleteVariant: async (productId: string, variantId: string): Promise<void> => {
    await apiClient.delete(
      `/admin/catalog/products/${productId}/variants/${variantId}`,
    );
  },
};

// Re-export so we can group types cleanly from a single place later.
export type { BrandRef, CategoryRef, MoneyAmount };
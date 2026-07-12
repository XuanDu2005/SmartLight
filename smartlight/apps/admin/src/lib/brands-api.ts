import { apiClient, unwrapPaginated } from './api-client';
import type {
  Brand,
  CreateBrandDto,
  Paginated,
  PaginatedEnvelope,
  UpdateBrandDto,
} from './types';

export interface ListBrandsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export const brandsApi = {
  list: async (params: ListBrandsQuery = {}): Promise<Paginated<Brand>> => {
    const { data } = await apiClient.get<PaginatedEnvelope<Brand>>(
      '/admin/catalog/brands',
      { params },
    );
    return unwrapPaginated(data);
  },

  listPublic: async (
    params: { page?: number; limit?: number; search?: string } = {},
  ): Promise<Paginated<Brand>> => {
    const { data } = await apiClient.get<PaginatedEnvelope<Brand>>('/catalog/brands', {
      params,
    });
    return unwrapPaginated(data);
  },

  get: async (id: string): Promise<Brand> => {
    const { data } = await apiClient.get<Brand>(`/catalog/brands/${id}`);
    return data;
  },

  create: async (dto: CreateBrandDto): Promise<Brand> => {
    const { data } = await apiClient.post<Brand>('/admin/catalog/brands', dto);
    return data;
  },

  update: async (id: string, dto: UpdateBrandDto): Promise<Brand> => {
    const { data } = await apiClient.patch<Brand>(
      `/admin/catalog/brands/${id}`,
      dto,
    );
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/catalog/brands/${id}`);
  },
};
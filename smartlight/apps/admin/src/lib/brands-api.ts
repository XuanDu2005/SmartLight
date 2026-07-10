import { apiClient } from './api-client';
import type { Brand, CreateBrandDto, Paginated, UpdateBrandDto } from './types';

export interface ListBrandsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export const brandsApi = {
  list: async (params: ListBrandsQuery = {}): Promise<Paginated<Brand>> => {
    const { data } = await apiClient.get<Paginated<Brand>>(
      '/admin/catalog/brands',
      { params },
    );
    return data;
  },

  listPublic: async (
    params: { page?: number; limit?: number; search?: string } = {},
  ): Promise<Paginated<Brand>> => {
    const { data } = await apiClient.get<Paginated<Brand>>('/catalog/brands', {
      params,
    });
    return data;
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
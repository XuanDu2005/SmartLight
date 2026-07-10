import { apiClient } from './api-client';
import type {
  Category,
  CategoryTreeNode,
  CreateCategoryDto,
  Paginated,
  UpdateCategoryDto,
} from './types';

export interface ListCategoriesQuery {
  page?: number;
  limit?: number;
  search?: string;
  parentId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export const categoriesApi = {
  list: async (
    params: ListCategoriesQuery = {},
  ): Promise<Paginated<Category>> => {
    const { data } = await apiClient.get<Paginated<Category>>(
      '/admin/catalog/categories',
      { params },
    );
    return data;
  },

  listPublic: async (
    params: { page?: number; limit?: number; search?: string } = {},
  ): Promise<Paginated<Category>> => {
    const { data } = await apiClient.get<Paginated<Category>>(
      '/catalog/categories',
      { params },
    );
    return data;
  },

  tree: async (): Promise<CategoryTreeNode[]> => {
    const { data } = await apiClient.get<CategoryTreeNode[]>(
      '/catalog/categories/tree',
    );
    return data;
  },

  get: async (id: string): Promise<Category> => {
    const { data } = await apiClient.get<Category>(`/catalog/categories/${id}`);
    return data;
  },

  create: async (dto: CreateCategoryDto): Promise<Category> => {
    const { data } = await apiClient.post<Category>(
      '/admin/catalog/categories',
      dto,
    );
    return data;
  },

  update: async (id: string, dto: UpdateCategoryDto): Promise<Category> => {
    const { data } = await apiClient.patch<Category>(
      `/admin/catalog/categories/${id}`,
      dto,
    );
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/catalog/categories/${id}`);
  },

  restore: async (id: string): Promise<Category> => {
    const { data } = await apiClient.post<Category>(
      `/admin/catalog/categories/${id}/restore`,
    );
    return data;
  },
};
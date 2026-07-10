import { apiClient } from './api-client';
import type {
  ListOrdersAdminParams,
  Order,
  Paginated,
  UpdateOrderStatusDto,
} from './types';

export const ordersApi = {
  listAdmin: async (
    params: ListOrdersAdminParams = {},
  ): Promise<Paginated<Order>> => {
    const { data } = await apiClient.get<Paginated<Order>>('/admin/orders', {
      params,
    });
    return data;
  },

  getAdmin: async (id: string): Promise<Order> => {
    const { data } = await apiClient.get<Order>(`/admin/orders/${id}`);
    return data;
  },

  updateStatus: async (
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> => {
    const { data } = await apiClient.patch<Order>(
      `/admin/orders/${id}/status`,
      dto,
    );
    return data;
  },
};
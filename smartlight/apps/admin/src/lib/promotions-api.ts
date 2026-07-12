import { apiClient, unwrapPaginated } from './api-client';
import type {
  CreatePromotionDto,
  CreateVoucherDto,
  Paginated,
  PaginatedEnvelope,
  Promotion,
  PromotionStatus,
  UpdatePromotionDto,
  UpdateVoucherDto,
  Voucher,
} from './types';

export interface ListPromotionsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: PromotionStatus;
  type?: Promotion['type'];
}

export const promotionsApi = {
  listAdmin: async (
    params: ListPromotionsParams = {},
  ): Promise<Paginated<Promotion>> => {
    const { data } = await apiClient.get<PaginatedEnvelope<Promotion>>(
      '/admin/promotions',
      { params },
    );
    return unwrapPaginated(data);
  },

  getAdmin: async (id: string): Promise<Promotion> => {
    const { data } = await apiClient.get<Promotion>(`/admin/promotions/${id}`);
    return data;
  },

  create: async (dto: CreatePromotionDto): Promise<Promotion> => {
    const { data } = await apiClient.post<Promotion>(
      '/admin/promotions',
      dto,
    );
    return data;
  },

  update: async (
    id: string,
    dto: UpdatePromotionDto,
  ): Promise<Promotion> => {
    const { data } = await apiClient.patch<Promotion>(
      `/admin/promotions/${id}`,
      dto,
    );
    return data;
  },

  publish: async (id: string): Promise<Promotion> => {
    const { data } = await apiClient.patch<Promotion>(
      `/admin/promotions/${id}/publish`,
    );
    return data;
  },

  archive: async (id: string): Promise<Promotion> => {
    const { data } = await apiClient.patch<Promotion>(
      `/admin/promotions/${id}/archive`,
    );
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/promotions/${id}`);
  },

  // Vouchers
  listVouchers: async (
    promotionId: string,
  ): Promise<Paginated<Voucher>> => {
    const { data } = await apiClient.get<PaginatedEnvelope<Voucher>>(
      `/admin/promotions/${promotionId}/vouchers`,
      { params: { limit: 100 } },
    );
    return unwrapPaginated(data);
  },

  createVoucher: async (dto: CreateVoucherDto): Promise<Voucher> => {
    const { data } = await apiClient.post<Voucher>('/admin/vouchers', dto);
    return data;
  },

  updateVoucher: async (
    id: string,
    dto: UpdateVoucherDto,
  ): Promise<Voucher> => {
    const { data } = await apiClient.patch<Voucher>(
      `/admin/vouchers/${id}`,
      dto,
    );
    return data;
  },

  removeVoucher: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/vouchers/${id}`);
  },
};
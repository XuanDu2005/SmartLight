import { apiClient } from './api-client';
import type {
  ListPaymentsAdminParams,
  Paginated,
  PaymentDetail,
  PaymentSummary,
} from './types';

export const paymentsApi = {
  listAdmin: async (
    params: ListPaymentsAdminParams = {},
  ): Promise<Paginated<PaymentSummary>> => {
    const { data } = await apiClient.get<Paginated<PaymentSummary>>(
      '/admin/payments',
      { params },
    );
    return data;
  },

  getAdmin: async (id: string): Promise<PaymentDetail> => {
    const { data } = await apiClient.get<PaymentDetail>(`/admin/payments/${id}`);
    return data;
  },
};
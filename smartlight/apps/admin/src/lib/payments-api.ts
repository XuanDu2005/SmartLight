import { apiClient, unwrapPaginated } from './api-client';
import type {
  ListPaymentsAdminParams,
  Paginated,
  PaginatedEnvelope,
  PaymentDetail,
  PaymentSummary,
} from './types';

export const paymentsApi = {
  listAdmin: async (
    params: ListPaymentsAdminParams = {},
  ): Promise<Paginated<PaymentSummary>> => {
    const { data } = await apiClient.get<PaginatedEnvelope<PaymentSummary>>(
      '/admin/payments',
      { params },
    );
    return unwrapPaginated(data);
  },

  getAdmin: async (id: string): Promise<PaymentDetail> => {
    const { data } = await apiClient.get<PaymentDetail>(`/admin/payments/${id}`);
    return data;
  },
};
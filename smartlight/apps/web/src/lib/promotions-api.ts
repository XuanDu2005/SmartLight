/**
 * Promotions API client — wraps /v1/promotions/* endpoints.
 */
import { apiClient } from './api-client';

export interface PromotionDto {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  status: string;
  discountValue: number;
  minimumOrderValue: number;
  maximumDiscount: number | null;
  startsAt: string;
  endsAt: string;
}

export interface CouponValidationResult {
  valid: boolean;
  promotionId?: string;
  code?: string;
  discount?: number;
  discountType?: string;
  message?: string;
  minimumOrderValue?: number;
}

export const promotionsApi = {
  async listActive(): Promise<PromotionDto[]> {
    const res = await apiClient.get<{ data: PromotionDto[] }>('/promotions');
    return res.data.data ?? [];
  },

  async validate(code: string, orderTotal: number): Promise<CouponValidationResult> {
    const res = await apiClient.post<{ data: CouponValidationResult }>(
      '/promotions/validate',
      { code, orderTotal },
    );
    return res.data.data;
  },
};
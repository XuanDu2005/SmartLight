/**
 * Promotion response DTOs.
 */

export interface PromotionResponseDto {
  id: string;
  name: string;
  description: string | null;
  type: string;
  scope: string;
  status: string;
  discountValue: number;
  minimumOrderValue: number;
  maximumDiscount: number | null;
  startAt: string;
  endAt: string;
  priority: number;
  stackable: boolean;
  usageLimitType: string;
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  isFreeShipping: boolean;
  flashSaleStock: number | null;
  flashSaleSold: number;
  bannerMediaUrl: string | null;
  productVariantIds: string[];
  categoryIds: string[];
  brandIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PromotionSummaryDto {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  discountValue: number;
  maximumDiscount: number | null;
  startAt: string;
  endAt: string;
  bannerMediaUrl: string | null;
}

export interface VoucherResponseDto {
  id: string;
  promotionId: string;
  code: string;
  type: string;
  status: string;
  usageLimitType: string;
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  expiresAt: string;
  firstOrderOnly: boolean;
  promotion: PromotionSummaryDto | null;
}

export interface VoucherSummaryDto {
  id: string;
  code: string;
  promotionId: string;
  status: string;
  type: string;
  expiresAt: string;
  usedCount: number;
}

export interface PromotionEvaluationResponseDto {
  promotionId: string;
  type: string;
  status: 'APPLIED' | 'REJECTED';
  reason: string | null;
  discountAmount: number;
  lines: Array<{
    productVariantId: string;
    discountPerUnit: number;
    discountTotal: number;
    applied: boolean;
    reason: string | null;
  }>;
}

export interface PromotionStackResponseDto {
  orderDiscount: number;
  shippingDiscount: number;
  finalSubtotal: number;
  finalShippingFee: number;
  warnings: string[];
  evaluations: PromotionEvaluationResponseDto[];
}

export interface ApplyPromotionResponseDto extends PromotionStackResponseDto {
  voucher: {
    valid: boolean;
    reason: string | null;
    voucherId: string | null;
    promotionId: string | null;
    discountAmount: number;
    discountType: string | null;
    isFreeShipping: boolean;
  } | null;
}

export interface PromotionListResponseDto {
  items: PromotionSummaryDto[];
  total: number;
  page: number;
  limit: number;
}

export interface VoucherListResponseDto {
  items: VoucherSummaryDto[];
  total: number;
  page: number;
  limit: number;
}

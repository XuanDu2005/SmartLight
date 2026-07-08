/**
 * Repository contracts and domain types for promotions.
 */
import type {
  Prisma,
  Promotion,
  PromotionStatus,
  PromotionType,
  Voucher,
  VoucherUsage,
  VoucherType,
} from '@prisma/client';

export type PromotionWithTargets = Prisma.PromotionGetPayload<{
  include: {
    productTargets: true;
    categoryTargets: true;
    brandTargets: true;
    vouchers: true;
  };
}>;

export type VoucherWithPromotion = Prisma.VoucherGetPayload<{
  include: {
    promotion: {
      include: {
        productTargets: true;
        categoryTargets: true;
        brandTargets: true;
      };
    };
  };
}>;

export interface PromotionCreateInput {
  name: string;
  description?: string | null;
  type: PromotionType;
  scope?: 'ORDER' | 'PRODUCT' | 'CATEGORY' | 'BRAND';
  discountValue: Prisma.Decimal | number;
  minimumOrderValue?: Prisma.Decimal | number;
  maximumDiscount?: Prisma.Decimal | number | null;
  startAt: Date;
  endAt: Date;
  priority?: number;
  stackable?: boolean;
  usageLimitType?: 'UNLIMITED' | 'PER_USER' | 'TOTAL';
  usageLimit?: number | null;
  perUserLimit?: number | null;
  isFreeShipping?: boolean;
  flashSaleStock?: number | null;
  bannerMediaUrl?: string | null;
  metadata?: Record<string, unknown>;
  productVariantIds?: string[];
  categoryIds?: string[];
  brandIds?: string[];
}

export interface VoucherCreateInput {
  promotionId: string;
  code: string;
  type: VoucherType;
  usageLimitType?: 'UNLIMITED' | 'PER_USER' | 'TOTAL';
  usageLimit?: number | null;
  perUserLimit?: number | null;
  expiresAt: Date;
  firstOrderOnly?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ListPromotionsFilter {
  status?: PromotionStatus;
  type?: PromotionType;
  page: number;
  limit: number;
}

export type { Promotion, Voucher, VoucherUsage };
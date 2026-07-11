/**
 * Promotion domain constants.
 */
import { PromotionStatus, PromotionType, UsageLimitType, VoucherType } from '@prisma/client';

export const PROMOTION_LIMITS = {
  DEFAULT_CURRENCY: 'VND',
  /** Page size defaults */
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 200,
  /** Max percentage discount (e.g. 100 = 100%) */
  MAX_PERCENTAGE: 100,
  /** Default per-user limit when not specified */
  DEFAULT_PER_USER_LIMIT: 1,
  /** Default minimum order value */
  DEFAULT_MIN_ORDER_VALUE: 0,
} as const;

export const PROMOTION_ERROR_CODES = {
  PROMOTION_NOT_FOUND: 'PROMOTION_NOT_FOUND',
  VOUCHER_NOT_FOUND: 'VOUCHER_NOT_FOUND',
  PROMOTION_EXPIRED: 'PROMOTION_EXPIRED',
  PROMOTION_NOT_ACTIVE: 'PROMOTION_NOT_ACTIVE',
  PROMOTION_DISABLED: 'PROMOTION_DISABLED',
  PROMOTION_ARCHIVED: 'PROMOTION_ARCHIVED',
  PROMOTION_NOT_STARTED: 'PROMOTION_NOT_STARTED',
  PROMOTION_USAGE_LIMIT_REACHED: 'PROMOTION_USAGE_LIMIT_REACHED',
  VOUCHER_USAGE_LIMIT_REACHED: 'VOUCHER_USAGE_LIMIT_REACHED',
  VOUCHER_PER_USER_LIMIT_REACHED: 'VOUCHER_PER_USER_LIMIT_REACHED',
  VOUCHER_ALREADY_USED: 'VOUCHER_ALREADY_USED',
  VOUCHER_NOT_YET_ACTIVE: 'VOUCHER_NOT_YET_ACTIVE',
  MINIMUM_ORDER_NOT_MET: 'MINIMUM_ORDER_NOT_MET',
  MAXIMUM_DISCOUNT_EXCEEDED: 'MAXIMUM_DISCOUNT_EXCEEDED',
  ORDER_TOTAL_CANNOT_GO_NEGATIVE: 'ORDER_TOTAL_CANNOT_GO_NEGATIVE',
  INVALID_DISCOUNT_VALUE: 'INVALID_DISCOUNT_VALUE',
  STACKING_NOT_ALLOWED: 'STACKING_NOT_ALLOWED',
  FLASH_SALE_CANNOT_STACK: 'FLASH_SALE_CANNOT_STACK',
  PRODUCT_NOT_ELIGIBLE: 'PRODUCT_NOT_ELIGIBLE',
  CATEGORY_NOT_ELIGIBLE: 'CATEGORY_NOT_ELIGIBLE',
  BRAND_NOT_ELIGIBLE: 'BRAND_NOT_ELIGIBLE',
  VOUCHER_CODE_ALREADY_EXISTS: 'VOUCHER_CODE_ALREADY_EXISTS',
  UNAUTHORIZED_PROMOTION_ACCESS: 'UNAUTHORIZED_PROMOTION_ACCESS',
  PROMOTION_CANNOT_DELETE_ACTIVE: 'PROMOTION_CANNOT_DELETE_ACTIVE',
  INVALID_PROMOTION_WINDOW: 'INVALID_PROMOTION_WINDOW',
} as const;

export type PromotionErrorCode =
  (typeof PROMOTION_ERROR_CODES)[keyof typeof PROMOTION_ERROR_CODES];

/** Terminal statuses (cannot transition out). */
export const PROMOTION_TERMINAL_STATUSES: PromotionStatus[] = [
  'EXPIRED',
  'DISABLED',
  'ARCHIVED',
];

export const SUPPORTED_PROMOTION_TYPES: PromotionType[] = [
  'PERCENTAGE',
  'FIXED_AMOUNT',
  'FREE_SHIPPING',
  'FLASH_SALE',
];

export const SUPPORTED_VOUCHER_TYPES: VoucherType[] = [
  'PUBLIC',
  'PRIVATE',
  'AUTO_APPLY',
];

export const SUPPORTED_USAGE_LIMIT_TYPES: UsageLimitType[] = [
  'UNLIMITED',
  'PER_USER',
  'TOTAL',
];

/**
 * Stacking rules (per spec):
 *   - One Order Promotion + One Shipping Promotion  \u2192 ALLOWED
 *   - Two Order Promotions                          \u2192 NOT ALLOWED
 *   - Flash Sale \u2192 cannot stack with PERCENTAGE
 *   - Coupon overrides AUTO_APPLY when configured
 *   - Higher priority promotion executes first
 */
export const PROMOTION_CATEGORY = {
  ORDER: 'ORDER',
  SHIPPING: 'SHIPPING',
} as const;

export type PromotionCategory =
  (typeof PROMOTION_CATEGORY)[keyof typeof PROMOTION_CATEGORY];

export function toPromotionCategory(type: PromotionType): PromotionCategory {
  if (type === 'FREE_SHIPPING') return PROMOTION_CATEGORY.SHIPPING;
  return PROMOTION_CATEGORY.ORDER;
}

export function toPromotionType(key: string): PromotionType {
  const k = key.toUpperCase();
  if (k === 'PERCENTAGE') return 'PERCENTAGE';
  if (k === 'FIXED_AMOUNT' || k === 'FIXED') return 'FIXED_AMOUNT';
  if (k === 'FREE_SHIPPING') return 'FREE_SHIPPING';
  if (k === 'FLASH_SALE') return 'FLASH_SALE';
  throw new Error(`Unsupported promotion type: ${key}`);
}

export function toVoucherType(key: string): VoucherType {
  const k = key.toUpperCase();
  if (k === 'PUBLIC') return 'PUBLIC';
  if (k === 'PRIVATE') return 'PRIVATE';
  if (k === 'AUTO_APPLY') return 'AUTO_APPLY';
  throw new Error(`Unsupported voucher type: ${key}`);
}

export function toUsageLimitType(key: string): UsageLimitType {
  const k = key.toUpperCase();
  if (k === 'UNLIMITED') return 'UNLIMITED';
  if (k === 'PER_USER') return 'PER_USER';
  if (k === 'TOTAL') return 'TOTAL';
  throw new Error(`Unsupported usage limit type: ${key}`);
}

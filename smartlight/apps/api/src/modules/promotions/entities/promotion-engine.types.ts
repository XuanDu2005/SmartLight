/**
 * Promotion engine domain types.
 *
 * The engine is a stateless calculator. Inputs are normalized, outputs are
 * normalized \u2014 callers can re-use the outputs as receipts.
 */

import type { PromotionType } from '@prisma/client';

export interface PromotionCartItem {
  productVariantId: string;
  productId?: string;
  categoryId?: string;
  brandId?: string;
  quantity: number;
  unitPrice: number;
  /** Pre-tax line subtotal */
  lineSubtotal: number;
}

export interface PromotionCartContext {
  userId: string | null;
  isFirstOrder?: boolean;
  currency: string;
  items: PromotionCartItem[];
  shippingFee: number;
  /** Pre-discount order subtotal (sum of line subtotals). */
  subtotal: number;
}

export interface PromotionEligibilityLine {
  productVariantId: string;
  eligible: boolean;
  /** Item amount the promotion can be applied to. */
  applicableAmount: number;
}

export interface PromotionEvaluationLine {
  productVariantId: string;
  discountPerUnit: number;
  discountTotal: number;
  applied: boolean;
  reason: string | null;
}

export interface PromotionEvaluation {
  promotionId: string;
  type: PromotionType;
  status: 'APPLIED' | 'REJECTED';
  reason: string | null;
  discountAmount: number;
  lines: PromotionEvaluationLine[];
  /** Order subtotal after applying this promotion. */
  subtotalAfter: number;
}

export interface PromotionStackResult {
  /** Total discount applied to the order (negative = cart total reduction). */
  orderDiscount: number;
  /** Total shipping fee waived. */
  shippingDiscount: number;
  evaluations: PromotionEvaluation[];
  /** Final order total after all applied promotions. */
  finalSubtotal: number;
  /** Final shipping fee after all applied promotions. */
  finalShippingFee: number;
  /** Warnings (non-fatal). */
  warnings: string[];
}

export interface VoucherValidationInput {
  code: string;
  userId: string | null;
  context: PromotionCartContext;
}

export interface VoucherValidationResult {
  valid: boolean;
  reason: string | null;
  voucherId: string | null;
  promotionId: string | null;
  discountAmount: number;
  discountType: PromotionType | null;
  isFreeShipping: boolean;
}

export interface ApplyPromotionRequest {
  /** Order context \u2014 the engine will compute discount without DB writes. */
  context: PromotionCartContext;
  /** Voucher code (optional). Coupon overrides auto-apply when present. */
  voucherCode?: string | null;
  /** Auto-apply promotion ids to consider (filtered by eligibility). */
  autoApplyPromotionIds?: string[];
}

export interface ApplyPromotionResult extends PromotionStackResult {
  voucher: VoucherValidationResult | null;
}
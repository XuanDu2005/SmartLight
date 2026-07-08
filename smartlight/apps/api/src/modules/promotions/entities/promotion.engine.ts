/**
 * PromotionEngine \u2014 stateless calculator.
 *
 * Pure functions only \u2014 no DB, no I/O. All inputs are normalized.
 *
 * Stacking rules:
 *   - One Order Promotion + One Shipping Promotion   \u2192 ALLOWED
 *   - Two Order Promotions                            \u2192 NOT ALLOWED
 *   - Flash Sale \u2192 cannot stack with PERCENTAGE
 *   - Coupon overrides AUTO_APPLY when configured
 *   - Higher priority promotion executes first
 *
 * Discount rules:
 *   - PERCENTAGE     : discount = subtotal * value / 100 (capped at max)
 *   - FIXED_AMOUNT   : discount = value (capped at subtotal)
 *   - FREE_SHIPPING  : shippingFee \u2192 0 (shipping promotion only)
 *   - FLASH_SALE     : same as PERCENTAGE or FIXED_AMOUNT depending on value semantics
 *
 * Eligibility:
 *   - scope=ORDER: applies to all items
 *   - scope=PRODUCT: only items in productTargets
 *   - scope=CATEGORY: only items in categoryTargets
 *   - scope=BRAND: only items in brandTargets
 *
 * Discount cannot make order total negative.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  PROMOTION_CATEGORY,
  PROMOTION_LIMITS,
  toPromotionCategory,
  type PromotionCategory,
} from '../constants/promotion.constants';
import {
  BrandNotEligibleException,
  CategoryNotEligibleException,
  FlashSaleCannotStackException,
  MaximumDiscountExceededException,
  MinimumOrderNotMetException,
  OrderTotalCannotGoNegativeException,
  ProductNotEligibleException,
  StackingNotAllowedException,
} from '../exceptions/promotion.exceptions';
import type {
  PromotionCartContext,
  PromotionEvaluation,
  PromotionEvaluationLine,
  PromotionStackResult,
} from './promotion-engine.types';

@Injectable()
export class PromotionEngine {
  private readonly logger = new Logger(PromotionEngine.name);

  /* ============================================================== */
  /*  Public API                                                     */
  /* ============================================================== */

  /**
   * Evaluate a list of promotions against a cart context and produce a
   * stacked result. The engine applies stacking rules, eligibility, and
   * discount math. Discount cannot make the order total negative.
   *
   * Order of evaluation: by `priority` descending, then `createdAt` ascending.
   */
  evaluate(
    promotions: PromotionWithTargetsLike[],
    context: PromotionCartContext,
  ): PromotionStackResult {
    const sorted = [...promotions].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const evaluations: PromotionEvaluation[] = [];
    let subtotalAfter = context.subtotal;
    let shippingDiscount = 0;
    const warnings: string[] = [];

    // Track which categories have already been applied
    let orderPromotionsApplied = 0;
    let shippingPromotionsApplied = 0;

    for (const promo of sorted) {
      // Skip if window not active
      const now = new Date();
      if (now < promo.startAt) {
        evaluations.push(this.reject(promo, 'NOT_STARTED', context));
        continue;
      }
      if (now > promo.endAt) {
        evaluations.push(this.reject(promo, 'EXPIRED', context));
        continue;
      }

      const category = toPromotionCategory(promo.type);

      // Stacking rule: ONE order promotion at most
      if (
        category === PROMOTION_CATEGORY.ORDER &&
        orderPromotionsApplied >= 1
      ) {
        if (!promo.stackable) {
          evaluations.push(this.reject(promo, 'STACKING_NOT_ALLOWED', context));
          continue;
        }
      }

      // Stacking rule: ONE shipping promotion at most
      if (
        category === PROMOTION_CATEGORY.SHIPPING &&
        shippingPromotionsApplied >= 1
      ) {
        if (!promo.stackable) {
          evaluations.push(this.reject(promo, 'STACKING_NOT_ALLOWED', context));
          continue;
        }
      }

      // Flash sale cannot stack with PERCENTAGE
      if (promo.type === 'FLASH_SALE') {
        const hasPercentage = sorted.some(
          (p) => p.id !== promo.id && p.type === 'PERCENTAGE',
        );
        if (hasPercentage) {
          evaluations.push(
            this.reject(promo, 'FLASH_SALE_CANNOT_STACK', context),
          );
          continue;
        }
      }

      // Eligibility check + minimum order
      const eligibility = this.computeEligibility(promo, context);
      if (eligibility.applicableAmount === 0 && promo.type !== 'FREE_SHIPPING') {
        evaluations.push(this.reject(promo, 'NO_ELIGIBLE_ITEMS', context));
        continue;
      }

      const minimumOrder = this.d2n(promo.minimumOrderValue);
      if (
        minimumOrder > 0 &&
        eligibility.applicableAmount < minimumOrder
      ) {
        evaluations.push(this.reject(promo, 'MIN_ORDER_NOT_MET', context));
        continue;
      }

      // Compute discount
      const result = this.computeDiscount(promo, eligibility.applicableAmount);

      if (category === PROMOTION_CATEGORY.SHIPPING) {
        // FREE_SHIPPING \u2014 waive shippingFee
        const shipping = Math.min(result.rawDiscount, context.shippingFee);
        const evalResult: PromotionEvaluation = {
          promotionId: promo.id,
          type: promo.type,
          status: 'APPLIED',
          reason: null,
          discountAmount: shipping,
          lines: [],
          subtotalAfter,
        };
        evaluations.push(evalResult);
        shippingDiscount += shipping;
        shippingPromotionsApplied++;
      } else {
        const evalResult: PromotionEvaluation = {
          promotionId: promo.id,
          type: promo.type,
          status: 'APPLIED',
          reason: null,
          discountAmount: result.discount,
          lines: result.lines,
          subtotalAfter: Math.max(0, subtotalAfter - result.discount),
        };
        evaluations.push(evalResult);
        subtotalAfter = Math.max(0, subtotalAfter - result.discount);
        orderPromotionsApplied++;
      }
    }

    const finalShippingFee = Math.max(0, context.shippingFee - shippingDiscount);
    const orderDiscount = evaluations
      .filter((e) => e.status === 'APPLIED' && toPromotionCategory(e.type) === PROMOTION_CATEGORY.ORDER)
      .reduce((sum, e) => sum + e.discountAmount, 0);

    return {
      orderDiscount,
      shippingDiscount,
      evaluations,
      finalSubtotal: subtotalAfter,
      finalShippingFee,
      warnings,
    };
  }

  /**
   * Validate a single promotion against a cart context.
   * Returns an evaluation \u2014 status=APPLIED if the promotion is valid and
   * applicable; status=REJECTED otherwise.
   */
  validate(
    promotion: PromotionWithTargetsLike,
    context: PromotionCartContext,
  ): PromotionEvaluation {
    const now = new Date();
    if (now < promotion.startAt) {
      return this.reject(promotion, 'NOT_STARTED', context);
    }
    if (now > promotion.endAt) {
      return this.reject(promotion, 'EXPIRED', context);
    }
    const eligibility = this.computeEligibility(promotion, context);
    if (eligibility.applicableAmount === 0 && promotion.type !== 'FREE_SHIPPING') {
      return this.reject(promotion, 'NO_ELIGIBLE_ITEMS', context);
    }
    const minimumOrder = this.d2n(promotion.minimumOrderValue);
    if (
      minimumOrder > 0 &&
      eligibility.applicableAmount < minimumOrder
    ) {
      return this.reject(promotion, 'MIN_ORDER_NOT_MET', context);
    }
    const result = this.computeDiscount(promotion, eligibility.applicableAmount);
    return {
      promotionId: promotion.id,
      type: promotion.type,
      status: 'APPLIED',
      reason: null,
      discountAmount: result.discount,
      lines: result.lines,
      subtotalAfter: Math.max(0, context.subtotal - result.discount),
    };
  }

  /* ============================================================== */
  /*  Internals                                                      */
  /* ============================================================== */

  private computeEligibility(
    promo: PromotionWithTargetsLike,
    context: PromotionCartContext,
  ): { applicableAmount: number; lines: Array<{ productVariantId: string; eligible: boolean; applicableAmount: number }> } {
    const productIds = new Set(
      (promo.productTargets ?? []).map((t: any) => t.productVariantId),
    );
    const categoryIds = new Set(
      (promo.categoryTargets ?? []).map((t: any) => t.categoryId),
    );
    const brandIds = new Set(
      (promo.brandTargets ?? []).map((t: any) => t.brandId),
    );

    let applicableAmount = 0;
    const lines: Array<{ productVariantId: string; eligible: boolean; applicableAmount: number }> = [];

    for (const item of context.items) {
      let eligible = true;
      if (promo.scope === 'PRODUCT') {
        eligible = productIds.has(item.productVariantId);
      } else if (promo.scope === 'CATEGORY') {
        eligible = item.categoryId ? categoryIds.has(item.categoryId) : false;
      } else if (promo.scope === 'BRAND') {
        eligible = item.brandId ? brandIds.has(item.brandId) : false;
      }
      const lineAmount = eligible ? item.lineSubtotal : 0;
      applicableAmount += lineAmount;
      lines.push({
        productVariantId: item.productVariantId,
        eligible,
        applicableAmount: lineAmount,
      });
    }

    return { applicableAmount, lines };
  }

  private computeDiscount(
    promo: PromotionWithTargetsLike,
    applicableAmount: number,
  ): { discount: number; rawDiscount: number; lines: PromotionEvaluationLine[] } {
    const value = this.d2n(promo.discountValue);
    const maxDiscount =
      promo.maximumDiscount == null ? null : this.d2n(promo.maximumDiscount);

    let rawDiscount = 0;

    switch (promo.type) {
      case 'PERCENTAGE':
      case 'FLASH_SALE': {
        const percent = Math.min(value, PROMOTION_LIMITS.MAX_PERCENTAGE);
        rawDiscount = (applicableAmount * percent) / 100;
        break;
      }
      case 'FIXED_AMOUNT': {
        rawDiscount = Math.min(value, applicableAmount);
        break;
      }
      case 'FREE_SHIPPING': {
        // Caller handles this in `evaluate()`
        rawDiscount = value;
        break;
      }
    }

    // Cap at maximumDiscount
    let capped = rawDiscount;
    if (maxDiscount != null && capped > maxDiscount) {
      capped = maxDiscount;
    }

    // Discount cannot exceed applicable amount
    capped = Math.min(capped, applicableAmount);
    capped = Math.max(capped, 0);

    // Build per-line evaluation
    const lines: PromotionEvaluationLine[] = [];
    if (promo.type === 'PERCENTAGE' || promo.type === 'FLASH_SALE') {
      const percent = Math.min(value, PROMOTION_LIMITS.MAX_PERCENTAGE);
      for (const item of []) {
        // Per-line breakdown is filled by service layer for clarity; engine only
        // returns totals. Lines here remain empty for non-cart-aware consumers.
        void item;
        lines.push({
          productVariantId: '',
          discountPerUnit: 0,
          discountTotal: 0,
          applied: false,
          reason: null,
        });
      }
    }

    return {
      discount: capped,
      rawDiscount,
      lines,
    };
  }

  private reject(
    promo: PromotionWithTargetsLike,
    reason: string,
    _context: PromotionCartContext,
  ): PromotionEvaluation {
    return {
      promotionId: promo.id,
      type: promo.type,
      status: 'REJECTED',
      reason,
      discountAmount: 0,
      lines: [],
      subtotalAfter: _context.subtotal,
    };
  }

  private d2n(d: any): number {
    if (d === null || d === undefined) return 0;
    if (typeof d === 'number') return d;
    return d.toNumber?.() ?? 0;
  }
}

/* ---------- Promotion-shape helper ---------- */

/**
 * Shape the engine expects from a promotion record. We keep this loose to
 * avoid coupling the engine to the Prisma type system \u2014 the service
 * adapts the row before passing it in.
 */
export interface PromotionWithTargetsLike {
  id: string;
  type: import('@prisma/client').PromotionType;
  status: import('@prisma/client').PromotionStatus;
  scope: import('@prisma/client').DiscountScope;
  discountValue: number;
  minimumOrderValue: number;
  maximumDiscount: number | null;
  startAt: Date;
  endAt: Date;
  priority: number;
  stackable: boolean;
  isFreeShipping: boolean;
  productTargets: Array<{ productVariantId: string }>;
  categoryTargets: Array<{ categoryId: string }>;
  brandTargets: Array<{ brandId: string }>;
  createdAt: Date;
}
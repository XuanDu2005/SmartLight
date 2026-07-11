/**
 * Promotion HTTP exceptions.
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import type { PromotionErrorCode } from '../constants/promotion.constants';

export class PromotionException extends HttpException {
  public readonly code: PromotionErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: PromotionErrorCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, httpStatus);
    this.code = code;
    this.details = details;
  }
}

export class PromotionNotFoundException extends PromotionException {
  constructor(id?: string) {
    super(
      'PROMOTION_NOT_FOUND',
      id ? `Promotion not found: ${id}` : 'Promotion not found',
      HttpStatus.NOT_FOUND,
      id ? { id } : undefined,
    );
  }
}

export class VoucherNotFoundException extends PromotionException {
  constructor(code?: string) {
    super(
      'VOUCHER_NOT_FOUND',
      code ? `Voucher not found: ${code}` : 'Voucher not found',
      HttpStatus.NOT_FOUND,
      code ? { code } : undefined,
    );
  }
}

export class PromotionExpiredException extends PromotionException {
  constructor(id: string) {
    super(
      'PROMOTION_EXPIRED',
      `Promotion ${id} has expired`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { id },
    );
  }
}

export class PromotionNotActiveException extends PromotionException {
  constructor(id: string, status: string) {
    super(
      'PROMOTION_NOT_ACTIVE',
      `Promotion ${id} is not active (status: ${status})`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { id, status },
    );
  }
}

export class PromotionDisabledException extends PromotionException {
  constructor(id: string) {
    super(
      'PROMOTION_DISABLED',
      `Promotion ${id} is disabled`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { id },
    );
  }
}

export class PromotionArchivedException extends PromotionException {
  constructor(id: string) {
    super(
      'PROMOTION_ARCHIVED',
      `Promotion ${id} is archived`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { id },
    );
  }
}

export class PromotionUsageLimitReachedException extends PromotionException {
  constructor(id: string, limit: number) {
    super(
      'PROMOTION_USAGE_LIMIT_REACHED',
      `Promotion ${id} reached usage limit ${limit}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { id, limit },
    );
  }
}

export class VoucherUsageLimitReachedException extends PromotionException {
  constructor(code: string, limit: number) {
    super(
      'VOUCHER_USAGE_LIMIT_REACHED',
      `Voucher ${code} reached usage limit ${limit}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { code, limit },
    );
  }
}

export class VoucherPerUserLimitReachedException extends PromotionException {
  constructor(code: string, limit: number) {
    super(
      'VOUCHER_PER_USER_LIMIT_REACHED',
      `Voucher ${code} per-user limit reached (${limit})`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { code, limit },
    );
  }
}

export class VoucherAlreadyUsedException extends PromotionException {
  constructor(code: string) {
    super(
      'VOUCHER_ALREADY_USED',
      `Voucher ${code} has already been used`,
      HttpStatus.CONFLICT,
      { code },
    );
  }
}

export class MinimumOrderNotMetException extends PromotionException {
  constructor(minimum: number, actual: number) {
    super(
      'MINIMUM_ORDER_NOT_MET',
      `Minimum order not met: required ${minimum}, got ${actual}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { minimum, actual },
    );
  }
}

export class MaximumDiscountExceededException extends PromotionException {
  constructor(computed: number, max: number) {
    super(
      'MAXIMUM_DISCOUNT_EXCEEDED',
      `Computed discount ${computed} exceeds maximum ${max}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { computed, max },
    );
  }
}

export class OrderTotalCannotGoNegativeException extends PromotionException {
  constructor(total: number, discount: number) {
    super(
      'ORDER_TOTAL_CANNOT_GO_NEGATIVE',
      `Discount ${discount} would make order total ${total} negative`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { total, discount },
    );
  }
}

export class StackingNotAllowedException extends PromotionException {
  constructor(reason: string) {
    super(
      'STACKING_NOT_ALLOWED',
      `Stacking not allowed: ${reason}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { reason },
    );
  }
}

export class FlashSaleCannotStackException extends PromotionException {
  constructor(promotionId: string) {
    super(
      'FLASH_SALE_CANNOT_STACK',
      `Flash sale promotion ${promotionId} cannot stack with percentage promotions`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { promotionId },
    );
  }
}

export class ProductNotEligibleException extends PromotionException {
  constructor(productVariantId: string, promotionId: string) {
    super(
      'PRODUCT_NOT_ELIGIBLE',
      `Product ${productVariantId} not eligible for promotion ${promotionId}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { productVariantId, promotionId },
    );
  }
}

export class CategoryNotEligibleException extends PromotionException {
  constructor(categoryId: string, promotionId: string) {
    super(
      'CATEGORY_NOT_ELIGIBLE',
      `Category ${categoryId} not eligible for promotion ${promotionId}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { categoryId, promotionId },
    );
  }
}

export class BrandNotEligibleException extends PromotionException {
  constructor(brandId: string, promotionId: string) {
    super(
      'BRAND_NOT_ELIGIBLE',
      `Brand ${brandId} not eligible for promotion ${promotionId}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { brandId, promotionId },
    );
  }
}

export class VoucherCodeAlreadyExistsException extends PromotionException {
  constructor(code: string) {
    super(
      'VOUCHER_CODE_ALREADY_EXISTS',
      `Voucher code already exists: ${code}`,
      HttpStatus.CONFLICT,
      { code },
    );
  }
}

export class PromotionCannotDeleteActiveException extends PromotionException {
  constructor(id: string) {
    super(
      'PROMOTION_CANNOT_DELETE_ACTIVE',
      `Cannot delete active promotion ${id}; archive it first`,
      HttpStatus.CONFLICT,
      { id },
    );
  }
}

export class InvalidPromotionWindowException extends PromotionException {
  constructor(reason: string) {
    super(
      'INVALID_PROMOTION_WINDOW',
      `Invalid promotion window: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { reason },
    );
  }
}

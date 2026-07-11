/**
 * Cart HTTP exceptions.
 *
 * Each exception carries a stable `code` field that maps 1:1 with the codes in
 * `cart.constants.ts:CART_ERROR_CODES`. The exception filter (and clients) use
 * those codes rather than HTTP status for programmatic branching.
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import { CART_ERROR_CODES, type CartErrorCode } from '../constants/cart.constants';

export class CartException extends HttpException {
  public readonly code: CartErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: CartErrorCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, httpStatus);
    this.code = code;
    this.details = details;
  }
}

export class CartNotFoundException extends CartException {
  constructor(identifier?: string) {
    super(
      CART_ERROR_CODES.CART_NOT_FOUND,
      identifier ? `Cart not found: ${identifier}` : 'Cart not found',
      HttpStatus.NOT_FOUND,
      identifier ? { id: identifier } : undefined,
    );
  }
}

export class CartItemNotFoundException extends CartException {
  constructor(itemId?: string) {
    super(
      CART_ERROR_CODES.CART_ITEM_NOT_FOUND,
      itemId ? `Cart item not found: ${itemId}` : 'Cart item not found',
      HttpStatus.NOT_FOUND,
      itemId ? { itemId } : undefined,
    );
  }
}

export class InvalidQuantityException extends CartException {
  constructor(reason: 'zero' | 'negative' | 'too_large' | 'not_integer', value?: number) {
    const code = CART_ERROR_CODES.CART_INVALID_QUANTITY;
    const map: Record<typeof reason, string> = {
      zero: 'Quantity must be at least 1',
      negative: 'Quantity cannot be negative',
      too_large: 'Quantity exceeds maximum allowed per line',
      not_integer: 'Quantity must be an integer',
    };
    super(code, map[reason], HttpStatus.BAD_REQUEST, { value });
  }
}

export class QuantityExceedsStockException extends CartException {
  constructor(requested: number, available: number, variantId?: string) {
    super(
      CART_ERROR_CODES.CART_QUANTITY_EXCEEDS_STOCK,
      `Requested quantity ${requested} exceeds available stock ${available}`,
      HttpStatus.CONFLICT,
      { requested, available, variantId },
    );
  }
}

export class MaxCartItemsReachedException extends CartException {
  constructor(limit: number) {
    super(
      CART_ERROR_CODES.CART_MAX_ITEMS_REACHED,
      `Cart cannot hold more than ${limit} distinct items`,
      HttpStatus.CONFLICT,
      { limit },
    );
  }
}

export class CartVariantUnavailableException extends CartException {
  constructor(variantId: string, reason: string) {
    super(
      CART_ERROR_CODES.CART_VARIANT_UNAVAILABLE,
      `Variant ${variantId} is unavailable: ${reason}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { variantId, reason },
    );
  }
}

export class ProductInactiveException extends CartException {
  constructor(productId: string) {
    super(
      CART_ERROR_CODES.CART_PRODUCT_INACTIVE,
      `Product ${productId} is not currently active`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { productId },
    );
  }
}

export class VariantInactiveException extends CartException {
  constructor(variantId: string) {
    super(
      CART_ERROR_CODES.CART_VARIANT_INACTIVE,
      `Variant ${variantId} is not currently active`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { variantId },
    );
  }
}

export class CartEmptyException extends CartException {
  constructor(operation: string) {
    super(
      CART_ERROR_CODES.CART_EMPTY,
      `Cart is empty; cannot ${operation}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { operation },
    );
  }
}

export class CartNotActiveException extends CartException {
  constructor(cartId: string, currentStatus: string) {
    super(
      CART_ERROR_CODES.CART_NOT_ACTIVE,
      `Cart ${cartId} is not active (current status: ${currentStatus})`,
      HttpStatus.CONFLICT,
      { cartId, currentStatus },
    );
  }
}


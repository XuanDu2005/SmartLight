/**
 * Checkout HTTP exceptions.
 *
 * Each carries a stable `code` from `checkout.constants.ts:CHECKOUT_ERROR_CODES`.
 * The exception filter maps those codes to HTTP status.
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import type { CheckoutErrorCode } from '../constants/checkout.constants';

export class CheckoutException extends HttpException {
  public readonly code: CheckoutErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: CheckoutErrorCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, httpStatus);
    this.code = code;
    this.details = details;
  }
}

export class CheckoutNotFoundException extends CheckoutException {
  constructor(id?: string) {
    super(
      'CHECKOUT_NOT_FOUND',
      id ? `Checkout session not found: ${id}` : 'Checkout session not found',
      HttpStatus.NOT_FOUND,
      id ? { id } : undefined,
    );
  }
}

export class CheckoutExpiredException extends CheckoutException {
  constructor(id: string) {
    super(
      'CHECKOUT_EXPIRED',
      `Checkout session ${id} has expired`,
      HttpStatus.GONE,
      { id },
    );
  }
}

export class CheckoutCancelledException extends CheckoutException {
  constructor(id: string) {
    super(
      'CHECKOUT_CANCELLED',
      `Checkout session ${id} was cancelled`,
      HttpStatus.CONFLICT,
      { id },
    );
  }
}

export class CheckoutCompletedException extends CheckoutException {
  constructor(id: string) {
    super(
      'CHECKOUT_COMPLETED',
      `Checkout session ${id} has already been completed`,
      HttpStatus.CONFLICT,
      { id },
    );
  }
}

export class CheckoutInvalidStatusException extends CheckoutException {
  constructor(id: string, currentStatus: string, required: string) {
    super(
      'CHECKOUT_INVALID_STATUS',
      `Checkout ${id} has status '${currentStatus}'; requires '${required}'`,
      HttpStatus.CONFLICT,
      { id, currentStatus, required },
    );
  }
}

export class EmptyCartException extends CheckoutException {
  constructor() {
    super(
      'EMPTY_CART',
      'Cannot checkout: cart has no selected items',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class NoSelectedItemsException extends CheckoutException {
  constructor() {
    super(
      'NO_SELECTED_ITEMS',
      'Cannot checkout: no items are selected',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class ProductUnavailableException extends CheckoutException {
  constructor(productId: string) {
    super(
      'PRODUCT_UNAVAILABLE',
      `Product ${productId} is not currently available`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { productId },
    );
  }
}

export class VariantUnavailableException extends CheckoutException {
  constructor(variantId: string, reason?: string) {
    super(
      'VARIANT_UNAVAILABLE',
      reason
        ? `Variant ${variantId} is unavailable: ${reason}`
        : `Variant ${variantId} is unavailable`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { variantId, reason },
    );
  }
}

export class InsufficientStockException extends CheckoutException {
  constructor(
    variantId: string,
    requested: number,
    available: number,
  ) {
    super(
      'INSUFFICIENT_STOCK',
      `Insufficient stock for variant ${variantId}: requested ${requested}, available ${available}`,
      HttpStatus.CONFLICT,
      { variantId, requested, available },
    );
  }
}

export class ReservationFailedException extends CheckoutException {
  constructor(reason: string) {
    super(
      'RESERVATION_FAILED',
      `Inventory reservation failed: ${reason}`,
      HttpStatus.CONFLICT,
      { reason },
    );
  }
}

export class ReservationExpiredException extends CheckoutException {
  constructor(id: string) {
    super(
      'RESERVATION_EXPIRED',
      `Stock reservation ${id} has expired`,
      HttpStatus.GONE,
      { id },
    );
  }
}

export class InvalidAddressException extends CheckoutException {
  constructor(field: string, reason: string) {
    super(
      'INVALID_ADDRESS',
      `Invalid address field '${field}': ${reason}`,
      HttpStatus.BAD_REQUEST,
      { field, reason },
    );
  }
}

export class UnauthorizedCheckoutAccessException extends CheckoutException {
  constructor(checkoutId: string, userId: string) {
    super(
      'UNAUTHORIZED_ACCESS',
      `User ${userId} does not own checkout ${checkoutId}`,
      HttpStatus.FORBIDDEN,
      { checkoutId, userId },
    );
  }
}

export class IdempotencyConflictException extends CheckoutException {
  constructor(key: string) {
    super(
      'IDEMPOTENCY_CONFLICT',
      `Idempotency key '${key}' already used for a different checkout`,
      HttpStatus.CONFLICT,
      { key },
    );
  }
}


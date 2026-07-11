/**
 * Inventory HTTP exceptions.
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import type { InventoryErrorCode } from '../constants/inventory.constants';

export class InventoryException extends HttpException {
  public readonly code: InventoryErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: InventoryErrorCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, httpStatus);
    this.code = code;
    this.details = details;
  }
}

export class InventoryNotFoundException extends InventoryException {
  constructor(variantId?: string) {
    super(
      'INVENTORY_NOT_FOUND',
      variantId
        ? `Inventory not found for variant: ${variantId}`
        : 'Inventory record not found',
      HttpStatus.NOT_FOUND,
      variantId ? { variantId } : undefined,
    );
  }
}

export class InsufficientStockException extends InventoryException {
  constructor(variantId: string, requested: number, available: number) {
    super(
      'INSUFFICIENT_STOCK',
      `Insufficient stock for variant ${variantId}: requested ${requested}, available ${available}`,
      HttpStatus.CONFLICT,
      { variantId, requested, available },
    );
  }
}

export class InvalidQuantityException extends InventoryException {
  constructor(quantity: number, reason: string) {
    super(
      'INVALID_QUANTITY',
      `Invalid quantity ${quantity}: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { quantity, reason },
    );
  }
}

export class StockReservationFailedException extends InventoryException {
  constructor(variantId: string, reason: string) {
    super(
      'STOCK_RESERVATION_FAILED',
      `Stock reservation failed for variant ${variantId}: ${reason}`,
      HttpStatus.CONFLICT,
      { variantId, reason },
    );
  }
}

export class StockNegativePreventedException extends InventoryException {
  constructor(variantId: string, currentOnHand: number, requestedDelta: number) {
    super(
      'STOCK_NEGATIVE_PREVENTED',
      `Operation would make stock negative for variant ${variantId}: onHand=${currentOnHand}, delta=${requestedDelta}`,
      HttpStatus.CONFLICT,
      { variantId, currentOnHand, requestedDelta },
    );
  }
}

export class ProductVariantNotFoundException extends InventoryException {
  constructor(variantId: string) {
    super(
      'PRODUCT_VARIANT_NOT_FOUND',
      `Product variant not found: ${variantId}`,
      HttpStatus.NOT_FOUND,
      { variantId },
    );
  }
}

export class VariantAlreadyHasInventoryException extends InventoryException {
  constructor(variantId: string) {
    super(
      'VARIANT_ALREADY_HAS_INVENTORY',
      `Variant ${variantId} already has an inventory record`,
      HttpStatus.CONFLICT,
      { variantId },
    );
  }
}

export class ReservationExpiredException extends InventoryException {
  constructor(variantId: string) {
    super(
      'RESERVATION_EXPIRED',
      `Reservation for variant ${variantId} has expired`,
      HttpStatus.GONE,
      { variantId },
    );
  }
}

export class AdjustmentRequiresReasonException extends InventoryException {
  constructor() {
    super(
      'ADJUSTMENT_REQUIRES_REASON',
      'Stock adjustment requires a reason',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class UnauthorizedInventoryAccessException extends InventoryException {
  constructor() {
    super(
      'UNAUTHORIZED_INVENTORY_ACCESS',
      'You do not have permission to access this inventory',
      HttpStatus.FORBIDDEN,
    );
  }
}

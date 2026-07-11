/**
 * Order HTTP exceptions.
 *
 * Each carries a stable `code` from `order.constants.ts:ORDER_ERROR_CODES`.
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import type { OrderErrorCode } from '../constants/order.constants';

export class OrderException extends HttpException {
  public readonly code: OrderErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: OrderErrorCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, httpStatus);
    this.code = code;
    this.details = details;
  }
}

export class OrderNotFoundException extends OrderException {
  constructor(id?: string) {
    super(
      'ORDER_NOT_FOUND',
      id ? `Order not found: ${id}` : 'Order not found',
      HttpStatus.NOT_FOUND,
      id ? { id } : undefined,
    );
  }
}

export class OrderAlreadyExistsException extends OrderException {
  constructor(checkoutId: string) {
    super(
      'ORDER_ALREADY_EXISTS',
      `Order already exists for checkout session ${checkoutId}`,
      HttpStatus.CONFLICT,
      { checkoutId },
    );
  }
}

export class InvalidStatusTransitionException extends OrderException {
  constructor(
    orderId: string,
    fromStatus: string,
    toStatus: string,
  ) {
    super(
      'INVALID_STATUS_TRANSITION',
      `Cannot transition order ${orderId} from '${fromStatus}' to '${toStatus}'`,
      HttpStatus.CONFLICT,
      { orderId, fromStatus, toStatus },
    );
  }
}

export class CheckoutNotReadyException extends OrderException {
  constructor(checkoutId: string, currentStatus: string) {
    super(
      'CHECKOUT_NOT_READY',
      `Checkout ${checkoutId} is not ready for order creation (current status: ${currentStatus})`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { checkoutId, currentStatus },
    );
  }
}

export class CheckoutNoReservationException extends OrderException {
  constructor(checkoutId: string) {
    super(
      'CHECKOUT_NO_RESERVATION',
      `Checkout ${checkoutId} has no active stock reservation`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { checkoutId },
    );
  }
}

export class CheckoutReservationNotActiveException extends OrderException {
  constructor(checkoutId: string, status: string) {
    super(
      'CHECKOUT_RESERVATION_NOT_ACTIVE',
      `Checkout ${checkoutId} reservation is not active (status: ${status})`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { checkoutId, status },
    );
  }
}

export class OrderAlreadyCancelledException extends OrderException {
  constructor(id: string) {
    super(
      'ORDER_ALREADY_CANCELLED',
      `Order ${id} is already cancelled`,
      HttpStatus.CONFLICT,
      { id },
    );
  }
}

export class OrderAlreadyCompletedException extends OrderException {
  constructor(id: string) {
    super(
      'ORDER_ALREADY_COMPLETED',
      `Order ${id} has already been completed`,
      HttpStatus.CONFLICT,
      { id },
    );
  }
}

export class OrderDeliveredCannotCancelException extends OrderException {
  constructor(id: string) {
    super(
      'ORDER_DELIVERED_CANNOT_CANCEL',
      `Order ${id} has been delivered and cannot be cancelled`,
      HttpStatus.CONFLICT,
      { id },
    );
  }
}

export class UnauthorizedOrderAccessException extends OrderException {
  constructor(orderId: string, userId: string) {
    super(
      'UNAUTHORIZED_ORDER_ACCESS',
      `User ${userId} does not own order ${orderId}`,
      HttpStatus.FORBIDDEN,
      { orderId, userId },
    );
  }
}

export class EmptyOrderException extends OrderException {
  constructor() {
    super(
      'EMPTY_ORDER',
      'Cannot create order: checkout has no items',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

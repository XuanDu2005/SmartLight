/**
 * Payment HTTP exceptions.
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import type { PaymentErrorCode } from '../constants/payment.constants';

export class PaymentException extends HttpException {
  public readonly code: PaymentErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: PaymentErrorCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, httpStatus);
    this.code = code;
    this.details = details;
  }
}

export class PaymentNotFoundException extends PaymentException {
  constructor(id?: string) {
    super(
      'PAYMENT_NOT_FOUND',
      id ? `Payment not found: ${id}` : 'Payment not found',
      HttpStatus.NOT_FOUND,
      id ? { id } : undefined,
    );
  }
}

export class OrderNotFoundForPaymentException extends PaymentException {
  constructor(orderId: string) {
    super(
      'ORDER_NOT_FOUND',
      `Order not found for payment: ${orderId}`,
      HttpStatus.NOT_FOUND,
      { orderId },
    );
  }
}

export class OrderNotPayableException extends PaymentException {
  constructor(orderId: string, currentStatus: string) {
    super(
      'ORDER_NOT_PAYABLE',
      `Order ${orderId} is not payable (current status: ${currentStatus})`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { orderId, currentStatus },
    );
  }
}

export class InvalidPaymentStateException extends PaymentException {
  constructor(id: string, currentStatus: string, required: string) {
    super(
      'INVALID_PAYMENT_STATE',
      `Payment ${id} is in state '${currentStatus}'; requires '${required}'`,
      HttpStatus.CONFLICT,
      { id, currentStatus, required },
    );
  }
}

export class InvalidSignatureException extends PaymentException {
  constructor(provider: string) {
    super(
      'INVALID_SIGNATURE',
      `Invalid signature for ${provider} webhook`,
      HttpStatus.UNAUTHORIZED,
      { provider },
    );
  }
}

export class PaymentAlreadyCompletedException extends PaymentException {
  constructor(id: string) {
    super(
      'PAYMENT_ALREADY_COMPLETED',
      `Payment ${id} has already been completed`,
      HttpStatus.CONFLICT,
      { id },
    );
  }
}

export class PaymentAlreadyFailedException extends PaymentException {
  constructor(id: string) {
    super(
      'PAYMENT_ALREADY_FAILED',
      `Payment ${id} has already failed`,
      HttpStatus.CONFLICT,
      { id },
    );
  }
}

export class PaymentProviderErrorException extends PaymentException {
  constructor(provider: string, message: string) {
    super(
      'PAYMENT_PROVIDER_ERROR',
      `Provider ${provider} error: ${message}`,
      HttpStatus.BAD_GATEWAY,
      { provider, message },
    );
  }
}

export class DuplicateWebhookException extends PaymentException {
  constructor(provider: string, eventId: string) {
    super(
      'DUPLICATE_WEBHOOK',
      `Duplicate webhook ${provider}:${eventId}`,
      HttpStatus.OK,
      { provider, eventId },
    );
  }
}

export class ProviderMismatchException extends PaymentException {
  constructor(paymentId: string, expected: string, received: string) {
    super(
      'PROVIDER_MISMATCH',
      `Payment ${paymentId} expects provider ${expected} but webhook arrived for ${received}`,
      HttpStatus.CONFLICT,
      { paymentId, expected, received },
    );
  }
}

export class AmountMismatchException extends PaymentException {
  constructor(paymentId: string, expected: number, received: number) {
    super(
      'AMOUNT_MISMATCH',
      `Payment ${paymentId} amount mismatch: expected ${expected}, received ${received}`,
      HttpStatus.CONFLICT,
      { paymentId, expected, received },
    );
  }
}

export class UnauthorizedPaymentAccessException extends PaymentException {
  constructor(paymentId: string, userId: string) {
    super(
      'UNAUTHORIZED_PAYMENT_ACCESS',
      `User ${userId} does not own payment ${paymentId}`,
      HttpStatus.FORBIDDEN,
      { paymentId, userId },
    );
  }
}

export class ActivePaymentExistsException extends PaymentException {
  constructor(orderId: string, existingPaymentId: string) {
    super(
      'ACTIVE_PAYMENT_EXISTS',
      `Order ${orderId} already has an active payment: ${existingPaymentId}`,
      HttpStatus.CONFLICT,
      { orderId, existingPaymentId },
    );
  }
}

export class MaxRetriesExceededException extends PaymentException {
  constructor(paymentId: string, max: number) {
    super(
      'MAX_RETRIES_EXCEEDED',
      `Payment ${paymentId} has exceeded ${max} retry attempts`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { paymentId, max },
    );
  }
}

export class InvalidWebhookPayloadException extends PaymentException {
  constructor(reason: string) {
    super(
      'INVALID_WEBHOOK_PAYLOAD',
      `Invalid webhook payload: ${reason}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { reason },
    );
  }
}
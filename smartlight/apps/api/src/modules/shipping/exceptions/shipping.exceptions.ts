/**
 * Shipping HTTP exceptions.
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import type { ShippingErrorCode } from '../constants/shipping.constants';

export class ShippingException extends HttpException {
  public readonly code: ShippingErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ShippingErrorCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, httpStatus);
    this.code = code;
    this.details = details;
  }
}

export class ShipmentNotFoundException extends ShippingException {
  constructor(id?: string) {
    super(
      'SHIPMENT_NOT_FOUND',
      id ? `Shipment not found: ${id}` : 'Shipment not found',
      HttpStatus.NOT_FOUND,
      id ? { id } : undefined,
    );
  }
}

export class OrderNotFoundForShippingException extends ShippingException {
  constructor(orderId: string) {
    super(
      'ORDER_NOT_FOUND',
      `Order not found: ${orderId}`,
      HttpStatus.NOT_FOUND,
      { orderId },
    );
  }
}

export class OrderNotShippableException extends ShippingException {
  constructor(orderId: string, currentStatus: string) {
    super(
      'ORDER_NOT_SHIPPABLE',
      `Order ${orderId} cannot be shipped (current status: ${currentStatus})`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { orderId, currentStatus },
    );
  }
}

export class ActiveShipmentExistsException extends ShippingException {
  constructor(orderId: string, existingShipmentId: string) {
    super(
      'ACTIVE_SHIPMENT_EXISTS',
      `Order ${orderId} already has an active shipment: ${existingShipmentId}`,
      HttpStatus.CONFLICT,
      { orderId, existingShipmentId },
    );
  }
}

export class InvalidShipmentTransitionException extends ShippingException {
  constructor(
    shipmentId: string,
    fromStatus: string,
    toStatus: string,
  ) {
    super(
      'INVALID_SHIPMENT_TRANSITION',
      `Cannot transition shipment ${shipmentId} from '${fromStatus}' to '${toStatus}'`,
      HttpStatus.CONFLICT,
      { shipmentId, fromStatus, toStatus },
    );
  }
}

export class ShipmentNotCancellableException extends ShippingException {
  constructor(shipmentId: string, currentStatus: string) {
    super(
      'SHIPMENT_NOT_CANCELLABLE',
      `Shipment ${shipmentId} cannot be cancelled (current status: ${currentStatus})`,
      HttpStatus.CONFLICT,
      { shipmentId, currentStatus },
    );
  }
}

export class ShipmentAlreadyDeliveredException extends ShippingException {
  constructor(shipmentId: string) {
    super(
      'SHIPMENT_ALREADY_DELIVERED',
      `Shipment ${shipmentId} has already been delivered`,
      HttpStatus.CONFLICT,
      { shipmentId },
    );
  }
}

export class InvalidShippingProviderException extends ShippingException {
  constructor(provider: string) {
    super(
      'INVALID_SHIPPING_PROVIDER',
      `Unsupported shipping provider: ${provider}`,
      HttpStatus.BAD_REQUEST,
      { provider },
    );
  }
}

export class InvalidSignatureException extends ShippingException {
  constructor(provider: string) {
    super(
      'INVALID_SIGNATURE',
      `Invalid signature for ${provider} webhook`,
      HttpStatus.UNAUTHORIZED,
      { provider },
    );
  }
}

export class DuplicateWebhookException extends ShippingException {
  constructor(provider: string, eventId: string) {
    super(
      'DUPLICATE_WEBHOOK',
      `Duplicate shipping webhook ${provider}:${eventId}`,
      HttpStatus.OK,
      { provider, eventId },
    );
  }
}

export class ProviderErrorException extends ShippingException {
  constructor(provider: string, message: string) {
    super(
      'PROVIDER_ERROR',
      `Provider ${provider} error: ${message}`,
      HttpStatus.BAD_GATEWAY,
      { provider, message },
    );
  }
}

export class WeightExceedsLimitException extends ShippingException {
  constructor(weightGrams: number, maxGrams: number) {
    super(
      'WEIGHT_EXCEEDS_LIMIT',
      `Weight ${weightGrams}g exceeds limit ${maxGrams}g`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { weightGrams, maxGrams },
    );
  }
}

export class InvalidAddressException extends ShippingException {
  constructor(reason: string) {
    super(
      'INVALID_ADDRESS',
      `Invalid shipping address: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { reason },
    );
  }
}

export class FeeEstimationFailedException extends ShippingException {
  constructor(reason: string) {
    super(
      'FEE_ESTIMATION_FAILED',
      `Failed to estimate shipping fee: ${reason}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { reason },
    );
  }
}

export class UnauthorizedShipmentAccessException extends ShippingException {
  constructor(shipmentId: string, userId: string) {
    super(
      'UNAUTHORIZED_SHIPMENT_ACCESS',
      `User ${userId} does not own shipment ${shipmentId}`,
      HttpStatus.FORBIDDEN,
      { shipmentId, userId },
    );
  }
}

export class TrackingNumberAlreadyUsedException extends ShippingException {
  constructor(trackingNumber: string) {
    super(
      'TRACKING_NUMBER_ALREADY_USED',
      `Tracking number already in use: ${trackingNumber}`,
      HttpStatus.CONFLICT,
      { trackingNumber },
    );
  }
}

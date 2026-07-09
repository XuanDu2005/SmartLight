/**
 * Notification HTTP exceptions.
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import type { NotificationErrorCode } from '../constants/notification.constants';

export class NotificationException extends HttpException {
  public readonly code: NotificationErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: NotificationErrorCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, httpStatus);
    this.code = code;
    this.details = details;
  }
}

export class NotificationTemplateNotFoundException extends NotificationException {
  constructor(key: string) {
    super(
      'NOTIFICATION_TEMPLATE_NOT_FOUND',
      `Notification template not found: ${key}`,
      HttpStatus.NOT_FOUND,
      { key },
    );
  }
}

export class NotificationNotFoundException extends NotificationException {
  constructor(id: string) {
    super(
      'NOTIFICATION_NOT_FOUND',
      `Notification not found: ${id}`,
      HttpStatus.NOT_FOUND,
      { id },
    );
  }
}

export class InvalidRecipientException extends NotificationException {
  constructor(reason: string) {
    super(
      'NOTIFICATION_INVALID_RECIPIENT',
      `Invalid recipient: ${reason}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { reason },
    );
  }
}

export class InvalidTemplateVariablesException extends NotificationException {
  constructor(missing: string[]) {
    super(
      'NOTIFICATION_INVALID_TEMPLATE_VARIABLES',
      `Missing template variables: ${missing.join(', ')}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { missing },
    );
  }
}

export class NotificationProviderDisabledException extends NotificationException {
  constructor(provider: string) {
    super(
      'NOTIFICATION_PROVIDER_DISABLED',
      `Notification provider disabled: ${provider}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { provider },
    );
  }
}

export class NotificationProviderFailedException extends NotificationException {
  constructor(provider: string, reason: string) {
    super(
      'NOTIFICATION_PROVIDER_FAILED',
      `${provider} failed: ${reason}`,
      HttpStatus.BAD_GATEWAY,
      { provider, reason },
    );
  }
}

export class ResendNotConfiguredException extends NotificationException {
  constructor() {
    super(
      'NOTIFICATION_RESEND_NOT_CONFIGURED',
      'RESEND_API_KEY missing in environment',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class NotificationQueueUnavailableException extends NotificationException {
  constructor(reason: string) {
    super(
      'NOTIFICATION_QUEUE_UNAVAILABLE',
      `Notification queue unavailable: ${reason}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { reason },
    );
  }
}
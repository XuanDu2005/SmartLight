/**
 * Notification domain constants.
 */
export const NOTIFICATION_CONSTANTS = {
  DEFAULT_FROM_EMAIL: 'no-reply@smartlight.vn',
  DEFAULT_FROM_NAME: 'SmartLight',

  /** Max retry attempts before marking FAILED. */
  MAX_RETRY_ATTEMPTS: 5,

  /** Backoff base in seconds (exponential). */
  RETRY_BACKOFF_BASE_SEC: 60,

  /** Default channel when not specified. */
  DEFAULT_CHANNEL: 'EMAIL',

  /** Bull queue names. */
  QUEUE_NOTIFICATIONS: 'notifications',

  /** Worker concurrency. */
  WORKER_CONCURRENCY: 4,

  /** Pagination defaults. */
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200,

  /** Local template fallback for events without a DB template. */
  FALLBACK_LOCALES: ['vi-VN', 'en-US'] as const,
} as const;

export const NOTIFICATION_ERROR_CODES = {
  TEMPLATE_NOT_FOUND: 'NOTIFICATION_TEMPLATE_NOT_FOUND',
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
  INVALID_RECIPIENT: 'NOTIFICATION_INVALID_RECIPIENT',
  INVALID_TEMPLATE_VARIABLES: 'NOTIFICATION_INVALID_TEMPLATE_VARIABLES',
  PROVIDER_DISABLED: 'NOTIFICATION_PROVIDER_DISABLED',
  PROVIDER_FAILED: 'NOTIFICATION_PROVIDER_FAILED',
  RESEND_NOT_CONFIGURED: 'NOTIFICATION_RESEND_NOT_CONFIGURED',
  QUEUE_UNAVAILABLE: 'NOTIFICATION_QUEUE_UNAVAILABLE',
} as const;

export type NotificationErrorCode =
  (typeof NOTIFICATION_ERROR_CODES)[keyof typeof NOTIFICATION_ERROR_CODES];

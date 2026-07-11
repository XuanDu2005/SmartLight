/**
 * Payment domain constants.
 */
import { PaymentProvider, PaymentStatus } from '@prisma/client';

export const PAYMENT_LIMITS = {
  /** Default currency. */
  DEFAULT_CURRENCY: 'VND',
  /** Payment expiration window (15 min). */
  PAYMENT_TTL_MINUTES: 15,
  /** Max signature length stored. */
  MAX_SIGNATURE_LENGTH: 1024,
  /** Max retry attempts for failed payment. */
  MAX_RETRY_ATTEMPTS: 3,
  /** Default pagination. */
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 200,
} as const;

export const PAYMENT_ERROR_CODES = {
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_NOT_PAYABLE: 'ORDER_NOT_PAYABLE',
  INVALID_PAYMENT_STATE: 'INVALID_PAYMENT_STATE',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  PAYMENT_ALREADY_COMPLETED: 'PAYMENT_ALREADY_COMPLETED',
  PAYMENT_ALREADY_FAILED: 'PAYMENT_ALREADY_FAILED',
  PAYMENT_PROVIDER_ERROR: 'PAYMENT_PROVIDER_ERROR',
  DUPLICATE_WEBHOOK: 'DUPLICATE_WEBHOOK',
  PROVIDER_MISMATCH: 'PROVIDER_MISMATCH',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  UNAUTHORIZED_PAYMENT_ACCESS: 'UNAUTHORIZED_PAYMENT_ACCESS',
  ACTIVE_PAYMENT_EXISTS: 'ACTIVE_PAYMENT_EXISTS',
  MAX_RETRIES_EXCEEDED: 'MAX_RETRIES_EXCEEDED',
  INVALID_WEBHOOK_PAYLOAD: 'INVALID_WEBHOOK_PAYLOAD',
} as const;

export type PaymentErrorCode =
  (typeof PAYMENT_ERROR_CODES)[keyof typeof PAYMENT_ERROR_CODES];

/** Map a PaymentStatus to a stable terminal/active classification. */
export const PAYMENT_ACTIVE_STATUSES: PaymentStatus[] = [
  'CREATED',
  'PENDING',
  'PROCESSING',
];

export const PAYMENT_SUCCESS_STATUS: PaymentStatus = 'SUCCESS';
export const PAYMENT_FAILED_STATUS: PaymentStatus = 'FAILED';

/** Set of providers the platform supports. */
export const SUPPORTED_PROVIDERS: PaymentProvider[] = [
  PaymentProvider.MOMO,
  PaymentProvider.VNPAY,
  PaymentProvider.PAYPAL,
];

/** Provider name -> gateway code. */
export const PROVIDER_NAMES: Record<PaymentProvider, string> = {
  MOMO: 'momo',
  VNPAY: 'vnpay',
  PAYPAL: 'paypal',
};

/** Allowed provider keys for incoming client requests. */
export const PROVIDER_KEYS = ['momo', 'vnpay', 'paypal'] as const;
export type ProviderKey = (typeof PROVIDER_KEYS)[number];

export function toProviderEnum(key: string): PaymentProvider {
  const k = key.toUpperCase();
  if (k === 'MOMO') return PaymentProvider.MOMO;
  if (k === 'VNPAY') return PaymentProvider.VNPAY;
  if (k === 'PAYPAL') return PaymentProvider.PAYPAL;
  throw new Error(`Unsupported provider: ${key}`);
}

export function toProviderKey(enumValue: PaymentProvider): ProviderKey {
  return enumValue.toLowerCase() as ProviderKey;
}

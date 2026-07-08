/**
 * Shipping domain constants.
 */
import { ShipmentStatus, ShippingProvider } from '@prisma/client';

export const SHIPPING_LIMITS = {
  DEFAULT_PROVIDER: 'GHN' as ShippingProvider,
  DEFAULT_CURRENCY: 'VND',
  DEFAULT_WAREHOUSE_PROVINCE: 'Hồ Chí Minh',
  DEFAULT_WAREHOUSE_DISTRICT: 'Quận 1',
  FEE_CACHE_TTL_MINUTES: 30,
  ESTIMATED_DELIVERY_DAYS: 3,
  MAX_WEIGHT_GRAMS: 50_000,
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 200,
  WEBHOOK_MAX_AGE_SECONDS: 300,
} as const;

export const SHIPPING_ERROR_CODES = {
  SHIPMENT_NOT_FOUND: 'SHIPMENT_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_NOT_SHIPPABLE: 'ORDER_NOT_SHIPPABLE',
  ACTIVE_SHIPMENT_EXISTS: 'ACTIVE_SHIPMENT_EXISTS',
  INVALID_SHIPMENT_TRANSITION: 'INVALID_SHIPMENT_TRANSITION',
  SHIPMENT_NOT_CANCELLABLE: 'SHIPMENT_NOT_CANCELLABLE',
  SHIPMENT_ALREADY_DELIVERED: 'SHIPMENT_ALREADY_DELIVERED',
  INVALID_SHIPPING_PROVIDER: 'INVALID_SHIPPING_PROVIDER',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  DUPLICATE_WEBHOOK: 'DUPLICATE_WEBHOOK',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  WEIGHT_EXCEEDS_LIMIT: 'WEIGHT_EXCEEDS_LIMIT',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  FEE_ESTIMATION_FAILED: 'FEE_ESTIMATION_FAILED',
  UNAUTHORIZED_SHIPMENT_ACCESS: 'UNAUTHORIZED_SHIPMENT_ACCESS',
  TRACKING_NUMBER_ALREADY_USED: 'TRACKING_NUMBER_ALREADY_USED',
  SHIPMENT_NUMBER_GENERATION_FAILED: 'SHIPMENT_NUMBER_GENERATION_FAILED',
} as const;

export type ShippingErrorCode =
  (typeof SHIPPING_ERROR_CODES)[keyof typeof SHIPPING_ERROR_CODES];

/** Active = not yet DELIVERED, RETURNED, CANCELLED. */
export const SHIPMENT_ACTIVE_STATUSES: ShipmentStatus[] = [
  'CREATED',
  'WAITING_PICKUP',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
];

/** Terminal statuses. */
export const SHIPMENT_TERMINAL_STATUSES: ShipmentStatus[] = [
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
];

/** Default state machine. */
export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  CREATED: ['WAITING_PICKUP', 'CANCELLED'],
  WAITING_PICKUP: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED', 'RETURNING'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'FAILED', 'RETURNING'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED', 'RETURNING'],
  DELIVERED: [],
  FAILED: ['RETURNING', 'CANCELLED'],
  RETURNING: ['RETURNED'],
  RETURNED: [],
  CANCELLED: [],
};

/** Provider labels. */
export const PROVIDER_LABELS: Record<ShippingProvider, string> = {
  GHN: 'Giao Hàng Nhanh',
  GHTK: 'Giao Hàng Tiết Kiệm',
  VIETTEL_POST: 'Viettel Post',
  AHAMOVE: 'Ahamove',
  GRAB_EXPRESS: 'Grab Express',
};

export const PROVIDER_KEYS = [
  'ghn',
  'ghtk',
  'viettel_post',
  'ahamove',
  'grab_express',
] as const;

export type ProviderKey = (typeof PROVIDER_KEYS)[number];

export function toProviderEnum(key: string): ShippingProvider {
  const k = key.toUpperCase();
  if (k === 'GHN') return ShippingProvider.GHN;
  if (k === 'GHTK') return ShippingProvider.GHTK;
  if (k === 'VIETTEL_POST') return ShippingProvider.VIETTEL_POST;
  if (k === 'AHAMOVE') return ShippingProvider.AHAMOVE;
  if (k === 'GRAB_EXPRESS') return ShippingProvider.GRAB_EXPRESS;
  throw new Error(`Unsupported provider: ${key}`);
}

export function toProviderKey(value: ShippingProvider): ProviderKey {
  return value.toLowerCase() as ProviderKey;
}
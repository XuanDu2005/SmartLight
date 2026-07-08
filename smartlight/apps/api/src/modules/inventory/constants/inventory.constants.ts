/**
 * Inventory domain constants.
 */
import { StockMovementType } from '@prisma/client';

export const INVENTORY_LIMITS = {
  /** Default warehouse code. */
  DEFAULT_WAREHOUSE_CODE: 'MAIN',
  /** Default low-stock threshold. */
  DEFAULT_LOW_STOCK_THRESHOLD: 5,
  /** Default pagination. */
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 200,
  /** Max items per bulk adjustment. */
  MAX_BULK_ADJUST: 100,
} as const;

export const INVENTORY_ERROR_CODES = {
  INVENTORY_NOT_FOUND: 'INVENTORY_NOT_FOUND',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  STOCK_RESERVATION_FAILED: 'STOCK_RESERVATION_FAILED',
  STOCK_ALREADY_RESERVED: 'STOCK_ALREADY_RESERVED',
  INVALID_WAREHOUSE: 'INVALID_WAREHOUSE',
  PRODUCT_VARIANT_NOT_FOUND: 'PRODUCT_VARIANT_NOT_FOUND',
  STOCK_NEGATIVE_PREVENTED: 'STOCK_NEGATIVE_PREVENTED',
  LOW_STOCK_THRESHOLD_INVALID: 'LOW_STOCK_THRESHOLD_INVALID',
  RESERVATION_EXPIRED: 'RESERVATION_EXPIRED',
  ADJUSTMENT_REQUIRES_REASON: 'ADJUSTMENT_REQUIRES_REASON',
  UNAUTHORIZED_INVENTORY_ACCESS: 'UNAUTHORIZED_INVENTORY_ACCESS',
  VARIANT_ALREADY_HAS_INVENTORY: 'VARIANT_ALREADY_HAS_INVENTORY',
} as const;

export type InventoryErrorCode =
  (typeof INVENTORY_ERROR_CODES)[keyof typeof INVENTORY_ERROR_CODES];

/** Movement types that represent a stock increase. */
export const STOCK_IN_TYPES: StockMovementType[] = [
  'IMPORT',
  'RETURN',
  'ADJUSTMENT',
];

/** Movement types that represent a stock decrease. */
export const STOCK_OUT_TYPES: StockMovementType[] = [
  'EXPORT',
  'SALE',
  'RESERVATION',
  'RELEASE',
];

/** Reference type constants. */
export const REFERENCE_TYPES = {
  ORDER: 'ORDER',
  CHECKOUT: 'CHECKOUT',
  MANUAL: 'MANUAL',
  RETURN: 'RETURN',
  IMPORT: 'IMPORT',
} as const;

/** Actor types for stock movements. */
export const ACTOR_TYPES = {
  USER: 'USER',
  ADMIN_USER: 'ADMIN_USER',
  SYSTEM: 'SYSTEM',
  WEBHOOK: 'WEBHOOK',
  ANONYMOUS: 'ANONYMOUS',
} as const;
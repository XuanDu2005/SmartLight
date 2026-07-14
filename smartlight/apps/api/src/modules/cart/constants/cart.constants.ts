/**
 * Cart domain constants.
 *
 * Centralised so business rules are easy to find and consistent across the
 * service, repositories, and (future) checkout/promotion modules.
 */
export const CART_LIMITS = {
  /** Maximum distinct SKUs in a single cart. */
  MAX_ITEMS_PER_CART: 100,
  /** Hard ceiling on per-line quantity. Generous so e-commerce users
   *  buying in bulk (B2B, gifts, projects) don't hit an artificial wall.
   *  Real stock is enforced by `inventory.available`. */
  MAX_QUANTITY_PER_ITEM: 999,
  /** Lowest possible per-line quantity. */
  MIN_QUANTITY_PER_ITEM: 1,
  /**
   * A cart is considered abandoned after this many days of inactivity.
   * The abandonment sweeper job (out of scope for MVP) flips status to ABANDONED.
   */
  ABANDONED_AFTER_DAYS: 30,
  /** Default cart TTL = 7 days from last activity; refreshed on every write. */
  DEFAULT_EXPIRES_IN_DAYS: 7,
  /** Default currency (VND). */
  DEFAULT_CURRENCY: 'VND',
} as const;

export const CART_ERROR_CODES = {
  CART_NOT_FOUND: 'CART_NOT_FOUND',
  CART_ITEM_NOT_FOUND: 'CART_ITEM_NOT_FOUND',
  CART_INVALID_QUANTITY: 'CART_INVALID_QUANTITY',
  CART_QUANTITY_EXCEEDS_STOCK: 'CART_QUANTITY_EXCEEDS_STOCK',
  CART_MAX_ITEMS_REACHED: 'CART_MAX_ITEMS_REACHED',
  CART_VARIANT_UNAVAILABLE: 'CART_VARIANT_UNAVAILABLE',
  CART_PRODUCT_INACTIVE: 'CART_PRODUCT_INACTIVE',
  CART_VARIANT_INACTIVE: 'CART_VARIANT_INACTIVE',
  CART_DUPLICATE_VARIANT: 'CART_DUPLICATE_VARIANT',
  CART_EMPTY: 'CART_EMPTY',
  CART_NOT_ACTIVE: 'CART_NOT_ACTIVE',
  CART_VARIANT_DELETED: 'CART_VARIANT_DELETED',
  CART_PRODUCT_DELETED: 'CART_PRODUCT_DELETED',
} as const;

export type CartErrorCode = typeof CART_ERROR_CODES[keyof typeof CART_ERROR_CODES];

export const CART_INCLUDE = {
  items: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  },
  user: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} as const;


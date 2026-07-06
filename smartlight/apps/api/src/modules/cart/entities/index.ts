/**
 * Domain entity placeholders.
 *
 * In a DDD / Clean Architecture setup the *model* is what holds business
 * invariants (e.g. cannot mutate a CartItem's quantity without going through
 * the Cart aggregate root). For MVP we use Prisma types directly through the
 * repository so this is a thin re-export \u2014 with the door left open for
 * future richer domain models (e.g. `Cart` aggregate with encapsulated state
 * transitions).
 */
export type { CartItem, Coupon, Cart } from '@prisma/client';

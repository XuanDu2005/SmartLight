/**
 * Repository contracts \u2014 pure TypeScript interfaces the service depends on.
 *
 * Keeps the service testable without Prisma and shields the rest of the app
 * from Prisma-generic quirks.
 */
import type {
  CheckoutItem,
  CheckoutSession,
  Prisma,
  StockReservation,
} from '@prisma/client';

/* ---------- Read shapes ---------- */

export type CheckoutWithItems = Prisma.CheckoutSessionGetPayload<{
  include: {
    items: {
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true;
                slug: true;
                name: true;
                status: true;
                deletedAt: true;
              };
            };
            inventory: true;
          };
        };
      };
    };
    reservation: {
      include: {
        items: {
          include: {
            variant: {
              include: {
                inventory: true;
              };
            };
          };
        };
      };
    };
    cart: {
      include: {
        items: {
          where: { deletedAt: null };
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true;
                    slug: true;
                    name: true;
                    status: true;
                    deletedAt: true;
                  };
                };
                inventory: true;
              };
            };
          };
        };
      };
    };
  };
}>;

export type CheckoutSummary = Prisma.CheckoutSessionGetPayload<{
  include: {
    items: true;
    _count: { select: { items: true } };
  };
}>;

/* ---------- Mutation inputs ---------- */

export interface CheckoutCreateInput {
  cartId: string;
  userId: string;
  idempotencyKey?: string;
  currency?: string;
  expiresAt: Date;
}

export interface CheckoutItemCreateInput {
  sessionId: string;
  productVariantId: string;
  quantity: number;
  unitPriceSnapshot: Prisma.Decimal | number;
  lineSubtotalSnapshot: Prisma.Decimal | number;
  taxAmountSnapshot?: Prisma.Decimal | number;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  skuSnapshot: string;
  productSlug: string;
  productImageUrl?: string | null;
}

export interface ReservationCreateInput {
  checkoutSessionId: string;
  cartId: string;
  userId: string;
  items: Array<{
    productVariantId: string;
    quantity: number;
  }>;
  expiresAt: Date;
}

export interface AddressSnapshot {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detail: string;
}

/* ---------- Domain types re-exported ---------- */

export type { CheckoutItem, CheckoutSession, StockReservation };


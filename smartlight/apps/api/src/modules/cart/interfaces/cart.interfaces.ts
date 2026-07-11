/**
 * Repository contracts — Pure TypeScript contracts the service depends on.
 * Keeps the service testable without Prisma and shields the rest of the app
 * from Prisma-generic quirks.
 */
import type {
  CartItem,
  Coupon,
  Inventory,
  Prisma,
  Product,
  ProductVariant,
} from '@prisma/client';

/* ---------- Read shapes ---------- */

export type CartWithItems = Prisma.CartGetPayload<{
  include: {
    items: true;
    coupon: true;
  };
}>;

export type CartItemWithVariant = Prisma.CartItemGetPayload<{
  include: {
    variant: {
      include: {
        product: {
          include: {
            category: false;
            brand: false;
          };
        };
        inventory: true;
      };
    };
  };
}>;

export type CartWithFullItems = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        variant: {
          include: {
            product: true;
            inventory: true;
          };
        };
      };
    };
    coupon: true;
  };
}>;

/* ---------- Mutation inputs ---------- */

export interface CartCreateInput {
  userId: string;
  currency?: string;
  expiresAt: Date;
}

export interface CartItemUpsertInput {
  id?: string;
  cartId: string;
  productVariantId: string;
  quantity: number;
  unitPrice: Prisma.Decimal | number;
  discountSnapshot?: Prisma.Decimal | number;
  subtotal: Prisma.Decimal | number;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  skuSnapshot: string;
  productSlug: string;
  productImageUrl: string | null;
  color?: string | null;
  size?: string | null;
  isSelected: boolean;
  availableStockAtAdd?: number | null;
  notes?: string | null;
}

/* ---------- Query filters ---------- */

export interface CartItemLookup {
  cartId: string;
  productVariantId: string;
}

export interface ListCartsFilter {
  status?: string;
  userId?: string;
  page: number;
  limit: number;
}

/* ---------- Domain entities re-exported for convenience ---------- */

export type { CartItem, Coupon, Inventory, Product, ProductVariant };


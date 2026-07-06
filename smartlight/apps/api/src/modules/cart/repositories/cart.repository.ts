/**
 * CartRepository — only DB access for the cart bounded context.
 *
 * No business rules live here. Anything that is a *domain rule* (quantity
 * bounds, inventory limits, single-active-cart per user, ...) is enforced in
 * the service. The repository provides:
 *
 *   - typed lookups (active cart, by id, by userId+status)
 *   - mutation primitives (create, soft-delete, totals recompute)
 *   - transactional helpers used by the service
 *
 * The service uses Prisma transaction clients (`this.prisma.$transaction`)
 * for atomic flows (add item, merge) but the repository also exposes
 * `withTransaction` so the service can run multi-statement work atomically.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Cart, CartItem, Coupon, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';
import { CART_LIMITS } from '../constants/cart.constants';
import type {
  CartCreateInput,
  CartItemUpsertInput,
  CartWithFullItems,
  CartWithItems,
  ListCartsFilter,
} from '../interfaces/cart.interfaces';

@Injectable()
export class CartRepository {
  private readonly logger = new Logger(CartRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Run a callback inside a Prisma transaction. */
  async withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15_000,
    });
  }

  /* ============================================================== */
  /*  Cart lookups                                                  */
  /* ============================================================== */

  async findActiveCartByUserId(userId: string): Promise<CartWithFullItems | null> {
    return this.prisma.cart.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: this.fullInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCartById(id: string): Promise<CartWithFullItems | null> {
    return this.prisma.cart.findFirst({
      where: { id, deletedAt: null },
      include: this.fullInclude(),
    });
  }

  async findCartItemById(id: string): Promise<CartItem | null> {
    return this.prisma.cartItem.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findCartItemInCart(
    cartId: string,
    productVariantId: string,
  ): Promise<CartItem | null> {
    return this.prisma.cartItem.findFirst({
      where: { cartId, productVariantId, deletedAt: null },
    });
  }

  /* ============================================================== */
  /*  Cart mutations                                                */
  /* ============================================================== */

  async createActiveCart(input: CartCreateInput): Promise<Cart> {
    return this.prisma.cart.create({
      data: {
        userId: input.userId,
        status: 'ACTIVE',
        currency: input.currency ?? CART_LIMITS.DEFAULT_CURRENCY,
        expiresAt: input.expiresAt,
        lastActivityAt: new Date(),
      },
    });
  }

  async updateCartTotals(
    cartId: string,
    totals: {
      subtotal: Prisma.Decimal | number;
      discountTotal: Prisma.Decimal | number;
      taxTotal: Prisma.Decimal | number;
      shippingTotal: Prisma.Decimal | number;
      estimatedShipping: Prisma.Decimal | number;
      grandTotal: Prisma.Decimal | number;
      itemCount: number;
      selectedItemCount: number;
    },
    expiresAt: Date,
  ): Promise<Cart> {
    return this.prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal: totals.subtotal as any,
        discountTotal: totals.discountTotal as any,
        taxTotal: totals.taxTotal as any,
        shippingTotal: totals.shippingTotal as any,
        estimatedShipping: totals.estimatedShipping as any,
        grandTotal: totals.grandTotal as any,
        itemCount: totals.itemCount,
        selectedItemCount: totals.selectedItemCount,
        lastActivityAt: new Date(),
        expiresAt,
      },
    });
  }

  async touchCart(cartId: string, expiresAt: Date): Promise<void> {
    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        lastActivityAt: new Date(),
        expiresAt,
      },
    });
  }

  async updateCartStatus(cartId: string, status: Cart['status']): Promise<void> {
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { status },
    });
  }

  async clearCartItems(cartId: string): Promise<void> {
    await this.prisma.cartItem.updateMany({
      where: { cartId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async softDeleteCart(cartId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.cartItem.updateMany({
        where: { cartId, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
      this.prisma.cart.update({
        where: { id: cartId },
        data: { deletedAt: new Date(), status: 'ABANDONED' },
      }),
    ]);
  }

  /* ============================================================== */
  /*  Cart item mutations                                           */
  /* ============================================================== */

  async upsertCartItem(
    existing: CartItem | null,
    input: CartItemUpsertInput,
  ): Promise<CartItem> {
    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: input.quantity,
          unitPrice: input.unitPrice as any,
          discountSnapshot: (input.discountSnapshot ?? 0) as any,
          subtotal: input.subtotal as any,
          isSelected: input.isSelected,
          notes: input.notes ?? null,
          availableStockAtAdd: input.availableStockAtAdd ?? null,
        },
      });
    }
    return this.prisma.cartItem.create({
      data: {
        cartId: input.cartId,
        productVariantId: input.productVariantId,
        quantity: input.quantity,
        unitPrice: input.unitPrice as any,
        discountSnapshot: (input.discountSnapshot ?? 0) as any,
        subtotal: input.subtotal as any,
        productNameSnapshot: input.productNameSnapshot,
        variantNameSnapshot: input.variantNameSnapshot,
        skuSnapshot: input.skuSnapshot,
        productSlug: input.productSlug,
        productImageUrl: input.productImageUrl,
        color: input.color ?? null,
        size: input.size ?? null,
        isSelected: input.isSelected,
        availableStockAtAdd: input.availableStockAtAdd ?? null,
        notes: input.notes ?? null,
      },
    });
  }

  async deleteCartItem(itemId: string): Promise<void> {
    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });
  }

  async softDeleteCartItemsByIds(cartId: string, itemIds: string[]): Promise<number> {
    if (itemIds.length === 0) return 0;
    const res = await this.prisma.cartItem.updateMany({
      where: { cartId, id: { in: itemIds }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return res.count;
  }

  async updateItemSelection(
    cartId: string,
    isSelected: boolean,
    itemIds?: string[],
  ): Promise<number> {
    const res = await this.prisma.cartItem.updateMany({
      where: {
        cartId,
        deletedAt: null,
        ...(itemIds && itemIds.length > 0 ? { id: { in: itemIds } } : {}),
      },
      data: { isSelected },
    });
    return res.count;
  }

  /* ============================================================== */
  /*  Catalog lookups (read-only — never mutates catalog)          */
  /* ============================================================== */

  async getVariantWithProductAndInventory(variantId: string) {
    return this.prisma.productVariant.findFirst({
      where: { id: variantId, deletedAt: null },
      include: {
        product: {
          select: {
            id: true,
            slug: true,
            name: true,
            status: true,
            deletedAt: true,
            category: { select: { id: true, name: true, slug: true } },
            brand: { select: { id: true, name: true, slug: true } },
          },
        },
        inventory: true,
      },
    });
  }

  async getPrimaryImageForVariant(variantId: string): Promise<string | null> {
    const img = await this.prisma.productImage.findFirst({
      where: {
        variantId,
        deletedAt: null,
      },
      orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
      include: { media: { select: { secureUrl: true } } },
    });
    return (img as any)?.media?.secureUrl ?? null;
  }

  /* ============================================================== */
  /*  Admin                                                         */
  /* ============================================================== */

  async listCartsForAdmin(filter: ListCartsFilter) {
    const { status, userId, page, limit } = filter;
    const skip = (page - 1) * limit;
    const where: Prisma.CartWhereInput = {
      deletedAt: null,
      ...(status ? { status: status as any } : {}),
      ...(userId ? { userId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.cart.findMany({
        where,
        include: {
          user: { select: { id: true, email: true } },
          _count: { select: { items: { where: { deletedAt: null } } } },
        },
        orderBy: { lastActivityAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.cart.count({ where }),
    ]);
    return { items, total };
  }

  async getCouponByCode(code: string): Promise<Coupon | null> {
    return this.prisma.coupon.findFirst({
      where: { code, deletedAt: null, isActive: true },
    });
  }

  /* ============================================================== */
  /*  Helpers                                                       */
  /* ============================================================== */

  private fullInclude() {
    return {
      coupon: true,
      items: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: {
          variant: {
            include: {
              product: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  status: true,
                  deletedAt: true,
                },
              },
              inventory: true,
            },
          },
        },
      },
    } as const;
  }

  /** Used by service when passing non-`tx` clients through. */
  get raw(): PrismaClient {
    return this.prisma as unknown as PrismaClient;
  }

  /** Re-export the type for service use. */
  withFullInclude<T>() {
    return this.fullInclude() as unknown as T;
  }
}

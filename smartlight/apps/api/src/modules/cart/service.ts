/**
 * CartService \u2014 all cart business logic.
 *
 * Responsibilities:
 *  - enforce single active cart per user
 *  - inventory validation on every add / update
 *  - decimal money math (never float) + recompute totals atomically
 *  - product / variant ACTIVE status guard
 *  - quantity bounds (1..MAX)
 *  - merge carts across sessions with inventory clamp
 *  - soft-delete only (never hard delete)
 *
 * Layers:
 *   Controller -> CartService -> CartRepository -> PrismaService
 */
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { CartRepository } from './repositories/cart.repository';
import { CART_LIMITS } from './constants/cart.constants';
import {
  CartItemNotFoundException,
  CartNotActiveException,
  CartNotFoundException,
  CartEmptyException,
  InvalidQuantityException,
  MaxCartItemsReachedException,
  ProductInactiveException,
  QuantityExceedsStockException,
  VariantInactiveException,
  CartVariantUnavailableException,
} from './exceptions/cart.exceptions';

import type {
  AddCartItemDto,
  AdminListCartsQueryDto,
  BulkRemoveCartItemsDto,
  MergeCartDto,
  SelectCartItemsDto,
  UpdateCartItemDto,
} from './dto/cart-request.dto';
import type {
  AdminCartListItemDto,
  AdminCartListResponseDto,
  CartItemResponseDto,
  CartMergeResultDto,
  CartResponseDto,
  CartSummaryDto,
  CartTotalsDto,
} from './dto/cart-response.dto';
import type { CartWithFullItems } from './interfaces/cart.interfaces';

const ZERO = new Decimal(0);

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(private readonly repo: CartRepository) {}

  /* ============================================================== */
  /*  Public API                                                    */
  /* ============================================================== */

  /**
   * Idempotent: returns the user's single active cart, creating one if
   * none exists. Also auto-revives carts that are in CHECKED_OUT or EXPIRED
   * state by leaving the existing one alone and creating a fresh one only
   * when truly none exists.
   */
  async getOrCreateActiveCart(userId: string): Promise<CartResponseDto> {
    let cart = await this.repo.findActiveCartByUserId(userId);
    if (!cart) {
      cart = await this.activateFreshCart(userId, cart);
    }
    return this.mapToResponse(cart);
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartResponseDto> {
    this.assertQuantityBounds(dto.quantity);

    return this.repo.withTransaction(async (tx) => {
      const cartId = await this.ensureActiveCartId(userId);
      this.logger.log(`addItem user=${userId} cart=${cartId} variant=${dto.variantId} qty=${dto.quantity}`);

      const rawVariant = await tx.productVariant.findFirst({
        where: { id: dto.variantId, deletedAt: null },
        include: {
          product: { select: { id: true, slug: true, name: true, status: true, deletedAt: true } },
          inventory: true,
        },
      });

      if (!rawVariant || rawVariant.deletedAt !== null) {
        throw new CartVariantUnavailableException(dto.variantId, 'variant-deleted');
      }
      const product = rawVariant.product;
      if (!product || product.deletedAt !== null) {
        throw new CartVariantUnavailableException(dto.variantId, 'product-deleted');
      }
      if (product.status !== 'PUBLISHED') {
        throw new ProductInactiveException(product.id);
      }
      if (rawVariant.status !== 'ACTIVE') {
        throw new VariantInactiveException(dto.variantId);
      }
      const variant = rawVariant;

      const existing = await tx.cartItem.findFirst({
        where: { cartId, productVariantId: dto.variantId, deletedAt: null },
      });

      const targetQty = existing
        ? existing.quantity + dto.quantity
        : dto.quantity;

      const stock = this.availableStock(variant.inventory?.available ?? 0);
      if (existing) {
        // enforce cart max items: count distinct after merge
        const itemCount = await tx.cartItem.count({
          where: { cartId, deletedAt: null },
        });
        if (itemCount > CART_LIMITS.MAX_ITEMS_PER_CART) {
          throw new MaxCartItemsReachedException(CART_LIMITS.MAX_ITEMS_PER_CART);
        }
      } else {
        const itemCount = await tx.cartItem.count({
          where: { cartId, deletedAt: null },
        });
        if (itemCount + 1 > CART_LIMITS.MAX_ITEMS_PER_CART) {
          throw new MaxCartItemsReachedException(CART_LIMITS.MAX_ITEMS_PER_CART);
        }
      }

      if (targetQty > stock) {
        throw new QuantityExceedsStockException(targetQty, stock, dto.variantId);
      }
      if (targetQty > CART_LIMITS.MAX_QUANTITY_PER_ITEM) {
        throw new InvalidQuantityException('too_large', targetQty);
      }

      const unitPrice = new Decimal(variant.price as any);
      const subtotal = unitPrice.mul(targetQty);
      const imageUrl = await this.repo.getPrimaryImageForVariant(dto.variantId);

      await this.repo.upsertCartItem(existing, {
        cartId,
        productVariantId: dto.variantId,
        quantity: targetQty,
        unitPrice,
        subtotal,
        productNameSnapshot: variant.product.name,
        variantNameSnapshot: variant.name,
        skuSnapshot: variant.sku,
        productSlug: variant.product.slug,
        productImageUrl: imageUrl,
        isSelected: dto.isSelected ?? true,
        availableStockAtAdd: stock,
        notes: dto.notes ?? null,
      });

      const cart = await tx.cart.findUniqueOrThrow({ where: { id: cartId } });
      const items = await tx.cartItem.findMany({
        where: { cartId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: this.fullIncludeLite(),
      });
      await this.recomputeAndPersistTotals(tx, cart, items);

      const full = await tx.cart.findUniqueOrThrow({
        where: { id: cartId },
        include: this.fullIncludeForTx(),
      });
      return this.mapToResponse(full);
    });
  }

  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    this.assertQuantityBounds(dto.quantity);

    return this.repo.withTransaction(async (tx) => {
      const cart = await this.requireActiveCart(userId);
      const item = await tx.cartItem.findFirst({
        where: { id: itemId, cartId: cart.id, deletedAt: null },
        include: {
          variant: {
            include: {
              product: { select: { id: true, slug: true, name: true, status: true, deletedAt: true } },
              inventory: true,
            },
          },
        },
      });
      if (!item) throw new CartItemNotFoundException(itemId);

      const variant = item.variant;
      if (!variant || variant.deletedAt !== null) {
        throw new CartVariantUnavailableException(item.variant?.id ?? itemId, 'variant-deleted');
      }
      const product = variant.product;
      if (!product || product.deletedAt !== null) {
        throw new CartVariantUnavailableException(variant.id, 'product-deleted');
      }
      if (product.status !== 'PUBLISHED') {
        throw new ProductInactiveException(product.id);
      }
      if (variant.status !== 'ACTIVE') {
        throw new VariantInactiveException(variant.id);
      }

      const stock = this.availableStock(variant.inventory?.available ?? 0);
      if (dto.quantity > stock) {
        throw new QuantityExceedsStockException(dto.quantity, stock, variant.id);
      }

      const unitPrice = new Decimal(item.unitPrice as any);
      const subtotal = unitPrice.mul(dto.quantity);
      await tx.cartItem.update({
        where: { id: item.id },
        data: {
          quantity: dto.quantity,
          isSelected: dto.isSelected ?? item.isSelected,
          subtotal,
          availableStockAtAdd: stock,
          notes: dto.notes ?? item.notes,
        },
      });

      const items = await tx.cartItem.findMany({
        where: { cartId: cart.id, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: this.fullIncludeLite(),
      });
      await this.recomputeAndPersistTotals(tx, cart, items);

      const full = await tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: this.fullIncludeForTx(),
      });
      return this.mapToResponse(full);
    });
  }

  async removeItem(userId: string, itemId: string): Promise<CartResponseDto> {
    return this.repo.withTransaction(async (tx) => {
      const cart = await this.requireActiveCart(userId);
      const item = await tx.cartItem.findFirst({
        where: { id: itemId, cartId: cart.id, deletedAt: null },
      });
      if (!item) throw new CartItemNotFoundException(itemId);

      await tx.cartItem.update({
        where: { id: item.id },
        data: { deletedAt: new Date() },
      });

      const items = await tx.cartItem.findMany({
        where: { cartId: cart.id, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: this.fullIncludeLite(),
      });
      await this.recomputeAndPersistTotals(tx, cart, items);

      const full = await tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: this.fullIncludeForTx(),
      });
      return this.mapToResponse(full);
    });
  }

  async bulkRemoveItems(
    userId: string,
    dto: BulkRemoveCartItemsDto,
  ): Promise<CartResponseDto> {
    return this.repo.withTransaction(async (tx) => {
      const cart = await this.requireActiveCart(userId);
      await tx.cartItem.updateMany({
        where: {
          cartId: cart.id,
          id: { in: dto.itemIds },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
      const items = await tx.cartItem.findMany({
        where: { cartId: cart.id, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: this.fullIncludeLite(),
      });
      await this.recomputeAndPersistTotals(tx, cart, items);
      const full = await tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: this.fullIncludeForTx(),
      });
      return this.mapToResponse(full);
    });
  }

  async clearCart(userId: string): Promise<CartResponseDto> {
    return this.repo.withTransaction(async (tx) => {
      const cart = await this.requireActiveCart(userId);
      await tx.cartItem.updateMany({
        where: { cartId: cart.id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          subtotal: ZERO,
          discountTotal: ZERO,
          taxTotal: ZERO,
          shippingTotal: ZERO,
          estimatedShipping: ZERO,
          grandTotal: ZERO,
          itemCount: 0,
          selectedItemCount: 0,
          lastActivityAt: new Date(),
        },
      });
      const full = await tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: this.fullIncludeForTx(),
      });
      return this.mapToResponse(full);
    });
  }

  async selectItems(
    userId: string,
    dto: SelectCartItemsDto,
  ): Promise<CartResponseDto> {
    return this.repo.withTransaction(async (tx) => {
      const cart = await this.requireActiveCart(userId);
      await tx.cartItem.updateMany({
        where: {
          cartId: cart.id,
          deletedAt: null,
          ...(dto.itemIds && dto.itemIds.length > 0
            ? { id: { in: dto.itemIds } }
            : {}),
        },
        data: { isSelected: dto.isSelected },
      });
      const items = await tx.cartItem.findMany({
        where: { cartId: cart.id, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: this.fullIncludeLite(),
      });
      await this.recomputeAndPersistTotals(tx, cart, items);

      const full = await tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: this.fullIncludeForTx(),
      });
      return this.mapToResponse(full);
    });
  }

  async mergeCart(userId: string, dto: MergeCartDto): Promise<CartMergeResultDto> {
    let mergedItems = 0;
    let keptSeparate = 0;
    let skipped = 0;

    const result = await this.repo.withTransaction(async (tx) => {
      const cart = await this.requireActiveCart(userId);

      for (const item of dto.items) {
        this.assertQuantityBounds(item.quantity);

        const variant = await tx.productVariant.findFirst({
          where: { id: item.variantId, deletedAt: null },
          include: {
            product: { select: { id: true, slug: true, name: true, status: true, deletedAt: true } },
            inventory: true,
          },
        });

        if (!variant || !this.isPurchasable(variant)) {
          skipped += 1;
          continue;
        }

        const stock = this.availableStock(variant.inventory?.available ?? 0);
        const existing = await tx.cartItem.findFirst({
          where: { cartId: cart.id, productVariantId: item.variantId, deletedAt: null },
        });

        if (existing) {
          let targetQty = existing.quantity + item.quantity;
          // clamp to inventory
          if (targetQty > stock) targetQty = stock;
          targetQty = this.clampQtyToBounds(targetQty);

          if (targetQty <= 0) {
            skipped += 1;
            continue;
          }
          const unitPrice = new Decimal(existing.unitPrice as any);
          await tx.cartItem.update({
            where: { id: existing.id },
            data: {
              quantity: targetQty,
              subtotal: unitPrice.mul(targetQty),
              isSelected: item.isSelected ?? existing.isSelected,
              availableStockAtAdd: stock,
              notes: item.notes ?? existing.notes,
            },
          });
          mergedItems += 1;
        } else {
          const itemCount = await tx.cartItem.count({
            where: { cartId: cart.id, deletedAt: null },
          });
          if (itemCount + 1 > CART_LIMITS.MAX_ITEMS_PER_CART) {
            keptSeparate += 1;
            continue;
          }
          let targetQty = item.quantity;
          if (targetQty > stock) targetQty = stock;
          targetQty = this.clampQtyToBounds(targetQty);
          if (targetQty <= 0) {
            skipped += 1;
            continue;
          }
          const unitPrice = new Decimal(variant.price as any);
          const imageUrl = await this.repo.getPrimaryImageForVariant(variant.id);
          await tx.cartItem.create({
            data: {
              cartId: cart.id,
              productVariantId: variant.id,
              quantity: targetQty,
              unitPrice,
              subtotal: unitPrice.mul(targetQty),
              productNameSnapshot: variant.product.name,
              variantNameSnapshot: variant.name,
              skuSnapshot: variant.sku,
              productSlug: variant.product.slug,
              productImageUrl: imageUrl,
              isSelected: item.isSelected ?? true,
              availableStockAtAdd: stock,
              notes: item.notes ?? null,
            },
          });
          if (variant.id !== item.variantId) keptSeparate += 1;
          else mergedItems += 1;
        }
      }

      const items = await tx.cartItem.findMany({
        where: { cartId: cart.id, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: this.fullIncludeLite(),
      });
      await this.recomputeAndPersistTotals(tx, cart, items);
      const full = await tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: this.fullIncludeForTx(),
      });
      return this.mapToResponse(full);
    });

    return { mergedItems, keptSeparate, skipped, cart: result };
  }

  /**
   * Soft-deletes the customer's cart. Future adds will recreate it.
   */
  async deleteCart(userId: string): Promise<void> {
    const cart = await this.repo.findActiveCartByUserId(userId);
    if (!cart) return; // already gone
    await this.repo.softDeleteCart(cart.id);
  }

  /* ============================================================== */
  /*  Admin                                                         */
  /* ============================================================== */

  async listCartsForAdmin(query: AdminListCartsQueryDto): Promise<AdminCartListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await this.repo.listCartsForAdmin({
      status: query.status,
      userId: query.userId,
      page,
      limit,
    });

    const dtos: AdminCartListItemDto[] = items.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      userEmail: row.user?.email ?? null,
      status: row.status,
      itemCount: row._count?.items ?? 0,
      subtotal: this.d2n(row.subtotal),
      grandTotal: this.d2n(row.grandTotal),
      currency: row.currency,
      lastActivityAt: row.lastActivityAt?.toISOString?.() ?? new Date(0).toISOString(),
      expiresAt: row.expiresAt?.toISOString?.() ?? null,
      createdAt: row.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
    }));

    return { items: dtos, total, page, limit };
  }

  async getCartForAdmin(id: string): Promise<CartResponseDto> {
    const cart = await this.repo.findCartById(id);
    if (!cart) throw new CartNotFoundException(id);
    return this.mapToResponse(cart);
  }

  /* ============================================================== */
  /*  Internal                                                      */
  /* ============================================================== */

  private async ensureActiveCartId(userId: string): Promise<string> {
    const cart = await this.repo.findActiveCartByUserId(userId);
    if (cart) return cart.id;
    const created = await this.repo.createActiveCart({
      userId,
      currency: CART_LIMITS.DEFAULT_CURRENCY,
      expiresAt: this.computeCartExpiry(),
    });
    return created.id;
  }

  private async activateFreshCart(
    userId: string,
    existing: CartWithFullItems | null,
  ): Promise<CartWithFullItems> {
    const created = await this.repo.createActiveCart({
      userId,
      currency: CART_LIMITS.DEFAULT_CURRENCY,
      expiresAt: this.computeCartExpiry(),
    });
    const full = await this.repo.findCartById(created.id);
    if (!full) {
      // Should never happen, but defensive.
      this.logger.error(`Cart ${created.id} disappeared right after creation`);
      throw new CartNotFoundException(created.id);
    }
    return full;
  }

  private async requireActiveCart(userId: string) {
    const cart = await this.repo.findActiveCartByUserId(userId);
    if (!cart) throw new CartEmptyException('read');
    if (cart.status !== 'ACTIVE') {
      throw new CartNotActiveException(cart.id, cart.status);
    }
    return cart;
  }

  private assertQuantityBounds(qty: number): void {
    if (!Number.isInteger(qty)) {
      throw new InvalidQuantityException('not_integer', qty);
    }
    if (qty <= 0) {
      throw new InvalidQuantityException(qty === 0 ? 'zero' : 'negative', qty);
    }
    if (qty > CART_LIMITS.MAX_QUANTITY_PER_ITEM) {
      throw new InvalidQuantityException('too_large', qty);
    }
  }

  private clampQtyToBounds(qty: number): number {
    if (qty < CART_LIMITS.MIN_QUANTITY_PER_ITEM) return 0;
    if (qty > CART_LIMITS.MAX_QUANTITY_PER_ITEM) return CART_LIMITS.MAX_QUANTITY_PER_ITEM;
    return qty;
  }

  private availableStock(stock: number): number {
    if (!Number.isFinite(stock) || stock < 0) return 0;
    return Math.min(stock, CART_LIMITS.MAX_QUANTITY_PER_ITEM);
  }

  private isPurchasable(v: {
    id: string;
    deletedAt: Date | null;
    status: string;
    inventory?: { available: number } | null;
  }): boolean {
    const stock = this.availableStock(v.inventory?.available ?? 0);
    return stock > 0;
  }

  private computeCartExpiry(): Date {
    const d = new Date();
    d.setDate(d.getDate() + CART_LIMITS.DEFAULT_EXPIRES_IN_DAYS);
    return d;
  }

  /* ---------- totals + persistence ---------- */

  private async recomputeAndPersistTotals(
    tx: Prisma.TransactionClient,
    cart: { id: string; discountTotal: any; taxTotal: any; shippingTotal: any },
    items: Array<{
      id: string;
      quantity: number;
      unitPrice: any;
      subtotal: any;
      isSelected: boolean;
      variant: { product: { id: string; status: string; deletedAt: Date | null }; inventory: { available: number } | null };
    }>,
  ): Promise<void> {
    let subtotal = ZERO;
    let selectedSubtotal = ZERO;
    let selectedCount = 0;
    let totalCount = 0;

    for (const item of items) {
      const lineSubtotal = new Decimal(item.subtotal as any);
      subtotal = subtotal.add(lineSubtotal);
      totalCount += 1;
      if (item.isSelected) {
        selectedSubtotal = selectedSubtotal.add(lineSubtotal);
        selectedCount += 1;
      }
    }

    const discountTotal = new Decimal((cart.discountTotal as any) ?? 0);
    const taxTotal = new Decimal((cart.taxTotal as any) ?? 0);
    const shippingTotal = new Decimal((cart.shippingTotal as any) ?? 0);
    const estimatedShipping = ZERO; // computed at checkout
    const grandTotal = subtotal
      .plus(estimatedShipping)
      .plus(shippingTotal)
      .plus(taxTotal)
      .minus(discountTotal);
    if (grandTotal.lessThan(ZERO)) grandTotal as unknown;

    await tx.cart.update({
      where: { id: cart.id },
      data: {
        subtotal,
        selectedItemCount: selectedCount,
        itemCount: totalCount,
        discountTotal,
        taxTotal,
        shippingTotal,
        estimatedShipping,
        grandTotal,
        lastActivityAt: new Date(),
        expiresAt: this.computeCartExpiry(),
      },
    });
  }

  /* ---------- mapping ---------- */

  private mapToResponse(cart: CartWithFullItems): CartResponseDto {
    const items: CartItemResponseDto[] = (cart.items || []).map((item: any) => {
      const variant = item.variant;
      const product = variant?.product;
      const inventory = variant?.inventory;
      const stock = this.availableStock(inventory?.available ?? 0);
      const inStock = stock > 0;
      const productActive = !!product && !product.deletedAt && product.status === 'PUBLISHED';
      const variantActive = !!variant && variant.status === 'ACTIVE';

      const attrs = (variant?.attributesJson ?? {}) as Record<string, unknown>;
      const color = (attrs.color as string) ?? (attrs.Color as string) ?? null;
      const size = (attrs.size as string) ?? (attrs.Size as string) ?? null;

      return {
        id: item.id,
        cartId: item.cartId,
        productVariantId: item.productVariantId,
        productId: product?.id ?? '',
        productName: item.productNameSnapshot,
        productSlug: item.productSlug,
        variantName: item.variantNameSnapshot,
        sku: item.skuSnapshot,
        imageUrl: item.productImageUrl ?? null,
        color: item.color ?? color ?? null,
        size: item.size ?? size ?? null,
        quantity: item.quantity,
        unitPrice: this.d2n(item.unitPrice),
        discountSnapshot: this.d2n(item.discountSnapshot),
        subtotal: this.d2n(item.subtotal),
        inStock,
        availableQuantity: stock,
        isSelected: item.isSelected,
        isProductActive: productActive,
        isVariantActive: variantActive,
        maxQuantityPerOrder: CART_LIMITS.MAX_QUANTITY_PER_ITEM,
        notes: item.notes ?? null,
        addedAt: item.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
        updatedAt: item.updatedAt?.toISOString?.() ?? new Date(0).toISOString(),
      };
    });

    const subtotal = this.d2n(cart.subtotal);
    const discountTotal = this.d2n(cart.discountTotal);
    const taxTotal = this.d2n(cart.taxTotal);
    const shippingTotal = this.d2n(cart.shippingTotal);
    const estimatedShipping = this.d2n(cart.estimatedShipping);
    const grandTotal = this.d2n(cart.grandTotal);

    const selectedSubtotal = items
      .filter((i) => i.isSelected)
      .reduce((acc, i) => acc + i.subtotal, 0);

    const totals: CartTotalsDto = {
      subtotal,
      discountTotal,
      taxTotal,
      shippingTotal,
      estimatedShipping,
      grandTotal,
      selectedSubtotal,
      currency: cart.currency,
    };

    return {
      id: cart.id,
      userId: cart.userId,
      status: cart.status,
      currency: cart.currency,
      itemCount: cart.itemCount ?? items.length,
      selectedItemCount: cart.selectedItemCount ?? items.filter((i) => i.isSelected).length,
      items,
      couponCode: cart.couponCode ?? null,
      totals,
      lastActivityAt: cart.lastActivityAt?.toISOString?.() ?? new Date(0).toISOString(),
      expiresAt: cart.expiresAt?.toISOString?.() ?? null,
      createdAt: cart.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      updatedAt: cart.updatedAt?.toISOString?.() ?? new Date(0).toISOString(),
    };
  }

  /**
   * Lightweight include used for totals recompute (no cart joins).
   */
  private fullIncludeLite() {
    return {
      variant: {
        include: {
          product: { select: { id: true, status: true, deletedAt: true } },
          inventory: true,
        },
      },
    } as const;
  }

  private fullIncludeForTx() {
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

  /* ---------- utilities ---------- */

  private d2n(d: Decimal | number | null | undefined): number {
    if (d === null || d === undefined) return 0;
    if (typeof d === 'number') return d;
    return d.toNumber();
  }

  /** Build a minimal CartSummaryDto for cart-count widgets. */
  async getSummary(userId: string): Promise<CartSummaryDto> {
    const cart = await this.repo.findActiveCartByUserId(userId);
    if (!cart) {
      return {
        id: '',
        status: 'NONE',
        itemCount: 0,
        selectedItemCount: 0,
        subtotal: 0,
        grandTotal: 0,
        currency: CART_LIMITS.DEFAULT_CURRENCY,
      };
    }
    return {
      id: cart.id,
      status: cart.status,
      itemCount: cart.itemCount ?? 0,
      selectedItemCount: cart.selectedItemCount ?? 0,
      subtotal: this.d2n(cart.subtotal),
      grandTotal: this.d2n(cart.grandTotal),
      currency: cart.currency,
    };
  }
}


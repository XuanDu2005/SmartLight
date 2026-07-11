/**
 * CheckoutService \u2014 all checkout business logic.
 *
 * Responsibilities:
 *  - validate cart items before checkout (product/variant active, stock)
 *  - create checkout session with price snapshots (immutable once created)
 *  - atomic inventory reservation with row-level locking
 *  - address management
 *  - session cancellation / expiry release
 *  - recalculate totals
 *
 * Layers:
 *   Controller -> CheckoutService -> CheckoutRepository -> PrismaService
 *
 * All money math uses Prisma.Decimal \u2014 never raw number.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { CheckoutRepository } from './repositories/checkout.repository';
import {
  CHECKOUT_LIMITS,
} from './constants/checkout.constants';
import {
  CheckoutCancelledException,
  CheckoutCompletedException,
  CheckoutExpiredException,
  CheckoutInvalidStatusException,
  CheckoutNotFoundException,
  InsufficientStockException,
  InvalidAddressException,
  NoSelectedItemsException,
  ProductUnavailableException,
  VariantUnavailableException,
} from './exceptions/checkout.exceptions';

import type {
  CreateCheckoutDto,
  UpdateAddressDto,
  AdminListCheckoutsQueryDto,
} from './dto/create-checkout.dto';
import type {
  AdminCheckoutListResponseDto,
  CheckoutCreateResponseDto,
  CheckoutItemResponseDto,
  CheckoutResponseDto,
  CheckoutTotalsDto,
  ReservationItemDto,
  ReservationResponseDto,
} from './dto/checkout-response.dto';

const ZERO = new Decimal(0);

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(private readonly repo: CheckoutRepository) {}

  /* ============================================================== */
  /*  Public API                                                    */
  /* ============================================================== */

  /**
   * Create a new checkout session from the user's active cart.
   *
   * Idempotent via optional `idempotencyKey`: if the same key was already used
   * for a session belonging to this user, that session is returned instead of
   * creating a duplicate.
   *
   * Flow:
   *   1. Validate cart + selected items
   *   2. Snapshot prices (immutable)
   *   3. Create session + checkout_items
   *   4. Return session (reservation is a separate POST /reserve step)
   */
  async createCheckout(
    userId: string,
    dto: CreateCheckoutDto,
  ): Promise<CheckoutCreateResponseDto> {
    // Idempotency: return existing session if key matches
    if (dto.idempotencyKey) {
      const existing = await this.repo.findByIdemKey(dto.idempotencyKey);
      if (existing && existing.userId === userId) {
        this.logger.debug(`Idempotent checkout replay: ${existing.id}`);
        return this.mapToCreateResponse(existing);
      }
    }

    return this.repo.withTransaction(async (tx) => {
      // 1. Resolve cart
      const cart = await tx.cart.findFirst({
        where: { userId, status: 'ACTIVE', deletedAt: null },
        include: {
          items: {
            where: { deletedAt: null, isSelected: true },
            include: {
              variant: {
                include: {
                  product: {
                    select: { id: true, slug: true, name: true, status: true, deletedAt: true },
                  },
                  inventory: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!cart) {
        throw new CheckoutNotFoundException();
      }

      // 2. Validate items (active product, active variant, in stock)
      const selectedItems = cart.items;
      if (selectedItems.length === 0) {
        throw new NoSelectedItemsException();
      }

      const validatedItems: Array<{
        cartItemId: string;
        variantId: string;
        quantity: number;
        price: unknown;
        productId: string;
        productName: string;
        variantName: string;
        sku: string;
        productSlug: string;
        productImageUrl: string | null;
        available: number;
      }> = [];

      for (const item of selectedItems) {
        const variant = item.variant;
        const product = variant?.product;

        // Product validation
        if (!product || product.deletedAt !== null) {
          throw new ProductUnavailableException(item.productVariantId);
        }
        if (product.status !== 'PUBLISHED') {
          throw new ProductUnavailableException(product.id);
        }

        // Variant validation
        if (!variant || variant.deletedAt !== null) {
          throw new VariantUnavailableException(item.productVariantId, 'variant-deleted');
        }
        if (variant.status !== 'ACTIVE') {
          throw new VariantUnavailableException(item.productVariantId, 'variant-inactive');
        }

        // Stock validation
        const available = variant.inventory?.available ?? 0;
        if (available < item.quantity) {
          throw new InsufficientStockException(
            item.productVariantId,
            item.quantity,
            available,
          );
        }

        validatedItems.push({
          cartItemId: item.id,
          variantId: item.productVariantId,
          quantity: item.quantity,
          price: item.unitPrice,
          productId: product.id,
          productName: item.productNameSnapshot,
          variantName: item.variantNameSnapshot,
          sku: item.skuSnapshot,
          productSlug: item.productSlug,
          productImageUrl: item.productImageUrl ?? null,
          available,
        });
      }

      // 3. Compute totals
      let subtotal = ZERO;
      for (const item of validatedItems) {
        subtotal = subtotal.add(new Decimal(item.price as any).mul(item.quantity));
      }

      const session = await tx.checkoutSession.create({
        data: {
          cartId: cart.id,
          userId,
          status: 'CREATED',
          currency: cart.currency,
          subtotal,
          discountAmount: ZERO,
          shippingFee: ZERO,
          taxAmount: ZERO,
          grandTotal: subtotal,
          expiresAt: this.computeSessionExpiry(),
          idempotencyKey: dto.idempotencyKey,
        },
      });

      // 4. Snapshot items (immutable price snapshot)
      const checkoutItems = validatedItems.map((item) => ({
        sessionId: session.id,
        productVariantId: item.variantId,
        quantity: item.quantity,
        unitPriceSnapshot: item.price,
        lineSubtotalSnapshot: new Decimal(item.price as any).mul(item.quantity),
        taxAmountSnapshot: ZERO,
        productNameSnapshot: item.productName,
        variantNameSnapshot: item.variantName,
        skuSnapshot: item.sku,
        productSlug: item.productSlug,
        productImageUrl: item.productImageUrl,
      }));

      if (checkoutItems.length > 0) {
        await tx.checkoutItem.createMany({ data: checkoutItems as any });
      }

      this.logger.log(
        `Checkout created: session=${session.id} user=${userId} items=${validatedItems.length}`,
      );

      return this.mapToCreateResponse(session);
    });
  }

  /**
   * Get a checkout session. Throws if not found or user doesn't own it.
   */
  async getCheckout(sessionId: string, userId: string): Promise<CheckoutResponseDto> {
    const session = await this.repo.findByIdForUser(sessionId, userId);
    if (!session) {
      throw new CheckoutNotFoundException(sessionId);
    }
    this.assertSessionNotExpired(session);
    return this.mapToResponse(session);
  }

  /**
   * Update shipping address for a checkout session.
   */
  async updateShippingAddress(
    sessionId: string,
    userId: string,
    dto: UpdateAddressDto,
  ): Promise<CheckoutResponseDto> {
    const session = await this.requireOwnedActiveSession(sessionId, userId);

    // Validate phone
    if (!CHECKOUT_LIMITS.PHONE_REGEX.test(dto.phone)) {
      throw new InvalidAddressException('phone', 'invalid Vietnamese phone format');
    }

    await this.repo.updateShippingAddress(sessionId, {
      shippingFullName: dto.fullName,
      shippingPhone: dto.phone,
      shippingProvince: dto.province,
      shippingDistrict: dto.district,
      shippingWard: dto.ward,
      shippingDetail: dto.detail,
    });

    const updated = await this.repo.findByIdForUser(sessionId, userId);
    if (!updated) throw new CheckoutNotFoundException(sessionId);
    return this.mapToResponse(updated);
  }

  /**
   * Reserve inventory for all checkout items.
   *
   * Runs inside a SERIALIZABLE transaction with atomic stock deduction:
   *   1. Validate all items still in stock
   *   2. Decrement inventory.available, increment inventory.reserved
   *   3. Create StockReservation + ReservationItem records
   *   4. Update session status to RESERVED
   *
   * If any item fails, the entire transaction rolls back.
   */
  async reserveInventory(
    sessionId: string,
    userId: string,
  ): Promise<CheckoutResponseDto> {
    return this.repo.withTransaction(async (tx) => {
      const session = await tx.checkoutSession.findFirst({
        where: { id: sessionId, userId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: { id: true, slug: true, name: true, status: true, deletedAt: true },
                  },
                  inventory: true,
                },
              },
            },
          },
        },
      });

      if (!session) throw new CheckoutNotFoundException(sessionId);
      this.assertSessionNotExpired(session as any);
      if (session.status !== 'CREATED') {
        throw new CheckoutInvalidStatusException(sessionId, session.status, 'CREATED');
      }

      // Reserve each variant's stock atomically
      const reservationItems: Array<{ productVariantId: string; quantity: number }> = [];

      for (const item of session.items) {
        const variant = item.variant;
        const product = variant?.product;

        // Re-validate product/variant are still active
        if (!product || product.deletedAt !== null || product.status !== 'PUBLISHED') {
          throw new ProductUnavailableException(item.productVariantId);
        }
        if (!variant || variant.deletedAt !== null || variant.status !== 'ACTIVE') {
          throw new VariantUnavailableException(item.productVariantId, 'variant-inactive');
        }

        const available = variant.inventory?.available ?? 0;
        if (available < item.quantity) {
          throw new InsufficientStockException(
            item.productVariantId,
            item.quantity,
            available,
          );
        }

        // Atomic row-level lock: deduct available, add reserved
        const updated = await tx.$executeRaw`
          UPDATE "inventory"
          SET
            "available" = "available" - ${item.quantity},
            "reserved"  = "reserved"  + ${item.quantity},
            "updated_at" = NOW()
          WHERE "product_variant_id" = ${item.productVariantId}
            AND "available" >= ${item.quantity}
        `;

        if (updated === 0) {
          // Race condition: stock was taken by another transaction
          const current = await tx.inventory.findUnique({
            where: { productVariantId: item.productVariantId },
            select: { available: true },
          });
          throw new InsufficientStockException(
            item.productVariantId,
            item.quantity,
            current?.available ?? 0,
          );
        }

        reservationItems.push({
          productVariantId: item.productVariantId,
          quantity: item.quantity,
        });
      }

      // Create reservation record
      const reservation = await tx.stockReservation.create({
        data: {
          checkoutSessionId: sessionId,
          cartId: session.cartId,
          userId,
          status: 'ACTIVE',
          expiresAt: this.computeReservationExpiry(),
          items: {
            create: reservationItems,
          },
        },
        include: {
          items: {
            include: {
              variant: {
                include: { inventory: true },
              },
            },
          },
        },
      });

      // Update session status
      await tx.checkoutSession.update({
        where: { id: sessionId },
        data: { status: 'RESERVED' },
      });

      this.logger.log(
        `Inventory reserved: session=${sessionId} reservation=${reservation.id} items=${reservationItems.length}`,
      );

      const full = await tx.checkoutSession.findFirst({
        where: { id: sessionId },
        include: this.repoFullInclude(),
      });
      return this.mapToResponse(full as any);
    });
  }

  /**
   * Cancel a checkout session and release any reserved inventory.
   */
  async cancelCheckout(sessionId: string, userId: string): Promise<void> {
    return this.repo.withTransaction(async (tx) => {
      const session = await tx.checkoutSession.findFirst({
        where: { id: sessionId, userId },
        include: {
          reservation: {
            include: {
              items: { include: { variant: true } },
            },
          },
        },
      });

      if (!session) throw new CheckoutNotFoundException(sessionId);

      // Release reserved stock
      if (session.reservation && session.reservation.status === 'ACTIVE') {
        for (const resItem of session.reservation.items) {
          await tx.$executeRaw`
            UPDATE "inventory"
            SET
              "available" = LEAST("available" + ${resItem.quantity}, "on_hand"),
              "reserved"  = GREATEST("reserved" - ${resItem.quantity}, 0),
              "updated_at" = NOW()
            WHERE "product_variant_id" = ${resItem.productVariantId}
          `;
        }
        await tx.stockReservation.update({
          where: { id: session.reservation.id },
          data: {
            status: 'RELEASED',
            releasedAt: new Date(),
            releasedReason: 'checkout-cancelled',
          },
        });
      }

      await tx.checkoutSession.update({
        where: { id: sessionId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      this.logger.log(`Checkout cancelled: session=${sessionId}`);
    });
  }

  /**
   * Mark a checkout session as expired (called by a background sweeper).
   * Releases any reserved inventory.
   */
  async expireCheckout(sessionId: string): Promise<void> {
    const session = await this.repo.findById(sessionId);
    if (!session) return;
    if (session.status === 'EXPIRED' || session.status === 'COMPLETED') return;

    await this.repo.withTransaction(async (tx) => {
      const full = await tx.checkoutSession.findFirst({
        where: { id: sessionId },
        include: {
          reservation: {
            include: {
              items: { include: { variant: true } },
            },
          },
        },
      });
      if (!full) return;

      if (full.reservation && full.reservation.status === 'ACTIVE') {
        for (const ri of full.reservation.items) {
          await tx.$executeRaw`
            UPDATE "inventory"
            SET
              "available" = LEAST("available" + ${ri.quantity}, "on_hand"),
              "reserved"  = GREATEST("reserved" - ${ri.quantity}, 0),
              "updated_at" = NOW()
            WHERE "product_variant_id" = ${ri.productVariantId}
          `;
        }
        await tx.stockReservation.update({
          where: { id: full.reservation.id },
          data: {
            status: 'EXPIRED',
            releasedAt: new Date(),
            releasedReason: 'checkout-expired',
          },
        });
      }

      await tx.checkoutSession.update({
        where: { id: sessionId },
        data: { status: 'EXPIRED' },
      });
    });
  }

  /* ============================================================== */
  /*  Admin                                                        */
  /* ============================================================== */

  async listForAdmin(
    query: AdminListCheckoutsQueryDto,
  ): Promise<AdminCheckoutListResponseDto> {
    const page = Math.max(1, parseInt(String(query.page ?? '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10)));

    const { items, total } = await this.repo.listForAdmin({
      status: query.status,
      userId: query.userId,
      page,
      limit,
    });

    return {
      items: items.map((row: any) => ({
        id: row.id,
        cartId: row.cartId,
        userId: row.userId,
        status: row.status,
        itemCount: row._count?.items ?? 0,
        grandTotal: this.d2n(row.grandTotal),
        currency: row.currency,
        expiresAt: row.expiresAt?.toISOString?.() ?? null,
        createdAt: row.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async getForAdmin(sessionId: string): Promise<CheckoutResponseDto> {
    const session = await this.repo.findById(sessionId);
    if (!session) throw new CheckoutNotFoundException(sessionId);
    return this.mapToResponse(session);
  }

  /* ============================================================== */
  /*  Internal helpers                                             */
  /* ============================================================== */

  /**
   * Load a session, verify ownership, and ensure it is not expired or cancelled.
   */
  private async requireOwnedActiveSession(sessionId: string, userId: string) {
    const session = await this.repo.findByIdForUser(sessionId, userId);
    if (!session) throw new CheckoutNotFoundException(sessionId);

    this.assertSessionNotExpired(session);

    if (session.status === 'CANCELLED') {
      throw new CheckoutCancelledException(sessionId);
    }
    if (session.status === 'COMPLETED') {
      throw new CheckoutCompletedException(sessionId);
    }

    return session;
  }

  private assertSessionNotExpired(session: { expiresAt: Date | null; status: string }) {
    if (
      session.status !== 'COMPLETED' &&
      session.expiresAt &&
      new Date() > session.expiresAt
    ) {
      throw new CheckoutExpiredException((session as any).id ?? '');
    }
  }

  private computeSessionExpiry(): Date {
    const d = new Date();
    d.setMinutes(d.getMinutes() + CHECKOUT_LIMITS.SESSION_TTL_MINUTES);
    return d;
  }

  private computeReservationExpiry(): Date {
    const d = new Date();
    d.setMinutes(d.getMinutes() + CHECKOUT_LIMITS.RESERVATION_TTL_MINUTES);
    return d;
  }

  /* ---------- DTO mapping ---------- */

  private mapToCreateResponse(session: any): CheckoutCreateResponseDto {
    return {
      id: session.id,
      status: session.status,
      expiresAt: session.expiresAt?.toISOString?.() ?? new Date(0).toISOString(),
      itemCount: (session._count?.items ?? session.itemCount) ?? 0,
      totals: {
        subtotal: this.d2n(session.subtotal),
        discountAmount: this.d2n(session.discountAmount),
        shippingFee: this.d2n(session.shippingFee),
        taxAmount: this.d2n(session.taxAmount),
        grandTotal: this.d2n(session.grandTotal),
        currency: session.currency ?? 'VND',
      },
    };
  }

  private mapToResponse(session: any): CheckoutResponseDto {
    const items: CheckoutItemResponseDto[] = (session.items ?? []).map((item: any) => {
      const variant = item.variant;
      const product = variant?.product;
      const inventory = variant?.inventory;
      const stock = inventory?.available ?? 0;
      const inStock = stock >= item.quantity;

      return {
        id: item.id,
        sessionId: item.sessionId,
        productVariantId: item.productVariantId,
        productId: product?.id ?? '',
        productName: item.productNameSnapshot,
        productSlug: item.productSlug ?? '',
        variantName: item.variantNameSnapshot,
        sku: item.skuSnapshot,
        imageUrl: item.productImageUrl ?? null,
        quantity: item.quantity,
        unitPrice: this.d2n(item.unitPriceSnapshot),
        lineSubtotal: this.d2n(item.lineSubtotalSnapshot),
        taxAmount: this.d2n(item.taxAmountSnapshot),
        inStock,
        availableQuantity: stock,
      };
    });

    const reservation: ReservationResponseDto | null = session.reservation
      ? {
          id: session.reservation.id,
          status: session.reservation.status,
          expiresAt: session.reservation.expiresAt?.toISOString?.() ?? null,
          items: (session.reservation.items ?? []).map((ri: any) => ({
            productVariantId: ri.productVariantId,
            quantity: ri.quantity,
            productName: ri.variant?.product?.name ?? '',
            variantName: ri.variant?.name ?? '',
            sku: ri.variant?.sku ?? '',
          })),
        }
      : null;

    const shippingAddress = session.shippingFullName
      ? {
          fullName: session.shippingFullName,
          phone: session.shippingPhone,
          province: session.shippingProvince,
          district: session.shippingDistrict,
          ward: session.shippingWard,
          detail: session.shippingDetail,
        }
      : null;

    const billingAddress = session.billingFullName
      ? {
          fullName: session.billingFullName,
          phone: session.billingPhone,
          province: session.billingProvince,
          district: session.billingDistrict,
          ward: session.billingWard,
          detail: session.billingDetail,
        }
      : null;

    const totals: CheckoutTotalsDto = {
      subtotal: this.d2n(session.subtotal),
      discountAmount: this.d2n(session.discountAmount),
      shippingFee: this.d2n(session.shippingFee),
      taxAmount: this.d2n(session.taxAmount),
      grandTotal: this.d2n(session.grandTotal),
      currency: session.currency ?? 'VND',
    };

    return {
      id: session.id,
      cartId: session.cartId,
      userId: session.userId,
      status: session.status,
      currency: session.currency ?? 'VND',
      items,
      reservation,
      shippingAddress,
      billingAddress,
      couponCode: session.couponCode ?? null,
      totals,
      expiresAt: session.expiresAt?.toISOString?.() ?? null,
      completedAt: session.completedAt?.toISOString?.() ?? null,
      cancelledAt: session.cancelledAt?.toISOString?.() ?? null,
      createdAt: session.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      updatedAt: session.updatedAt?.toISOString?.() ?? new Date(0).toISOString(),
    };
  }

  private d2n(d: Decimal | number | null | undefined): number {
    if (d === null || d === undefined) return 0;
    if (typeof d === 'number') return d;
    return (d as any).toNumber?.() ?? 0;
  }

  /**
   * Reusable include shape shared between service and repository.
   * Defined here so both stay in sync.
   */
  private repoFullInclude() {
    return {
      items: {
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
      reservation: {
        include: {
          items: {
            include: {
              variant: {
                include: { inventory: true },
              },
            },
          },
        },
      },
    } as const;
  }
}


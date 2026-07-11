/**
 * CheckoutRepository \u2014 only DB access for the checkout bounded context.
 *
 * No business rules live here. The service enforces all domain invariants.
 * Repository provides:
 *   - typed lookups (by id, by userId, by idempotency key)
 *   - mutation primitives (create session, update address, reserve, cancel)
 *   - transactional helpers
 *
 * All atomic flows (create session, reserve inventory) use
 * `this.prisma.$transaction` with Serializable isolation.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, CheckoutSessionStatus, StockReservation, StockReservationStatus } from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  CheckoutCreateInput,
  CheckoutItemCreateInput,
  CheckoutSummary,
  CheckoutWithItems,
  ReservationCreateInput,
} from '../interfaces/checkout.interfaces';

@Injectable()
export class CheckoutRepository {
  private readonly logger = new Logger(CheckoutRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Run a callback inside a Prisma transaction. */
  async withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn, {
      isolationLevel: 'Serializable',
      timeout: 20_000,
    });
  }

  /* ============================================================== */
  /*  Checkout session lookups                                       */
  /* ============================================================== */

  async findById(id: string): Promise<CheckoutWithItems | null> {
    return this.prisma.checkoutSession.findFirst({
      where: { id },
      include: this.fullInclude(),
    });
  }

  async findByIdForUser(id: string, userId: string): Promise<CheckoutWithItems | null> {
    return this.prisma.checkoutSession.findFirst({
      where: { id, userId },
      include: this.fullInclude(),
    });
  }

  async findByIdemKey(key: string): Promise<CheckoutWithItems | null> {
    return this.prisma.checkoutSession.findFirst({
      where: { idempotencyKey: key },
      include: this.fullInclude(),
    });
  }

  async findByUserId(userId: string): Promise<CheckoutWithItems | null> {
    return this.prisma.checkoutSession.findFirst({
      where: { userId },
      include: this.fullInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  /* ============================================================== */
  /*  Checkout session mutations                                     */
  /* ============================================================== */

  async createCheckout(input: CheckoutCreateInput): Promise<Prisma.CheckoutSessionGetPayload<{}>> {
    return this.prisma.checkoutSession.create({
      data: {
        cartId: input.cartId,
        userId: input.userId,
        status: 'CREATED',
        currency: input.currency ?? 'VND',
        expiresAt: input.expiresAt,
        idempotencyKey: input.idempotencyKey,
      },
    });
  }

  async createCheckoutItems(items: CheckoutItemCreateInput[]): Promise<void> {
    if (items.length === 0) return;
    await this.prisma.checkoutItem.createMany({ data: items });
  }

  async updateShippingAddress(
    sessionId: string,
    address: {
      shippingFullName: string;
      shippingPhone: string;
      shippingProvince: string;
      shippingDistrict: string;
      shippingWard: string;
      shippingDetail: string;
    },
  ): Promise<void> {
    await this.prisma.checkoutSession.update({
      where: { id: sessionId },
      data: address,
    });
  }

  async updateBillingAddress(
    sessionId: string,
    address: {
      billingFullName: string;
      billingPhone: string;
      billingProvince: string;
      billingDistrict: string;
      billingWard: string;
      billingDetail: string;
    },
  ): Promise<void> {
    await this.prisma.checkoutSession.update({
      where: { id: sessionId },
      data: address,
    });
  }

  async updateTotals(
    sessionId: string,
    totals: {
      subtotal: Prisma.Decimal | number;
      discountAmount: Prisma.Decimal | number;
      shippingFee: Prisma.Decimal | number;
      taxAmount: Prisma.Decimal | number;
      grandTotal: Prisma.Decimal | number;
    },
  ): Promise<void> {
    await this.prisma.checkoutSession.update({
      where: { id: sessionId },
      data: {
        subtotal: totals.subtotal as any,
        discountAmount: totals.discountAmount as any,
        shippingFee: totals.shippingFee as any,
        taxAmount: totals.taxAmount as any,
        grandTotal: totals.grandTotal as any,
      },
    });
  }

  async updateStatus(
    sessionId: string,
    status: CheckoutSessionStatus,
  ): Promise<void> {
    const data: Prisma.CheckoutSessionUpdateInput = { status };
    if (status === 'COMPLETED') data.completedAt = new Date();
    if (status === 'CANCELLED') data.cancelledAt = new Date();
    await this.prisma.checkoutSession.update({
      where: { id: sessionId },
      data,
    });
  }

  async markExpired(sessionId: string): Promise<void> {
    await this.prisma.checkoutSession.update({
      where: { id: sessionId },
      data: { status: 'EXPIRED' },
    });
  }

  /* ============================================================== */
  /*  Stock reservation                                             */
  /* ============================================================== */

  async createReservation(
    input: ReservationCreateInput,
  ): Promise<StockReservation> {
    return this.prisma.stockReservation.create({
      data: {
        checkoutSessionId: input.checkoutSessionId,
        cartId: input.cartId,
        userId: input.userId,
        status: 'ACTIVE',
        expiresAt: input.expiresAt,
        items: {
          create: input.items.map((item) => ({
            productVariantId: item.productVariantId,
            quantity: item.quantity,
          })),
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
  }

  async findActiveReservationBySession(
    sessionId: string,
  ): Promise<StockReservation | null> {
    return this.prisma.stockReservation.findFirst({
      where: {
        checkoutSessionId: sessionId,
        status: 'ACTIVE',
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
  }

  async releaseReservation(
    reservationId: string,
    reason: string,
  ): Promise<void> {
    await this.prisma.stockReservation.update({
      where: { id: reservationId },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
        releasedReason: reason,
      },
    });
  }

  async confirmReservation(reservationId: string): Promise<void> {
    await this.prisma.stockReservation.update({
      where: { id: reservationId },
      data: {
        status: 'CONFIRMED',
        consumedAt: new Date(),
      },
    });
  }

  /** Atomically deduct `available` and increment `reserved` for a variant.
   *  Returns the number of updated rows (0 = insufficient stock).
   *  Uses raw UPDATE with a WHERE clause for row-level locking. */
  async reserveStock(
    variantId: string,
    quantity: number,
  ): Promise<number> {
    const result = await this.prisma.$executeRaw<number>`
      UPDATE "inventory"
      SET
        "available"     = "available" - ${quantity},
        "reserved"      = "reserved"  + ${quantity},
        "updated_at"    = NOW()
      WHERE
        "product_variant_id" = ${variantId}
        AND "available" >= ${quantity}
    `;
    return Number(result);
  }

  /** Release reserved stock back to available (on cancel/expire). */
  async releaseStock(
    variantId: string,
    quantity: number,
  ): Promise<number> {
    const result = await this.prisma.$executeRaw<number>`
      UPDATE "inventory"
      SET
        "available"  = LEAST("available" + ${quantity}, "on_hand"),
        "reserved"   = GREATEST("reserved" - ${quantity}, 0),
        "updated_at" = NOW()
      WHERE "product_variant_id" = ${variantId}
    `;
    return Number(result);
  }

  /** Consume reserved stock (on order confirmation). */
  async consumeStock(
    variantId: string,
    quantity: number,
  ): Promise<number> {
    const result = await this.prisma.$executeRaw<number>`
      UPDATE "inventory"
      SET
        "on_hand"    = "on_hand"    - ${quantity},
        "reserved"   = GREATEST("reserved" - ${quantity}, 0),
        "updated_at" = NOW()
      WHERE "product_variant_id" = ${variantId}
        AND "on_hand" >= ${quantity}
    `;
    return Number(result);
  }

  /* ============================================================== */
  /*  Inventory availability                                        */
  /* ============================================================== */

  async getVariantAvailability(
    variantId: string,
  ): Promise<{ available: number } | null> {
    const row = await this.prisma.inventory.findUnique({
      where: { productVariantId: variantId },
      select: { available: true },
    });
    return row;
  }

  /* ============================================================== */
  /*  Admin                                                        */
  /* ============================================================== */

  async listForAdmin(filter: {
    status?: string;
    userId?: string;
    page: number;
    limit: number;
  }) {
    const { status, userId, page, limit } = filter;
    const skip = (page - 1) * limit;
    const where: Prisma.CheckoutSessionWhereInput = {
      ...(status ? { status: status as any } : {}),
      ...(userId ? { userId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.checkoutSession.findMany({
        where,
        include: {
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.checkoutSession.count({ where }),
    ]);
    return { items, total };
  }

  /* ============================================================== */
  /*  Helpers                                                      */
  /* ============================================================== */

  private fullInclude() {
    return {
      cart: {
        include: {
          items: {
            where: { deletedAt: null },
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
        },
      },
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


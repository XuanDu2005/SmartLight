/**
 * OrdersRepository \u2014 only DB access for the order bounded context.
 *
 * No business rules live here. The service enforces all domain invariants.
 * Repository provides:
 *   - typed lookups (by id, by userId, by orderNumber, by checkoutSessionId)
 *   - mutation primitives (create order, create items, status updates, history)
 *   - transactional helpers
 *
 * All atomic flows (create order from checkout, status transitions) use
 * `this.prisma.$transaction` with Serializable isolation.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  Order,
  OrderPaymentStatus,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  ListOrdersFilter,
  OrderCreateInput,
  OrderItemCreateInput,
  OrderWithFull,
  OrderWithItems,
  StatusHistoryCreateInput,
} from '../interfaces/order.interfaces';

@Injectable()
export class OrdersRepository {
  private readonly logger = new Logger(OrdersRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Run a callback inside a Prisma transaction. */
  async withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 20_000,
    });
  }

  /* ============================================================== */
  /*  Order lookups                                                  */
  /* ============================================================== */

  async findById(id: string): Promise<OrderWithFull | null> {
    return this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: this.fullInclude(),
    });
  }

  async findByIdForUser(id: string, userId: string): Promise<OrderWithFull | null> {
    return this.prisma.order.findFirst({
      where: { id, userId, deletedAt: null },
      include: this.fullInclude(),
    });
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderWithFull | null> {
    return this.prisma.order.findFirst({
      where: { orderNumber, deletedAt: null },
      include: this.fullInclude(),
    });
  }

  async findByCheckoutSessionId(
    checkoutSessionId: string,
  ): Promise<OrderWithItems | null> {
    return this.prisma.order.findFirst({
      where: { checkoutSessionId, deletedAt: null },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async findByReservationId(reservationId: string): Promise<OrderWithItems | null> {
    return this.prisma.order.findFirst({
      where: { reservationId, deletedAt: null },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  /* ============================================================== */
  /*  Order mutations                                                */
  /* ============================================================== */

  async createOrder(
    input: OrderCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Order> {
    const client = tx ?? this.prisma;
    return client.order.create({
      data: {
        orderNumber: input.orderNumber,
        userId: input.userId,
        checkoutSessionId: input.checkoutSessionId,
        cartId: input.cartId,
        reservationId: input.reservationId,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'UNPAID',
        currency: input.currency,
        locale: input.locale,
        subtotal: input.subtotal as any,
        discountAmount: input.discountAmount as any,
        shippingFee: input.shippingFee as any,
        taxAmount: input.taxAmount as any,
        grandTotal: input.grandTotal as any,
        couponCode: input.couponCode,
        customerNotes: input.customerNotes,
        shippingFullName: input.shippingAddress.fullName,
        shippingPhone: input.shippingAddress.phone,
        shippingProvince: input.shippingAddress.province,
        shippingDistrict: input.shippingAddress.district,
        shippingWard: input.shippingAddress.ward,
        shippingDetail: input.shippingAddress.detail,
        billingFullName: input.billingAddress.fullName,
        billingPhone: input.billingAddress.phone,
        billingProvince: input.billingAddress.province,
        billingDistrict: input.billingAddress.district,
        billingWard: input.billingAddress.ward,
        billingDetail: input.billingAddress.detail,
      },
    });
  }

  async createOrderItems(
    items: OrderItemCreateInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (items.length === 0) return;
    const client = tx ?? this.prisma;
    await client.orderItem.createMany({
      data: items.map((item) => ({
        orderId: item.orderId,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPriceSnapshot: item.unitPriceSnapshot as any,
        lineSubtotalSnapshot: item.lineSubtotalSnapshot as any,
        taxAmountSnapshot: item.taxAmountSnapshot as any,
        productNameSnapshot: item.productNameSnapshot,
        variantNameSnapshot: item.variantNameSnapshot,
        skuSnapshot: item.skuSnapshot,
        productSlugSnapshot: item.productSlugSnapshot,
        imageSnapshotUrl: item.imageSnapshotUrl,
        weightGramsSnapshot: item.weightGramsSnapshot,
      })),
    });
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    paidAt?: Date,
    cancelledAt?: Date,
    cancelReason?: string,
    cancelledById?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Order> {
    const client = tx ?? this.prisma;
    return client.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        paidAt: paidAt ?? undefined,
        cancelledAt: cancelledAt ?? undefined,
        cancelReason: cancelReason ?? undefined,
        cancelledById: cancelledById ?? undefined,
      },
    });
  }

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: OrderPaymentStatus,
    paidAt?: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<Order> {
    const client = tx ?? this.prisma;
    return client.order.update({
      where: { id: orderId },
      data: {
        paymentStatus,
        paidAt: paidAt ?? undefined,
      },
    });
  }

  /* ============================================================== */
  /*  Status history                                                */
  /* ============================================================== */

  async createStatusHistory(
    input: StatusHistoryCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.orderStatusHistory.create({
      data: {
        orderId: input.orderId,
        fromStatus: input.fromStatus ?? undefined,
        toStatus: input.toStatus,
        changedByType: input.changedByType,
        changedById: input.changedById,
        changedByName: input.changedByName,
        reason: input.reason,
        metadataJson: (input.metadata as any) ?? Prisma.JsonNull ?? {},
      },
    });
  }

  /* ============================================================== */
  /*  Listing                                                       */
  /* ============================================================== */

  async listForUser(filter: ListOrdersFilter) {
    const { userId, status, page, limit } = filter;
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          items: { select: { id: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total };
  }

  async listForAdmin(filter: ListOrdersFilter) {
    const { userId, status, page, limit } = filter;
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, email: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total };
  }

  /* ============================================================== */
  /*  Order number generation                                       */
  /* ============================================================== */

  async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `SL-${datePart}-`;

    // Find the highest sequence number for today
    const lastOrder = await this.prisma.order.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });

    let nextSeq = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.orderNumber.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    const seqStr = String(nextSeq).padStart(6, '0');
    return `${prefix}${seqStr}`;
  }

  /* ============================================================== */
  /*  Helpers                                                       */
  /* ============================================================== */

  private fullInclude() {
    return {
      items: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    } as const;
  }
}
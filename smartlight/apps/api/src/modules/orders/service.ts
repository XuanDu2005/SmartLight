/**
 * OrdersService \u2014 all order business logic.
 *
 * Responsibilities:
 *   - convert RESERVED checkout session into order (with snapshots)
 *   - state machine for order status transitions
 *   - status history (immutable audit trail)
 *   - cancel order (customer + admin)
 *   - confirm reservation -> ownership transfer to order
 *   - customer isolation (IDOR protection)
 *
 * Layers:
 *   Controller -> OrdersService -> OrdersRepository -> PrismaService
 *
 * All money math uses Prisma.Decimal \u2014 never raw number.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { OrdersRepository } from './repositories/orders.repository';
import { ORDER_LIMITS } from './constants/order.constants';
import {
  CheckoutNoReservationException,
  CheckoutNotReadyException,
  CheckoutReservationNotActiveException,
  EmptyOrderException,
  InvalidStatusTransitionException,
  OrderAlreadyCancelledException,
  OrderAlreadyCompletedException,
  OrderAlreadyExistsException,
  OrderDeliveredCannotCancelException,
  OrderNotFoundException,
  UnauthorizedOrderAccessException,
} from './exceptions/order.exceptions';

import type {
  CancelOrderDto,
  CreateOrderDto,
  ListOrdersQueryDto,
  AdminListOrdersQueryDto,
  UpdateOrderStatusDto,
} from './dto/create-order.dto';
import type {
  AdminOrderListResponseDto,
  BillingAddressDto,
  OrderCreateResponseDto,
  OrderItemResponseDto,
  OrderResponseDto,
  OrderStatusHistoryEntryDto,
  OrderSummaryDto,
  OrderTotalsDto,
  ShippingAddressDto,
} from './dto/order-response.dto';

const ZERO = new Decimal(0);

/* ============================================================== */
/*  Order Status State Machine                                    */
/* ============================================================== */

/**
 * Allowed customer transitions (no admin override):
 *
 *   PENDING_PAYMENT -> CANCELLED
 *   DELIVERED -> RETURN_REQUESTED
 *   RETURN_REQUESTED -> RETURNED
 */
const CUSTOMER_ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['CANCELLED'],
  PAID: [],
  PROCESSING: [],
  PACKED: [],
  SHIPPED: [],
  DELIVERING: [],
  DELIVERED: ['RETURN_REQUESTED'],
  CANCELLED: [],
  REFUNDED: [],
  RETURN_REQUESTED: ['RETURNED'],
  RETURNED: [],
};

/**
 * Allowed admin transitions (full state machine):
 *
 *   PENDING_PAYMENT -> PAID -> PROCESSING -> PACKED -> SHIPPED -> DELIVERING -> DELIVERED
 *   PENDING_PAYMENT -> CANCELLED
 *   PROCESSING -> CANCELLED
 *   DELIVERED -> REFUNDED
 */
const ADMIN_ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED'],
  SHIPPED: ['DELIVERING'],
  DELIVERING: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
  RETURN_REQUESTED: [],
  RETURNED: ['REFUNDED'],
};

/* ============================================================== */
/*  Service                                                       */
/* ============================================================== */

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly repo: OrdersRepository) {}

  /* ============================================================== */
  /*  Create Order                                                  */
  /* ============================================================== */

  /**
   * Convert a RESERVED checkout session into an Order.
   *
   * Flow:
   *   1. Validate checkout exists, belongs to user, is RESERVED
   *   2. Validate reservation is ACTIVE
   *   3. Check no order already exists for this checkout
   *   4. Snapshot all prices and product info into OrderItem rows
   *   5. Snapshot addresses
   *   6. Mark reservation as CONFIRMED (ownership transfer)
   *   7. Mark checkout session as COMPLETED
   *   8. Create initial status history entry
   */
  async createOrder(
    userId: string,
    dto: CreateOrderDto,
  ): Promise<OrderCreateResponseDto> {
    // Idempotency: if an order already exists for this checkout, return it.
    const existing = await this.repo.findByCheckoutSessionId(
      dto.checkoutSessionId,
    );
    if (existing) {
      throw new OrderAlreadyExistsException(dto.checkoutSessionId);
    }

    return this.repo.withTransaction(async (tx) => {
      // 1. Load checkout session with reservation and items
      const session = await tx.checkoutSession.findFirst({
        where: { id: dto.checkoutSessionId, userId },
        include: {
          reservation: {
            include: { items: true },
          },
          items: {
            include: {
              variant: {
                select: { weightGrams: true },
              },
            },
          },
        },
      });

      if (!session) {
        throw new CheckoutNotReadyException(dto.checkoutSessionId, 'NOT_FOUND');
      }
      if (session.status !== 'RESERVED') {
        throw new CheckoutNotReadyException(dto.checkoutSessionId, session.status);
      }

      // 2. Validate reservation is ACTIVE
      if (!session.reservation) {
        throw new CheckoutNoReservationException(dto.checkoutSessionId);
      }
      if (session.reservation.status !== 'ACTIVE') {
        throw new CheckoutReservationNotActiveException(
          dto.checkoutSessionId,
          session.reservation.status,
        );
      }

      // 3. Validate items
      if (session.items.length === 0) {
        throw new EmptyOrderException();
      }

      // 4. Generate order number
      const orderNumber = await this.repo.generateOrderNumber();

      // 5. Create order with snapshot of totals + addresses
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          checkoutSessionId: session.id,
          cartId: session.cartId,
          reservationId: session.reservation.id,
          status: 'PENDING_PAYMENT',
          paymentStatus: 'UNPAID',
          currency: session.currency,
          locale: ORDER_LIMITS.DEFAULT_LOCALE,
          subtotal: session.subtotal,
          discountAmount: session.discountAmount,
          shippingFee: session.shippingFee,
          taxAmount: session.taxAmount,
          grandTotal: session.grandTotal,
          couponCode: session.couponCode,
          customerNotes: dto.customerNotes ?? null,
          // Shipping address snapshot
          shippingFullName: session.shippingFullName,
          shippingPhone: session.shippingPhone,
          shippingProvince: session.shippingProvince,
          shippingDistrict: session.shippingDistrict,
          shippingWard: session.shippingWard,
          shippingDetail: session.shippingDetail,
          // Billing address snapshot
          billingFullName: session.billingFullName,
          billingPhone: session.billingPhone,
          billingProvince: session.billingProvince,
          billingDistrict: session.billingDistrict,
          billingWard: session.billingWard,
          billingDetail: session.billingDetail,
        },
      });

      // 6. Create order items (immutable snapshot)
      await tx.orderItem.createMany({
        data: session.items.map((item) => ({
          orderId: order.id,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitPriceSnapshot: item.unitPriceSnapshot,
          lineSubtotalSnapshot: item.lineSubtotalSnapshot,
          taxAmountSnapshot: item.taxAmountSnapshot,
          productNameSnapshot: item.productNameSnapshot,
          variantNameSnapshot: item.variantNameSnapshot,
          skuSnapshot: item.skuSnapshot,
          productSlugSnapshot: item.productSlug,
          imageSnapshotUrl: item.productImageUrl,
          weightGramsSnapshot: item.variant?.weightGrams ?? null,
        })),
      });

      // 7. Confirm reservation (ACTIVE -> CONFIRMED)
      await tx.stockReservation.update({
        where: { id: session.reservation.id },
        data: {
          status: 'CONFIRMED',
          consumedAt: new Date(),
        },
      });

      // 8. Mark checkout session as COMPLETED
      await tx.checkoutSession.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // 9. Create initial status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: 'PENDING_PAYMENT',
          changedByType: 'CUSTOMER',
          changedById: userId,
          changedByName: null,
          reason: 'Order created from checkout session',
        },
      });

      this.logger.log(
        `Order created: order=${order.orderNumber} user=${userId} checkout=${session.id}`,
      );

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        grandTotal: this.d2n(order.grandTotal),
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
      };
    });
  }

  /* ============================================================== */
  /*  Read                                                          */
  /* ============================================================== */

  async getOrderForUser(
    orderId: string,
    userId: string,
  ): Promise<OrderResponseDto> {
    const order = await this.repo.findByIdForUser(orderId, userId);
    if (!order) {
      // Either doesn't exist or doesn't belong to user
      const exists = await this.repo.findById(orderId);
      if (exists) {
        throw new UnauthorizedOrderAccessException(orderId, userId);
      }
      throw new OrderNotFoundException(orderId);
    }
    return this.mapToResponse(order);
  }

  async listOrdersForUser(
    userId: string,
    query: ListOrdersQueryDto,
  ): Promise<{ items: OrderSummaryDto[]; total: number; page: number; limit: number }> {
    const page = Math.max(
      1,
      parseInt(String(query.page ?? '1'), 10) || ORDER_LIMITS.DEFAULT_PAGE,
    );
    const limit = Math.min(
      ORDER_LIMITS.MAX_LIMIT,
      Math.max(
        1,
        parseInt(String(query.limit ?? '20'), 10) || ORDER_LIMITS.DEFAULT_LIMIT,
      ),
    );

    const status = query.status
      ? (this.parseStatus(query.status))
      : undefined;

    const { items, total } = await this.repo.listForUser({
      userId,
      status,
      page,
      limit,
    });

    return {
      items: items.map((row: any) => ({
        id: row.id,
        orderNumber: row.orderNumber,
        status: row.status,
        paymentStatus: row.paymentStatus,
        itemCount: row._count?.items ?? 0,
        grandTotal: this.d2n(row.grandTotal),
        currency: row.currency,
        createdAt: row.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  /* ============================================================== */
  /*  Customer cancel                                              */
  /* ============================================================== */

  /**
   * Customer-initiated cancellation.
   *
   * Rules (BR-ORD-006, BR-ORD-005):
   *   - Allowed only when status is PENDING_PAYMENT (or DELIVERED for return).
   *   - Cannot cancel after DELIVERED (use return flow instead).
   *   - Cancelled orders cannot be re-opened.
   */
  async cancelOrderForUser(
    orderId: string,
    userId: string,
    dto: CancelOrderDto,
  ): Promise<OrderResponseDto> {
    return this.transitionStatus({
      orderId,
      actor: { type: 'CUSTOMER', id: userId, name: null },
      toStatus: 'CANCELLED',
      reason: dto.reason ?? 'Cancelled by customer',
      isAdmin: false,
    }).then(() => this.requireOwnedOrder(orderId, userId));
  }

  /* ============================================================== */
  /*  Admin                                                         */
  /* ============================================================== */

  async listOrdersForAdmin(
    query: AdminListOrdersQueryDto,
  ): Promise<AdminOrderListResponseDto> {
    const page = Math.max(
      1,
      parseInt(String(query.page ?? '1'), 10) || ORDER_LIMITS.DEFAULT_PAGE,
    );
    const limit = Math.min(
      ORDER_LIMITS.MAX_LIMIT,
      Math.max(
        1,
        parseInt(String(query.limit ?? '20'), 10) || ORDER_LIMITS.DEFAULT_LIMIT,
      ),
    );

    const status = query.status ? this.parseStatus(query.status) : undefined;

    const { items, total } = await this.repo.listForAdmin({
      userId: query.userId,
      status,
      page,
      limit,
    });

    return {
      items: items.map((row: any) => ({
        id: row.id,
        orderNumber: row.orderNumber,
        userId: row.userId,
        userEmail: row.user?.email ?? null,
        status: row.status,
        paymentStatus: row.paymentStatus,
        itemCount: row._count?.items ?? 0,
        grandTotal: this.d2n(row.grandTotal),
        currency: row.currency,
        createdAt: row.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
        paidAt: row.paidAt?.toISOString?.() ?? null,
      })),
      total,
      page,
      limit,
    };
  }

  async getOrderForAdmin(orderId: string): Promise<OrderResponseDto> {
    const order = await this.repo.findById(orderId);
    if (!order) throw new OrderNotFoundException(orderId);
    return this.mapToResponse(order);
  }

  async updateOrderStatusByAdmin(
    orderId: string,
    adminId: string,
    adminName: string | null,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const toStatus = this.parseStatus(dto.toStatus);

    await this.transitionStatus({
      orderId,
      actor: { type: 'ADMIN', id: adminId, name: adminName },
      toStatus,
      reason: dto.reason,
      isAdmin: true,
    });

    return this.requireOrder(orderId);
  }

  /* ============================================================== */
  /*  Internal: state machine                                      */
  /* ============================================================== */

  private async transitionStatus(args: {
    orderId: string;
    actor: {
      type: 'CUSTOMER' | 'ADMIN' | 'SYSTEM' | 'WEBHOOK';
      id: string | null;
      name: string | null;
    };
    toStatus: OrderStatus;
    reason: string | null | undefined;
    isAdmin: boolean;
  }): Promise<void> {
    return this.repo.withTransaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: args.orderId, deletedAt: null },
      });
      if (!order) throw new OrderNotFoundException(args.orderId);

      const fromStatus = order.status as OrderStatus;

      // BR-ORD-005: Cancelled orders cannot continue
      if (fromStatus === 'CANCELLED') {
        throw new OrderAlreadyCancelledException(args.orderId);
      }

      // BR-ORD-006: Delivered orders cannot be cancelled (use return)
      if (
        args.toStatus === 'CANCELLED' &&
        (fromStatus === 'DELIVERED' ||
          fromStatus === 'DELIVERING' ||
          fromStatus === 'RETURNED' ||
          fromStatus === 'REFUNDED')
      ) {
        throw new OrderDeliveredCannotCancelException(args.orderId);
      }

      // State machine validation
      const allowed = args.isAdmin
        ? ADMIN_ALLOWED[fromStatus]
        : CUSTOMER_ALLOWED[fromStatus];

      if (!allowed || !allowed.includes(args.toStatus)) {
        throw new InvalidStatusTransitionException(
          args.orderId,
          fromStatus,
          args.toStatus,
        );
      }

      // Update order status + side effects
      const updateData: Prisma.OrderUpdateInput = {
        status: args.toStatus,
      };
      if (args.toStatus === 'CANCELLED') {
        updateData.cancelledAt = new Date();
        updateData.cancelReason = args.reason ?? 'CANCELLED';
        if (args.isAdmin && args.actor.id) {
          updateData.cancelledById = args.actor.id;
        }
      }

      await tx.order.update({
        where: { id: args.orderId },
        data: updateData,
      });

      // Create status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId: args.orderId,
          fromStatus,
          toStatus: args.toStatus,
          changedByType: args.actor.type,
          changedById: args.actor.id,
          changedByName: args.actor.name,
          reason: args.reason,
        },
      });

      this.logger.log(
        `Order status changed: order=${args.orderId} ${fromStatus} -> ${args.toStatus} by ${args.actor.type}:${args.actor.id}`,
      );
    });
  }

  /* ============================================================== */
  /*  Helpers                                                       */
  /* ============================================================== */

  private async requireOwnedOrder(
    orderId: string,
    userId: string,
  ): Promise<OrderResponseDto> {
    const order = await this.repo.findByIdForUser(orderId, userId);
    if (!order) {
      const exists = await this.repo.findById(orderId);
      if (exists) {
        throw new UnauthorizedOrderAccessException(orderId, userId);
      }
      throw new OrderNotFoundException(orderId);
    }
    return this.mapToResponse(order);
  }

  private async requireOrder(orderId: string): Promise<OrderResponseDto> {
    const order = await this.repo.findById(orderId);
    if (!order) throw new OrderNotFoundException(orderId);
    return this.mapToResponse(order);
  }

  private parseStatus(status: string): OrderStatus {
    const valid = [
      'PENDING_PAYMENT',
      'PAID',
      'PROCESSING',
      'PACKED',
      'SHIPPED',
      'DELIVERING',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED',
      'RETURN_REQUESTED',
      'RETURNED',
    ] as const;
    if (!valid.includes(status as any)) {
      throw new InvalidStatusTransitionException('?', '?', status);
    }
    return status as OrderStatus;
  }

  /* ---------- Mapping ---------- */

  private mapToResponse(order: any): OrderResponseDto {
    const items: OrderItemResponseDto[] = (order.items ?? []).map((item: any) => ({
      id: item.id,
      productVariantId: item.productVariantId,
      productName: item.productNameSnapshot,
      variantName: item.variantNameSnapshot,
      sku: item.skuSnapshot,
      productSlug: item.productSlugSnapshot,
      imageUrl: item.imageSnapshotUrl ?? null,
      quantity: item.quantity,
      unitPrice: this.d2n(item.unitPriceSnapshot),
      lineSubtotal: this.d2n(item.lineSubtotalSnapshot),
      taxAmount: this.d2n(item.taxAmountSnapshot),
      weightGrams: item.weightGramsSnapshot ?? null,
    }));

    const statusHistory: OrderStatusHistoryEntryDto[] = (
      order.statusHistory ?? []
    ).map((entry: any) => ({
      id: entry.id,
      fromStatus: entry.fromStatus ?? null,
      toStatus: entry.toStatus,
      changedByType: entry.changedByType,
      changedById: entry.changedById ?? null,
      changedByName: entry.changedByName ?? null,
      reason: entry.reason ?? null,
      createdAt: entry.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
    }));

    const shippingAddress: ShippingAddressDto | null = order.shippingFullName
      ? {
          fullName: order.shippingFullName,
          phone: order.shippingPhone,
          province: order.shippingProvince,
          district: order.shippingDistrict,
          ward: order.shippingWard,
          detail: order.shippingDetail,
        }
      : null;

    const billingAddress: BillingAddressDto | null = order.billingFullName
      ? {
          fullName: order.billingFullName,
          phone: order.billingPhone,
          province: order.billingProvince,
          district: order.billingDistrict,
          ward: order.billingWard,
          detail: order.billingDetail,
        }
      : null;

    const totals: OrderTotalsDto = {
      subtotal: this.d2n(order.subtotal),
      discountAmount: this.d2n(order.discountAmount),
      shippingFee: this.d2n(order.shippingFee),
      taxAmount: this.d2n(order.taxAmount),
      grandTotal: this.d2n(order.grandTotal),
      currency: order.currency,
    };

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      checkoutSessionId: order.checkoutSessionId ?? null,
      cartId: order.cartId ?? null,
      status: order.status,
      paymentStatus: order.paymentStatus,
      currency: order.currency,
      items,
      statusHistory,
      shippingAddress,
      billingAddress,
      totals,
      couponCode: order.couponCode ?? null,
      customerNotes: order.customerNotes ?? null,
      cancelledAt: order.cancelledAt?.toISOString?.() ?? null,
      cancelReason: order.cancelReason ?? null,
      paidAt: order.paidAt?.toISOString?.() ?? null,
      createdAt: order.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      updatedAt: order.updatedAt?.toISOString?.() ?? new Date(0).toISOString(),
    };
  }

  private d2n(d: Decimal | number | null | undefined): number {
    if (d === null || d === undefined) return 0;
    if (typeof d === 'number') return d;
    return (d as any).toNumber?.() ?? 0;
  }
}

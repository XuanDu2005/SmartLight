/**
 * ShippingRepository \u2014 only DB access for the shipping bounded context.
 *
 * All business rules live in ShippingService. The repository provides:
 *   - typed lookups
 *   - append-only mutations
 *   - transactional helpers
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  Shipment,
  ShipmentEventType,
  ShipmentStatus,
  ShippingProvider,
  ShippingWebhookLog,
} from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';

import type {
  ListShipmentsFilter,
  ShipmentCreateInput,
  ShipmentHistoryCreateInput,
  ShipmentItemCreateInput,
  ShipmentWithAll,
} from '../interfaces/shipping.interfaces';

@Injectable()
export class ShippingRepository {
  private readonly logger = new Logger(ShippingRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 20_000,
    });
  }

  /* ============================================================== */
  /*  Order lookups for service-level validation                   */
  /* ============================================================== */

  async findOrderForShipping(orderId: string): Promise<{
    id: string;
    orderNumber: string;
    userId: string;
    grandTotal: any;
    currency: string;
    status: string;
    paymentStatus: string;
    shippingFullName: string | null;
    shippingPhone: string | null;
    shippingProvince: string | null;
    shippingDistrict: string | null;
    shippingWard: string | null;
    shippingDetail: string | null;
  } | null> {
    return this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        grandTotal: true,
        currency: true,
        status: true,
        paymentStatus: true,
        shippingFullName: true,
        shippingPhone: true,
        shippingProvince: true,
        shippingDistrict: true,
        shippingWard: true,
        shippingDetail: true,
      },
    });
  }

  async findOrderItemsForShipping(orderId: string) {
    return this.prisma.orderItem.findMany({
      where: { orderId },
      include: {
        variant: {
          select: { weightGrams: true },
        },
      },
    });
  }

  /* ============================================================== */
  /*  Shipment lookups                                              */
  /* ============================================================== */

  async findById(id: string): Promise<ShipmentWithAll | null> {
    return this.prisma.shipment.findFirst({
      where: { id },
      include: this.fullInclude(),
    });
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<ShipmentWithAll | null> {
    return this.prisma.shipment.findFirst({
      where: { id, userId },
      include: this.fullInclude(),
    });
  }

  async findByOrderId(orderId: string): Promise<ShipmentWithAll | null> {
    return this.prisma.shipment.findFirst({
      where: { orderId },
      include: this.fullInclude(),
    });
  }

  async findActiveByOrderId(orderId: string): Promise<Shipment | null> {
    return this.prisma.shipment.findFirst({
      where: {
        orderId,
        status: {
          notIn: ['DELIVERED', 'RETURNED', 'CANCELLED'],
        },
      },
    });
  }

  async findByTrackingNumber(
    trackingNumber: string,
  ): Promise<ShipmentWithAll | null> {
    return this.prisma.shipment.findFirst({
      where: { trackingNumber },
      include: this.fullInclude(),
    });
  }

  async findByProviderOrderCode(
    providerOrderCode: string,
  ): Promise<ShipmentWithAll | null> {
    return this.prisma.shipment.findFirst({
      where: { providerOrderCode },
      include: this.fullInclude(),
    });
  }

  /* ============================================================== */
  /*  Shipment mutations                                            */
  /* ============================================================== */

  async createShipment(
    input: ShipmentCreateInput,
    shipmentNumber: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Shipment> {
    const client = tx ?? this.prisma;
    return client.shipment.create({
      data: {
        shipmentNumber,
        orderId: input.orderId,
        userId: input.userId,
        provider: input.provider,
        status: 'CREATED',
        weightGrams: input.weightGrams,
        lengthMm: input.lengthMm ?? null,
        widthMm: input.widthMm ?? null,
        heightMm: input.heightMm ?? null,
        shippingFee: input.shippingFee as any,
        codAmount: (input.codAmount ?? 0) as any,
        shipToFullName: input.shipTo.fullName ?? '',
        shipToPhone: input.shipTo.phone ?? '',
        shipToProvince: input.shipTo.province ?? '',
        shipToDistrict: input.shipTo.district ?? '',
        shipToWard: input.shipTo.ward,
        shipToDetail: input.shipTo.detail ?? '',
        notes: input.notes,
        metadataJson: (input.metadata as any) ?? Prisma.JsonNull ?? {},
      },
    });
  }

  async createShipmentItems(
    items: ShipmentItemCreateInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (items.length === 0) return;
    const client = tx ?? this.prisma;
    await client.shipmentItem.createMany({
      data: items.map((item) => ({
        shipmentId: item.shipmentId,
        orderItemId: item.orderItemId ?? null,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        productNameSnapshot: item.productNameSnapshot,
        variantNameSnapshot: item.variantNameSnapshot,
        skuSnapshot: item.skuSnapshot,
        weightGramsSnapshot: item.weightGramsSnapshot,
      })),
    });
  }

  async updateShipment(
    id: string,
    patch: {
      status?: ShipmentStatus;
      trackingNumber?: string | null;
      providerOrderCode?: string | null;
      labelUrl?: string | null;
      estimatedDeliveryAt?: Date | null;
      shippedAt?: Date | null;
      pickedUpAt?: Date | null;
      deliveredAt?: Date | null;
      returnedAt?: Date | null;
      cancelledAt?: Date | null;
      failureReason?: string | null;
      notes?: string | null;
      metadata?: Record<string, unknown>;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Shipment> {
    const client = tx ?? this.prisma;
    const data: Prisma.ShipmentUpdateInput = {};
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.trackingNumber !== undefined)
      data.trackingNumber = patch.trackingNumber;
    if (patch.providerOrderCode !== undefined)
      data.providerOrderCode = patch.providerOrderCode;
    if (patch.labelUrl !== undefined) data.labelUrl = patch.labelUrl;
    if (patch.estimatedDeliveryAt !== undefined)
      data.estimatedDeliveryAt = patch.estimatedDeliveryAt;
    if (patch.shippedAt !== undefined) data.shippedAt = patch.shippedAt;
    if (patch.pickedUpAt !== undefined) data.pickedUpAt = patch.pickedUpAt;
    if (patch.deliveredAt !== undefined) data.deliveredAt = patch.deliveredAt;
    if (patch.returnedAt !== undefined) data.returnedAt = patch.returnedAt;
    if (patch.cancelledAt !== undefined)
      data.cancelledAt = patch.cancelledAt;
    if (patch.failureReason !== undefined)
      data.failureReason = patch.failureReason;
    if (patch.notes !== undefined) data.notes = patch.notes;
    if (patch.metadata !== undefined)
      data.metadataJson = (patch.metadata as any) ?? Prisma.JsonNull ?? {};
    return client.shipment.update({ where: { id }, data });
  }

  /* ============================================================== */
  /*  Shipment history (append-only)                                */
  /* ============================================================== */

  async createHistory(
    input: ShipmentHistoryCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.shipmentHistory.create({
      data: {
        shipmentId: input.shipmentId,
        event: input.event,
        oldStatus: input.oldStatus ?? null,
        newStatus: input.newStatus ?? null,
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        message: input.message ?? null,
        location: input.location ?? null,
        metadataJson: (input.metadata as any) ?? Prisma.JsonNull ?? {},
      },
    });
  }

  /* ============================================================== */
  /*  Webhook log                                                    */
  /* ============================================================== */

  async findWebhookByEventId(
    provider: ShippingProvider,
    eventId: string,
  ): Promise<ShippingWebhookLog | null> {
    return this.prisma.shippingWebhookLog.findFirst({
      where: { provider, eventId },
    });
  }

  async createWebhookLog(args: {
    provider: ShippingProvider;
    eventId: string;
    eventType?: string | null;
    payload: Record<string, unknown>;
    signature?: string | null;
  }): Promise<ShippingWebhookLog> {
    return this.prisma.shippingWebhookLog.create({
      data: {
        provider: args.provider,
        eventId: args.eventId,
        eventType: args.eventType ?? null,
        payloadJson: (args.payload as any) ?? Prisma.JsonNull ?? {},
        signature: args.signature ?? null,
      },
    });
  }

  async markWebhookProcessed(
    id: string,
    ok: boolean,
    errorMessage?: string,
  ): Promise<void> {
    await this.prisma.shippingWebhookLog.update({
      where: { id },
      data: {
        processed: ok,
        processedAt: new Date(),
        errorMessage: errorMessage ?? null,
      },
    });
  }

  /* ============================================================== */
  /*  Fee cache                                                      */
  /* ============================================================== */

  async findFeeCache(args: {
    provider: ShippingProvider;
    originProvince: string;
    originDistrict: string;
    destProvince: string;
    destDistrict: string;
    weightGrams: number;
  }) {
    return this.prisma.shippingFeeCache.findFirst({
      where: {
        provider: args.provider,
        originProvince: args.originProvince,
        originDistrict: args.originDistrict,
        destProvince: args.destProvince,
        destDistrict: args.destDistrict,
        weightGrams: args.weightGrams,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async upsertFeeCache(args: {
    provider: ShippingProvider;
    originProvince: string;
    originDistrict: string;
    destProvince: string;
    destDistrict: string;
    weightGrams: number;
    fee: Prisma.Decimal | number;
    currency: string;
    raw?: Record<string, unknown>;
    ttlMinutes: number;
  }): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + args.ttlMinutes);
    await this.prisma.shippingFeeCache.upsert({
      where: {
        provider_originProvince_originDistrict_destProvince_destDistrict_weightGrams:
          {
            provider: args.provider,
            originProvince: args.originProvince,
            originDistrict: args.originDistrict,
            destProvince: args.destProvince,
            destDistrict: args.destDistrict,
            weightGrams: args.weightGrams,
          },
      },
      create: {
        provider: args.provider,
        originProvince: args.originProvince,
        originDistrict: args.originDistrict,
        destProvince: args.destProvince,
        destDistrict: args.destDistrict,
        weightGrams: args.weightGrams,
        fee: args.fee as any,
        currency: args.currency,
        rawResponseJson: (args.raw as any) ?? Prisma.JsonNull ?? {},
        expiresAt,
      },
      update: {
        fee: args.fee as any,
        currency: args.currency,
        rawResponseJson: (args.raw as any) ?? Prisma.JsonNull ?? {},
        expiresAt,
      },
    });
  }

  /* ============================================================== */
  /*  Listing                                                        */
  /* ============================================================== */

  async listShipments(filter: ListShipmentsFilter) {
    const { userId, orderId, status, provider, page, limit } = filter;
    const skip = (page - 1) * limit;
    const where: Prisma.ShipmentWhereInput = {
      ...(userId ? { userId } : {}),
      ...(orderId ? { orderId } : {}),
      ...(status ? { status } : {}),
      ...(provider ? { provider } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.shipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);
    return { items, total };
  }

  /* ============================================================== */
  /*  Shipment number generation                                     */
  /* ============================================================== */

  async generateShipmentNumber(): Promise<string> {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `SHP-${datePart}-`;

    const last = await this.prisma.shipment.findFirst({
      where: { shipmentNumber: { startsWith: prefix } },
      orderBy: { shipmentNumber: 'desc' },
      select: { shipmentNumber: true },
    });

    let nextSeq = 1;
    if (last) {
      const lastSeq = parseInt(last.shipmentNumber.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }
    return `${prefix}${String(nextSeq).padStart(6, '0')}`;
  }

  /* ============================================================== */
  /*  Helpers                                                        */
  /* ============================================================== */

  private fullInclude() {
    return {
      items: true,
      history: { orderBy: { createdAt: 'asc' } },
      order: {
        select: {
          id: true,
          orderNumber: true,
          userId: true,
          grandTotal: true,
          currency: true,
          status: true,
          shippingFullName: true,
          shippingPhone: true,
          shippingProvince: true,
          shippingDistrict: true,
          shippingWard: true,
          shippingDetail: true,
        },
      },
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

type _EventType = ShipmentEventType; // keep import for re-export

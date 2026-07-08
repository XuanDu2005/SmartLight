/**
 * ShippingService \u2014 all shipping business logic.
 *
 * Public service contract (exposed for Orders module and other bounded
 * contexts):
 *   - createShipment(orderId, options)
 *   - cancelShipment(shipmentId, options)
 *   - findShipment(shipmentId)
 *   - trackShipment(trackingNumber)
 *   - estimateFee(input)
 *   - updateStatus(shipmentId, toStatus, actor)
 *
 * Customer + admin API methods are exposed via the controller.
 *
 * Provider abstraction: this service depends on the {@link ShippingGateway}
 * interface, never on a concrete provider. New providers can be added by
 * implementing the interface and registering them in the module.
 *
 * Money math: Prisma.Decimal throughout; never raw number.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ShipmentStatus, ShippingProvider } from '@prisma/client';

import { ShippingRepository } from './repositories/shipping.repository';
import { GHNGateway } from './gateways/ghn.gateway';
import { GHTKGateway } from './gateways/ghtk.gateway';
import { ViettelPostGateway } from './gateways/viettel-post.gateway';
import { AhamoveGateway } from './gateways/ahamove.gateway';
import { GrabExpressGateway } from './gateways/grab-express.gateway';
import {
  CALLBACK_TO_SHIPMENT_STATUS,
  type AddressPayload,
  type CallbackResult,
  type ShippingGateway,
} from './interfaces/shipping-gateway.interface';
import {
  PROVIDER_LABELS,
  SHIPPING_LIMITS,
  SHIPMENT_ACTIVE_STATUSES,
  SHIPMENT_TRANSITIONS,
  toProviderEnum,
} from './constants/shipping.constants';
import {
  ActiveShipmentExistsException,
  DuplicateWebhookException,
  InvalidShipmentTransitionException,
  InvalidShippingProviderException,
  OrderNotFoundForShippingException,
  OrderNotShippableException,
  ProviderErrorException,
  ShipmentAlreadyDeliveredException,
  ShipmentNotCancellableException,
  ShipmentNotFoundException,
  TrackingNumberAlreadyUsedException,
  UnauthorizedShipmentAccessException,
  WeightExceedsLimitException,
} from './exceptions/shipping.exceptions';

import type {
  AddressDto,
  CreateShipmentDto,
  EstimateFeeDto,
} from './dto/create-shipment.dto';
import type {
  FeeEstimateResponseDto,
  ProviderInfoDto,
  PublicTrackingResponseDto,
  ShipmentListResponseDto,
  ShipmentResponseDto,
  ShipmentSummaryDto,
} from './dto/shipping-response.dto';

const SHIPPABLE_ORDER_STATUSES = [
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERING',
  'DELIVERED',
];

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly gatewayRegistry: Record<ShippingProvider, ShippingGateway>;

  constructor(
    private readonly repo: ShippingRepository,
    private readonly ghn: GHNGateway,
    private readonly ghtk: GHTKGateway,
    private readonly viettel: ViettelPostGateway,
    private readonly ahamove: AhamoveGateway,
    private readonly grab: GrabExpressGateway,
  ) {
    this.gatewayRegistry = {
      [ShippingProvider.GHN]: this.ghn,
      [ShippingProvider.GHTK]: this.ghtk,
      [ShippingProvider.VIETTEL_POST]: this.viettel,
      [ShippingProvider.AHAMOVE]: this.ahamove,
      [ShippingProvider.GRAB_EXPRESS]: this.grab,
    };
  }

  /* ============================================================== */
  /*  Provider listing (public API)                                  */
  /* ============================================================== */

  listProviders(): ProviderInfoDto[] {
    return Object.values(ShippingProvider).map((p) => ({
      code: p.toLowerCase(),
      name: PROVIDER_LABELS[p],
      enabled: p === ShippingProvider.GHN, // Only GHN is live in V1
    }));
  }

  /* ============================================================== */
  /*  Fee estimation                                                 */
  /* ============================================================== */

  async estimateFee(dto: EstimateFeeDto): Promise<FeeEstimateResponseDto> {
    const providerEnum = dto.provider
      ? toProviderEnum(dto.provider)
      : SHIPPING_LIMITS.DEFAULT_PROVIDER;

    if (providerEnum !== ShippingProvider.GHN) {
      throw new InvalidShippingProviderException(providerEnum);
    }

    // 1. Cache lookup
    const cacheKey = {
      provider: providerEnum,
      originProvince: dto.shipFrom.province,
      originDistrict: dto.shipFrom.district,
      destProvince: dto.shipTo.province,
      destDistrict: dto.shipTo.district,
      weightGrams: dto.weightGrams,
    };
    const cached = await this.repo.findFeeCache(cacheKey);
    if (cached) {
      return {
        provider: providerEnum.toLowerCase(),
        serviceCode: 'GHN_STD',
        serviceName: 'GHN Standard',
        fee: this.d2n(cached.fee),
        currency: cached.currency,
        estimatedDaysMin: 1,
        estimatedDaysMax: 3,
        cached: true,
      };
    }

    // 2. Live estimate via gateway
    const gateway = this.gatewayRegistry[providerEnum];
    const result = await gateway.estimateFee({
      shipFrom: this.toAddress(dto.shipFrom),
      shipTo: this.toAddress(dto.shipTo),
      weightGrams: dto.weightGrams,
      codAmount: dto.codAmount ?? 0,
    });

    // 3. Persist to cache
    await this.repo.upsertFeeCache({
      ...cacheKey,
      fee: result.fee,
      currency: result.currency,
      raw: result.raw,
      ttlMinutes: SHIPPING_LIMITS.FEE_CACHE_TTL_MINUTES,
    });

    return {
      provider: providerEnum.toLowerCase(),
      serviceCode: result.serviceCode,
      serviceName: result.serviceName,
      fee: result.fee,
      currency: result.currency,
      estimatedDaysMin: result.estimatedDaysMin,
      estimatedDaysMax: result.estimatedDaysMax,
      cached: false,
    };
  }

  /* ============================================================== */
  /*  createShipment                                                  */
  /* ============================================================== */

  /**
   * Create a shipment for an order. Enforces:
   *   - Order exists, belongs to user, is in a shippable state
   *   - No active shipment already exists for the order
   *   - Order has at least one item
   *   - Weight within provider limits
   *   - Provider is enabled (only GHN in V1)
   */
  async createShipment(
    userId: string,
    dto: CreateShipmentDto,
  ): Promise<ShipmentResponseDto> {
    const providerEnum = dto.provider
      ? toProviderEnum(dto.provider)
      : SHIPPING_LIMITS.DEFAULT_PROVIDER;

    if (providerEnum !== ShippingProvider.GHN) {
      throw new InvalidShippingProviderException(providerEnum);
    }

    // 1. Load order + items
    const order = await this.repo.findOrderForShipping(dto.orderId);
    if (!order) throw new OrderNotFoundForShippingException(dto.orderId);
    if (order.userId !== userId) {
      throw new UnauthorizedShipmentAccessException(dto.orderId, userId);
    }
    if (!SHIPPABLE_ORDER_STATUSES.includes(order.status)) {
      throw new OrderNotShippableException(dto.orderId, order.status);
    }

    // 2. Reject duplicate active shipment
    const existing = await this.repo.findActiveByOrderId(dto.orderId);
    if (existing) {
      throw new ActiveShipmentExistsException(dto.orderId, existing.id);
    }

    const orderItems = await this.repo.findOrderItemsForShipping(dto.orderId);
    if (orderItems.length === 0) {
      throw new OrderNotShippableException(dto.orderId, 'NO_ITEMS');
    }

    // 3. Compute weight
    const weightGrams = dto.weightGrams ?? this.computeOrderWeight(orderItems);
    if (weightGrams > SHIPPING_LIMITS.MAX_WEIGHT_GRAMS) {
      throw new WeightExceedsLimitException(
        weightGrams,
        SHIPPING_LIMITS.MAX_WEIGHT_GRAMS,
      );
    }

    const shippingFee = Number(order.grandTotal) >= 500_000 ? 0 : 25_000;
    const codAmount = order.paymentStatus === 'PAID' ? 0 : Number(order.grandTotal);

    // 4. Generate shipment number
    const shipmentNumber = await this.repo.generateShipmentNumber();

    // 5. Create shipment row in CREATED state
    const shipment = await this.repo.createShipment(
      {
        orderId: dto.orderId,
        userId,
        provider: providerEnum,
        weightGrams,
        shippingFee,
        codAmount,
        shipTo: {
          fullName: order.shippingFullName,
          phone: order.shippingPhone,
          province: order.shippingProvince,
          district: order.shippingDistrict,
          ward: order.shippingWard,
          detail: order.shippingDetail,
        },
        notes: dto.notes,
      },
      shipmentNumber,
    );

    // 6. Create shipment items snapshot
    await this.repo.createShipmentItems(
      orderItems.map((it) => ({
        shipmentId: shipment.id,
        orderItemId: it.id,
        productVariantId: it.productVariantId,
        quantity: it.quantity,
        productNameSnapshot: it.productNameSnapshot,
        variantNameSnapshot: it.variantNameSnapshot,
        skuSnapshot: it.skuSnapshot,
        weightGramsSnapshot: it.variant?.weightGrams ?? 0,
      })),
    );

    // 7. Initial history entry
    await this.repo.createHistory({
      shipmentId: shipment.id,
      event: 'CREATED',
      oldStatus: null,
      newStatus: 'CREATED',
      actorType: 'SYSTEM',
      actorId: userId,
      message: 'Shipment created',
    });

    // 8. Call provider to register shipment
    const gateway = this.gatewayRegistry[providerEnum];
    try {
      const result = await gateway.createShipment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        shipFrom: {
          fullName: 'SmartLight Warehouse',
          phone: this.configWarehousePhone(),
          province: SHIPPING_LIMITS.DEFAULT_WAREHOUSE_PROVINCE,
          district: SHIPPING_LIMITS.DEFAULT_WAREHOUSE_DISTRICT,
          detail: 'SmartLight warehouse address',
        },
        shipTo: this.toAddress({
          fullName: order.shippingFullName,
          phone: order.shippingPhone,
          province: order.shippingProvince,
          district: order.shippingDistrict,
          ward: order.shippingWard,
          detail: order.shippingDetail,
        }),
        items: orderItems.map((it) => ({
          productVariantId: it.productVariantId,
          productName: it.productNameSnapshot,
          sku: it.skuSnapshot,
          weightGrams: it.variant?.weightGrams ?? 0,
          quantity: it.quantity,
        })),
        weightGrams,
        codAmount,
        shippingFee,
        notes: dto.notes,
      });

      await this.repo.updateShipment(shipment.id, {
        status: 'WAITING_PICKUP',
        trackingNumber: result.trackingNumber,
        providerOrderCode: result.providerOrderCode,
        labelUrl: result.labelUrl,
        estimatedDeliveryAt: result.estimatedDeliveryAt,
      });
      await this.repo.createHistory({
        shipmentId: shipment.id,
        event: 'STATUS_CHANGED',
        oldStatus: 'CREATED',
        newStatus: 'WAITING_PICKUP',
        actorType: 'SYSTEM',
        message: `Registered with ${gateway.displayName}`,
        metadata: { providerOrderCode: result.providerOrderCode },
      });
    } catch (err: any) {
      // Provider call failed \u2014 mark shipment as FAILED but keep the record
      await this.repo.updateShipment(shipment.id, {
        status: 'FAILED',
        failureReason: `provider_error: ${err?.message ?? err}`,
      });
      await this.repo.createHistory({
        shipmentId: shipment.id,
        event: 'FAILED',
        oldStatus: 'CREATED',
        newStatus: 'FAILED',
        actorType: 'SYSTEM',
        message: err?.message ?? 'Provider error',
      });
      this.logger.error(
        `Provider call failed for shipment=${shipment.id}: ${err?.message ?? err}`,
      );
    }

    const final = await this.repo.findById(shipment.id);
    return this.mapToResponse(final!);
  }

  /* ============================================================== */
  /*  cancelShipment                                                  */
  /* ============================================================== */

  async cancelShipment(
    shipmentId: string,
    options: {
      actorType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM' | 'WEBHOOK';
      actorId: string | null;
      actorName: string | null;
      reason?: string;
    },
  ): Promise<ShipmentResponseDto> {
    return this.transitionStatus({
      shipmentId,
      toStatus: 'CANCELLED',
      actor: {
        type: options.actorType,
        id: options.actorId,
        name: options.actorName,
      },
      reason: options.reason,
      event: 'STATUS_CHANGED',
    }).then(() => this.requireShipment(shipmentId));
  }

  /* ============================================================== */
  /*  updateStatus (admin / webhook)                                  */
  /* ============================================================== */

  async updateStatus(
    shipmentId: string,
    toStatus: ShipmentStatus,
    actor: {
      type: 'CUSTOMER' | 'ADMIN' | 'SYSTEM' | 'WEBHOOK';
      id: string | null;
      name: string | null;
    },
    reason?: string,
  ): Promise<ShipmentResponseDto> {
    await this.transitionStatus({
      shipmentId,
      toStatus,
      actor,
      reason,
      event: 'STATUS_CHANGED',
    });
    return this.requireShipment(shipmentId);
  }

  /* ============================================================== */
  /*  findShipment / trackShipment                                    */
  /* ============================================================== */

  async findShipment(shipmentId: string): Promise<ShipmentResponseDto> {
    const s = await this.repo.findById(shipmentId);
    if (!s) throw new ShipmentNotFoundException(shipmentId);
    return this.mapToResponse(s);
  }

  async findShipmentForUser(
    shipmentId: string,
    userId: string,
  ): Promise<ShipmentResponseDto> {
    const s = await this.repo.findByIdForUser(shipmentId, userId);
    if (!s) {
      const exists = await this.repo.findById(shipmentId);
      if (exists) {
        throw new UnauthorizedShipmentAccessException(shipmentId, userId);
      }
      throw new ShipmentNotFoundException(shipmentId);
    }
    return this.mapToResponse(s);
  }

  async trackShipment(trackingNumber: string): Promise<PublicTrackingResponseDto> {
    const s = await this.repo.findByTrackingNumber(trackingNumber);
    if (!s) throw new ShipmentNotFoundException(trackingNumber);

    // Optionally enrich with provider live tracking
    // (we keep DB as the source of truth; the gateway is consulted only
    // for the latest snapshot)
    return {
      shipmentNumber: s.shipmentNumber,
      trackingNumber: s.trackingNumber,
      provider: s.provider.toLowerCase(),
      status: s.status,
      estimatedDeliveryAt: s.estimatedDeliveryAt?.toISOString?.() ?? null,
      shippedAt: s.shippedAt?.toISOString?.() ?? null,
      deliveredAt: s.deliveredAt?.toISOString?.() ?? null,
      history: (s.history ?? []).map((h: any) => ({
        event: h.event,
        oldStatus: h.oldStatus ?? null,
        newStatus: h.newStatus ?? null,
        message: h.message ?? null,
        location: h.location ?? null,
        occurredAt: h.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      })),
    };
  }

  /* ============================================================== */
  /*  List (customer + admin)                                         */
  /* ============================================================== */

  async listForUser(
    userId: string,
    options: { page?: number; limit?: number; status?: ShipmentStatus },
  ): Promise<ShipmentListResponseDto> {
    const page = options.page ?? 1;
    const limit = options.limit ?? SHIPPING_LIMITS.DEFAULT_LIMIT;
    const { items, total } = await this.repo.listShipments({
      userId,
      status: options.status,
      page,
      limit,
    });
    return {
      items: items.map((row: any) => this.mapToSummary(row)),
      total,
      page,
      limit,
    };
  }

  async listForAdmin(
    options: {
      page?: number;
      limit?: number;
      status?: ShipmentStatus;
      provider?: ShippingProvider;
      userId?: string;
      orderId?: string;
    },
  ): Promise<ShipmentListResponseDto> {
    const page = options.page ?? 1;
    const limit = options.limit ?? SHIPPING_LIMITS.DEFAULT_LIMIT;
    const { items, total } = await this.repo.listShipments({
      userId: options.userId,
      orderId: options.orderId,
      status: options.status,
      provider: options.provider,
      page,
      limit,
    });
    return {
      items: items.map((row: any) => this.mapToSummary(row)),
      total,
      page,
      limit,
    };
  }

  /* ============================================================== */
  /*  Webhook handling                                                */
  /* ============================================================== */

  /**
   * Receive a provider webhook, verify signature, apply state changes
   * idempotently. Returns a 200 OK-friendly object.
   */
  async handleWebhook(
    provider: ShippingProvider,
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
    signatureHeader: string | null,
  ): Promise<{ processed: boolean; reason?: string }> {
    const gateway = this.gatewayRegistry[provider];

    // 1. Verify signature / callback
    let callback: CallbackResult;
    try {
      callback = await gateway.verifyCallback(payload, headers);
    } catch (err) {
      const eventId = this.extractEventId(payload) ?? `unknown-${Date.now()}`;
      await this.repo.createWebhookLog({
        provider,
        eventId,
        eventType: this.extractEventType(payload),
        payload: (payload as Record<string, unknown>) ?? {},
        signature: signatureHeader ?? undefined,
      });
      const log = await this.repo.findWebhookByEventId(provider, eventId);
      if (log) {
        await this.repo.markWebhookProcessed(
          log.id,
          false,
          err instanceof Error ? err.message : String(err),
        );
      }
      throw err;
    }

    // 2. Idempotency check
    if (callback.eventId) {
      const existing = await this.repo.findWebhookByEventId(
        provider,
        callback.eventId,
      );
      if (existing) {
        if (existing.processed) {
          return { processed: true, reason: 'duplicate' };
        }
        await this.repo.markWebhookProcessed(existing.id, true);
        return { processed: true, reason: 'duplicate' };
      }
    }

    // 3. Locate shipment
    const shipment = await this.locateShipment(provider, callback);
    if (!shipment) {
      const eventId = callback.eventId ?? `unknown-${Date.now()}`;
      const log = await this.repo.createWebhookLog({
        provider,
        eventId,
        eventType: callback.message ?? null,
        payload: (payload as Record<string, unknown>) ?? {},
        signature: signatureHeader ?? undefined,
      });
      await this.repo.markWebhookProcessed(
        log.id,
        false,
        'shipment-not-found',
      );
      throw new ProviderErrorException(
        provider,
        `No shipment found for ${callback.providerOrderCode ?? callback.trackingNumber ?? '?'}`,
      );
    }

    // 4. Apply state change
    const toStatus = CALLBACK_TO_SHIPMENT_STATUS[callback.outcome];
    await this.transitionStatus({
      shipmentId: shipment.id,
      toStatus,
      actor: { type: 'WEBHOOK', id: null, name: provider },
      reason: callback.message,
      event: this.mapOutcomeToEvent(callback.outcome),
      metadata: { raw: callback.raw, location: callback.location },
    });

    // 5. Persist webhook log
    const eventId = callback.eventId ?? `${shipment.id}-${Date.now()}`;
    const log = await this.repo.createWebhookLog({
      provider,
      eventId,
      eventType: callback.message ?? null,
      payload: (payload as Record<string, unknown>) ?? {},
      signature: signatureHeader ?? undefined,
    });
    await this.repo.markWebhookProcessed(log.id, true);

    return { processed: true };
  }

  /* ============================================================== */
  /*  Internal: state machine                                        */
  /* ============================================================== */

  private async transitionStatus(args: {
    shipmentId: string;
    toStatus: ShipmentStatus;
    actor: {
      type: 'CUSTOMER' | 'ADMIN' | 'SYSTEM' | 'WEBHOOK';
      id: string | null;
      name: string | null;
    };
    reason?: string;
    event: 'CREATED' | 'STATUS_CHANGED' | 'TRACKING_UPDATED' | 'DELIVERED' | 'RETURNED' | 'FAILED';
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.repo.withTransaction(async (tx) => {
      const shipment = await tx.shipment.findFirst({
        where: { id: args.shipmentId },
      });
      if (!shipment) throw new ShipmentNotFoundException(args.shipmentId);

      const fromStatus = shipment.status as ShipmentStatus;

      // Cancellation guard: only before PICKED_UP
      if (args.toStatus === 'CANCELLED' && fromStatus !== 'CREATED' && fromStatus !== 'WAITING_PICKUP') {
        throw new ShipmentNotCancellableException(args.shipmentId, fromStatus);
      }

      // Already-delivered guard
      if (fromStatus === 'DELIVERED' && args.toStatus !== 'DELIVERED') {
        throw new ShipmentAlreadyDeliveredException(args.shipmentId);
      }

      // State machine
      const allowed = SHIPMENT_TRANSITIONS[fromStatus] ?? [];
      if (fromStatus === args.toStatus) {
        // No-op transition (e.g. duplicate webhook)
        return;
      }
      if (!allowed.includes(args.toStatus)) {
        throw new InvalidShipmentTransitionException(
          args.shipmentId,
          fromStatus,
          args.toStatus,
        );
      }

      // Side effects
      const patch: Record<string, unknown> = { status: args.toStatus };
      const now = new Date();
      if (args.toStatus === 'PICKED_UP') patch.pickedUpAt = now;
      if (args.toStatus === 'IN_TRANSIT' || args.toStatus === 'OUT_FOR_DELIVERY') {
        patch.shippedAt = patch.shippedAt ?? now;
      }
      if (args.toStatus === 'DELIVERED') patch.deliveredAt = now;
      if (args.toStatus === 'RETURNED') patch.returnedAt = now;
      if (args.toStatus === 'CANCELLED') {
        patch.cancelledAt = now;
        patch.failureReason = args.reason ?? null;
      }

      await tx.shipment.update({
        where: { id: args.shipmentId },
        data: patch,
      });

      await tx.shipmentHistory.create({
        data: {
          shipmentId: args.shipmentId,
          event: args.event as any,
          oldStatus: fromStatus,
          newStatus: args.toStatus,
          actorType: args.actor.type,
          actorId: args.actor.id ?? null,
          actorName: args.actor.name ?? null,
          message: args.reason ?? null,
          metadataJson: (args.metadata as any) ?? {},
        },
      });

      this.logger.log(
        `Shipment status: ${args.shipmentId} ${fromStatus} -> ${args.toStatus} by ${args.actor.type}`,
      );
    });
  }

  /* ============================================================== */
  /*  Internal helpers                                                */
  /* ============================================================== */

  private async requireShipment(id: string): Promise<ShipmentResponseDto> {
    const s = await this.repo.findById(id);
    if (!s) throw new ShipmentNotFoundException(id);
    return this.mapToResponse(s);
  }

  private async locateShipment(
    provider: ShippingProvider,
    callback: CallbackResult,
  ): Promise<{ id: string } | null> {
    if (callback.providerOrderCode) {
      const s = await this.repo.findByProviderOrderCode(
        callback.providerOrderCode,
      );
      if (s) return { id: s.id };
    }
    if (callback.trackingNumber) {
      const s = await this.repo.findByTrackingNumber(callback.trackingNumber);
      if (s) return { id: s.id };
    }
    return null;
  }

  private extractEventId(payload: unknown): string | null {
    const p = payload as any;
    if (!p) return null;
    return (
      p.id ??
      p.eventId ??
      p.event_id ??
      p.OrderCode ??
      p.order_code ??
      p.tracking_number ??
      null
    );
  }

  private extractEventType(payload: unknown): string | null {
    const p = payload as any;
    if (!p) return null;
    return (
      p.event_type ??
      p.eventType ??
      p.status ??
      p.Status ??
      p.message ??
      null
    );
  }

  private mapOutcomeToEvent(
    outcome: CallbackResult['outcome'],
  ): 'STATUS_CHANGED' | 'DELIVERED' | 'RETURNED' | 'FAILED' {
    if (outcome === 'DELIVERED') return 'DELIVERED';
    if (outcome === 'RETURNED') return 'RETURNED';
    if (outcome === 'FAILED') return 'FAILED';
    return 'STATUS_CHANGED';
  }

  private computeOrderWeight(orderItems: any[]): number {
    return orderItems.reduce((sum, it) => {
      const w = it.variant?.weightGrams ?? 100;
      return sum + w * it.quantity;
    }, 0);
  }

  private toAddress(a: AddressDto | AddressPayload): AddressPayload {
    return {
      fullName: a.fullName,
      phone: a.phone,
      province: a.province,
      district: a.district,
      ward: (a as AddressDto).ward ?? null,
      detail: a.detail,
    };
  }

  private configWarehousePhone(): string {
    return '19000000';
  }

  private parsePagination(
    pageStr: string | undefined,
    limitStr: string | undefined,
  ): { page: number; limit: number } {
    const page = Math.max(
      1,
      parseInt(String(pageStr ?? '1'), 10) || SHIPPING_LIMITS.DEFAULT_PAGE,
    );
    const limit = Math.min(
      SHIPPING_LIMITS.MAX_LIMIT,
      Math.max(
        1,
        parseInt(String(limitStr ?? '20'), 10) ||
          SHIPPING_LIMITS.DEFAULT_LIMIT,
      ),
    );
    return { page, limit };
  }

  private d2n(d: any): number {
    if (d === null || d === undefined) return 0;
    if (typeof d === 'number') return d;
    return d.toNumber?.() ?? 0;
  }

  /* ---------- Mapping ---------- */

  private mapToResponse(s: any): ShipmentResponseDto {
    return {
      id: s.id,
      shipmentNumber: s.shipmentNumber,
      orderId: s.orderId,
      userId: s.userId,
      provider: s.provider,
      status: s.status,
      trackingNumber: s.trackingNumber ?? null,
      shipTo: {
        fullName: s.shipToFullName ?? null,
        phone: s.shipToPhone ?? null,
        province: s.shipToProvince ?? null,
        district: s.shipToDistrict ?? null,
        ward: s.shipToWard ?? null,
        detail: s.shipToDetail ?? null,
      },
      weightGrams: s.weightGrams,
      shippingFee: this.d2n(s.shippingFee),
      codAmount: this.d2n(s.codAmount),
      currency: 'VND',
      labelUrl: s.labelUrl ?? null,
      estimatedDeliveryAt: s.estimatedDeliveryAt?.toISOString?.() ?? null,
      shippedAt: s.shippedAt?.toISOString?.() ?? null,
      pickedUpAt: s.pickedUpAt?.toISOString?.() ?? null,
      deliveredAt: s.deliveredAt?.toISOString?.() ?? null,
      returnedAt: s.returnedAt?.toISOString?.() ?? null,
      cancelledAt: s.cancelledAt?.toISOString?.() ?? null,
      notes: s.notes ?? null,
      items: (s.items ?? []).map((it: any) => ({
        id: it.id,
        productVariantId: it.productVariantId,
        productName: it.productNameSnapshot,
        variantName: it.variantNameSnapshot,
        sku: it.skuSnapshot,
        quantity: it.quantity,
        weightGrams: it.weightGramsSnapshot,
      })),
      history: (s.history ?? []).map((h: any) => ({
        id: h.id,
        event: h.event,
        oldStatus: h.oldStatus ?? null,
        newStatus: h.newStatus ?? null,
        actorType: h.actorType,
        actorId: h.actorId ?? null,
        actorName: h.actorName ?? null,
        message: h.message ?? null,
        location: h.location ?? null,
        createdAt: h.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      })),
      createdAt: s.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      updatedAt: s.updatedAt?.toISOString?.() ?? new Date(0).toISOString(),
    };
  }

  private mapToSummary(row: any): ShipmentSummaryDto {
    return {
      id: row.id,
      shipmentNumber: row.shipmentNumber,
      orderId: row.orderId,
      provider: row.provider,
      status: row.status,
      trackingNumber: row.trackingNumber ?? null,
      weightGrams: row.weightGrams,
      shippingFee: this.d2n(row.shippingFee),
      currency: 'VND',
      estimatedDeliveryAt:
        row.estimatedDeliveryAt?.toISOString?.() ?? null,
      createdAt: row.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
    };
  }
}

/**
 * PaymentsService \u2014 all payment business logic.
 *
 * Responsibilities:
 *   - create payment intent (delegated to provider gateway)
 *   - retry failed payment
 *   - webhook handling (signature verification + state transitions)
 *   - order synchronization on payment success/failure (transactional)
 *   - idempotency for both client requests and provider webhooks
 *   - ownership checks (no IDOR)
 *
 * Layers:
 *   Controller -> PaymentsService -> PaymentsRepository -> PrismaService
 *                \-> PaymentGateway (MoMo | VNPay | PayPal)
 *
 * Money math uses Prisma.Decimal \u2014 never raw number.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  OrderPaymentStatus,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';

import { PaymentsRepository } from './repositories/payments.repository';
import { MomoGateway } from './gateways/momo.gateway';
import { VNPayGateway } from './gateways/vnpay.gateway';
import { PayPalGateway } from './gateways/paypal.gateway';
import {
  CALLBACK_TO_PAYMENT_STATUS,
  type CallbackResult,
  type PaymentGateway,
} from './interfaces/payment-gateway.interface';
import {
  PAYMENT_ACTIVE_STATUSES,
  PAYMENT_LIMITS,
  toProviderEnum,
} from './constants/payment.constants';
import {
  ActivePaymentExistsException,
  AmountMismatchException,
  InvalidPaymentStateException,
  InvalidWebhookPayloadException,
  MaxRetriesExceededException,
  OrderNotFoundForPaymentException,
  OrderNotPayableException,
  PaymentAlreadyCompletedException,
  PaymentAlreadyFailedException,
  PaymentNotFoundException,
  ProviderMismatchException,
  UnauthorizedPaymentAccessException,
} from './exceptions/payment.exceptions';

import type {
  CreatePaymentDto,
  RetryPaymentDto,
  ListPaymentsQueryDto,
  AdminListPaymentsQueryDto,
  ConfirmOfflinePaymentDto,
} from './dto/create-payment.dto';
import type {
  AdminPaymentListResponseDto,
  PaymentDetailDto,
  PaymentIntentResponseDto,
  PaymentResponseDto,
  PaymentSummaryDto,
  PaymentTransactionResponseDto,
} from './dto/payment-response.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly gatewayRegistry: Partial<Record<PaymentProvider, PaymentGateway>>;

  constructor(
    private readonly repo: PaymentsRepository,
    private readonly momo: MomoGateway,
    private readonly vnpay: VNPayGateway,
    private readonly paypal: PayPalGateway,
  ) {
    this.gatewayRegistry = {
      [PaymentProvider.MOMO]: this.momo,
      [PaymentProvider.VNPAY]: this.vnpay,
      [PaymentProvider.PAYPAL]: this.paypal,
      [PaymentProvider.MANUAL]: undefined,
    };
  }

  /* ============================================================== */
  /*  Create Payment Intent                                         */
  /* ============================================================== */

  /**
   * Create a payment and immediately request an intent from the provider.
   *
   * Flow:
   *   1. Validate order exists, belongs to user, status PENDING_PAYMENT
   *   2. Reject duplicate active payment for the same order
   *   3. Resolve provider gateway
   *   4. Create Payment row (status=CREATED)
   *   5. Call gateway.createIntent() to obtain checkout URL
   *   6. Update payment with checkout URL + status=PENDING
   *   7. Record INITIATED PaymentTransaction
   */
  async createPayment(
    userId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentIntentResponseDto> {
    const providerEnum = toProviderEnum(dto.provider);

    // 1. Idempotency by client key
    if (dto.idempotencyKey) {
      const existing = await this.repo.findByIdemKey(dto.idempotencyKey);
      if (existing && existing.order.userId === userId) {
        return this.mapToIntentResponse(existing);
      }
    }

    // 2. Load order
    const order = await this.repo.findOrderForPayment(dto.orderId);
    if (!order) {
      throw new OrderNotFoundForPaymentException(dto.orderId);
    }
    if (order.userId !== userId) {
      throw new UnauthorizedPaymentAccessException(dto.orderId, userId);
    }
    if (order.status !== 'PENDING_PAYMENT') {
      throw new OrderNotPayableException(dto.orderId, order.status);
    }

    // 3. Reject duplicate active payment
    const existing = await this.repo.findByOrderId(dto.orderId);
    if (existing && PAYMENT_ACTIVE_STATUSES.includes(existing.status)) {
      throw new ActivePaymentExistsException(dto.orderId, existing.id);
    }

    // 4. Amount comes from the order \u2014 never from client
    const amount = order.grandTotal;
    const currency = order.currency;

    // 5. Create Payment row
    const payment = await this.repo.createPayment({
      orderId: dto.orderId,
      userId,
      provider: providerEnum,
      amount,
      currency,
      idempotencyKey: dto.idempotencyKey,
      expiresAt: this.computePaymentExpiry(),
      metadata: {
        returnUrl: dto.returnUrl,
        cancelUrl: dto.cancelUrl,
      },
    });

    // 6. Call provider to obtain checkout URL
    const gateway = this.gatewayRegistry[providerEnum];
    if (!gateway) {
      throw new Error(`No gateway registered for provider: ${providerEnum}`);
    }
    let intent;
    try {
      intent = await gateway.createIntent({
        paymentId: payment.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: this.d2n(amount),
        currency,
        description: dto.returnUrl ?? `Order ${order.orderNumber}`,
        returnUrl: dto.returnUrl,
        cancelUrl: dto.cancelUrl,
      });
    } catch (err: any) {
      // Mark payment as FAILED with reason
      await this.repo.updatePayment(payment.id, {
        status: 'FAILED',
        failureReason: `intent_failed: ${err?.message ?? err}`,
        failedAt: new Date(),
      });
      await this.repo.createTransaction({
        paymentId: payment.id,
        type: 'CREATE',
        status: 'FAILED',
        amount,
        providerCode: 'INTENT_ERROR',
        providerMessage: err?.message ?? String(err),
        rawResponse: { error: err?.message ?? String(err) },
      });
      throw err;
    }

    // 7. Persist checkout URL
    const expiresAt = intent.expiresAt ?? this.computePaymentExpiry();
    await this.repo.updatePayment(payment.id, {
      status: 'PENDING',
      checkoutUrl: intent.checkoutUrl,
      providerReference: intent.providerReference,
      providerTxnId: intent.providerTxnId,
      expiresAt,
    });

    // 8. Record INITIATED transaction
    await this.repo.createTransaction({
      paymentId: payment.id,
      type: 'CREATE',
      status: 'INITIATED',
      amount,
      providerTxnId: intent.providerTxnId,
      providerMessage: 'Intent created',
      rawResponse: intent.raw,
    });

    this.logger.log(
      `Payment intent created: payment=${payment.id} provider=${providerEnum} order=${order.orderNumber}`,
    );

    return {
      paymentId: payment.id,
      orderId: order.id,
      amount: this.d2n(amount),
      currency,
      provider: providerEnum,
      checkoutUrl: intent.checkoutUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /* ============================================================== */
  /*  Retry failed payment                                         */
  /* ============================================================== */

  /**
   * Retry a FAILED payment: marks the old one as FAILED terminal and creates
   * a new Payment row with the same order + provider.
   */
  async retryPayment(
    paymentId: string,
    userId: string,
    dto: RetryPaymentDto,
  ): Promise<PaymentIntentResponseDto> {
    const existing = await this.requireOwnedPayment(paymentId, userId);

    if (existing.status === 'SUCCESS') {
      throw new PaymentAlreadyCompletedException(paymentId);
    }
    if (existing.status !== 'FAILED' && existing.status !== 'CANCELLED') {
      throw new InvalidPaymentStateException(
        paymentId,
        existing.status,
        'FAILED',
      );
    }

    return this.createPayment(userId, {
      orderId: existing.orderId,
      provider: existing.provider.toLowerCase() as any,
      returnUrl: dto.returnUrl,
      cancelUrl: dto.cancelUrl,
    });
  }

  /* ============================================================== */
  /*  Read                                                          */
  /* ============================================================== */

  async getPaymentForUser(
    paymentId: string,
    userId: string,
  ): Promise<PaymentDetailDto> {
    const payment = await this.requireOwnedPayment(paymentId, userId);
    return this.mapToDetailResponse(payment);
  }

  async listPaymentsForUser(
    userId: string,
    query: ListPaymentsQueryDto,
  ): Promise<{
    items: PaymentSummaryDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit } = this.parsePagination(query.page, query.limit);
    const { items, total } = await this.repo.listForUser({
      userId,
      orderId: query.orderId,
      status: query.status ? this.parseStatus(query.status) : undefined,
      page,
      limit,
    });
    return {
      items: items.map((row: any) => ({
        id: row.id,
        orderId: row.orderId,
        provider: row.provider,
        status: row.status,
        amount: this.d2n(row.amount),
        currency: row.currency,
        createdAt: row.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  /* ============================================================== */
  /*  Admin                                                         */
  /* ============================================================== */

  async listPaymentsForAdmin(
    query: AdminListPaymentsQueryDto,
  ): Promise<AdminPaymentListResponseDto> {
    const { page, limit } = this.parsePagination(query.page, query.limit);
    const provider = query.provider
      ? toProviderEnum(query.provider)
      : undefined;
    const { items, total } = await this.repo.listForAdmin({
      userId: query.userId,
      orderId: query.orderId,
      status: query.status ? this.parseStatus(query.status) : undefined,
      provider,
      page,
      limit,
    });
    return {
      items: items.map((row: any) => ({
        id: row.id,
        orderId: row.orderId,
        userId: row.userId,
        provider: row.provider,
        status: row.status,
        amount: this.d2n(row.amount),
        currency: row.currency,
        providerTxnId: row.providerTxnId ?? null,
        createdAt: row.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
        succeededAt: row.succeededAt?.toISOString?.() ?? null,
        failedAt: row.failedAt?.toISOString?.() ?? null,
      })),
      total,
      page,
      limit,
    };
  }

  async getPaymentForAdmin(paymentId: string): Promise<PaymentDetailDto> {
    const payment = await this.repo.findById(paymentId);
    if (!payment) throw new PaymentNotFoundException(paymentId);
    return this.mapToDetailResponse(payment);
  }

  /**
   * Admin-only: confirm an offline payment (bank transfer reconciled,
   * COD collected, etc.) without going through a gateway webhook.
   *
   * Behaviour:
   *   1. Load order, must be PENDING_PAYMENT
   *   2. Reject if a SUCCESS payment already exists for this order
   *   3. Create a `Payment` row with provider=MANUAL, status=SUCCESS
   *   4. Move order to PAID + payment_status=PAID
   *   5. Append OrderStatusHistory (admin actor)
   *
   * Returns the resulting Payment detail.
   */
  async confirmOfflinePayment(
    orderId: string,
    adminId: string,
    adminName: string | null,
    dto: ConfirmOfflinePaymentDto,
  ): Promise<PaymentDetailDto> {
    return this.repo.withTransaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });
      if (!order) {
        throw new OrderNotFoundForPaymentException(orderId);
      }
      if (order.status !== 'PENDING_PAYMENT') {
        throw new OrderNotPayableException(orderId, order.status);
      }

      const existing = await tx.payment.findUnique({
        where: { orderId },
      });
      if (existing && existing.status === 'SUCCESS') {
        throw new PaymentAlreadyCompletedException(existing.id);
      }

      const amount = order.grandTotal;
      const currency = order.currency ?? 'VND';
      const now = new Date();

      const payment = existing
        ? await tx.payment.update({
            where: { id: existing.id },
            data: {
              provider: PaymentProvider.MANUAL,
              status: PaymentStatus.SUCCESS,
              amount,
              currency,
              succeededAt: now,
              failureReason: null,
              failedAt: null,
              cancelledAt: null,
              metadataJson: {
                ...((existing as any).metadataJson ?? {}),
                confirmedBy: adminId,
                confirmedAt: now.toISOString(),
                note: dto.note ?? null,
                referenceCode: dto.referenceCode ?? null,
              },
            },
          })
        : await tx.payment.create({
            data: {
              orderId,
              userId: order.userId,
              provider: PaymentProvider.MANUAL,
              status: PaymentStatus.SUCCESS,
              amount,
              currency,
              succeededAt: now,
              metadataJson: {
                confirmedBy: adminId,
                confirmedAt: now.toISOString(),
                note: dto.note ?? null,
                referenceCode: dto.referenceCode ?? null,
              },
            },
          });

      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          type: 'CAPTURE',
          status: 'SUCCESS',
          amount,
          providerCode: 'MANUAL_CONFIRM',
          providerMessage: dto.note ?? 'Admin manual confirmation',
          providerTxnId: dto.referenceCode ?? null,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PAID,
          paymentStatus: OrderPaymentStatus.PAID,
          paidAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: 'PENDING_PAYMENT',
          toStatus: 'PAID',
          changedByType: 'ADMIN_USER',
          changedById: adminId,
          changedByName: adminName ?? 'admin',
          reason:
            dto.note ||
            `Admin confirmed offline payment${dto.referenceCode ? ` (ref ${dto.referenceCode})` : ''}`,
        },
      });

      const reloaded = await tx.payment.findUnique({
        where: { id: payment.id },
        include: {
          order: true,
          transactions: { orderBy: { createdAt: 'desc' } },
          webhookLogs: { orderBy: { createdAt: 'desc' } },
        },
      });

      this.logger.log(
        `Offline payment confirmed: order=${order.orderNumber} admin=${adminId} amount=${this.d2n(amount)}`,
      );

      return this.mapToDetailResponse(reloaded);
    });
  }

  /* ============================================================== */
  /*  Webhook Handling                                              */
  /* ============================================================== */

  /**
   * Receive a provider webhook, verify signature, and apply state changes
   * idempotently.
   *
   * Returns a small object the controller will serialize as 200 OK
   * (providers require 2xx even on duplicates).
   */
  async handleWebhook(
    provider: PaymentProvider,
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
    signatureHeader: string | null,
  ): Promise<{ processed: boolean; reason?: string }> {
    const gateway = this.gatewayRegistry[provider];
    if (!gateway) {
      this.logger.warn(`No gateway registered for provider: ${provider}, skipping webhook`);
      return { processed: false, reason: `Unknown provider: ${provider}` };
    }

    // 1. Signature verification (throws on failure)
    let callback: CallbackResult;
    try {
      callback = await gateway.verifyCallback(payload, headers);
    } catch (err) {
      // Record failed webhook log
      const eventId = this.extractEventId(payload) ?? `unknown-${Date.now()}`;
      await this.repo.createWebhookLog({
        provider,
        eventId,
        eventType: this.extractEventType(payload) ?? 'UNKNOWN',
        status: 'FAILED',
        payload: (payload as Record<string, unknown>) ?? {},
        signature: signatureHeader ?? undefined,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    // 2. Idempotency: if we've seen this eventId, return previous result
    if (callback.eventId) {
      const existing = await this.repo.findWebhookByEventId(
        provider,
        callback.eventId,
      );
      if (existing) {
        if (existing.status === 'PROCESSED') {
          return { processed: true, reason: 'duplicate' };
        }
        // Mark as duplicate but do not reprocess
        await this.repo.markWebhookProcessed(
          existing.id,
          'DUPLICATE',
          'already-received',
        );
        return { processed: true, reason: 'duplicate' };
      }
    }

    // 3. Find the payment by provider reference / txnId / order
    const payment = await this.locatePayment(provider, callback);
    if (!payment) {
      // Cannot link to a payment \u2014 log only.
      await this.repo.createWebhookLog({
        provider,
        eventId: callback.eventId ?? `unknown-${Date.now()}`,
        eventType: this.extractEventType(payload) ?? 'UNKNOWN',
        status: 'FAILED',
        payload: (payload as Record<string, unknown>) ?? {},
        signature: signatureHeader ?? undefined,
        errorMessage: 'payment-not-found',
      });
      throw new InvalidWebhookPayloadException(
        `No matching payment for ${provider} txn ${callback.providerTxnId}`,
      );
    }

    // 4. Verify provider matches
    if (payment.provider !== provider) {
      await this.repo.createWebhookLog({
        provider,
        eventId: callback.eventId ?? `unknown-${Date.now()}`,
        eventType: this.extractEventType(payload) ?? 'UNKNOWN',
        status: 'FAILED',
        payload: (payload as Record<string, unknown>) ?? {},
        signature: signatureHeader ?? undefined,
        errorMessage: `provider-mismatch: payment=${payment.provider}, webhook=${provider}`,
      });
      throw new ProviderMismatchException(
        payment.id,
        payment.provider,
        provider,
      );
    }

    // 5. Verify amount matches
    const expectedAmount = this.d2n(payment.amount);
    if (
      Math.abs(expectedAmount - callback.amount) > 0.01 // tolerate 0.01 rounding
    ) {
      await this.repo.createWebhookLog({
        provider,
        eventId: callback.eventId ?? `unknown-${Date.now()}`,
        eventType: this.extractEventType(payload) ?? 'UNKNOWN',
        status: 'FAILED',
        payload: (payload as Record<string, unknown>) ?? {},
        signature: signatureHeader ?? undefined,
        errorMessage: `amount-mismatch: expected=${expectedAmount}, received=${callback.amount}`,
      });
      throw new AmountMismatchException(
        payment.id,
        expectedAmount,
        callback.amount,
      );
    }

    // 6. Apply the result transactionally
    await this.applyCallback(payment.id, callback, signatureHeader ?? undefined);

    return { processed: true };
  }

  /* ============================================================== */
  /*  Internal: apply callback                                     */
  /* ============================================================== */

  private async applyCallback(
    paymentId: string,
    callback: CallbackResult,
    signature: string | undefined,
  ): Promise<void> {
    await this.repo.withTransaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId },
        include: {
          order: true,
        },
      });
      if (!payment) {
        throw new PaymentNotFoundException(paymentId);
      }

      // Idempotent: if already SUCCESS, do nothing
      if (payment.status === 'SUCCESS') {
        // Still log the webhook
        await tx.paymentWebhookLog.create({
          data: {
            paymentId,
            provider: payment.provider,
            eventId: callback.eventId ?? `dup-${Date.now()}`,
            eventType: callback.raw?.event_type as string ?? 'UNKNOWN',
            status: 'DUPLICATE',
            payloadJson: (callback.raw as any) ?? {},
            signature,
            processedAt: new Date(),
            errorMessage: 'already-success',
          },
        });
        return;
      }

      const newStatus = CALLBACK_TO_PAYMENT_STATUS[callback.outcome];
      const now = new Date();

      // Update payment status + side effects
      const update: any = {
        status: newStatus,
        providerTxnId: callback.providerTxnId ?? payment.providerTxnId,
      };
      if (callback.outcome === 'SUCCESS') {
        update.succeededAt = now;
      } else if (callback.outcome === 'FAILED') {
        update.failedAt = now;
        update.failureReason = callback.failureReason ?? 'provider-failed';
      } else if (callback.outcome === 'CANCELLED') {
        update.cancelledAt = now;
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: update,
      });

      // Record transaction
      await tx.paymentTransaction.create({
        data: {
          paymentId,
          type: callback.outcome === 'SUCCESS' ? 'CAPTURE' : callback.outcome === 'CANCELLED' ? 'VOID' : 'CAPTURE',
          status: callback.outcome === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
          amount: payment.amount,
          providerCode: callback.failureReason ?? null,
          providerMessage: callback.failureReason ?? null,
          providerTxnId: callback.providerTxnId,
          rawResponseJson: (callback.raw as any) ?? undefined,
        },
      });

      // Order synchronization (atomic with payment state)
      if (callback.outcome === 'SUCCESS') {
        if (payment.order.status === 'PENDING_PAYMENT') {
          await tx.order.update({
            where: { id: payment.orderId },
            data: {
              status: 'PAID' as OrderStatus,
              paymentStatus: 'PAID',
              paidAt: now,
            },
          });
          await tx.orderStatusHistory.create({
            data: {
              orderId: payment.orderId,
              fromStatus: 'PENDING_PAYMENT',
              toStatus: 'PAID',
              changedByType: 'SYSTEM',
              changedById: null,
              changedByName: `payment:${providerName(payment.provider)}`,
              reason: `Payment ${paymentId} succeeded`,
            },
          });
        }
      } else if (callback.outcome === 'FAILED') {
        // Order stays PENDING_PAYMENT so customer can retry
        if (payment.order.status === 'PENDING_PAYMENT') {
          await tx.orderStatusHistory.create({
            data: {
              orderId: payment.orderId,
              fromStatus: 'PENDING_PAYMENT',
              toStatus: 'PENDING_PAYMENT',
              changedByType: 'SYSTEM',
              changedById: null,
              changedByName: `payment:${providerName(payment.provider)}`,
              reason: `Payment ${paymentId} failed: ${callback.failureReason ?? 'unknown'}`,
            },
          });
        }
      }

      // Log webhook
      await tx.paymentWebhookLog.create({
        data: {
          paymentId,
          provider: payment.provider,
          eventId: callback.eventId ?? `${paymentId}-${now.getTime()}`,
          eventType: callback.raw?.event_type as string ?? 'UNKNOWN',
          status: 'PROCESSED',
          payloadJson: (callback.raw as any) ?? {},
          signature,
          processedAt: now,
        },
      });
    });

    this.logger.log(
      `Webhook processed: payment=${paymentId} outcome=${callback.outcome}`,
    );
  }

  /* ============================================================== */
  /*  Helpers                                                       */
  /* ============================================================== */

  private async requireOwnedPayment(
    paymentId: string,
    userId: string,
  ): Promise<any> {
    const payment = await this.repo.findByIdForUser(paymentId, userId);
    if (!payment) {
      const exists = await this.repo.findById(paymentId);
      if (exists) {
        throw new UnauthorizedPaymentAccessException(paymentId, userId);
      }
      throw new PaymentNotFoundException(paymentId);
    }
    return payment;
  }

  /**
   * Find the payment associated with a webhook by:
   *   1. providerTxnId match
   *   2. orderNumber / orderId encoded in providerReference
   */
  private async locatePayment(
    provider: PaymentProvider,
    callback: CallbackResult,
  ): Promise<any | null> {
    if (callback.providerTxnId) {
      const byTxn = await this.repo.findByProviderTxnId(
        provider,
        callback.providerTxnId,
      );
      if (byTxn) return byTxn;
    }
    // Try to find via reference suffix \u2014 common pattern is "<orderId>-<ts>"
    const byRef = (callback as any)?.raw?.orderId as string | undefined;
    if (byRef) {
      // OrderId is "<orderId>-<ts>" \u2014 strip suffix
      const baseId = byRef.split('-')[0];
      const byOrder = await this.repo.findByOrderId(baseId);
      if (byOrder && byOrder.provider === provider) return byOrder;
    }
    const txnRef = (callback as any)?.raw?.vnp_TxnRef as string | undefined;
    if (txnRef) {
      const baseId = txnRef.split('-')[0];
      const byOrder = await this.repo.findByOrderId(baseId);
      if (byOrder && byOrder.provider === provider) return byOrder;
    }
    const customId = (callback as any)?.raw?.resource?.custom_id as
      | string
      | undefined;
    if (customId) {
      const byOrder = await this.repo.findByOrderId(customId);
      if (byOrder && byOrder.provider === provider) return byOrder;
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
      p.orderId ??
      p.requestId ??
      p.vnp_TxnRef ??
      null
    );
  }

  private extractEventType(payload: unknown): string | null {
    const p = payload as any;
    if (!p) return null;
    return (
      p.event_type ??
      p.eventType ??
      p.resultCode ??
      p.vnp_ResponseCode ??
      null
    );
  }

  private computePaymentExpiry(): Date {
    const d = new Date();
    d.setMinutes(d.getMinutes() + PAYMENT_LIMITS.PAYMENT_TTL_MINUTES);
    return d;
  }

  private parsePagination(
    pageStr: string | undefined,
    limitStr: string | undefined,
  ): { page: number; limit: number } {
    const page = Math.max(
      1,
      parseInt(String(pageStr ?? '1'), 10) || PAYMENT_LIMITS.DEFAULT_PAGE,
    );
    const limit = Math.min(
      PAYMENT_LIMITS.MAX_LIMIT,
      Math.max(
        1,
        parseInt(String(limitStr ?? '20'), 10) || PAYMENT_LIMITS.DEFAULT_LIMIT,
      ),
    );
    return { page, limit };
  }

  private parseStatus(status: string): PaymentStatus {
    const valid = [
      'CREATED',
      'PENDING',
      'PROCESSING',
      'SUCCESS',
      'FAILED',
      'CANCELLED',
      'REFUNDED',
    ] as const;
    if (!valid.includes(status as any)) {
      throw new InvalidPaymentStateException('?', '?', status);
    }
    return status as PaymentStatus;
  }

  private d2n(d: any): number {
    if (d === null || d === undefined) return 0;
    if (typeof d === 'number') return d;
    return d.toNumber?.() ?? 0;
  }

  /* ---------- Mapping ---------- */

  private mapToIntentResponse(payment: any): PaymentIntentResponseDto {
    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: this.d2n(payment.amount),
      currency: payment.currency,
      provider: payment.provider,
      checkoutUrl: payment.checkoutUrl ?? '',
      expiresAt: payment.expiresAt?.toISOString?.() ?? null,
    };
  }

  private mapToResponse(payment: any): PaymentResponseDto {
    return {
      id: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      provider: payment.provider,
      status: payment.status,
      checkoutUrl: payment.checkoutUrl ?? null,
      totals: {
        amount: this.d2n(payment.amount),
        currency: payment.currency,
      },
      failureReason: payment.failureReason ?? null,
      providerTxnId: payment.providerTxnId ?? null,
      expiresAt: payment.expiresAt?.toISOString?.() ?? null,
      authorizedAt: payment.authorizedAt?.toISOString?.() ?? null,
      succeededAt: payment.succeededAt?.toISOString?.() ?? null,
      failedAt: payment.failedAt?.toISOString?.() ?? null,
      cancelledAt: payment.cancelledAt?.toISOString?.() ?? null,
      createdAt: payment.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      updatedAt: payment.updatedAt?.toISOString?.() ?? new Date(0).toISOString(),
    };
  }

  private mapToDetailResponse(payment: any): PaymentDetailDto {
    return {
      ...this.mapToResponse(payment),
      transactions: (payment.transactions ?? []).map(
        (tx: any) =>
          ({
            id: tx.id,
            paymentId: tx.paymentId,
            type: tx.type,
            status: tx.status,
            amount: this.d2n(tx.amount),
            providerCode: tx.providerCode ?? null,
            providerMessage: tx.providerMessage ?? null,
            providerTxnId: tx.providerTxnId ?? null,
            createdAt: tx.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
          }) as PaymentTransactionResponseDto,
      ),
      order: {
        id: payment.order.id,
        orderNumber: payment.order.orderNumber,
        userId: payment.order.userId,
        status: payment.order.status,
        grandTotal: this.d2n(payment.order.grandTotal),
        currency: payment.order.currency,
      },
    };
  }
}

function providerName(p: PaymentProvider): string {
  return p.toLowerCase();
}

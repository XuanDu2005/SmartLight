/**
 * PaymentsRepository \u2014 only DB access for the payments bounded context.
 *
 * The service enforces business rules; this layer is just typed SQL.
 *
 * Why a separate repository class:
 *   - service tests can mock this without spinning up Prisma
 *   - transaction primitive (`withTransaction`) is centralized
 *   - all payments-domain queries live in one file (easy audit)
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  Payment,
  PaymentProvider,
  PaymentStatus,
  PaymentWebhookLog,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  ListPaymentsFilter,
  PaymentCreateInput,
  PaymentTransactionCreateInput,
  PaymentUpdateInput,
  PaymentWithAll,
  PaymentWithTransactions,
  WebhookLogCreateInput,
} from '../interfaces/payment.interfaces';

@Injectable()
export class PaymentsRepository {
  private readonly logger = new Logger(PaymentsRepository.name);

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
  /*  Payment lookups                                                */
  /* ============================================================== */

  async findById(id: string): Promise<PaymentWithAll | null> {
    return this.prisma.payment.findFirst({
      where: { id },
      include: this.fullInclude(),
    });
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<PaymentWithAll | null> {
    return this.prisma.payment.findFirst({
      where: { id, userId },
      include: this.fullInclude(),
    });
  }

  async findByOrderId(orderId: string): Promise<PaymentWithTransactions | null> {
    return this.prisma.payment.findFirst({
      where: { orderId },
      include: {
        transactions: { orderBy: { createdAt: 'asc' } },
        order: {
          select: {
            id: true,
            orderNumber: true,
            userId: true,
            grandTotal: true,
            currency: true,
            status: true,
          },
        },
      },
    });
  }

  /** Lightweight order lookup used by the payment service to validate
   *  ownership and payable state without loading the full payment graph. */
  async findOrderForPayment(orderId: string): Promise<{
    id: string;
    orderNumber: string;
    userId: string;
    grandTotal: any;
    currency: string;
    status: string;
  } | null> {
    const o = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        grandTotal: true,
        currency: true,
        status: true,
      },
    });
    return o;
  }

  async findByIdemKey(key: string): Promise<PaymentWithTransactions | null> {
    return this.prisma.payment.findFirst({
      where: { idempotencyKey: key },
      include: {
        transactions: { orderBy: { createdAt: 'asc' } },
        order: {
          select: {
            id: true,
            orderNumber: true,
            userId: true,
            grandTotal: true,
            currency: true,
            status: true,
          },
        },
      },
    });
  }

  async findByProviderTxnId(
    provider: PaymentProvider,
    txnId: string,
  ): Promise<PaymentWithTransactions | null> {
    return this.prisma.payment.findFirst({
      where: { provider, providerTxnId: txnId },
      include: {
        transactions: { orderBy: { createdAt: 'asc' } },
        order: {
          select: {
            id: true,
            orderNumber: true,
            userId: true,
            grandTotal: true,
            currency: true,
            status: true,
          },
        },
      },
    });
  }

  /* ============================================================== */
  /*  Payment mutations                                              */
  /* ============================================================== */

  async createPayment(
    input: PaymentCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment> {
    const client = tx ?? this.prisma;
    return client.payment.create({
      data: {
        orderId: input.orderId,
        userId: input.userId,
        provider: input.provider,
        status: 'CREATED',
        amount: input.amount as any,
        currency: input.currency,
        idempotencyKey: input.idempotencyKey ?? undefined,
        checkoutUrl: input.checkoutUrl ?? undefined,
        expiresAt: input.expiresAt ?? undefined,
        metadataJson: (input.metadata as any) ?? Prisma.JsonNull ?? {},
      },
    });
  }

  async updatePayment(
    id: string,
    patch: PaymentUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment> {
    const client = tx ?? this.prisma;
    const data: Prisma.PaymentUpdateInput = {};
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.providerTxnId !== undefined)
      data.providerTxnId = patch.providerTxnId;
    if (patch.providerReference !== undefined)
      data.providerReference = patch.providerReference;
    if (patch.checkoutUrl !== undefined) data.checkoutUrl = patch.checkoutUrl;
    if (patch.failureReason !== undefined)
      data.failureReason = patch.failureReason;
    if (patch.authorizedAt !== undefined)
      data.authorizedAt = patch.authorizedAt;
    if (patch.succeededAt !== undefined)
      data.succeededAt = patch.succeededAt;
    if (patch.failedAt !== undefined) data.failedAt = patch.failedAt;
    if (patch.cancelledAt !== undefined)
      data.cancelledAt = patch.cancelledAt;
    if (patch.expiresAt !== undefined) data.expiresAt = patch.expiresAt;
    if (patch.metadata !== undefined)
      data.metadataJson = (patch.metadata as any) ?? Prisma.JsonNull ?? {};
    return client.payment.update({ where: { id }, data });
  }

  /* ============================================================== */
  /*  Payment transactions                                          */
  /* ============================================================== */

  async createTransaction(
    input: PaymentTransactionCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.paymentTransaction.create({
      data: {
        paymentId: input.paymentId,
        type: input.type,
        status: input.status,
        amount: input.amount as any,
        providerCode: input.providerCode ?? undefined,
        providerMessage: input.providerMessage ?? undefined,
        providerTxnId: input.providerTxnId ?? undefined,
        rawResponseJson:
          (input.rawResponse as any) ?? Prisma.JsonNull ?? undefined,
      },
    });
  }

  /* ============================================================== */
  /*  Webhook log                                                   */
  /* ============================================================== */

  async findWebhookByEventId(
    provider: PaymentProvider,
    eventId: string,
  ): Promise<PaymentWebhookLog | null> {
    return this.prisma.paymentWebhookLog.findFirst({
      where: { provider, eventId },
    });
  }

  async createWebhookLog(
    input: WebhookLogCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentWebhookLog> {
    const client = tx ?? this.prisma;
    return client.paymentWebhookLog.create({
      data: {
        paymentId: input.paymentId ?? undefined,
        provider: input.provider,
        eventId: input.eventId,
        eventType: input.eventType,
        status: input.status,
        payloadJson: (input.payload as any) ?? Prisma.JsonNull ?? {},
        signature: input.signature ?? undefined,
        processedAt: input.processedAt ?? undefined,
        errorMessage: input.errorMessage ?? undefined,
      },
    });
  }

  async markWebhookProcessed(
    id: string,
    status: 'PROCESSED' | 'FAILED' | 'DUPLICATE',
    errorMessage?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.paymentWebhookLog.update({
      where: { id },
      data: {
        status,
        processedAt: new Date(),
        errorMessage: errorMessage ?? undefined,
      },
    });
  }

  /* ============================================================== */
  /*  Listing                                                       */
  /* ============================================================== */

  async listForUser(filter: ListPaymentsFilter) {
    const { userId, orderId, status, provider, page, limit } = filter;
    const skip = (page - 1) * limit;
    const where: Prisma.PaymentWhereInput = {
      ...(userId ? { userId } : {}),
      ...(orderId ? { orderId } : {}),
      ...(status ? { status } : {}),
      ...(provider ? { provider } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items, total };
  }

  async listForAdmin(filter: ListPaymentsFilter) {
    const { userId, orderId, status, provider, page, limit } = filter;
    const skip = (page - 1) * limit;
    const where: Prisma.PaymentWhereInput = {
      ...(userId ? { userId } : {}),
      ...(orderId ? { orderId } : {}),
      ...(status ? { status } : {}),
      ...(provider ? { provider } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items, total };
  }

  /* ============================================================== */
  /*  Helpers                                                       */
  /* ============================================================== */

  private fullInclude() {
    return {
      transactions: { orderBy: { createdAt: 'asc' } },
      webhookLogs: { orderBy: { createdAt: 'desc' } },
      order: {
        select: {
          id: true,
          orderNumber: true,
          userId: true,
          grandTotal: true,
          currency: true,
          status: true,
          paymentStatus: true,
        },
      },
    } as const;
  }
}
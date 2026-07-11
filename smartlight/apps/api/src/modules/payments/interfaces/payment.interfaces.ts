/**
 * Repository contracts for the payments bounded context.
 */
import type {
  Payment,
  PaymentProvider,
  PaymentStatus,
  PaymentTransaction,
  PaymentTransactionStatus,
  PaymentWebhookLog,
  Prisma,
} from '@prisma/client';

/* ---------- Read shapes ---------- */

export type PaymentWithTransactions = Prisma.PaymentGetPayload<{
  include: {
    transactions: { orderBy: { createdAt: 'asc' } };
    order: {
      select: {
        id: true;
        orderNumber: true;
        userId: true;
        grandTotal: true;
        currency: true;
        status: true;
      };
    };
  };
}>;

export type PaymentWithAll = Prisma.PaymentGetPayload<{
  include: {
    transactions: { orderBy: { createdAt: 'asc' } };
    webhookLogs: { orderBy: { createdAt: 'desc' } };
    order: {
      select: {
        id: true;
        orderNumber: true;
        userId: true;
        grandTotal: true;
        currency: true;
        status: true;
        paymentStatus: true;
      };
    };
  };
}>;

/* ---------- Mutation inputs ---------- */

export interface PaymentCreateInput {
  orderId: string;
  userId: string;
  provider: PaymentProvider;
  amount: Prisma.Decimal | number;
  currency: string;
  idempotencyKey?: string | null;
  checkoutUrl?: string | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}

export interface PaymentTransactionCreateInput {
  paymentId: string;
  type: string;
  status: PaymentTransactionStatus;
  amount: Prisma.Decimal | number;
  providerCode?: string | null;
  providerMessage?: string | null;
  providerTxnId?: string | null;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentUpdateInput {
  status?: PaymentStatus;
  providerTxnId?: string | null;
  providerReference?: string | null;
  checkoutUrl?: string | null;
  failureReason?: string | null;
  authorizedAt?: Date | null;
  succeededAt?: Date | null;
  failedAt?: Date | null;
  cancelledAt?: Date | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}

export interface WebhookLogCreateInput {
  paymentId?: string | null;
  provider: PaymentProvider;
  eventId: string;
  eventType: string;
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'DUPLICATE';
  payload: Record<string, unknown>;
  signature?: string | null;
  processedAt?: Date | null;
  errorMessage?: string | null;
}

export interface ListPaymentsFilter {
  userId?: string;
  orderId?: string;
  status?: PaymentStatus;
  provider?: PaymentProvider;
  page: number;
  limit: number;
}

/* ---------- Domain re-exports ---------- */

export type {
  Payment,
  PaymentProvider,
  PaymentStatus,
  PaymentTransaction,
  PaymentTransactionStatus,
  PaymentWebhookLog,
};

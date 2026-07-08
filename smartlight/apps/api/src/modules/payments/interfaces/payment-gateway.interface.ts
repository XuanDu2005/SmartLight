/**
 * PaymentGateway \u2014 provider-agnostic contract.
 *
 * Every concrete gateway (MoMo, VNPay, PayPal, ...) must implement this.
 * The service never depends on a specific gateway; it picks one by name
 * from the gateway registry.
 */
import { PaymentProvider, PaymentStatus } from '@prisma/client';

export interface CreateIntentInput {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
  /** Buyer metadata \u2014 free-form key/values forwarded to the provider. */
  metadata?: Record<string, string>;
}

export interface CreateIntentResult {
  /** URL to redirect the user to (provider hosted page). */
  checkoutUrl: string;
  /** Optional provider-side token / session id (e.g. MoMo requestId). */
  providerReference?: string;
  /** Optional provider-side transaction id (returned in create response). */
  providerTxnId?: string;
  /** Raw response from the provider (for audit / debugging). */
  raw?: Record<string, unknown>;
  /** When the intent expires (defaults to platform default). */
  expiresAt?: Date;
}

export type CallbackOutcome = 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface CallbackResult {
  outcome: CallbackOutcome;
  /** Provider-side transaction id (must be present). */
  providerTxnId: string;
  /** Optional event id used for idempotency (provider eventId or order id). */
  eventId?: string;
  /** Verified amount in major units (VND). Server MUST compare to expected. */
  amount: number;
  /** ISO 4217 currency, e.g. "VND". */
  currency: string;
  /** When the provider says the event happened. */
  providerTimestamp?: Date;
  /** Raw callback payload (for audit). */
  raw?: Record<string, unknown>;
  /** Provider-supplied error code / reason (if failed). */
  failureReason?: string;
}

/**
 * Provider-agnostic contract. All methods are synchronous because they only
 * talk to provider SDKs / HTTP clients; the caller wraps them in transactions.
 */
export interface PaymentGateway {
  /** Provider code as in the database enum. */
  readonly provider: PaymentProvider;

  /** Display name for logs / admin UI. */
  readonly displayName: string;

  /** Build a checkout intent and return a redirect URL. */
  createIntent(input: CreateIntentInput): Promise<CreateIntentResult>;

  /**
   * Verify a webhook/IPN callback and translate it into a normalized
   * CallbackResult. Throws InvalidSignatureException if signature check fails.
   */
  verifyCallback(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<CallbackResult>;

  /**
   * Issue a refund against an existing capture (V1 implements no-op stub
   * unless needed by an immediate integration).
   */
  refundPayment(args: {
    providerTxnId: string;
    amount: number;
    reason: string;
  }): Promise<{ providerRefundId: string; raw?: Record<string, unknown> }>;
}

/** Status on Payment domain when a callback succeeds. */
export const CALLBACK_TO_PAYMENT_STATUS: Record<
  CallbackOutcome,
  PaymentStatus
> = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};
/**
 * PayPal gateway.
 *
 * Implements PayPal Orders v2 API:
 *   - createIntent() POSTs to /v2/checkout/orders and returns the approval URL
 *   - verifyCallback() validates webhook event payloads
 *
 * Configuration (environment variables):
 *   - PAYPAL_CLIENT_ID     (required)
 *   - PAYPAL_CLIENT_SECRET (required)
 *   - PAYPAL_MODE          ("live" | "sandbox", default: sandbox)
 *
 * PayPal signature verification uses the Certificate API to verify the
 * transmission signature header (or simply trusts the event when no signature
 * header is present and the event source is configured \u2014 v1 uses the
 * PAYPAL_WEBHOOK_ID + VERIFY-WEBHOOK-SIGNATURE API for production-grade
 * verification).
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';
import {
  CallbackResult,
  CreateIntentInput,
  CreateIntentResult,
  PaymentGateway,
} from '../interfaces/payment-gateway.interface';
import {
  InvalidSignatureException,
  PaymentProviderErrorException,
} from '../exceptions/payment.exceptions';
import type { PayPalCallbackPayload } from '../dto/payment-webhook.dto';

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  apiBase: string;
  webhookId: string;
}

@Injectable()
export class PayPalGateway implements PaymentGateway {
  public readonly provider = PaymentProvider.PAYPAL;
  public readonly displayName = 'PayPal';
  private readonly logger = new Logger(PayPalGateway.name);

  constructor(private readonly config: ConfigService) {}

  private getConfig(): PayPalConfig {
    const clientId = this.config.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.config.get<string>('PAYPAL_CLIENT_SECRET');
    const mode = this.config.get<string>('PAYPAL_MODE', 'sandbox');
    const webhookId = this.config.get<string>('PAYPAL_WEBHOOK_ID', '');
    if (!clientId || !clientSecret) {
      throw new Error(
        'PayPal is not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET missing)',
      );
    }
    const apiBase =
      mode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
    return { clientId, clientSecret, apiBase, webhookId };
  }

  /* ============================================================== */
  /*  OAuth                                                         */
  /* ============================================================== */

  private async getAccessToken(cfg: PayPalConfig): Promise<string> {
    const auth = Buffer.from(
      `${cfg.clientId}:${cfg.clientSecret}`,
    ).toString('base64');
    const res = await fetch(`${cfg.apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      throw new PaymentProviderErrorException(
        this.provider,
        `PayPal OAuth failed: ${res.status}`,
      );
    }
    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  /* ============================================================== */
  /*  createIntent                                                  */
  /* ============================================================== */

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    const cfg = this.getConfig();
    const token = await this.getAccessToken(cfg);
    const returnUrl = input.returnUrl ?? '';
    const cancelUrl = input.cancelUrl ?? '';

    const body = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: input.orderId,
          invoice_id: input.orderNumber,
          description:
            input.description ?? `Payment for order ${input.orderNumber}`,
          amount: {
            currency_code: input.currency,
            value: input.amount.toFixed(2),
          },
          custom_id: input.paymentId,
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        brand_name: 'SmartLight',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    };

    const res = await fetch(`${cfg.apiBase}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new PaymentProviderErrorException(
        this.provider,
        `PayPal order create failed (${res.status}): ${text.slice(0, 256)}`,
      );
    }

    const order = (await res.json()) as {
      id: string;
      status: string;
      links?: Array<{ rel: string; href: string }>;
    };

    const approvalLink = order.links?.find((l) => l.rel === 'approve');
    if (!approvalLink?.href) {
      throw new PaymentProviderErrorException(
        this.provider,
        'PayPal did not return approval URL',
      );
    }

    return {
      checkoutUrl: approvalLink.href,
      providerReference: order.id,
      providerTxnId: order.id,
      raw: { id: order.id, status: order.status },
    };
  }

  /* ============================================================== */
  /*  verifyCallback                                                */
  /* ============================================================== */

  async verifyCallback(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<CallbackResult> {
    const cfg = this.getConfig();
    const event = payload as PayPalCallbackPayload;
    if (!event || !event.id || !event.event_type) {
      throw new InvalidSignatureException(this.provider);
    }

    // Signature verification via PayPal's verify-webhook-signature API
    // if a webhook id is configured.
    if (cfg.webhookId) {
      const ok = await this.verifySignature(cfg, event, headers);
      if (!ok) throw new InvalidSignatureException(this.provider);
    }

    const resource = event.resource ?? {};
    const resourceId = resource.id ?? '';
    const status = (resource.status ?? '').toUpperCase();
    const totalAmount = resource.amount?.total ?? '0';
    const currency = resource.amount?.currency ?? 'USD';

    // Outcomes for order events we care about
    let outcome: 'SUCCESS' | 'FAILED' | 'CANCELLED' = 'FAILED';
    if (event.event_type === 'CHECKOUT.ORDER.COMPLETED') {
      outcome = 'SUCCESS';
    } else if (
      event.event_type === 'CHECKOUT.ORDER.APPROVED' ||
      event.event_type === 'PAYMENT.CAPTURE.COMPLETED'
    ) {
      outcome = 'SUCCESS';
    } else if (
      event.event_type === 'PAYMENT.CAPTURE.DENIED' ||
      event.event_type === 'PAYMENT.CAPTURE.DECLINED'
    ) {
      outcome = 'FAILED';
    } else if (
      event.event_type === 'CHECKOUT.ORDER.CANCELLED' ||
      event.event_type === 'PAYMENT.CAPTURE.REFUNDED'
    ) {
      outcome = 'CANCELLED';
    } else {
      // Default unknown event types to FAILED so we don't mark orders paid
      // from ambiguous signals.
      outcome = 'FAILED';
    }

    // PayPal status overrides for explicit captures
    if (status === 'COMPLETED') outcome = 'SUCCESS';
    if (status === 'DECLINED' || status === 'DENIED') outcome = 'FAILED';
    if (status === 'VOIDED') outcome = 'CANCELLED';

    return {
      outcome,
      providerTxnId: resourceId || event.id,
      eventId: event.id,
      amount: Number(totalAmount),
      currency,
      providerTimestamp: new Date(),
      raw: { ...event },
      failureReason:
        outcome === 'SUCCESS' ? undefined : `event=${event.event_type}`,
    };
  }

  private async verifySignature(
    cfg: PayPalConfig,
    event: PayPalCallbackPayload,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<boolean> {
    try {
      const token = await this.getAccessToken(cfg);
      const authAlgo = this.headerString(headers['paypal-auth-algo']);
      const certUrl = this.headerString(headers['paypal-cert-url']);
      const transmissionId = this.headerString(headers['paypal-transmission-id']);
      const transmissionSig = this.headerString(
        headers['paypal-transmission-sig'],
      );
      const transmissionTime = this.headerString(
        headers['paypal-transmission-time'],
      );
      const body = {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: cfg.webhookId,
        webhook_event: event,
      };
      const res = await fetch(
        `${cfg.apiBase}/v1/notifications/verify-webhook-signature`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) return false;
      const data = (await res.json()) as { verification_status?: string };
      return data.verification_status === 'SUCCESS';
    } catch (e: any) {
      this.logger.warn(`PayPal verify error: ${e?.message ?? e}`);
      return false;
    }
  }

  /* ============================================================== */
  /*  refund                                                        */
  /* ============================================================== */

  async refundPayment(args: {
    providerTxnId: string;
    amount: number;
    reason: string;
  }): Promise<{ providerRefundId: string; raw?: Record<string, unknown> }> {
    const cfg = this.getConfig();
    const token = await this.getAccessToken(cfg);

    // First look up the capture id, then POST refund
    const capRes = await fetch(
      `${cfg.apiBase}/v2/payments/captures/${args.providerTxnId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!capRes.ok) {
      throw new PaymentProviderErrorException(
        this.provider,
        `Capture lookup failed: ${capRes.status}`,
      );
    }

    const refundRes = await fetch(
      `${cfg.apiBase}/v2/payments/captures/${args.providerTxnId}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: {
            value: args.amount.toFixed(2),
            currency_code: 'USD',
          },
          note_to_payer: args.reason,
        }),
      },
    );
    if (!refundRes.ok) {
      const text = await refundRes.text();
      throw new PaymentProviderErrorException(
        this.provider,
        `PayPal refund failed (${refundRes.status}): ${text.slice(0, 256)}`,
      );
    }
    const data = (await refundRes.json()) as { id: string };
    return { providerRefundId: data.id, raw: data };
  }

  /* ============================================================== */
  /*  Helpers                                                       */
  /* ============================================================== */

  private headerString(h: string | string[] | undefined): string {
    if (!h) return '';
    if (Array.isArray(h)) return h[0] ?? '';
    return h;
  }
}

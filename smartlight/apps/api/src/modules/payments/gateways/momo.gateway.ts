/**
 * MoMo gateway.
 *
 * Implements the MoMo v2 payment flow (hosted page redirect):
 *   - createIntent() builds a signed request and returns a `payUrl`
 *   - verifyCallback() validates the IPN signature and translates it
 *     into a normalized CallbackResult
 *
 * Configuration (environment variables):
 *   - MOMO_PARTNER_CODE   (required)
 *   - MOMO_ACCESS_KEY     (required)
 *   - MOMO_SECRET_KEY     (required)
 *   - MOMO_ENDPOINT       (default: https://test-payment.momo.vn/v2/gateway/api/create)
 *   - MOMO_REDIRECT_URL   (optional fallback for returnUrl)
 *   - MOMO_IPN_URL        (optional fallback for webhook URL)
 *
 * Signature algorithm (per MoMo docs):
 *   rawSignature = "accessKey=$accessKey&amount=$amount&extraData=$extraData
 *                  &ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo
 *                  &partnerCode=$partnerCode&redirectUrl=$redirectUrl
 *                  &requestId=$requestId&requestType=$requestType"
 *   signature = HMAC_SHA256(rawSignature, secretKey)
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';
import { createHmac } from 'crypto';
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
import type { MomoCallbackPayload } from '../dto/payment-webhook.dto';

interface MomoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
  redirectUrl: string;
  ipnUrl: string;
  requestType: string;
}

@Injectable()
export class MomoGateway implements PaymentGateway {
  public readonly provider = PaymentProvider.MOMO;
  public readonly displayName = 'MoMo';
  private readonly logger = new Logger(MomoGateway.name);

  constructor(private readonly config: ConfigService) {}

  private getConfig(): MomoConfig {
    const partnerCode = this.config.get<string>('MOMO_PARTNER_CODE');
    const accessKey = this.config.get<string>('MOMO_ACCESS_KEY');
    const secretKey = this.config.get<string>('MOMO_SECRET_KEY');
    const endpoint = this.config.get<string>(
      'MOMO_ENDPOINT',
      'https://test-payment.momo.vn/v2/gateway/api/create',
    );
    const redirectUrl = this.config.get<string>('MOMO_REDIRECT_URL', '');
    const ipnUrl = this.config.get<string>('MOMO_IPN_URL', '');
    if (!partnerCode || !accessKey || !secretKey) {
      throw new Error(
        'MoMo is not configured (MOMO_PARTNER_CODE / MOMO_ACCESS_KEY / MOMO_SECRET_KEY missing)',
      );
    }
    return {
      partnerCode,
      accessKey,
      secretKey,
      endpoint,
      redirectUrl,
      ipnUrl,
      requestType: 'captureWallet',
    };
  }

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    const cfg = this.getConfig();
    const requestId = `${input.paymentId}-${Date.now()}`;
    const orderId = input.orderId;
    const orderInfo = input.description ?? `Payment for order ${input.orderNumber}`;
    const extraData = '';
    const amount = String(Math.round(input.amount));
    const redirectUrl = input.returnUrl ?? cfg.redirectUrl;
    const ipnUrl = cfg.ipnUrl;

    const rawSignature =
      `accessKey=${cfg.accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${cfg.partnerCode}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${cfg.requestType}`;

    const signature = this.sign(rawSignature, cfg.secretKey);

    const body = {
      partnerCode: cfg.partnerCode,
      accessKey: cfg.accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType: cfg.requestType,
      signature,
      lang: 'vi',
    };

    let response: any;
    try {
      const fetchRes = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      response = await fetchRes.json();
    } catch (e: any) {
      throw new PaymentProviderErrorException(
        this.provider,
        `MoMo request failed: ${e?.message ?? 'network'}`,
      );
    }

    if (!response || response.resultCode !== 0 || !response.payUrl) {
      throw new PaymentProviderErrorException(
        this.provider,
        response?.message ?? `resultCode=${response?.resultCode}`,
      );
    }

    return {
      checkoutUrl: response.payUrl as string,
      providerReference: requestId,
      providerTxnId: response.transId ? String(response.transId) : undefined,
      raw: response,
    };
  }

  async verifyCallback(
    payload: unknown,
    _headers: Record<string, string | string[] | undefined>,
  ): Promise<CallbackResult> {
    const cfg = this.getConfig();
    const cb = payload as MomoCallbackPayload;
    if (!cb || !cb.signature || !cb.orderId) {
      throw new InvalidSignatureException(this.provider);
    }

    const amount = String(cb.amount);
    const extraData = cb.extraData ?? '';
    const orderId = cb.orderId;
    const orderInfo = cb.orderInfo ?? '';
    const orderType = cb.orderType ?? '';
    const partnerCode = cb.partnerCode;
    const payType = cb.payType ?? '';
    const requestId = cb.requestId;
    const responseTime = String(cb.responseTime ?? '');
    const resultCode = String(cb.resultCode);
    const transId = String(cb.transId);

    const rawSignature =
      `accessKey=${cfg.accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${cb.message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const expected = this.sign(rawSignature, cfg.secretKey);
    if (!this.safeEqual(expected, cb.signature)) {
      this.logger.warn(`MoMo signature mismatch for order ${orderId}`);
      throw new InvalidSignatureException(this.provider);
    }

    const resultCodeNum = Number(resultCode);
    const outcome: 'SUCCESS' | 'FAILED' | 'CANCELLED' =
      resultCodeNum === 0
        ? 'SUCCESS'
        : resultCodeNum === 1006
          ? 'CANCELLED'
          : 'FAILED';

    return {
      outcome,
      providerTxnId: transId,
      eventId: `${partnerCode}-${orderId}-${transId}-${responseTime}`,
      amount: Number(amount),
      currency: 'VND',
      providerTimestamp: cb.responseTime
        ? new Date(Number(cb.responseTime))
        : undefined,
      raw: { ...cb },
      failureReason:
        outcome === 'SUCCESS' ? undefined : (cb.message ?? `code=${resultCode}`),
    };
  }

  async refundPayment(args: {
    providerTxnId: string;
    amount: number;
    reason: string;
  }): Promise<{ providerRefundId: string; raw?: Record<string, unknown> }> {
    // MoMo refund is an explicit API call (refund endpoint). For V1 we
    // record a no-op id and let ops trigger the refund via MoMo dashboard.
    this.logger.warn(
      `MoMoGateway.refundPayment called for txn ${args.providerTxnId} \u2014 ops manual trigger`,
    );
    return {
      providerRefundId: `MOMO-REFUND-${args.providerTxnId}-${Date.now()}`,
    };
  }

  private sign(raw: string, secret: string): string {
    return createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
  }

  private safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
      mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
  }
}

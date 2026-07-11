/**
 * VNPay gateway.
 *
 * Implements the VNPay hosted page flow:
 *   - createIntent() builds a signed redirect URL
 *   - verifyCallback() validates the IPN/IPC signature using HMAC-SHA512
 *
 * Configuration (environment variables):
 *   - VNPAY_TMN_CODE      (required)
 *   - VNPAY_HASH_SECRET   (required)
 *   - VNPAY_URL           (default: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html)
 *   - VNPAY_RETURN_URL    (optional fallback for returnUrl)
 *
 * Signature algorithm (per VNPay docs):
 *   1. Remove `vnp_SecureHash` and `vnp_SecureHashType` from the param map
 *   2. Sort remaining params alphabetically by key
 *   3. Build query string: key1=val1&key2=val2\u2026 (URL-encoded values)
 *   4. signature = HMAC_SHA512(queryString, secret)
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
import type { VNPayCallbackPayload } from '../dto/payment-webhook.dto';

interface VNPayConfig {
  tmnCode: string;
  hashSecret: string;
  payUrl: string;
  returnUrl: string;
  apiBase: string;
}

@Injectable()
export class VNPayGateway implements PaymentGateway {
  public readonly provider = PaymentProvider.VNPAY;
  public readonly displayName = 'VNPay';
  private readonly logger = new Logger(VNPayGateway.name);

  constructor(private readonly config: ConfigService) {}

  private getConfig(): VNPayConfig {
    const tmnCode = this.config.get<string>('VNPAY_TMN_CODE');
    const hashSecret = this.config.get<string>('VNPAY_HASH_SECRET');
    const payUrl = this.config.get<string>(
      'VNPAY_URL',
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    );
    const returnUrl = this.config.get<string>('VNPAY_RETURN_URL', '');
    const apiBase = this.config.get<string>(
      'VNPAY_API_BASE',
      'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
    );
    if (!tmnCode || !hashSecret) {
      throw new Error(
        'VNPay is not configured (VNPAY_TMN_CODE / VNPAY_HASH_SECRET missing)',
      );
    }
    return { tmnCode, hashSecret, payUrl, returnUrl, apiBase };
  }

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    const cfg = this.getConfig();
    const now = new Date();
    const createDate = this.formatDate(now);
    const expireDate = this.formatDate(
      new Date(now.getTime() + 15 * 60 * 1000),
    );
    const amount = Math.round(input.amount * 100); // VNPay expects amount * 100
    const txnRef = `${input.orderId}-${Date.now()}`;
    const orderInfo = this.stripVietnamese(
      input.description ?? `Thanh toan don hang ${input.orderNumber}`,
    );
    const returnUrl = input.returnUrl ?? cfg.returnUrl;

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: cfg.tmnCode,
      vnp_Amount: String(amount),
      vnp_CurrCode: input.currency,
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: '127.0.0.1',
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    const signed = this.signParams(params, cfg.hashSecret);
    const queryString = this.buildQueryString(signed);
    const checkoutUrl = `${cfg.payUrl}?${queryString}`;

    return {
      checkoutUrl,
      providerReference: txnRef,
      raw: { params: signed },
    };
  }

  async verifyCallback(
    payload: unknown,
    _headers: Record<string, string | string[] | undefined>,
  ): Promise<CallbackResult> {
    const cfg = this.getConfig();
    const cb = payload as VNPayCallbackPayload;
    if (!cb || !cb.vnp_SecureHash) {
      throw new InvalidSignatureException(this.provider);
    }

    // Strip secure-hash fields and verify
    const { vnp_SecureHash: _h, ...rest } = cb;
    const expected = this.signParams(rest as any, cfg.hashSecret);
    const expectedHash = expected.vnp_SecureHash;
    if (!expectedHash || !this.safeEqual(expectedHash, cb.vnp_SecureHash)) {
      this.logger.warn(
        `VNPay signature mismatch for txn ${cb.vnp_TxnRef ?? '?'}`,
      );
      throw new InvalidSignatureException(this.provider);
    }

    // resultCode 0 = success, !=0 = failed/cancelled
    const responseCode = cb.vnp_ResponseCode ?? '99';
    const transactionStatus = cb.vnp_TransactionStatus ?? '99';
    const success =
      responseCode === '00' && transactionStatus === '00';
    const outcome: 'SUCCESS' | 'FAILED' | 'CANCELLED' = success
      ? 'SUCCESS'
      : responseCode === '24'
        ? 'CANCELLED'
        : 'FAILED';

    const amountMajor = Number(cb.vnp_Amount ?? 0) / 100;
    const txnRef = cb.vnp_TxnRef ?? '';
    const txnNo = cb.vnp_TransactionNo;

    return {
      outcome,
      providerTxnId: txnNo ?? txnRef,
      eventId: txnRef,
      amount: amountMajor,
      currency: 'VND',
      providerTimestamp: cb.vnp_PayDate
        ? this.parseVNPayDate(cb.vnp_PayDate)
        : undefined,
      raw: { ...cb },
      failureReason: success
        ? undefined
        : `responseCode=${responseCode},txnStatus=${transactionStatus}`,
    };
  }

  async refundPayment(args: {
    providerTxnId: string;
    amount: number;
    reason: string;
  }): Promise<{ providerRefundId: string; raw?: Record<string, unknown> }> {
    // VNPay refunds go via `dr` API call. For V1 we record a stub.
    this.logger.warn(
      `VNPayGateway.refundPayment called for txn ${args.providerTxnId} \u2014 ops manual trigger`,
    );
    return {
      providerRefundId: `VNPAY-REFUND-${args.providerTxnId}-${Date.now()}`,
    };
  }

  /* ============================================================== */
  /*  Helpers                                                       */
  /* ============================================================== */

  /**
   * Sign VNPay params: sort by key, build querystring, HMAC-SHA512.
   */
  private signParams(
    params: Record<string, string>,
    secret: string,
  ): Record<string, string> {
    const sorted = Object.keys(params)
      .filter((k) => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType')
      .sort();
    const signData = sorted
      .map((k) => `${k}=${this.urlEncode(params[k])}`)
      .join('&');
    const secureHash = createHmac('sha512', secret)
      .update(signData, 'utf8')
      .digest('hex');
    return { ...params, vnp_SecureHash: secureHash };
  }

  private buildQueryString(params: Record<string, string>): string {
    return Object.keys(params)
      .sort()
      .map((k) => `${this.urlEncode(k)}=${this.urlEncode(params[k])}`)
      .join('&');
  }

  private urlEncode(value: string): string {
    return encodeURIComponent(value).replace(/%20/g, '+');
  }

  private safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
      mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
  }

  private formatDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
      `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
    );
  }

  private parseVNPayDate(s: string): Date {
    // yyyyMMddHHmmss
    if (s.length !== 14) return new Date();
    const y = Number(s.slice(0, 4));
    const mo = Number(s.slice(4, 6)) - 1;
    const d = Number(s.slice(6, 8));
    const h = Number(s.slice(8, 10));
    const mi = Number(s.slice(10, 12));
    const se = Number(s.slice(12, 14));
    return new Date(y, mo, d, h, mi, se);
  }

  private stripVietnamese(s: string): string {
    // VNPay disallows certain special chars in vnp_OrderInfo
    return s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

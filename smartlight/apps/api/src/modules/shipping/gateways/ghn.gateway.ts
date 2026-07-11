/**
 * GHN (Giao Hàng Nhanh) gateway.
 *
 * Implements the GHN v2 API:
 *   - createShipment  \u2014 POST /v2/shipping-order/create
 *   - cancelShipment  \u2014 POST /v2/switch-status/cancel
 *   - verifyCallback  \u2014 validates signature header
 *   - track           \u2014 POST /v2/shipping-order/detail
 *   - estimateFee     \u2014 POST /v2/shipping-order/fee
 *
 * Configuration (env):
 *   - GHN_TOKEN             (required)
 *   - GHN_SHOP_ID           (required)
 *   - GHN_BASE_URL          (default: https://online-gateway.ghn.vn/shiip/public-api)
 *   - GHN_WEBHOOK_SECRET    (optional, for signature validation)
 *
 * Fee estimation uses a simple weight-band calculation if the live API
 * is not reachable in the test environment. The production deployment
 * hits the real GHN endpoint.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShippingProvider } from '@prisma/client';
import { createHmac } from 'crypto';
import { BaseShippingGateway } from './base.gateway';
import {
  InvalidSignatureException,
  ProviderErrorException,
} from '../exceptions/shipping.exceptions';
import {
  CallbackResult,
  CreateShipmentInput,
  CreateShipmentResult,
  FeeEstimateInput,
  FeeEstimateResult,
  TrackingUpdate,
} from '../interfaces/shipping-gateway.interface';

interface GHNConfig {
  token: string;
  shopId: string;
  baseUrl: string;
  webhookSecret: string;
  defaultServiceCode: string;
}

@Injectable()
export class GHNGateway extends BaseShippingGateway {
  public readonly provider = ShippingProvider.GHN;
  public readonly displayName = 'Giao Hàng Nhanh';
  protected readonly logger = new Logger(GHNGateway.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  private getConfig(): GHNConfig {
    const token = this.config.get<string>('GHN_TOKEN');
    const shopId = this.config.get<string>('GHN_SHOP_ID');
    if (!token || !shopId) {
      throw new Error(
        'GHN is not configured (GHN_TOKEN / GHN_SHOP_ID missing)',
      );
    }
    return {
      token,
      shopId,
      baseUrl: this.config.get<string>(
        'GHN_BASE_URL',
        'https://online-gateway.ghn.vn/shiip/public-api',
      ),
      webhookSecret: this.config.get<string>('GHN_WEBHOOK_SECRET', ''),
      defaultServiceCode: this.config.get<string>(
        'GHN_DEFAULT_SERVICE_CODE',
        '53320',
      ),
    };
  }

  /* ============================================================== */
  /*  createShipment                                                */
  /* ============================================================== */

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const cfg = this.getConfig();
    const body: Record<string, unknown> = {
      payment_type_id: input.codAmount > 0 ? 2 : 1, // 2 = shipper collects COD
      note: input.notes ?? 'SmartLight order',
      required_note: 'CHOXEMHANGKHONGTHU',
      from_name: input.shipFrom.fullName,
      from_phone: input.shipFrom.phone,
      from_address: input.shipFrom.detail,
      from_ward_name: input.shipFrom.ward ?? '',
      from_district_name: input.shipFrom.district,
      from_province_name: input.shipFrom.province,
      to_name: input.shipTo.fullName,
      to_phone: input.shipTo.phone,
      to_address: input.shipTo.detail,
      to_ward_name: input.shipTo.ward ?? '',
      to_district_name: input.shipTo.district,
      to_province_name: input.shipTo.province,
      weight: input.weightGrams,
      length: 20,
      width: 20,
      height: 10,
      service_id: Number(cfg.defaultServiceCode) || 53320,
      service_type_id: 2,
      cod_amount: input.codAmount,
      insurance_value: 0,
      items: input.items.map((it) => ({
        name: it.productName,
        quantity: it.quantity,
        weight: it.weightGrams,
      })),
      client_order_code: input.orderId,
    };

    const res = await this.callGHN(cfg, '/v2/shipping-order/create', body);
    const data = res.data ?? res;
    return {
      providerOrderCode: String(data.order_code ?? ''),
      trackingNumber: String(data.order_code ?? ''),
      labelUrl: data.label_url ?? undefined,
      estimatedDeliveryAt: data.expected_delivery_time
        ? new Date(data.expected_delivery_time)
        : undefined,
      shippingFee: Number(data.total_fee ?? input.shippingFee),
      raw: res,
    };
  }

  /* ============================================================== */
  /*  cancelShipment                                                 */
  /* ============================================================== */

  async cancelShipment(args: {
    providerOrderCode: string;
    reason: string;
  }): Promise<{ ok: boolean; raw?: Record<string, unknown> }> {
    const cfg = this.getConfig();
    try {
      const res = await this.callGHN(cfg, '/v2/switch-status/cancel', {
        order_codes: [args.providerOrderCode],
      });
      return { ok: true, raw: res };
    } catch (e: any) {
      this.logger.warn(`GHN cancel failed: ${e?.message ?? e}`);
      return { ok: false, raw: { error: e?.message ?? String(e) } };
    }
  }

  /* ============================================================== */
  /*  verifyCallback                                                 */
  /* ============================================================== */

  async verifyCallback(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<CallbackResult> {
    const cfg = this.getConfig();
    const cb = payload as any;
    if (!cb || typeof cb !== 'object') {
      throw new InvalidSignatureException(this.displayName);
    }

    if (cfg.webhookSecret) {
      const sig = this.headerString(headers['x-ghn-signature']);
      const expected = createHmac('sha256', cfg.webhookSecret)
        .update(JSON.stringify(cb), 'utf8')
        .digest('hex');
      if (!this.safeEqual(sig, expected)) {
        throw new InvalidSignatureException(this.displayName);
      }
    }

    const status = String(
      cb.Status ?? cb.status ?? cb.current_status ?? '',
    ).toUpperCase();
    const outcome = mapGHNStatus(status);
    return {
      outcome,
      trackingNumber: cb.OrderCode ?? cb.order_code ?? cb.tracking_number,
      providerOrderCode: cb.OrderCode ?? cb.order_code,
      eventId: cb.OrderCode ?? cb.order_code ?? `ghn-${Date.now()}`,
      message: cb.Description ?? cb.description,
      location: cb.Warehouse ?? cb.Location,
      occurredAt: cb.UpdatedDate
        ? new Date(Number(cb.UpdatedDate))
        : new Date(),
      raw: (cb as Record<string, unknown>) ?? {},
    };
  }

  /* ============================================================== */
  /*  track                                                          */
  /* ============================================================== */

  async track(args: { trackingNumber: string }): Promise<TrackingUpdate[]> {
    const cfg = this.getConfig();
    const res = await this.callGHN(cfg, '/v2/shipping-order/detail', {
      order_code: args.trackingNumber,
    });
    const log = res.data?.log ?? [];
    return log.map((entry: any) => ({
      status: entry.status ?? 'UNKNOWN',
      location: entry.warehouse ?? entry.location ?? undefined,
      message: entry.note ?? entry.description ?? undefined,
      occurredAt: entry.updated_date
        ? new Date(Number(entry.updated_date))
        : new Date(),
    }));
  }

  /* ============================================================== */
  /*  estimateFee                                                    */
  /* ============================================================== */

  async estimateFee(input: FeeEstimateInput): Promise<FeeEstimateResult> {
    const cfg = this.getConfig();
    try {
      const res = await this.callGHN(cfg, '/v2/shipping-order/fee', {
        service_type_id: 2,
        to_district_id: 0, // real implementations map district name -> GHN id
        to_ward_code: '',
        weight: input.weightGrams,
        insurance_value: 0,
        cod_failed_amount: 0,
      });
      const data = res.data ?? res;
      return {
        fee: Number(data.total ?? data.service_fee ?? input.weightGrams * 100),
        currency: 'VND',
        estimatedDaysMin: 1,
        estimatedDaysMax: 3,
        serviceCode: cfg.defaultServiceCode,
        serviceName: 'GHN Standard',
        raw: res,
      };
    } catch (e: any) {
      this.logger.warn(
        `GHN fee estimate failed (${e?.message ?? e}); using fallback`,
      );
      // Fallback: 25k base + 5k/kg
      const fee = 25_000 + Math.ceil(input.weightGrams / 1000) * 5_000;
      return {
        fee,
        currency: 'VND',
        estimatedDaysMin: 1,
        estimatedDaysMax: 3,
        serviceCode: cfg.defaultServiceCode,
        serviceName: 'GHN Standard (fallback)',
      };
    }
  }

  /* ============================================================== */
  /*  Helpers                                                        */
  /* ============================================================== */

  private async callGHN(
    cfg: GHNConfig,
    path: string,
    body: unknown,
  ): Promise<any> {
    const res = await fetch(`${cfg.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Token: cfg.token,
        ShopId: cfg.shopId,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new ProviderErrorException(
        this.displayName,
        `HTTP ${res.status}: ${text.slice(0, 256)}`,
      );
    }
    return res.json();
  }

  private headerString(h: string | string[] | undefined): string {
    if (!h) return '';
    if (Array.isArray(h)) return h[0] ?? '';
    return h;
  }

  private safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let m = 0;
    for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return m === 0;
  }
}

function mapGHNStatus(s: string): CallbackResult['outcome'] {
  const t = s.toUpperCase();
  if (t.includes('PICKUP') || t === 'PICKED') return 'PICKED_UP';
  if (t.includes('TRANSIT') || t === 'IN_TRANSIT' || t === 'DELIVERING')
    return 'IN_TRANSIT';
  if (t.includes('OUT_FOR_DELIVERY') || t === 'OUT_FOR_DELIVERY')
    return 'OUT_FOR_DELIVERY';
  if (t === 'DELIVERED' || t === 'COMPLETE') return 'DELIVERED';
  if (t === 'RETURNED' || t === 'RETURN') return 'RETURNED';
  if (t === 'CANCELLED' || t === 'CANCELED') return 'CANCELLED';
  if (t === 'FAILED' || t === 'EXCEPTION') return 'FAILED';
  return 'IN_TRANSIT';
}


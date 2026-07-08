/**
 * Abstract base for shipping gateways.
 *
 * Subclasses MUST override the protected `providerCode` and
 * `displayName` accessors and implement the abstract methods. The base
 * class centralises error handling and provides stub implementations of
 * `verifyCallback` and `track` that subclasses can override when they
 * are integrated.
 */
import { Logger } from '@nestjs/common';
import { ShippingProvider } from '@prisma/client';
import {
  CallbackResult,
  CreateShipmentInput,
  CreateShipmentResult,
  FeeEstimateInput,
  FeeEstimateResult,
  ShippingGateway,
  TrackingUpdate,
} from '../interfaces/shipping-gateway.interface';
import { ProviderErrorException } from '../exceptions/shipping.exceptions';

export abstract class BaseShippingGateway implements ShippingGateway {
  abstract readonly provider: ShippingProvider;
  abstract readonly displayName: string;
  protected abstract readonly logger: Logger;

  abstract createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;

  async cancelShipment(args: {
    providerOrderCode: string;
    reason: string;
  }): Promise<{ ok: boolean; raw?: Record<string, unknown> }> {
    this.logger.warn(
      `${this.displayName} cancel not implemented \u2014 ops manual trigger for ${args.providerOrderCode}`,
    );
    return { ok: false };
  }

  async verifyCallback(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<CallbackResult> {
    void headers;
    const p = payload as any;
    if (!p) {
      throw new ProviderErrorException(this.displayName, 'empty payload');
    }
    // Generic fallback for unintegrated providers: best-effort outcome
    // detection. Production providers (GHN) override this.
    return {
      outcome: 'IN_TRANSIT',
      eventId: p.id ?? p.eventId ?? `unknown-${Date.now()}`,
      message: p.message ?? 'Generic outcome',
      raw: (p as Record<string, unknown>) ?? {},
    };
  }

  async track(args: { trackingNumber: string }): Promise<TrackingUpdate[]> {
    this.logger.warn(
      `${this.displayName} track not implemented for ${args.trackingNumber}`,
    );
    return [];
  }

  abstract estimateFee(input: FeeEstimateInput): Promise<FeeEstimateResult>;
}

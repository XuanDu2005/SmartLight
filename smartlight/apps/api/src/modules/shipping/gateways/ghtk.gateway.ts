/**
 * GHTK (Giao Hàng Tiết Kiệm) gateway.
 *
 * STUB: To be integrated in a follow-up release. The base class
 * implementations are used until then. Returns ProviderErrorException
 * for actual create/cancel/track calls to surface unintegrated state
 * to callers.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ShippingProvider } from '@prisma/client';
import { BaseShippingGateway } from './base.gateway';
import {
  CallbackResult,
  CreateShipmentInput,
  CreateShipmentResult,
  FeeEstimateInput,
  FeeEstimateResult,
} from '../interfaces/shipping-gateway.interface';
import { ProviderErrorException } from '../exceptions/shipping.exceptions';

@Injectable()
export class GHTKGateway extends BaseShippingGateway {
  public readonly provider = ShippingProvider.GHTK;
  public readonly displayName = 'Giao Hàng Tiết Kiệm';
  protected readonly logger = new Logger(GHTKGateway.name);

  async createShipment(_input: CreateShipmentInput): Promise<CreateShipmentResult> {
    throw new ProviderErrorException(
      this.displayName,
      'GHTK integration is not yet available',
    );
  }

  async estimateFee(input: FeeEstimateInput): Promise<FeeEstimateResult> {
    const fee = 20_000 + Math.ceil(input.weightGrams / 1000) * 4_000;
    return {
      fee,
      currency: 'VND',
      estimatedDaysMin: 2,
      estimatedDaysMax: 4,
      serviceCode: 'GHTK_STD',
      serviceName: 'GHTK Standard (estimated)',
    };
  }

  override async verifyCallback(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<CallbackResult> {
    return super.verifyCallback(payload, headers);
  }
}


/**
 * Ahamove gateway \u2014 STUB.
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
export class AhamoveGateway extends BaseShippingGateway {
  public readonly provider = ShippingProvider.AHAMOVE;
  public readonly displayName = 'Ahamove';
  protected readonly logger = new Logger(AhamoveGateway.name);

  async createShipment(_input: CreateShipmentInput): Promise<CreateShipmentResult> {
    throw new ProviderErrorException(
      this.displayName,
      'Ahamove integration is not yet available',
    );
  }

  async estimateFee(input: FeeEstimateInput): Promise<FeeEstimateResult> {
    const fee = 30_000 + Math.ceil(input.weightGrams / 1000) * 6_000;
    return {
      fee,
      currency: 'VND',
      estimatedDaysMin: 1,
      estimatedDaysMax: 2,
      serviceCode: 'AHA_EXPRESS',
      serviceName: 'Ahamove Express (estimated)',
    };
  }

  override async verifyCallback(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<CallbackResult> {
    return super.verifyCallback(payload, headers);
  }
}

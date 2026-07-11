/**
 * Grab Express gateway \u2014 STUB.
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
export class GrabExpressGateway extends BaseShippingGateway {
  public readonly provider = ShippingProvider.GRAB_EXPRESS;
  public readonly displayName = 'Grab Express';
  protected readonly logger = new Logger(GrabExpressGateway.name);

  async createShipment(_input: CreateShipmentInput): Promise<CreateShipmentResult> {
    throw new ProviderErrorException(
      this.displayName,
      'Grab Express integration is not yet available',
    );
  }

  async estimateFee(input: FeeEstimateInput): Promise<FeeEstimateResult> {
    const fee = 35_000 + Math.ceil(input.weightGrams / 1000) * 7_000;
    return {
      fee,
      currency: 'VND',
      estimatedDaysMin: 1,
      estimatedDaysMax: 1,
      serviceCode: 'GRAB_EXPRESS',
      serviceName: 'Grab Express (estimated)',
    };
  }

  override async verifyCallback(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<CallbackResult> {
    return super.verifyCallback(payload, headers);
  }
}


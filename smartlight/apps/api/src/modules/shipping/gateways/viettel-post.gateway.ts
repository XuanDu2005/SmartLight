/**
 * Viettel Post gateway \u2014 STUB.
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
export class ViettelPostGateway extends BaseShippingGateway {
  public readonly provider = ShippingProvider.VIETTEL_POST;
  public readonly displayName = 'Viettel Post';
  protected readonly logger = new Logger(ViettelPostGateway.name);

  async createShipment(_input: CreateShipmentInput): Promise<CreateShipmentResult> {
    throw new ProviderErrorException(
      this.displayName,
      'Viettel Post integration is not yet available',
    );
  }

  async estimateFee(input: FeeEstimateInput): Promise<FeeEstimateResult> {
    const fee = 22_000 + Math.ceil(input.weightGrams / 1000) * 4_500;
    return {
      fee,
      currency: 'VND',
      estimatedDaysMin: 2,
      estimatedDaysMax: 5,
      serviceCode: 'VTP_STD',
      serviceName: 'Viettel Post Standard (estimated)',
    };
  }

  override async verifyCallback(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<CallbackResult> {
    return super.verifyCallback(payload, headers);
  }
}


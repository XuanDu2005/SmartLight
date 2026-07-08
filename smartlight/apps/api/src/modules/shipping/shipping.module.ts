/**
 * ShippingModule \u2014 owns the shipping bounded context.
 *
 * Responsibilities:
 *   - Shipment lifecycle (CREATED \u2192 WAITING_PICKUP \u2192 ... \u2192 DELIVERED)
 *   - Provider abstraction (GHN, GHTK, Viettel Post, Ahamove, Grab Express)
 *   - Webhook handling with signature verification + idempotency
 *   - Shipping fee estimation (with caching)
 *
 * Dependencies:
 *   - DatabaseModule (PrismaService)
 *   - AuthModule (JwtAuthGuard, @CurrentUser, @Roles)
 *
 * Exposed for other modules: ShippingService internal contract.
 */
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../platform/database/database.module';
import { AuthModule } from '../auth/auth.module';

import { ShippingController } from './controller';
import { ShippingRepository } from './repositories/shipping.repository';
import { ShippingService } from './service';

import { GHNGateway } from './gateways/ghn.gateway';
import { GHTKGateway } from './gateways/ghtk.gateway';
import { ViettelPostGateway } from './gateways/viettel-post.gateway';
import { AhamoveGateway } from './gateways/ahamove.gateway';
import { GrabExpressGateway } from './gateways/grab-express.gateway';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ShippingController],
  providers: [
    ShippingService,
    ShippingRepository,
    GHNGateway,
    GHTKGateway,
    ViettelPostGateway,
    AhamoveGateway,
    GrabExpressGateway,
  ],
  exports: [ShippingService],
})
export class ShippingModule {}

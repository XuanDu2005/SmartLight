/**
 * PaymentsModule \u2014 owns the payment bounded context.
 *
 * Responsibilities:
 *   - Payment lifecycle (CREATED -> PENDING -> SUCCESS/FAILED/CANCELLED)
 *   - Provider gateway abstraction (MoMo, VNPay, PayPal)
 *   - Webhook handling with signature verification + idempotency
 *   - Order synchronization (PENDING_PAYMENT -> PAID) on payment success
 *
 * Dependencies:
 *   - DatabaseModule (PrismaService)
 *   - AuthModule (JwtAuthGuard, @CurrentUser, @Roles)
 *
 * Does NOT depend on ShippingModule (shipping starts after payment success
 * via event consumers).
 */
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../platform/database/database.module';
import { AuthModule } from '../auth/auth.module';

import { PaymentsController } from './controller';
import { PaymentsRepository } from './repositories/payments.repository';
import { PaymentsService } from './service';

import { MomoGateway } from './gateways/momo.gateway';
import { VNPayGateway } from './gateways/vnpay.gateway';
import { PayPalGateway } from './gateways/paypal.gateway';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    MomoGateway,
    VNPayGateway,
    PayPalGateway,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}

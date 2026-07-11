/**
 * CheckoutModule \u2014 owns the checkout bounded context.
 *
 * Responsibilities:
 *   - Checkout session creation and management
 *   - Inventory reservation with atomic row-level locking
 *   - Address management (shipping + billing)
 *   - Session cancellation and expiry
 *
 * Dependencies:
 *   - DatabaseModule (PrismaService)
 *   - AuthModule (JwtAuthGuard, @CurrentUser, @Roles)
 *   - CartModule (reads cart for session creation)
 *
 * Does NOT depend on OrderModule or PaymentModule (those come later).
 */
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../platform/database/database.module';
import { AuthModule } from '../auth/auth.module';

import { CheckoutController } from './controller';
import { CheckoutRepository } from './repositories/checkout.repository';
import { CheckoutService } from './service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, CheckoutRepository],
  exports: [CheckoutService],
})
export class CheckoutModule {}


/**
 * OrdersModule \u2014 owns the order management bounded context.
 *
 * Responsibilities:
 *   - Convert RESERVED checkout sessions into orders (with snapshots)
 *   - Status state machine enforcement
 *   - Immutable status history audit trail
 *   - Customer + admin order read/cancel APIs
 *
 * Dependencies:
 *   - DatabaseModule (PrismaService)
 *   - AuthModule (JwtAuthGuard, @CurrentUser, @Roles)
 *
 * Does NOT depend on PaymentModule or ShippingModule (those come later).
 */
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../platform/database/database.module';
import { AuthModule } from '../auth/auth.module';

import { OrdersController } from './controller';
import { OrdersRepository } from './repositories/orders.repository';
import { OrdersService } from './service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService],
})
export class OrdersModule {}

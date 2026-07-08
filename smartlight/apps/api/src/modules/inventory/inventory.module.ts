/**
 * InventoryModule \u2014 owns the inventory bounded context.
 *
 * Responsibilities:
 *   - Stock tracking (on_hand, reserved, available)
 *   - Stock reservation/release (internal contract for checkout/orders)
 *   - Stock movement history (append-only audit trail)
 *   - Manual adjustments (admin only)
 *   - Low-stock monitoring
 *
 * Dependencies:
 *   - DatabaseModule (PrismaService)
 *   - AuthModule (JwtAuthGuard, @CurrentUser, @Roles)
 *
 * Exported: InventoryService \u2014 internal service contract used by
 *   CheckoutModule, OrdersModule, CatalogModule.
 */
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../platform/database/database.module';
import { AuthModule } from '../auth/auth.module';

import { InventoryController } from './controller';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryService } from './service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository],
  exports: [InventoryService],
})
export class InventoryModule {}

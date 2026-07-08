/**
 * PromotionsModule \u2014 owns the promotion bounded context.
 *
 * Responsibilities:
 *   - Promotion lifecycle (DRAFT \u2192 SCHEDULED \u2192 ACTIVE \u2192 EXPIRED/DISABLED/ARCHIVED)
 *   - Voucher validation + usage tracking
 *   - Promotion stacking engine (one order + one shipping, flash-sale
 *     cannot stack with PERCENTAGE)
 *   - Discount calculation (PERCENTAGE / FIXED_AMOUNT / FREE_SHIPPING / FLASH_SALE)
 *   - Eligibility scoping (ORDER / PRODUCT / CATEGORY / BRAND)
 *
 * Dependencies:
 *   - DatabaseModule (PrismaService)
 *   - AuthModule (JwtAuthGuard, @CurrentUser, @Roles)
 *
 * Exposed for other modules: PromotionsService internal contract.
 */
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../platform/database/database.module';
import { AuthModule } from '../auth/auth.module';

import { PromotionsController } from './controller';
import { PromotionsService } from './service';
import { PromotionsRepository } from './repositories/promotions.repository';
import { PromotionEngine } from './entities/promotion.engine';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PromotionsController],
  providers: [PromotionsService, PromotionsRepository, PromotionEngine],
  exports: [PromotionsService],
})
export class PromotionsModule {}
/**
 * CartModule \u2014 owns the customer shopping-cart bounded context.
 *
 * Provides:
 *   - CartController (customer + admin routes)
 *   - CartService (business rules)
 *   - CartRepository (data access)
 *
 * Imports:
 *   - DatabaseModule \u2014 for PrismaService.
 *   - AuthModule \u2014 for JwtAuthGuard / RolesGuard / @CurrentUser / @Roles.
 *
 * Money math uses Prisma.Decimal throughout \u2014 never raw `number`.
 */
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../platform/database/database.module';
import { AuthModule } from '../auth/auth.module';

import { CartController } from './controller';
import { CartRepository } from './repositories/cart.repository';
import { CartService } from './service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CartController],
  providers: [CartService, CartRepository],
  exports: [CartService, CartRepository],
})
export class CartModule {}


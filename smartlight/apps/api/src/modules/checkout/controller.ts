/**
 * CheckoutController \u2014 customer + admin routes.
 *
 * All customer routes are JwtAuthGuard-protected (APP_GUARD in AppModule).
 * Admin routes additionally require @Roles('admin', ...).
 *
 * Security model:
 *   - JwtAuthGuard (global) ensures authentication
 *   - Service-level ownership check prevents IDOR
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CheckoutService } from './service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { UserPrincipal } from '../users/interfaces/user-principal.interface';
import { SWAGGER_BEARER_AUTH } from '../../config/swagger';

import type {
  CreateCheckoutDto,
  UpdateAddressDto,
  AdminListCheckoutsQueryDto,
} from './dto/create-checkout.dto';
import type {
  AdminCheckoutListResponseDto,
  CheckoutCreateResponseDto,
  CheckoutResponseDto,
} from './dto/checkout-response.dto';

@ApiTags('Checkout')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller()
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  /* ============================================================== */
  /*  Customer API                                                  */
  /* ============================================================== */

  /**
   * POST /checkout
   *
   * Creates a new checkout session from the user's active cart.
   * Idempotent via optional idempotencyKey.
   */
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a checkout session from the active cart',
    description:
      'Creates a new checkout session snapshotting the active cart. ' +
      'Idempotent via optional idempotencyKey header.',
  })
  async createCheckout(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateCheckoutDto,
  ): Promise<CheckoutCreateResponseDto> {
    return this.checkoutService.createCheckout(user.id, dto);
  }

  /**
   * GET /checkout/:id
   *
   * Retrieve a checkout session by ID. Ownership is enforced at the service layer.
   */
  @Get('checkout/:id')
  @ApiOperation({ summary: 'Get a checkout session by id' })
  async getCheckout(
    @CurrentUser() user: UserPrincipal,
    @Param('id') sessionId: string,
  ): Promise<CheckoutResponseDto> {
    return this.checkoutService.getCheckout(sessionId, user.id);
  }

  /**
   * POST /checkout/:id/address
   *
   * Update the shipping address for a checkout session.
   * Billing address is stored separately; if omitted it defaults to shipping.
   */
  @Post('checkout/:id/address')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update the shipping address of a checkout session' })
  async updateAddress(
    @CurrentUser() user: UserPrincipal,
    @Param('id') sessionId: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<CheckoutResponseDto> {
    return this.checkoutService.updateShippingAddress(sessionId, user.id, dto);
  }

  /**
   * POST /checkout/:id/reserve
   *
   * Atomically reserve inventory for all items in the checkout session.
   * This is a separate step so the client can handle reservation failures
   * (e.g. out-of-stock) before committing to the order.
   */
  @Post('checkout/:id/reserve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atomically reserve inventory for the session' })
  async reserveInventory(
    @CurrentUser() user: UserPrincipal,
    @Param('id') sessionId: string,
  ): Promise<CheckoutResponseDto> {
    return this.checkoutService.reserveInventory(sessionId, user.id);
  }

  /**
   * DELETE /checkout/:id
   *
   * Cancel the checkout session. Releases any reserved inventory.
   * Status transitions: CREATED | PENDING_RESERVATION | RESERVED -> CANCELLED
   */
  @Delete('checkout/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a checkout session' })
  async cancelCheckout(
    @CurrentUser() user: UserPrincipal,
    @Param('id') sessionId: string,
  ): Promise<void> {
    await this.checkoutService.cancelCheckout(sessionId, user.id);
  }

  /* ============================================================== */
  /*  Admin API (read-only)                                        */
  /* ============================================================== */

  @Get('admin/checkouts')
  @Roles('admin', 'catalog_manager', 'order_manager')
  @ApiOperation({ summary: 'Admin: list checkout sessions' })
  async listAdmin(
    @Query() query: AdminListCheckoutsQueryDto,
  ): Promise<AdminCheckoutListResponseDto> {
    return this.checkoutService.listForAdmin(query);
  }

  @Get('admin/checkouts/:id')
  @Roles('admin', 'catalog_manager', 'order_manager')
  @ApiOperation({ summary: 'Admin: get a checkout session by id' })
  async getAdmin(
    @Param('id') sessionId: string,
  ): Promise<CheckoutResponseDto> {
    return this.checkoutService.getForAdmin(sessionId);
  }
}


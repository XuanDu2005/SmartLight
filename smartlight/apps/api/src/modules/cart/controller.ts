/**
 * CartController \u2014 customer + admin routes.
 *
 * All customer routes are JwtAuthGuard-protected (configured globally via
 * APP_GUARD in AppModule). RolesGuard plus @Roles() restrict admin routes.
 *
 * Public cart access is intentionally NOT supported in MVP \u2014 guests have no
 * checkout path, so they have nothing useful to do with a cart.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CartService } from './service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { UserPrincipal } from '../users/interfaces/user-principal.interface';

import {
  AddCartItemDto,
  AdminListCartsQueryDto,
  ApplyCouponDto,
  BulkRemoveCartItemsDto,
  MergeCartDto,
  SelectCartItemsDto,
  UpdateCartItemDto,
} from './dto/cart-request.dto';
import type {
  AdminCartListResponseDto,
  CartMergeResultDto,
  CartResponseDto,
  CartSummaryDto,
} from './dto/cart-response.dto';

@Controller()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /* ============================================================== */
  /*  Customer API                                                  */
  /* ============================================================== */

  @Get('cart')
  async getCart(@CurrentUser() user: UserPrincipal): Promise<CartResponseDto> {
    return this.cartService.getOrCreateActiveCart(user.id);
  }

  @Get('cart/summary')
  async getCartSummary(@CurrentUser() user: UserPrincipal): Promise<CartSummaryDto> {
    return this.cartService.getSummary(user.id);
  }

  @Post('cart/items')
  @HttpCode(HttpStatus.OK)
  async addItem(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: AddCartItemDto,
  ): Promise<CartResponseDto> {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('cart/items/:id')
  async updateItem(
    @CurrentUser() user: UserPrincipal,
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    return this.cartService.updateItem(user.id, itemId, dto);
  }

  @Delete('cart/items/:id')
  async removeItem(
    @CurrentUser() user: UserPrincipal,
    @Param('id') itemId: string,
  ): Promise<CartResponseDto> {
    return this.cartService.removeItem(user.id, itemId);
  }

  /**
   * Bulk-remove accepts an array of itemIds in the body. We can't use the
   * standard DELETE-with-body pattern, so we expose it under PATCH for
   * parity with how select works. Multiple synchronous removes also allow
   * a single round-trip vs. N sequential DELETE calls.
   */
  @Patch('cart/items/bulk-remove')
  async bulkRemoveItems(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: BulkRemoveCartItemsDto,
  ): Promise<CartResponseDto> {
    return this.cartService.bulkRemoveItems(user.id, dto);
  }

  @Delete('cart/clear')
  @HttpCode(HttpStatus.OK)
  async clearCart(@CurrentUser() user: UserPrincipal): Promise<CartResponseDto> {
    return this.cartService.clearCart(user.id);
  }

  @Patch('cart/items/select')
  async selectItems(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: SelectCartItemsDto,
  ): Promise<CartResponseDto> {
    return this.cartService.selectItems(user.id, dto);
  }

  /**
   * Cart merge is used when the user logs in from a new device / session.
   * Client supplies items accumulated locally (anonymous ids -> real variant
   * IDs). For MVP there are no guest carts, so merge is reserved for future
   * B2B / multi-device sync flows but the endpoint is exposed for API
   * completeness.
   */
  @Post('cart/merge')
  @HttpCode(HttpStatus.OK)
  async mergeCart(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: MergeCartDto,
  ): Promise<CartMergeResultDto> {
    return this.cartService.mergeCart(user.id, dto);
  }

  @Delete('cart')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCart(@CurrentUser() user: UserPrincipal): Promise<void> {
    await this.cartService.deleteCart(user.id);
  }

  /**
   * Coupon validation placeholder. The promotion engine lives in a future
   * phase; this endpoint just attaches the code to the cart so checkout can
   * pick it up.
   */
  @Post('cart/coupon')
  @HttpCode(HttpStatus.OK)
  async applyCoupon(
    @CurrentUser() user: UserPrincipal,
    @Body() _dto: ApplyCouponDto,
  ): Promise<CartResponseDto> {
    // Future: validate coupon, attach, recompute totals.
    return this.cartService.getOrCreateActiveCart(user.id);
  }

  /* ============================================================== */
  /*  Admin API (read-only)                                         */
  /* ============================================================== */

  @Get('admin/carts')
  @Roles('admin', 'catalog_manager', 'order_manager')
  async listAdmin(
    @Query() query: AdminListCartsQueryDto,
  ): Promise<AdminCartListResponseDto> {
    return this.cartService.listCartsForAdmin(query);
  }

  @Get('admin/carts/:id')
  @Roles('admin', 'catalog_manager', 'order_manager')
  async getAdmin(@Param('id') id: string): Promise<CartResponseDto> {
    return this.cartService.getCartForAdmin(id);
  }
}

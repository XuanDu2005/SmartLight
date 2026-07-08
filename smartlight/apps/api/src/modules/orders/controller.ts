/**
 * OrdersController \u2014 customer + admin routes.
 *
 * All customer routes are JwtAuthGuard-protected (APP_GUARD in AppModule).
 * Admin routes additionally require @Roles('admin', 'order_manager').
 *
 * Security model:
 *   - JwtAuthGuard (global) ensures authentication
 *   - Service-level ownership check prevents IDOR
 *   - State machine enforced at the service layer
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { OrdersService } from './service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { UserPrincipal } from '../users/interfaces/user-principal.interface';

import type {
  AdminListOrdersQueryDto,
  CancelOrderDto,
  CreateOrderDto,
  ListOrdersQueryDto,
  UpdateOrderStatusDto,
} from './dto/create-order.dto';
import type {
  AdminOrderListResponseDto,
  OrderCreateResponseDto,
  OrderResponseDto,
  OrderSummaryDto,
} from './dto/order-response.dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /* ============================================================== */
  /*  Customer API                                                  */
  /* ============================================================== */

  /**
   * POST /orders
   *
   * Create an order from a RESERVED checkout session.
   */
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderCreateResponseDto> {
    return this.ordersService.createOrder(user.id, dto);
  }

  /**
   * GET /orders
   *
   * List the authenticated customer's orders.
   */
  @Get('orders')
  async listOrders(
    @CurrentUser() user: UserPrincipal,
    @Query() query: ListOrdersQueryDto,
  ): Promise<{ items: OrderSummaryDto[]; total: number; page: number; limit: number }> {
    return this.ordersService.listOrdersForUser(user.id, query);
  }

  /**
   * GET /orders/:id
   *
   * Get a specific order. Ownership is enforced at the service layer.
   */
  @Get('orders/:id')
  async getOrder(
    @CurrentUser() user: UserPrincipal,
    @Param('id') orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.getOrderForUser(orderId, user.id);
  }

  /**
   * PATCH /orders/:id/cancel
   *
   * Customer-initiated cancellation. Allowed only when status is PENDING_PAYMENT.
   */
  @Patch('orders/:id/cancel')
  async cancelOrder(
    @CurrentUser() user: UserPrincipal,
    @Param('id') orderId: string,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOrderForUser(orderId, user.id, dto);
  }

  /* ============================================================== */
  /*  Admin API                                                     */
  /* ============================================================== */

  @Get('admin/orders')
  @Roles('admin', 'order_manager')
  async listAdmin(
    @Query() query: AdminListOrdersQueryDto,
  ): Promise<AdminOrderListResponseDto> {
    return this.ordersService.listOrdersForAdmin(query);
  }

  @Get('admin/orders/:id')
  @Roles('admin', 'order_manager')
  async getAdmin(
    @Param('id') orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.getOrderForAdmin(orderId);
  }

  /**
   * PATCH /admin/orders/:id/status
   *
   * Admin status update. Validated against the full state machine.
   */
  @Patch('admin/orders/:id/status')
  @Roles('admin', 'order_manager')
  async updateStatus(
    @CurrentUser() admin: UserPrincipal,
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const adminName = `${admin.email}`;
    return this.ordersService.updateOrderStatusByAdmin(
      orderId,
      admin.id,
      adminName,
      dto,
    );
  }
}
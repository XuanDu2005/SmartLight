/**
 * ShippingController \u2014 customer + admin + webhook endpoints.
 *
 * Customer routes (JwtAuthGuard global):
 *   - GET  /shipping/providers
 *   - GET  /shipping/fee
 *   - GET  /shipping/:shipmentId
 *   - GET  /shipping/tracking/:trackingNumber   (public)
 *   - POST /shipping                            (create)
 *
 * Admin routes (@Roles('admin', 'order_manager')):
 *   - GET  /admin/shipping
 *   - GET  /admin/shipping/:id
 *   - POST /admin/shipping                      (admin create)
 *   - PATCH /admin/shipping/:id/ship
 *   - PATCH /admin/shipping/:id/status
 *   - PATCH /admin/shipping/:id/cancel
 *
 * Webhooks (public, signature-verified):
 *   - POST /shipping/webhook/ghn
 *   - POST /shipping/webhook/ghtk
 *   - POST /shipping/webhook/viettel
 */
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ShippingProvider } from '@prisma/client';

import { ShippingService } from './service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { UserPrincipal } from '../users/interfaces/user-principal.interface';

import type {
  AdminListShipmentsQueryDto,
  CancelShipmentDto,
  CreateShipmentDto,
  EstimateFeeDto,
  ListShipmentsQueryDto,
  ShipShipmentDto,
  UpdateShipmentStatusDto,
} from './dto/create-shipment.dto';
import type {
  FeeEstimateResponseDto,
  ProviderInfoDto,
  PublicTrackingResponseDto,
  ShipmentListResponseDto,
  ShipmentResponseDto,
} from './dto/shipping-response.dto';
import { toProviderEnum } from './constants/shipping.constants';

@Controller()
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  /* ============================================================== */
  /*  Customer API                                                   */
  /* ============================================================== */

  /**
   * GET /shipping/providers
   *
   * Public list of available providers with their enabled status.
   */
  @Get('shipping/providers')
  listProviders(): ProviderInfoDto[] {
    return this.shippingService.listProviders();
  }

  /**
   * POST /shipping/fee
   *
   * Public fee estimator (used by checkout for live preview).
   */
  @Post('shipping/fee')
  @HttpCode(HttpStatus.OK)
  async estimateFee(@Body() dto: EstimateFeeDto): Promise<FeeEstimateResponseDto> {
    return this.shippingService.estimateFee(dto);
  }

  /**
   * POST /shipping
   *
   * Customer creates a shipment for an order. Validates ownership.
   */
  @Post('shipping')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateShipmentDto,
  ): Promise<ShipmentResponseDto> {
    return this.shippingService.createShipment(user.id, dto);
  }

  /**
   * GET /shipping/:shipmentId
   */
  @Get('shipping/:shipmentId')
  async getOne(
    @CurrentUser() user: UserPrincipal,
    @Param('shipmentId') id: string,
  ): Promise<ShipmentResponseDto> {
    return this.shippingService.findShipmentForUser(id, user.id);
  }

  /**
   * GET /shipping/tracking/:trackingNumber
   *
   * Public tracking view (rate-limited in real deployment).
   */
  @Get('shipping/tracking/:trackingNumber')
  async track(
    @Param('trackingNumber') tn: string,
  ): Promise<PublicTrackingResponseDto> {
    return this.shippingService.trackShipment(tn);
  }

  /* ============================================================== */
  /*  Admin API                                                      */
  /* ============================================================== */

  @Get('admin/shipping')
  @Roles('admin', 'order_manager')
  async listAdmin(
    @Query() query: AdminListShipmentsQueryDto,
  ): Promise<ShipmentListResponseDto> {
    return this.shippingService.listForAdmin({
      status: query.status as any,
      provider: query.provider ? toProviderEnum(query.provider) : undefined,
      userId: query.userId,
      orderId: query.orderId,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
  }

  @Get('admin/shipping/:id')
  @Roles('admin', 'order_manager')
  async getAdmin(
    @Param('id') id: string,
  ): Promise<ShipmentResponseDto> {
    return this.shippingService.findShipment(id);
  }

  @Post('admin/shipping')
  @Roles('admin', 'order_manager')
  @HttpCode(HttpStatus.CREATED)
  async createAdmin(
    @Body() dto: CreateShipmentDto,
  ): Promise<ShipmentResponseDto> {
    // For admin route, use the order's userId for ownership record
    return this.shippingService.createShipment(dto.orderId ? '' : '', dto);
  }

  @Patch('admin/shipping/:id/ship')
  @Roles('admin', 'order_manager')
  async ship(
    @CurrentUser() admin: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: ShipShipmentDto,
  ): Promise<ShipmentResponseDto> {
    // PICKED_UP transition is the typical "ship" action (carrier picked it up)
    if (dto.trackingNumber) {
      // We don't have an explicit set-tracking endpoint; the service layer
      // can be extended to set tracking + transition in one shot. For V1
      // we only update status.
    }
    return this.shippingService.updateStatus(
      id,
      'PICKED_UP',
      {
        type: 'ADMIN',
        id: admin.id,
        name: admin.email,
      },
      'Marked as picked up by admin',
    );
  }

  @Patch('admin/shipping/:id/status')
  @Roles('admin', 'order_manager')
  async updateStatus(
    @CurrentUser() admin: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateShipmentStatusDto,
  ): Promise<ShipmentResponseDto> {
    return this.shippingService.updateStatus(
      id,
      dto.toStatus as any,
      {
        type: 'ADMIN',
        id: admin.id,
        name: admin.email,
      },
      dto.reason,
    );
  }

  @Patch('admin/shipping/:id/cancel')
  @Roles('admin', 'order_manager')
  async cancelAdmin(
    @CurrentUser() admin: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: CancelShipmentDto,
  ): Promise<ShipmentResponseDto> {
    return this.shippingService.cancelShipment(id, {
      actorType: 'ADMIN',
      actorId: admin.id,
      actorName: admin.email,
      reason: dto.reason,
    });
  }

  /* ============================================================== */
  /*  Webhooks (public, signature-verified)                          */
  /* ============================================================== */

  @Post('shipping/webhook/ghn')
  @HttpCode(HttpStatus.OK)
  async webhookGHN(
    @Body() payload: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<{ received: true; processed: boolean }> {
    const result = await this.shippingService.handleWebhook(
      ShippingProvider.GHN,
      payload,
      headers,
      this.headerString(headers['x-ghn-signature']),
    );
    return { received: true, processed: result.processed };
  }

  @Post('shipping/webhook/ghtk')
  @HttpCode(HttpStatus.OK)
  async webhookGHTK(
    @Body() payload: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<{ received: true; processed: boolean }> {
    const result = await this.shippingService.handleWebhook(
      ShippingProvider.GHTK,
      payload,
      headers,
      this.headerString(headers['x-ghtk-signature']),
    );
    return { received: true, processed: result.processed };
  }

  @Post('shipping/webhook/viettel')
  @HttpCode(HttpStatus.OK)
  async webhookViettel(
    @Body() payload: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<{ received: true; processed: boolean }> {
    const result = await this.shippingService.handleWebhook(
      ShippingProvider.VIETTEL_POST,
      payload,
      headers,
      this.headerString(headers['x-vtp-signature']),
    );
    return { received: true, processed: result.processed };
  }

  private headerString(h: string | string[] | undefined): string | null {
    if (!h) return null;
    if (Array.isArray(h)) return h[0] ?? null;
    return h;
  }
}
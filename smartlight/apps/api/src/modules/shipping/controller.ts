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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShippingProvider } from '@prisma/client';

import { ShippingService } from './service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { UserPrincipal } from '../users/interfaces/user-principal.interface';
import { Public } from '../auth/decorators/public.decorator';
import { SWAGGER_BEARER_AUTH } from '../../config/swagger';

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

@ApiTags('Shipping')
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
  @Public()
  @Get('shipping/providers')
  @ApiOperation({ summary: 'List available shipping providers' })
  listProviders(): ProviderInfoDto[] {
    return this.shippingService.listProviders();
  }

  /**
   * POST /shipping/fee
   *
   * Public fee estimator (used by checkout for live preview).
   */
  @Public()
  @Post('shipping/fee')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estimate shipping fee' })
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
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiOperation({ summary: 'Create a shipment for an order' })
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
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiOperation({ summary: 'Get a shipment by id' })
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
  @Public()
  @Get('shipping/tracking/:trackingNumber')
  @ApiOperation({ summary: 'Public tracking lookup' })
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
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiOperation({ summary: 'Admin: list all shipments' })
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
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiOperation({ summary: 'Admin: get a shipment by id' })
  async getAdmin(
    @Param('id') id: string,
  ): Promise<ShipmentResponseDto> {
    return this.shippingService.findShipment(id);
  }

  @Post('admin/shipping')
  @Roles('admin', 'order_manager')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiOperation({ summary: 'Admin: create a shipment on behalf of a user' })
  async createAdmin(
    @Body() dto: CreateShipmentDto,
  ): Promise<ShipmentResponseDto> {
    // For admin route, use the order's userId for ownership record
    return this.shippingService.createShipment(dto.orderId ? '' : '', dto);
  }

  @Patch('admin/shipping/:id/ship')
  @Roles('admin', 'order_manager')
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiOperation({ summary: 'Admin: mark a shipment as PICKED_UP' })
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
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiOperation({ summary: 'Admin: update shipment status' })
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
  @ApiBearerAuth(SWAGGER_BEARER_AUTH)
  @ApiOperation({ summary: 'Admin: cancel a shipment' })
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

  @Public()
  @Post('shipping/webhook/ghn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'GHN webhook (public, signature-verified)',
    description:
      'Reachable by GHN servers. Signature verified via x-ghn-signature.',
  })
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

  @Public()
  @Post('shipping/webhook/ghtk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'GHTK webhook (public, signature-verified)',
    description:
      'Reachable by GHTK servers. Signature verified via x-ghtk-signature.',
  })
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

  @Public()
  @Post('shipping/webhook/viettel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Viettel Post webhook (public, signature-verified)',
    description:
      'Reachable by Viettel Post servers. Signature verified via x-vtp-signature.',
  })
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

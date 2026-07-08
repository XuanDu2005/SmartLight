/**
 * PromotionsController \u2014 customer + admin endpoints.
 *
 * Customer routes (JwtAuthGuard global):
 *   - GET  /promotions
 *   - GET  /promotions/:id
 *   - POST /promotions/validate
 *   - POST /promotions/apply
 *
 * Voucher route (public):
 *   - GET  /vouchers/:code
 *
 * Admin routes (@Roles('admin', 'marketing_manager')):
 *   - GET    /admin/promotions
 *   - GET    /admin/promotions/:id
 *   - POST   /admin/promotions
 *   - PATCH  /admin/promotions/:id
 *   - DELETE /admin/promotions/:id
 *   - PATCH  /admin/promotions/:id/publish
 *   - PATCH  /admin/promotions/:id/archive
 *   - POST   /admin/vouchers
 *   - PATCH  /admin/vouchers/:id
 *   - DELETE /admin/vouchers/:id
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

import { PromotionsService } from './service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { UserPrincipal } from '../users/interfaces/user-principal.interface';

import type {
  ApplyPromotionDto,
  CreatePromotionDto,
  CreateVoucherDto,
  ListPromotionsQueryDto,
  UpdatePromotionDto,
  UpdateVoucherDto,
  ValidateVoucherDto,
} from './dto/create-promotion.dto';
import type {
  ApplyPromotionResponseDto,
  PromotionListResponseDto,
  PromotionResponseDto,
  PromotionSummaryDto,
  VoucherListResponseDto,
  VoucherResponseDto,
  VoucherSummaryDto,
} from './dto/promotion-response.dto';

@Controller()
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  /* ============================================================== */
  /*  Customer API                                                   */
  /* ============================================================== */

  /**
   * GET /promotions
   *
   * List active promotions (cached by gateway \u2014 not enforced here).
   */
  @Get('promotions')
  async listActive(): Promise<PromotionSummaryDto[]> {
    return this.promotionsService.listActivePromotions();
  }

  /**
   * GET /promotions/:id
   */
  @Get('promotions/:id')
  async getById(
    @Param('id') id: string,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.getPromotionById(id);
  }

  /**
   * POST /promotions/validate
   *
   * Validate a voucher against a cart context.
   */
  @Post('promotions/validate')
  @HttpCode(HttpStatus.OK)
  async validate(
    @Body() dto: ValidateVoucherDto,
  ): Promise<unknown> {
    // Optional auth: use 'me' if present, else null
    return this.promotionsService.validateVoucherForCustomer(dto, dto.code);
  }

  /**
   * POST /promotions/apply
   *
   * Apply a voucher (and auto-apply promotions if none) and compute discount.
   */
  @Post('promotions/apply')
  @HttpCode(HttpStatus.OK)
  async apply(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: ApplyPromotionDto,
  ): Promise<ApplyPromotionResponseDto> {
    return this.promotionsService.applyPromotions(dto, user.id);
  }

  /**
   * GET /vouchers/:code
   *
   * Public voucher preview (no usage recorded).
   */
  @Get('vouchers/:code')
  async getVoucher(
    @Param('code') code: string,
  ): Promise<VoucherSummaryDto | null> {
    // For V1 we don't expose full voucher details publicly \u2014 only summary.
    return this.promotionsService['repo'].findVoucherByCode(code).then((v) =>
      v
        ? {
            id: v.id,
            code: v.code,
            promotionId: v.promotionId,
            status: v.status,
            type: v.type,
            expiresAt: v.expiresAt.toISOString(),
            usedCount: v.usedCount,
          }
        : null,
    );
  }

  /* ============================================================== */
  /*  Admin: Promotion                                               */
  /* ============================================================== */

  @Get('admin/promotions')
  @Roles('admin', 'marketing_manager')
  async listAdmin(
    @Query() query: ListPromotionsQueryDto,
  ): Promise<PromotionListResponseDto> {
    return this.promotionsService.listPromotionsAdmin(query);
  }

  @Get('admin/promotions/:id')
  @Roles('admin', 'marketing_manager')
  async getAdmin(
    @Param('id') id: string,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.getPromotionAdmin(id);
  }

  @Post('admin/promotions')
  @Roles('admin', 'marketing_manager')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() admin: UserPrincipal,
    @Body() dto: CreatePromotionDto,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.createPromotion(dto, {
      id: admin.id,
      name: admin.email,
    });
  }

  @Patch('admin/promotions/:id')
  @Roles('admin', 'marketing_manager')
  async update(
    @CurrentUser() admin: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.updatePromotion(id, dto, {
      id: admin.id,
      name: admin.email,
    });
  }

  @Patch('admin/promotions/:id/publish')
  @Roles('admin', 'marketing_manager')
  async publish(
    @CurrentUser() admin: UserPrincipal,
    @Param('id') id: string,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.publishPromotion(id, {
      id: admin.id,
      name: admin.email,
    });
  }

  @Patch('admin/promotions/:id/archive')
  @Roles('admin', 'marketing_manager')
  async archive(
    @CurrentUser() admin: UserPrincipal,
    @Param('id') id: string,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.archivePromotion(id, {
      id: admin.id,
      name: admin.email,
    });
  }

  @Delete('admin/promotions/:id')
  @Roles('admin', 'marketing_manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() admin: UserPrincipal,
    @Param('id') id: string,
  ): Promise<void> {
    return this.promotionsService.deletePromotion(id, {
      id: admin.id,
      name: admin.email,
    });
  }

  /* ============================================================== */
  /*  Admin: Voucher                                                 */
  /* ============================================================== */

  @Post('admin/vouchers')
  @Roles('admin', 'marketing_manager')
  @HttpCode(HttpStatus.CREATED)
  async createVoucher(
    @CurrentUser() admin: UserPrincipal,
    @Body() dto: CreateVoucherDto,
  ): Promise<VoucherResponseDto> {
    return this.promotionsService.createVoucher(dto, {
      id: admin.id,
      name: admin.email,
    });
  }

  @Patch('admin/vouchers/:id')
  @Roles('admin', 'marketing_manager')
  async updateVoucher(
    @CurrentUser() admin: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateVoucherDto,
  ): Promise<VoucherResponseDto> {
    return this.promotionsService.updateVoucher(id, dto, {
      id: admin.id,
      name: admin.email,
    });
  }

  @Delete('admin/vouchers/:id')
  @Roles('admin', 'marketing_manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVoucher(
    @CurrentUser() admin: UserPrincipal,
    @Param('id') id: string,
  ): Promise<void> {
    return this.promotionsService.deleteVoucher(id, {
      id: admin.id,
      name: admin.email,
    });
  }
}
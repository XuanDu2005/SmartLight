/**
 * PromotionsService \u2014 all promotion business logic.
 *
 * Internal service contract:
 *   - validatePromotion(promotionId, context)
 *   - applyPromotion(context, voucherCode, autoApplyIds)
 *   - calculateDiscount(promotionId, items)
 *   - validateVoucher(code, context)
 *   - incrementUsage(voucherId, userId, orderId, discountAmount)
 *   - rollbackUsage(voucherId)
 *
 * Admin operations exposed via HTTP:
 *   - create / update / publish / archive / delete promotion
 *   - create / update / delete voucher
 *
 * Money math: Prisma.Decimal throughout.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PromotionStatus, PromotionType, VoucherType } from '@prisma/client';

import { PromotionsRepository } from './repositories/promotions.repository';
import {
  PromotionEngine,
  type PromotionWithTargetsLike,
} from './entities/promotion.engine';
import type {
  ApplyPromotionRequest,
  ApplyPromotionResult,
  PromotionCartContext,
  PromotionEvaluation,
  PromotionStackResult,
  VoucherValidationInput,
  VoucherValidationResult,
} from './entities/promotion-engine.types';
import {
  PROMOTION_LIMITS,
  toPromotionCategory,
  toPromotionType,
  toUsageLimitType,
  toVoucherType,
} from './constants/promotion.constants';
import {
  BrandNotEligibleException,
  CategoryNotEligibleException,
  InvalidPromotionWindowException,
  MaximumDiscountExceededException,
  MinimumOrderNotMetException,
  OrderTotalCannotGoNegativeException,
  PromotionArchivedException,
  PromotionCannotDeleteActiveException,
  PromotionDisabledException,
  PromotionExpiredException,
  PromotionNotActiveException,
  PromotionNotFoundException,
  PromotionUsageLimitReachedException,
  VoucherAlreadyUsedException,
  VoucherCodeAlreadyExistsException,
  VoucherNotFoundException,
  VoucherPerUserLimitReachedException,
  VoucherUsageLimitReachedException,
} from './exceptions/promotion.exceptions';

import type {
  CreatePromotionDto,
  CreateVoucherDto,
  UpdatePromotionDto,
  UpdateVoucherDto,
} from './dto/create-promotion.dto';
import type {
  ApplyPromotionResponseDto,
  PromotionListResponseDto,
  PromotionResponseDto,
  PromotionStackResponseDto,
  PromotionSummaryDto,
  VoucherListResponseDto,
  VoucherResponseDto,
  VoucherSummaryDto,
} from './dto/promotion-response.dto';

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    private readonly repo: PromotionsRepository,
    private readonly engine: PromotionEngine,
  ) {}

  /* ============================================================== */
  /*  Internal service contract                                      */
  /* ============================================================== */

  async validatePromotion(
    promotionId: string,
    context: PromotionCartContext,
  ): Promise<PromotionEvaluation> {
    const promo = await this.repo.findById(promotionId);
    if (!promo) throw new PromotionNotFoundException(promotionId);
    this.assertPromotable(promo);
    return this.engine.validate(this.toLike(promo), context);
  }

  async applyPromotion(req: ApplyPromotionRequest): Promise<ApplyPromotionResult> {
    const context = req.context;
    const promotions: PromotionWithTargetsLike[] = [];

    // 1. Voucher (overrides auto-apply when present)
    let voucherResult: VoucherValidationResult | null = null;
    if (req.voucherCode) {
      voucherResult = await this.validateVoucherInternal({
        code: req.voucherCode,
        userId: context.userId,
        context,
      });
      if (voucherResult.valid && voucherResult.promotionId) {
        const voucherPromo = await this.repo.findById(voucherResult.promotionId);
        if (voucherPromo) {
          promotions.push(this.toLike(voucherPromo));
        }
      }
    } else if (req.autoApplyPromotionIds && req.autoApplyPromotionIds.length > 0) {
      for (const id of req.autoApplyPromotionIds) {
        const p = await this.repo.findActiveById(id);
        if (p) promotions.push(this.toLike(p));
      }
    } else {
      // Auto-discover active auto-apply promotions
      const autoApply = await this.repo.findActiveAutoApply();
      for (const p of autoApply) {
        promotions.push(this.toLike(p));
      }
    }

    const stack: PromotionStackResult = this.engine.evaluate(promotions, context);

    return { ...stack, voucher: voucherResult };
  }

  async calculateDiscount(
    promotionId: string,
    items: PromotionCartContext['items'],
    shippingFee: number,
    userId: string | null,
    isFirstOrder = false,
  ): Promise<{ discount: number; subtotalAfter: number; freeShipping: boolean }> {
    const promo = await this.repo.findById(promotionId);
    if (!promo) throw new PromotionNotFoundException(promotionId);
    this.assertPromotable(promo);

    const subtotal = items.reduce((s, it) => s + it.lineSubtotal, 0);
    const ctx: PromotionCartContext = {
      userId,
      isFirstOrder,
      currency: 'VND',
      items,
      shippingFee,
      subtotal,
    };
    const result = this.engine.evaluate([this.toLike(promo)], ctx);
    return {
      discount: result.orderDiscount,
      subtotalAfter: result.finalSubtotal,
      freeShipping: result.shippingDiscount > 0,
    };
  }

  async validateVoucher(
    code: string,
    context: PromotionCartContext,
  ): Promise<VoucherValidationResult> {
    return this.validateVoucherInternal({ code, userId: context.userId, context });
  }

  /**
   * Atomically increment usage counters and create VoucherUsage row.
   * Returns true if usage was successfully recorded.
   */
  async incrementUsage(args: {
    voucherId: string;
    promotionId: string;
    userId: string;
    orderId: string;
    discountAmount: number;
  }): Promise<{ success: boolean; reason?: string }> {
    return this.repo.withTransaction(async (tx) => {
      // 1. Increment voucher usage
      const newCount = await this.repo.incrementVoucherUsage(args.voucherId, tx);
      if (newCount === -1) {
        throw new VoucherUsageLimitReachedException(args.voucherId, 0);
      }

      // 2. Per-user limit check
      const voucher = await tx.voucher.findUnique({ where: { id: args.voucherId } });
      if (voucher?.perUserLimit) {
        const userCount = await this.repo.countVoucherUsageByUser(
          args.voucherId,
          args.userId,
        );
        if (userCount > voucher.perUserLimit) {
          // Rollback voucher increment
          await this.repo.decrementVoucherUsage(args.voucherId, tx);
          throw new VoucherPerUserLimitReachedException(
            args.voucherId,
            voucher.perUserLimit,
          );
        }
      }

      // 3. Increment promotion usage (TOTAL limit)
      const promoCount = await this.repo.incrementPromotionUsage(args.promotionId, tx);
      if (promoCount === -1) {
        // Rollback voucher increment
        await this.repo.decrementVoucherUsage(args.voucherId, tx);
        throw new PromotionUsageLimitReachedException(args.promotionId, 0);
      }

      // 4. Record VoucherUsage
      await this.repo.recordUsage({
        voucherId: args.voucherId,
        userId: args.userId,
        orderId: args.orderId,
        promotionId: args.promotionId,
        discountAmount: args.discountAmount,
        tx,
      });

      // 5. Audit log
      await this.repo.writeAuditLog(
        {
          promotionId: args.promotionId,
          action: 'USAGE_RECORDED',
          payload: {
            voucherId: args.voucherId,
            orderId: args.orderId,
            discountAmount: args.discountAmount,
          },
          actorType: 'SYSTEM',
          actorId: args.userId,
        },
        tx,
      );

      this.logger.log(
        `Voucher usage recorded: voucher=${args.voucherId} order=${args.orderId} discount=${args.discountAmount}`,
      );
      return { success: true };
    });
  }

  async rollbackUsage(args: {
    voucherId: string;
    promotionId: string;
    orderId: string;
  }): Promise<void> {
    await this.repo.withTransaction(async (tx) => {
      // Remove VoucherUsage row
      await tx.voucherUsage.deleteMany({
        where: { voucherId: args.voucherId, orderId: args.orderId },
      });
      // Decrement counters
      await this.repo.decrementVoucherUsage(args.voucherId, tx);
      await this.repo.decrementPromotionUsage(args.promotionId, tx);

      await this.repo.writeAuditLog(
        {
          promotionId: args.promotionId,
          action: 'USAGE_ROLLED_BACK',
          payload: { voucherId: args.voucherId, orderId: args.orderId },
          actorType: 'SYSTEM',
        },
        tx,
      );

      this.logger.log(
        `Voucher usage rolled back: voucher=${args.voucherId} order=${args.orderId}`,
      );
    });
  }

  /* ============================================================== */
  /*  Customer API                                                   */
  /* ============================================================== */

  async listActivePromotions(): Promise<PromotionSummaryDto[]> {
    const items = await this.repo.findActiveAutoApply();
    return items.map((row) => this.toSummary(row));
  }

  async getPromotionById(id: string): Promise<PromotionResponseDto> {
    const p = await this.repo.findById(id);
    if (!p) throw new PromotionNotFoundException(id);
    return this.toResponse(p);
  }

  async validateVoucherForCustomer(
    dto: {
      code: string;
      items?: Array<{
        productVariantId: string;
        productId?: string;
        categoryId?: string;
        brandId?: string;
        quantity: number;
        unitPrice: number;
      }>;
      shippingFee?: number;
      isFirstOrder?: boolean;
    },
    userId: string,
  ): Promise<VoucherValidationResult> {
    const items = dto.items ?? [];
    const context = this.cartContextFromDto({ ...dto, items }, userId);
    const result = await this.validateVoucherInternal({
      code: dto.code,
      userId,
      context,
    });
    if (!result.valid) {
      // Map invalid result to specific exception
      if (result.reason === 'VOUCHER_ALREADY_USED')
        throw new VoucherAlreadyUsedException(dto.code);
      if (result.reason === 'VOUCHER_PER_USER_LIMIT_REACHED')
        throw new VoucherPerUserLimitReachedException(dto.code, 0);
      if (result.reason === 'VOUCHER_USAGE_LIMIT_REACHED')
        throw new VoucherUsageLimitReachedException(dto.code, 0);
      if (result.reason === 'MIN_ORDER_NOT_MET')
        throw new MinimumOrderNotMetException(0, context.subtotal);
    }
    return result;
  }

  async applyPromotions(
    dto: {
      voucherCode?: string;
      items: Array<{
        productVariantId: string;
        productId?: string;
        categoryId?: string;
        brandId?: string;
        quantity: number;
        unitPrice: number;
      }>;
      shippingFee: number;
      isFirstOrder?: boolean;
      autoApplyPromotionIds?: string[];
    },
    userId: string,
  ): Promise<ApplyPromotionResponseDto> {
    const context = this.cartContextFromDto(dto, userId);
    const result = await this.applyPromotion({
      context,
      voucherCode: dto.voucherCode,
      autoApplyPromotionIds: dto.autoApplyPromotionIds,
    });
    return this.mapToApplyResponse(result);
  }

  /* ============================================================== */
  /*  Admin: Promotion CRUD                                          */
  /* ============================================================== */

  async createPromotion(
    dto: CreatePromotionDto,
    admin: { id: string; name: string },
  ): Promise<PromotionResponseDto> {
    this.validateWindow(dto.startAt, dto.endAt);

    return this.repo.withTransaction(async (tx) => {
      const p = await this.repo.createPromotion(
        {
          name: dto.name,
          description: dto.description,
          type: toPromotionType(dto.type),
          scope: (dto.scope as any) ?? 'ORDER',
          discountValue: dto.discountValue,
          minimumOrderValue: dto.minimumOrderValue ?? PROMOTION_LIMITS.DEFAULT_MIN_ORDER_VALUE,
          maximumDiscount: dto.maximumDiscount,
          startAt: new Date(dto.startAt),
          endAt: new Date(dto.endAt),
          priority: dto.priority ?? 0,
          stackable: dto.stackable ?? false,
          usageLimitType: dto.usageLimitType
            ? toUsageLimitType(dto.usageLimitType)
            : 'TOTAL',
          usageLimit: dto.usageLimit,
          perUserLimit: dto.perUserLimit,
          isFreeShipping: dto.type === 'FREE_SHIPPING',
          flashSaleStock: dto.flashSaleStock,
          bannerMediaUrl: dto.bannerMediaUrl,
          productVariantIds: dto.productVariantIds,
          categoryIds: dto.categoryIds,
          brandIds: dto.brandIds,
        },
        tx,
      );

      if (dto.productVariantIds) {
        await this.repo.addProductTargets(p.id, dto.productVariantIds, tx);
      }
      if (dto.categoryIds) {
        await this.repo.addCategoryTargets(p.id, dto.categoryIds, tx);
      }
      if (dto.brandIds) {
        await this.repo.addBrandTargets(p.id, dto.brandIds, tx);
      }

      await this.repo.writeAuditLog(
        {
          promotionId: p.id,
          action: 'CREATED',
          payload: { ...dto },
          actorType: 'ADMIN_USER',
          actorId: admin.id,
          actorName: admin.name,
        },
        tx,
      );

      const full = await this.repo.findById(p.id);
      return this.toResponse(full!);
    });
  }

  async updatePromotion(
    id: string,
    dto: UpdatePromotionDto,
    admin: { id: string; name: string },
  ): Promise<PromotionResponseDto> {
    return this.repo.withTransaction(async (tx) => {
      const existing = await tx.promotion.findFirst({ where: { id } });
      if (!existing) throw new PromotionNotFoundException(id);

      if (dto.endAt) {
        const endAt = new Date(dto.endAt);
        if (endAt <= existing.startAt) {
          throw new InvalidPromotionWindowException('endAt must be after startAt');
        }
      }

      const updated = await this.repo.updatePromotion(
        id,
        {
          name: dto.name,
          description: dto.description,
          discountValue: dto.discountValue as any,
          minimumOrderValue: dto.minimumOrderValue as any,
          maximumDiscount: dto.maximumDiscount == null ? null : (dto.maximumDiscount as any),
          endAt: dto.endAt ? new Date(dto.endAt) : undefined,
          priority: dto.priority,
          stackable: dto.stackable,
          usageLimit: dto.usageLimit,
          perUserLimit: dto.perUserLimit,
          bannerMediaUrl: dto.bannerMediaUrl,
        },
        tx,
      );

      await this.repo.writeAuditLog(
        {
          promotionId: id,
          action: 'UPDATED',
          payload: { ...dto },
          actorType: 'ADMIN_USER',
          actorId: admin.id,
          actorName: admin.name,
        },
        tx,
      );

      const full = await this.repo.findById(updated.id);
      return this.toResponse(full!);
    });
  }

  async publishPromotion(
    id: string,
    admin: { id: string; name: string },
  ): Promise<PromotionResponseDto> {
    return this.repo.withTransaction(async (tx) => {
      const p = await this.repo.findById(id);
      if (!p) throw new PromotionNotFoundException(id);
      if (p.status === 'ARCHIVED' || p.status === 'EXPIRED' || p.status === 'DISABLED') {
        throw new PromotionNotActiveException(id, p.status);
      }
      await this.repo.setPromotionStatus(id, 'ACTIVE', tx);
      await this.repo.writeAuditLog(
        {
          promotionId: id,
          action: 'PUBLISHED',
          payload: { previousStatus: p.status },
          actorType: 'ADMIN_USER',
          actorId: admin.id,
          actorName: admin.name,
        },
        tx,
      );
      const full = await this.repo.findById(id);
      return this.toResponse(full!);
    });
  }

  async archivePromotion(
    id: string,
    admin: { id: string; name: string },
  ): Promise<PromotionResponseDto> {
    return this.repo.withTransaction(async (tx) => {
      const p = await this.repo.findById(id);
      if (!p) throw new PromotionNotFoundException(id);
      await this.repo.setPromotionStatus(id, 'ARCHIVED', tx);
      await this.repo.writeAuditLog(
        {
          promotionId: id,
          action: 'ARCHIVED',
          payload: { previousStatus: p.status },
          actorType: 'ADMIN_USER',
          actorId: admin.id,
          actorName: admin.name,
        },
        tx,
      );
      const full = await this.repo.findById(id);
      return this.toResponse(full!);
    });
  }

  async deletePromotion(
    id: string,
    admin: { id: string; name: string },
  ): Promise<void> {
    return this.repo.withTransaction(async (tx) => {
      const p = await this.repo.findById(id);
      if (!p) throw new PromotionNotFoundException(id);
      if (p.status === 'ACTIVE') {
        throw new PromotionCannotDeleteActiveException(id);
      }
      await this.repo.softDeletePromotion(id, tx);
      await this.repo.writeAuditLog(
        {
          promotionId: id,
          action: 'DELETED',
          payload: { previousStatus: p.status },
          actorType: 'ADMIN_USER',
          actorId: admin.id,
          actorName: admin.name,
        },
        tx,
      );
    });
  }

  async listPromotionsAdmin(query: {
    status?: string;
    type?: string;
    page?: string;
    limit?: string;
  }): Promise<PromotionListResponseDto> {
    const { page, limit } = this.parsePagination(query.page, query.limit);
    const { items, total } = await this.repo.listPromotions({
      status: query.status as PromotionStatus | undefined,
      type: query.type ? toPromotionType(query.type) : undefined,
      page,
      limit,
    });
    return {
      items: items.map((row) => this.toSummary(row)),
      total,
      page,
      limit,
    };
  }

  async getPromotionAdmin(id: string): Promise<PromotionResponseDto> {
    return this.getPromotionById(id);
  }

  /* ============================================================== */
  /*  Admin: Voucher CRUD                                            */
  /* ============================================================== */

  async createVoucher(
    dto: CreateVoucherDto,
    admin: { id: string; name: string },
  ): Promise<VoucherResponseDto> {
    // Pre-check for duplicate code
    const existing = await this.repo.findVoucherByCode(dto.code);
    if (existing) {
      throw new VoucherCodeAlreadyExistsException(dto.code);
    }

    const voucher = await this.repo.createVoucher({
      promotionId: dto.promotionId,
      code: dto.code,
      type: dto.type ? toVoucherType(dto.type) : VoucherType.PUBLIC,
      usageLimitType: dto.usageLimitType
        ? toUsageLimitType(dto.usageLimitType)
        : 'TOTAL',
      usageLimit: dto.usageLimit,
      perUserLimit: dto.perUserLimit,
      expiresAt: new Date(dto.expiresAt),
      firstOrderOnly: dto.firstOrderOnly ?? false,
    });

    await this.repo.writeAuditLog({
      promotionId: dto.promotionId,
      action: 'VOUCHER_CREATED',
      payload: { code: dto.code },
      actorType: 'ADMIN_USER',
      actorId: admin.id,
      actorName: admin.name,
    });

    const full = await this.repo.findVoucherByCode(dto.code);
    return this.toVoucherResponse(full!);
  }

  async updateVoucher(
    id: string,
    dto: UpdateVoucherDto,
    admin: { id: string; name: string },
  ): Promise<VoucherResponseDto> {
    const existing = await this.repo.findVoucherById(id);
    if (!existing) throw new VoucherNotFoundException(id);

    const updated = await this.repo.updateVoucher(id, {
      usageLimit: dto.usageLimit,
      perUserLimit: dto.perUserLimit,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    await this.repo.writeAuditLog({
      promotionId: updated.promotionId,
      action: 'VOUCHER_UPDATED',
      payload: { id, ...dto },
      actorType: 'ADMIN_USER',
      actorId: admin.id,
      actorName: admin.name,
    });

    const full = await this.repo.findVoucherByCode(updated.code);
    return this.toVoucherResponse(full!);
  }

  async deleteVoucher(id: string, admin: { id: string; name: string }): Promise<void> {
    const existing = await this.repo.findVoucherById(id);
    if (!existing) throw new VoucherNotFoundException(id);
    await this.repo.deleteVoucher(id);
    await this.repo.writeAuditLog({
      promotionId: existing.promotionId,
      action: 'VOUCHER_DELETED',
      payload: { id, code: existing.code },
      actorType: 'ADMIN_USER',
      actorId: admin.id,
      actorName: admin.name,
    });
  }

  async listVouchers(promotionId?: string, page = 1, limit = 20): Promise<VoucherListResponseDto> {
    const { items, total } = await this.repo.listVouchers(promotionId, page, limit);
    return {
      items: items.map((v) => ({
        id: v.id,
        code: v.code,
        promotionId: v.promotionId,
        status: v.status,
        type: v.type,
        expiresAt: v.expiresAt.toISOString(),
        usedCount: v.usedCount,
      })),
      total,
      page,
      limit,
    };
  }

  /* ============================================================== */
  /*  Internal helpers                                               */
  /* ============================================================== */

  private async validateVoucherInternal(
    input: VoucherValidationInput,
  ): Promise<VoucherValidationResult> {
    const voucher = await this.repo.findVoucherByCode(input.code);
    if (!voucher) {
      return {
        valid: false,
        reason: 'VOUCHER_NOT_FOUND',
        voucherId: null,
        promotionId: null,
        discountAmount: 0,
        discountType: null,
        isFreeShipping: false,
      };
    }

    const now = new Date();
    if (voucher.expiresAt < now) {
      return {
        valid: false,
        reason: 'VOUCHER_EXPIRED',
        voucherId: voucher.id,
        promotionId: voucher.promotionId,
        discountAmount: 0,
        discountType: voucher.promotion.type,
        isFreeShipping: voucher.promotion.isFreeShipping,
      };
    }

    if (voucher.status !== 'ACTIVE') {
      return {
        valid: false,
        reason: 'VOUCHER_NOT_ACTIVE',
        voucherId: voucher.id,
        promotionId: voucher.promotionId,
        discountAmount: 0,
        discountType: voucher.promotion.type,
        isFreeShipping: voucher.promotion.isFreeShipping,
      };
    }

    if (voucher.usageLimit != null && voucher.usedCount >= voucher.usageLimit) {
      return {
        valid: false,
        reason: 'VOUCHER_USAGE_LIMIT_REACHED',
        voucherId: voucher.id,
        promotionId: voucher.promotionId,
        discountAmount: 0,
        discountType: voucher.promotion.type,
        isFreeShipping: voucher.promotion.isFreeShipping,
      };
    }

    if (input.userId && voucher.perUserLimit != null) {
      const userCount = await this.repo.countVoucherUsageByUser(
        voucher.id,
        input.userId,
      );
      if (userCount >= voucher.perUserLimit) {
        return {
          valid: false,
          reason: 'VOUCHER_PER_USER_LIMIT_REACHED',
          voucherId: voucher.id,
          promotionId: voucher.promotionId,
          discountAmount: 0,
          discountType: voucher.promotion.type,
          isFreeShipping: voucher.promotion.isFreeShipping,
        };
      }
    }

    // Evaluate the promotion
    const evaluation = this.engine.validate(this.toLike(voucher.promotion), input.context);
    if (evaluation.status !== 'APPLIED') {
      return {
        valid: false,
        reason: evaluation.reason,
        voucherId: voucher.id,
        promotionId: voucher.promotionId,
        discountAmount: 0,
        discountType: voucher.promotion.type,
        isFreeShipping: voucher.promotion.isFreeShipping,
      };
    }

    return {
      valid: true,
      reason: null,
      voucherId: voucher.id,
      promotionId: voucher.promotionId,
      discountAmount: evaluation.discountAmount,
      discountType: voucher.promotion.type,
      isFreeShipping: voucher.promotion.isFreeShipping,
    };
  }

  private assertPromotable(p: any): void {
    const now = new Date();
    if (p.status === 'ARCHIVED') throw new PromotionArchivedException(p.id);
    if (p.status === 'DISABLED') throw new PromotionDisabledException(p.id);
    if (p.status === 'EXPIRED' || p.endAt < now)
      throw new PromotionExpiredException(p.id);
    if (p.status !== 'ACTIVE') throw new PromotionNotActiveException(p.id, p.status);
    if (p.startAt > now) throw new PromotionNotActiveException(p.id, 'NOT_STARTED');
  }

  private validateWindow(startAt: string, endAt: string): void {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (!(start instanceof Date) || isNaN(start.getTime()))
      throw new InvalidPromotionWindowException('invalid startAt');
    if (!(end instanceof Date) || isNaN(end.getTime()))
      throw new InvalidPromotionWindowException('invalid endAt');
    if (end <= start)
      throw new InvalidPromotionWindowException('endAt must be after startAt');
  }

  private toLike(p: any): PromotionWithTargetsLike {
    return {
      id: p.id,
      type: p.type,
      status: p.status,
      scope: p.scope,
      discountValue: this.d2n(p.discountValue),
      minimumOrderValue: this.d2n(p.minimumOrderValue),
      maximumDiscount:
        p.maximumDiscount == null ? null : this.d2n(p.maximumDiscount),
      startAt: p.startAt,
      endAt: p.endAt,
      priority: p.priority,
      stackable: p.stackable,
      isFreeShipping: p.isFreeShipping,
      productTargets: (p.productTargets ?? []).map((t: any) => ({
        productVariantId: t.productVariantId,
      })),
      categoryTargets: (p.categoryTargets ?? []).map((t: any) => ({
        categoryId: t.categoryId,
      })),
      brandTargets: (p.brandTargets ?? []).map((t: any) => ({
        brandId: t.brandId,
      })),
      createdAt: p.createdAt,
    };
  }

  private cartContextFromDto(
    dto: {
      items: Array<{
        productVariantId: string;
        productId?: string;
        categoryId?: string;
        brandId?: string;
        quantity: number;
        unitPrice: number;
      }>;
      shippingFee?: number;
      isFirstOrder?: boolean;
    },
    userId: string,
  ): PromotionCartContext {
    const items = dto.items.map((it) => ({
      productVariantId: it.productVariantId,
      productId: it.productId,
      categoryId: it.categoryId,
      brandId: it.brandId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineSubtotal: it.unitPrice * it.quantity,
    }));
    return {
      userId,
      isFirstOrder: dto.isFirstOrder,
      currency: 'VND',
      items,
      shippingFee: dto.shippingFee ?? 0,
      subtotal: items.reduce((s, it) => s + it.lineSubtotal, 0),
    };
  }

  private mapToApplyResponse(result: ApplyPromotionResult): ApplyPromotionResponseDto {
    return {
      orderDiscount: result.orderDiscount,
      shippingDiscount: result.shippingDiscount,
      finalSubtotal: result.finalSubtotal,
      finalShippingFee: result.finalShippingFee,
      warnings: result.warnings,
      evaluations: result.evaluations.map((e) => ({
        promotionId: e.promotionId,
        type: e.type,
        status: e.status,
        reason: e.reason,
        discountAmount: e.discountAmount,
        lines: e.lines.map((l) => ({
          productVariantId: l.productVariantId,
          discountPerUnit: l.discountPerUnit,
          discountTotal: l.discountTotal,
          applied: l.applied,
          reason: l.reason,
        })),
      })),
      voucher: result.voucher
        ? {
            valid: result.voucher.valid,
            reason: result.voucher.reason,
            voucherId: result.voucher.voucherId,
            promotionId: result.voucher.promotionId,
            discountAmount: result.voucher.discountAmount,
            discountType: result.voucher.discountType,
            isFreeShipping: result.voucher.isFreeShipping,
          }
        : null,
    };
  }

  private parsePagination(
    pageStr: string | undefined,
    limitStr: string | undefined,
  ): { page: number; limit: number } {
    const page = Math.max(
      1,
      parseInt(String(pageStr ?? '1'), 10) || PROMOTION_LIMITS.DEFAULT_PAGE,
    );
    const limit = Math.min(
      PROMOTION_LIMITS.MAX_LIMIT,
      Math.max(
        1,
        parseInt(String(limitStr ?? '20'), 10) || PROMOTION_LIMITS.DEFAULT_LIMIT,
      ),
    );
    return { page, limit };
  }

  private d2n(d: any): number {
    if (d === null || d === undefined) return 0;
    if (typeof d === 'number') return d;
    return d.toNumber?.() ?? 0;
  }

  /* ---------- Mappers ---------- */

  private toResponse(p: any): PromotionResponseDto {
    return {
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      type: p.type,
      scope: p.scope,
      status: p.status,
      discountValue: this.d2n(p.discountValue),
      minimumOrderValue: this.d2n(p.minimumOrderValue),
      maximumDiscount: p.maximumDiscount == null ? null : this.d2n(p.maximumDiscount),
      startAt: p.startAt?.toISOString?.() ?? new Date(0).toISOString(),
      endAt: p.endAt?.toISOString?.() ?? new Date(0).toISOString(),
      priority: p.priority,
      stackable: p.stackable,
      usageLimitType: p.usageLimitType,
      usageLimit: p.usageLimit ?? null,
      perUserLimit: p.perUserLimit ?? null,
      usedCount: p.usedCount,
      isFreeShipping: p.isFreeShipping,
      flashSaleStock: p.flashSaleStock ?? null,
      flashSaleSold: p.flashSaleSold ?? 0,
      bannerMediaUrl: p.bannerMediaUrl ?? null,
      productVariantIds: (p.productTargets ?? []).map((t: any) => t.productVariantId),
      categoryIds: (p.categoryTargets ?? []).map((t: any) => t.categoryId),
      brandIds: (p.brandTargets ?? []).map((t: any) => t.brandId),
      createdAt: p.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      updatedAt: p.updatedAt?.toISOString?.() ?? new Date(0).toISOString(),
    };
  }

  private toSummary(p: any): PromotionSummaryDto {
    return {
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      type: p.type,
      status: p.status,
      discountValue: this.d2n(p.discountValue),
      maximumDiscount: p.maximumDiscount == null ? null : this.d2n(p.maximumDiscount),
      startAt: p.startAt?.toISOString?.() ?? new Date(0).toISOString(),
      endAt: p.endAt?.toISOString?.() ?? new Date(0).toISOString(),
      bannerMediaUrl: p.bannerMediaUrl ?? null,
    };
  }

  private toVoucherResponse(v: any): VoucherResponseDto {
    return {
      id: v.id,
      promotionId: v.promotionId,
      code: v.code,
      type: v.type,
      status: v.status,
      usageLimitType: v.usageLimitType,
      usageLimit: v.usageLimit ?? null,
      perUserLimit: v.perUserLimit ?? null,
      usedCount: v.usedCount,
      expiresAt: v.expiresAt?.toISOString?.() ?? new Date(0).toISOString(),
      firstOrderOnly: v.firstOrderOnly,
      promotion: v.promotion ? this.toSummary(v.promotion) : null,
    };
  }
}
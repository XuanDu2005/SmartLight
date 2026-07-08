/**
 * PromotionsRepository \u2014 only DB access for the promotion bounded context.
 *
 * Key concurrency design:
 *   - usedCount increments are done atomically via raw SQL with WHERE
 *     constraints to prevent over-usage.
 *   - Flash sale stock decrement also uses raw SQL with WHERE stock > 0.
 *   - All multi-step mutations (voucher creation + audit log) run inside
 *     `withTransaction`.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  Promotion,
  PromotionStatus,
  Voucher,
} from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';

import type {
  ListPromotionsFilter,
  PromotionCreateInput,
  PromotionWithTargets,
  VoucherCreateInput,
  VoucherWithPromotion,
} from '../interfaces/promotion.interfaces';

@Injectable()
export class PromotionsRepository {
  private readonly logger = new Logger(PromotionsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 20_000,
    });
  }

  /* ============================================================== */
  /*  Promotion lookups                                              */
  /* ============================================================== */

  async findById(id: string): Promise<PromotionWithTargets | null> {
    return this.prisma.promotion.findFirst({
      where: { id },
      include: this.fullTargetsInclude(),
    });
  }

  async findActiveById(id: string): Promise<PromotionWithTargets | null> {
    return this.prisma.promotion.findFirst({
      where: { id, status: 'ACTIVE' },
      include: this.fullTargetsInclude(),
    });
  }

  async findActiveAutoApply(): Promise<PromotionWithTargets[]> {
    return this.prisma.promotion.findMany({
      where: {
        status: 'ACTIVE',
        endAt: { gte: new Date() },
      },
      include: this.fullTargetsInclude(),
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findAutoApplyVouchers(): Promise<VoucherWithPromotion[]> {
    return this.prisma.voucher.findMany({
      where: {
        type: 'AUTO_APPLY',
        status: 'ACTIVE',
        expiresAt: { gte: new Date() },
      },
      include: {
        promotion: {
          include: {
            productTargets: true,
            categoryTargets: true,
            brandTargets: true,
          },
        },
      },
    });
  }

  /* ============================================================== */
  /*  Voucher lookups                                                */
  /* ============================================================== */

  async findVoucherByCode(code: string): Promise<VoucherWithPromotion | null> {
    return this.prisma.voucher.findFirst({
      where: { code },
      include: {
        promotion: {
          include: {
            productTargets: true,
            categoryTargets: true,
            brandTargets: true,
          },
        },
      },
    });
  }

  async findVoucherById(id: string): Promise<Voucher | null> {
    return this.prisma.voucher.findFirst({ where: { id } });
  }

  async findVouchersByPromotionId(promotionId: string) {
    return this.prisma.voucher.findMany({
      where: { promotionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countVoucherUsageByUser(
    voucherId: string,
    userId: string,
  ): Promise<number> {
    return this.prisma.voucherUsage.count({
      where: { voucherId, userId },
    });
  }

  async countPromotionUsageByUser(
    promotionId: string,
    userId: string,
  ): Promise<number> {
    return this.prisma.voucherUsage.count({
      where: { promotionId, userId },
    });
  }

  /* ============================================================== */
  /*  Promotion mutations                                            */
  /* ============================================================== */

  async createPromotion(
    input: PromotionCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Promotion> {
    const client = tx ?? this.prisma;
    return client.promotion.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        scope: input.scope ?? 'ORDER',
        discountValue: input.discountValue as any,
        minimumOrderValue: (input.minimumOrderValue ?? 0) as any,
        maximumDiscount: input.maximumDiscount == null ? null : (input.maximumDiscount as any),
        startAt: input.startAt,
        endAt: input.endAt,
        priority: input.priority ?? 0,
        stackable: input.stackable ?? false,
        usageLimitType: input.usageLimitType ?? 'TOTAL',
        usageLimit: input.usageLimit ?? null,
        perUserLimit: input.perUserLimit ?? null,
        isFreeShipping: input.isFreeShipping ?? false,
        flashSaleStock: input.flashSaleStock ?? null,
        bannerMediaUrl: input.bannerMediaUrl ?? null,
        metadataJson: (input.metadata as any) ?? Prisma.JsonNull ?? {},
      },
    });
  }

  async updatePromotion(
    id: string,
    patch: {
      name?: string;
      description?: string | null;
      discountValue?: Prisma.Decimal | number;
      minimumOrderValue?: Prisma.Decimal | number;
      maximumDiscount?: Prisma.Decimal | number | null;
      endAt?: Date;
      priority?: number;
      stackable?: boolean;
      usageLimit?: number | null;
      perUserLimit?: number | null;
      bannerMediaUrl?: string | null;
      status?: PromotionStatus;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Promotion> {
    const client = tx ?? this.prisma;
    const data: Prisma.PromotionUpdateInput = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.discountValue !== undefined)
      data.discountValue = patch.discountValue as any;
    if (patch.minimumOrderValue !== undefined)
      data.minimumOrderValue = patch.minimumOrderValue as any;
    if (patch.maximumDiscount !== undefined)
      data.maximumDiscount = patch.maximumDiscount == null ? null : (patch.maximumDiscount as any);
    if (patch.endAt !== undefined) data.endAt = patch.endAt;
    if (patch.priority !== undefined) data.priority = patch.priority;
    if (patch.stackable !== undefined) data.stackable = patch.stackable;
    if (patch.usageLimit !== undefined) data.usageLimit = patch.usageLimit;
    if (patch.perUserLimit !== undefined)
      data.perUserLimit = patch.perUserLimit;
    if (patch.bannerMediaUrl !== undefined)
      data.bannerMediaUrl = patch.bannerMediaUrl;
    if (patch.status !== undefined) data.status = patch.status;
    return client.promotion.update({ where: { id }, data });
  }

  async setPromotionStatus(
    id: string,
    status: PromotionStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<Promotion> {
    const client = tx ?? this.prisma;
    const data: Prisma.PromotionUpdateInput = { status };
    if (status === 'ARCHIVED') data.archivedAt = new Date();
    return client.promotion.update({ where: { id }, data });
  }

  async softDeletePromotion(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.promotion.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });
  }

  /* ============================================================== */
  /*  Targets (product/category/brand)                              */
  /* ============================================================== */

  async addProductTargets(
    promotionId: string,
    variantIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (variantIds.length === 0) return;
    const client = tx ?? this.prisma;
    await client.promotionProduct.createMany({
      data: variantIds.map((id) => ({
        promotionId,
        productVariantId: id,
      })),
    });
  }

  async addCategoryTargets(
    promotionId: string,
    categoryIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (categoryIds.length === 0) return;
    const client = tx ?? this.prisma;
    await client.promotionCategory.createMany({
      data: categoryIds.map((id) => ({ promotionId, categoryId: id })),
    });
  }

  async addBrandTargets(
    promotionId: string,
    brandIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (brandIds.length === 0) return;
    const client = tx ?? this.prisma;
    await client.promotionBrand.createMany({
      data: brandIds.map((id) => ({ promotionId, brandId: id })),
    });
  }

  async clearTargets(
    promotionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await Promise.all([
      client.promotionProduct.deleteMany({ where: { promotionId } }),
      client.promotionCategory.deleteMany({ where: { promotionId } }),
      client.promotionBrand.deleteMany({ where: { promotionId } }),
    ]);
  }

  /* ============================================================== */
  /*  Voucher mutations                                              */
  /* ============================================================== */

  async createVoucher(
    input: VoucherCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Voucher> {
    const client = tx ?? this.prisma;
    return client.voucher.create({
      data: {
        promotionId: input.promotionId,
        code: input.code,
        type: input.type,
        usageLimitType: input.usageLimitType ?? 'TOTAL',
        usageLimit: input.usageLimit ?? null,
        perUserLimit: input.perUserLimit ?? null,
        expiresAt: input.expiresAt,
        firstOrderOnly: input.firstOrderOnly ?? false,
        metadataJson: (input.metadata as any) ?? Prisma.JsonNull ?? {},
      },
    });
  }

  async updateVoucher(
    id: string,
    patch: {
      usageLimit?: number | null;
      perUserLimit?: number | null;
      expiresAt?: Date;
      status?: PromotionStatus;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Voucher> {
    const client = tx ?? this.prisma;
    const data: Prisma.VoucherUpdateInput = {};
    if (patch.usageLimit !== undefined) data.usageLimit = patch.usageLimit;
    if (patch.perUserLimit !== undefined) data.perUserLimit = patch.perUserLimit;
    if (patch.expiresAt !== undefined) data.expiresAt = patch.expiresAt;
    if (patch.status !== undefined) data.status = patch.status;
    return client.voucher.update({ where: { id }, data });
  }

  async deleteVoucher(id: string): Promise<void> {
    await this.prisma.voucher.delete({ where: { id } });
  }

  /* ============================================================== */
  /*  Atomic usage counters (concurrency-safe)                      */
  /* ============================================================== */

  /**
   * Atomically increment promotion usedCount by 1, only if:
   *   - usageLimitType = TOTAL: usedCount < usageLimit
   *   - usageLimitType = UNLIMITED: always
   * Returns the new usedCount, or -1 if limit reached.
   */
  async incrementPromotionUsage(
    promotionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const row = await client.$queryRaw<{ used_count: number }[]>`
      UPDATE "promotion"
      SET "used_count" = "used_count" + 1,
          "updated_at" = NOW()
      WHERE "id" = ${promotionId}
        AND (
          "usage_limit_type" = 'UNLIMITED'
          OR "usage_limit" IS NULL
          OR "used_count" < "usage_limit"
        )
      RETURNING "used_count"
    `;
    return row[0]?.used_count ?? -1;
  }

  async decrementPromotionUsage(
    promotionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const row = await client.$queryRaw<{ used_count: number }[]>`
      UPDATE "promotion"
      SET "used_count" = GREATEST("used_count" - 1, 0),
          "updated_at" = NOW()
      WHERE "id" = ${promotionId}
      RETURNING "used_count"
    `;
    return row[0]?.used_count ?? 0;
  }

  /**
   * Atomically increment voucher usedCount by 1.
   * Returns new usedCount, or -1 if limit reached.
   */
  async incrementVoucherUsage(
    voucherId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const row = await client.$queryRaw<{ used_count: number }[]>`
      UPDATE "voucher"
      SET "used_count" = "used_count" + 1,
          "updated_at" = NOW()
      WHERE "id" = ${voucherId}
        AND (
          "usage_limit_type" = 'UNLIMITED'
          OR "usage_limit" IS NULL
          OR "used_count" < "usage_limit"
        )
      RETURNING "used_count"
    `;
    return row[0]?.used_count ?? -1;
  }

  async decrementVoucherUsage(
    voucherId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const row = await client.$queryRaw<{ used_count: number }[]>`
      UPDATE "voucher"
      SET "used_count" = GREATEST("used_count" - 1, 0),
          "updated_at" = NOW()
      WHERE "id" = ${voucherId}
      RETURNING "used_count"
    `;
    return row[0]?.used_count ?? 0;
  }

  /**
   * Atomically decrement flash-sale stock.
   * Returns new sold_count, or -1 if out of stock.
   */
  async decrementFlashSaleStock(
    promotionId: string,
    qty: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const row = await client.$queryRaw<{ flash_sale_sold: number }[]>`
      UPDATE "promotion"
      SET "flash_sale_sold" = "flash_sale_sold" + ${qty},
          "updated_at" = NOW()
      WHERE "id" = ${promotionId}
        AND "flash_sale_stock" IS NOT NULL
        AND ("flash_sale_sold" + ${qty}) <= "flash_sale_stock"
      RETURNING "flash_sale_sold"
    `;
    return row[0]?.flash_sale_sold ?? -1;
  }

  /* ============================================================== */
  /*  Voucher usage recording                                        */
  /* ============================================================== */

  async recordUsage(args: {
    voucherId: string;
    userId: string;
    orderId: string;
    promotionId: string;
    discountAmount: Prisma.Decimal | number;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const client = args.tx ?? this.prisma;
    await client.voucherUsage.create({
      data: {
        voucherId: args.voucherId,
        userId: args.userId,
        orderId: args.orderId,
        promotionId: args.promotionId,
        discountAmount: args.discountAmount as any,
      },
    });
  }

  /* ============================================================== */
  /*  Audit log (append-only)                                        */
  /* ============================================================== */

  async writeAuditLog(args: {
    promotionId: string;
    action: string;
    payload?: Record<string, unknown>;
    actorType?: string;
    actorId?: string | null;
    actorName?: string | null;
  }, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.promotionAuditLog.create({
      data: {
        promotionId: args.promotionId,
        action: args.action,
        payloadJson: (args.payload as any) ?? Prisma.JsonNull ?? {},
        actorType: args.actorType ?? 'ADMIN_USER',
        actorId: args.actorId ?? null,
        actorName: args.actorName ?? null,
      },
    });
  }

  /* ============================================================== */
  /*  Listing                                                        */
  /* ============================================================== */

  async listPromotions(filter: ListPromotionsFilter) {
    const { status, type, page, limit } = filter;
    const skip = (page - 1) * limit;
    const where: Prisma.PromotionWhereInput = {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.promotion.findMany({
        where,
        include: this.fullTargetsInclude(),
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.promotion.count({ where }),
    ]);
    return { items, total };
  }

  async listActiveFlashSales() {
    return this.prisma.promotion.findMany({
      where: {
        type: 'FLASH_SALE',
        status: 'ACTIVE',
        startAt: { lte: new Date() },
        endAt: { gte: new Date() },
      },
      include: this.fullTargetsInclude(),
      orderBy: { endAt: 'asc' },
    });
  }

  async listVouchers(promotionId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.VoucherWhereInput = promotionId ? { promotionId } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.voucher.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.voucher.count({ where }),
    ]);
    return { items, total };
  }

  /* ============================================================== */
  /*  Helpers                                                        */
  /* ============================================================== */

  private fullTargetsInclude() {
    return {
      productTargets: true,
      categoryTargets: true,
      brandTargets: true,
      vouchers: true,
    } as const;
  }
}
/**
 * InventoryRepository \u2014 only DB access for the inventory bounded context.
 *
 * The service enforces all business rules. This layer provides:
 *   - typed lookups
 *   - atomic raw-SQL mutations for concurrency safety
 *   - transactional helpers
 *
 * Key concurrency design:
 *   All mutation methods that affect stock levels use raw UPDATE ... WHERE
 *   with the appropriate constraint (e.g. WHERE available >= :qty). The
 *   returned row-count tells the caller whether the operation succeeded.
 *   This gives us row-level locking without explicit locks.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  InventoryAdjustmentReason,
  Prisma,
  StockMovement,
  StockMovementType,
} from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';

import type {
  InventoryWithMovements,
  InventoryWithVariant,
} from '../interfaces/inventory.interfaces';

@Injectable()
export class InventoryRepository {
  private readonly logger = new Logger(InventoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn, {
      isolationLevel: 'ReadCommitted',
      timeout: 20_000,
    });
  }

  /* ============================================================== */
  /*  Lookups                                                       */
  /* ============================================================== */

  async findByVariantId(
    variantId: string,
    warehouseCode = 'MAIN',
  ): Promise<InventoryWithVariant | null> {
    return this.prisma.inventory.findFirst({
      where: { productVariantId: variantId, warehouseCode },
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(id: string): Promise<InventoryWithVariant | null> {
    return this.prisma.inventory.findFirst({
      where: { id },
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });
  }

  async findWithMovements(
    variantId: string,
    warehouseCode = 'MAIN',
  ): Promise<InventoryWithMovements | null> {
    return this.prisma.inventory.findFirst({
      where: { productVariantId: variantId, warehouseCode },
      include: {
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        variant: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });
  }

  async existsForVariant(variantId: string): Promise<boolean> {
    const count = await this.prisma.inventory.count({
      where: { productVariantId: variantId },
    });
    return count > 0;
  }

  /* ============================================================== */
  /*  Inventory creation                                            */
  /* ============================================================== */

  async createInventory(
    data: {
      productVariantId: string;
      warehouseCode?: string;
      onHand?: number;
      reserved?: number;
      lowStockThreshold?: number;
      allowBackorder?: boolean;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string; productVariantId: string }> {
    const client = tx ?? this.prisma;
    return client.inventory.create({
      data: {
        productVariantId: data.productVariantId,
        warehouseCode: data.warehouseCode ?? 'MAIN',
        onHand: data.onHand ?? 0,
        reserved: data.reserved ?? 0,
        available: (data.onHand ?? 0) - (data.reserved ?? 0),
        lowStockThreshold: data.lowStockThreshold ?? 5,
        allowBackorder: data.allowBackorder ?? false,
      },
      select: { id: true, productVariantId: true },
    });
  }

  /* ============================================================== */
  /*  Atomic stock operations (raw SQL for row-level locking)      */
  /* ============================================================== */

  /**
   * Reserve stock: increment `reserved`, decrement `available`.
   * Returns the number of rows updated (0 = insufficient stock).
   */
  async reserveStock(
    inventoryId: string,
    quantity: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const result = await client.$executeRaw<number>`
      UPDATE "inventory"
      SET
        "reserved"  = "reserved"  + ${quantity},
        "available" = "available" - ${quantity},
        "updated_at" = NOW()
      WHERE "id" = ${inventoryId}
        AND "available" >= ${quantity}
    `;
    return Number(result);
  }

  /**
   * Release reservation: decrement `reserved`, increment `available`.
   * Safe: reserved won't go below 0.
   */
  async releaseStock(
    inventoryId: string,
    quantity: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const result = await client.$executeRaw<number>`
      UPDATE "inventory"
      SET
        "reserved"  = GREATEST("reserved" - ${quantity}, 0),
        "available" = LEAST("available" + ${quantity}, "on_hand"),
        "updated_at" = NOW()
      WHERE "id" = ${inventoryId}
    `;
    return Number(result);
  }

  /**
   * Confirm sale: decrement `on_hand` and `reserved` (items were already reserved).
   * Called when an order is paid.
   */
  async confirmSale(
    inventoryId: string,
    quantity: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const result = await client.$executeRaw<number>`
      UPDATE "inventory"
      SET
        "on_hand"   = "on_hand"   - ${quantity},
        "reserved"  = GREATEST("reserved" - ${quantity}, 0),
        "available" = "available" - ${quantity},
        "updated_at" = NOW()
      WHERE "id" = ${inventoryId}
        AND "on_hand" >= ${quantity}
        AND "reserved" >= ${quantity}
    `;
    return Number(result);
  }

  /**
   * Restore stock (return or cancellation refund): increment `on_hand` and `available`.
   */
  async restoreStock(
    inventoryId: string,
    quantity: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const result = await client.$executeRaw<number>`
      UPDATE "inventory"
      SET
        "on_hand"   = "on_hand"   + ${quantity},
        "available" = "available" + ${quantity},
        "updated_at" = NOW()
      WHERE "id" = ${inventoryId}
    `;
    return Number(result);
  }

  /**
   * Atomic stock adjustment (positive or negative delta).
   * Prevents on_hand going below 0.
   */
  async adjustStock(
    inventoryId: string,
    delta: number,
    tx?: Prisma.TransactionClient,
  ): Promise<{ success: boolean; onHandAfter: number }> {
    const client = tx ?? this.prisma;

    if (delta >= 0) {
      const result = await client.$executeRaw<number>`
        UPDATE "inventory"
        SET
          "on_hand"   = "on_hand"   + ${delta},
          "available" = "available" + ${delta},
          "updated_at" = NOW()
        WHERE "id" = ${inventoryId}
      `;
      const updated = await this.fetchOnHand(inventoryId, client);
      return { success: Number(result) > 0, onHandAfter: updated };
    } else {
      const absDelta = Math.abs(delta);
      const result = await client.$executeRaw<number>`
        UPDATE "inventory"
        SET
          "on_hand"   = "on_hand"   - ${absDelta},
          "available" = "available" - ${absDelta},
          "updated_at" = NOW()
        WHERE "id" = ${inventoryId}
          AND "on_hand" >= ${absDelta}
      `;
      const updated = await this.fetchOnHand(inventoryId, client);
      return { success: Number(result) > 0, onHandAfter: updated };
    }
  }

  private async fetchOnHand(
    inventoryId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const row = await tx.$queryRaw<{ on_hand: number }[]>`
      SELECT "on_hand" FROM "inventory" WHERE "id" = ${inventoryId}
    `;
    return row[0]?.on_hand ?? 0;
  }

  /* ============================================================== */
  /*  Stock movements (append-only)                                 */
  /* ============================================================== */

  async createMovement(
    data: {
      inventoryId: string;
      productVariantId: string;
      type: StockMovementType;
      quantity: number;
      onHandAfter: number;
      reservedAfter?: number;
      reason?: string | null;
      referenceType?: string | null;
      referenceId?: string | null;
      createdByType?: 'USER' | 'ADMIN_USER' | 'SYSTEM' | 'WEBHOOK' | 'ANONYMOUS';
      createdById?: string | null;
      metadata?: Record<string, unknown>;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<StockMovement> {
    const client = tx ?? this.prisma;
    return client.stockMovement.create({
      data: {
        inventoryId: data.inventoryId,
        productVariantId: data.productVariantId,
        type: data.type,
        quantity: data.quantity,
        onHandAfter: data.onHandAfter,
        reservedAfter: data.reservedAfter ?? 0,
        reason: data.reason ?? undefined,
        referenceType: data.referenceType ?? undefined,
        referenceId: data.referenceId ?? undefined,
        createdByType: data.createdByType ?? 'SYSTEM',
        createdById: data.createdById ?? undefined,
        metadataJson: (data.metadata as any) ?? Prisma.JsonNull ?? {},
      },
    });
  }

  /* ============================================================== */
  /*  Inventory adjustments                                        */
  /* ============================================================== */

  async createAdjustment(
    data: {
      inventoryId: string;
      productVariantId: string;
      quantityDelta: number;
      onHandAfter: number;
      reason: InventoryAdjustmentReason;
      note?: string | null;
      referenceType?: string | null;
      referenceId?: string | null;
      createdById?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Prisma.InventoryAdjustmentGetPayload<{}>> {
    const client = tx ?? this.prisma;
    return client.inventoryAdjustment.create({
      data: {
        inventoryId: data.inventoryId,
        productVariantId: data.productVariantId,
        quantityDelta: data.quantityDelta,
        onHandAfter: data.onHandAfter,
        reason: data.reason,
        note: data.note ?? undefined,
        referenceType: data.referenceType ?? undefined,
        referenceId: data.referenceId ?? undefined,
        createdById: data.createdById ?? undefined,
      },
    });
  }

  /* ============================================================== */
  /*  Low stock                                                   */
  /* ============================================================== */

  async findLowStock(limit = 50) {
    return this.prisma.inventory.findMany({
      where: {
        available: { lte: this.prisma.inventory.fields.lowStockThreshold },
      },
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { available: 'asc' },
      take: limit,
    });
  }

  /* ============================================================== */
  /*  Listing                                                     */
  /* ============================================================== */

  async listInventory(filter: {
    warehouseCode?: string;
    status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'all';
    search?: string;
    page: number;
    limit: number;
  }) {
    const { warehouseCode, status, search, page, limit } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryWhereInput = {
      ...(warehouseCode ? { warehouseCode } : {}),
    };

    if (status === 'out_of_stock') {
      where.available = 0;
    } else if (status === 'low_stock') {
      // available > 0 AND available <= low_stock_threshold
      // We can't easily express "column <= column" in Prisma's typed where
      // filter, so we fetch candidate low-stock records and let the service
      // refine. To keep the query path straightforward we approximate with
      // `available <= 50` and let downstream filter refine.
      where.AND = [
        { available: { gt: 0 } },
        { available: { lte: 50 } },
      ];
    } else if (status === 'in_stock') {
      where.available = { gt: 0 };
    }

    if (search) {
      where.variant = {
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventory.findMany({
        where,
        include: {
          variant: {
            include: {
              product: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return { items, total };
  }

  async listMovements(filter: {
    productVariantId?: string;
    inventoryId?: string;
    type?: string;
    referenceType?: string;
    page: number;
    limit: number;
  }) {
    const { productVariantId, inventoryId, type, referenceType, page, limit } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {
      ...(productVariantId ? { productVariantId } : {}),
      ...(inventoryId ? { inventoryId } : {}),
      ...(type ? { type: type as StockMovementType } : {}),
      ...(referenceType ? { referenceType } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { items, total };
  }
}

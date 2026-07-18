/**
 * InventoryService \u2014 all inventory business logic.
 *
 * Internal Service Contract exposed to other bounded contexts:
 *   - checkout: reserveStock(), releaseStock()
 *   - orders: confirmSale(), restoreStock()
 *   - catalog: getAvailability()
 *
 * Admin operations exposed via HTTP:
 *   - create inventory record
 *   - import stock
 *   - manual adjustment
 *   - list / detail / movements / low-stock
 *
 * Key concurrency design:
 *   All stock mutations use raw SQL with WHERE constraints to atomically
 *   verify preconditions (e.g. "WHERE available >= qty"). The returned row-count
 *   tells us whether the operation succeeded. No explicit locking needed.
 *
 * BR-INV-001: available stock cannot be negative
 * BR-INV-002: reserved cannot exceed available
 * BR-INV-003: every stock change creates StockMovement
 * BR-INV-004: stock history is append-only (no update/delete)
 * BR-INV-005: all operations are transactional
 * BR-INV-006: each product variant owns its inventory record
 */
import { Injectable, Logger } from '@nestjs/common';
import { InventoryAdjustmentReason, StockMovementType } from '@prisma/client';

import { InventoryRepository } from './repositories/inventory.repository';
import {
  ACTOR_TYPES,
  INVENTORY_LIMITS,
  REFERENCE_TYPES,
} from './constants/inventory.constants';
import {
  AdjustmentRequiresReasonException,
  InsufficientStockException,
  InventoryNotFoundException,
  ProductVariantNotFoundException,
  ReservationExpiredException,
  StockNegativePreventedException,
  StockReservationFailedException,
  VariantAlreadyHasInventoryException,
} from './exceptions/inventory.exceptions';

import type {
  ListInventoryQueryDto,
  ListMovementsQueryDto,
  CreateInventoryDto,
  StockAdjustmentDto,
  ImportStockDto,
  BulkAdjustmentDto,
  UpdateLowStockThresholdDto,
} from './dto/create-stock.dto';
import type {
  InventoryAdjustmentResponseDto,
  InventoryAvailabilityDto,
  InventoryCreateResponseDto,
  InventoryListResponseDto,
  InventoryStockDto,
  LowStockListResponseDto,
  StockMovementListResponseDto,
} from './dto/inventory-response.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly repo: InventoryRepository) {}

  /* ============================================================== */
  /*  Internal service contract \u2014 called by other modules       */
  /* ============================================================== */

  /**
   * Check if a variant has available stock.
   * Called by catalog for public availability endpoints.
   */
  async getAvailability(variantId: string): Promise<InventoryAvailabilityDto> {
    const inv = await this.repo.findByVariantId(variantId);
    if (!inv) {
      return {
        variantId,
        sku: '',
        inStock: false,
        availableQuantity: 0,
        stockOnHand: 0,
        stockReserved: 0,
        lowStock: true,
        maxQuantityPerOrder: 0,
      };
    }
    const { available, onHand, reserved } = inv;
    const lowStock = available <= inv.lowStockThreshold;
    return {
      variantId,
      sku: inv.variant?.sku ?? '',
      inStock: available > 0,
      availableQuantity: available,
      stockOnHand: onHand,
      stockReserved: reserved,
      lowStock,
      maxQuantityPerOrder: available > 0 ? available : 0,
    };
  }

  /**
   * Reserve stock for a checkout.
   * Called by CheckoutModule when customer proceeds to checkout.
   *
   * Atomic: validates available >= quantity, then increments reserved, decrements available.
   * Returns whether reservation succeeded.
   *
   * BR-INV-001: available cannot go negative
   * BR-INV-002: reserved cannot exceed available
   */
  async reserveStock(args: {
    variantId: string;
    quantity: number;
    referenceType: 'CHECKOUT' | 'ORDER';
    referenceId: string;
    actorId?: string;
  }): Promise<{ success: boolean; availableAfter: number }> {
    const { variantId, quantity, referenceType, referenceId, actorId } = args;

    if (quantity <= 0) {
      return { success: false, availableAfter: 0 };
    }

    return this.repo.withTransaction(async (tx) => {
      // Load inventory record
      const inv = await tx.inventory.findFirst({
        where: { productVariantId: variantId },
      });
      if (!inv) {
        throw new InventoryNotFoundException(variantId);
      }

      // Atomic reserve: available >= quantity required
      const updated = await this.repo.reserveStock(inv.id, quantity, tx);
      if (updated === 0) {
        // Re-fetch for the response
        const current = await tx.inventory.findUnique({
          where: { id: inv.id },
          select: { available: true },
        });
        return {
          success: false,
          availableAfter: current?.available ?? 0,
        };
      }

      // Re-fetch post-update state for movement record
      const after = await tx.inventory.findUnique({
        where: { id: inv.id },
        select: { onHand: true, reserved: true, available: true },
      });

      // Record movement
      await this.repo.createMovement(
        {
          inventoryId: inv.id,
          productVariantId: variantId,
          type: 'RESERVATION',
          quantity: -quantity,
          onHandAfter: after?.onHand ?? 0,
          reservedAfter: after?.reserved ?? 0,
          reason: `Reserved for ${referenceType.toLowerCase()} ${referenceId}`,
          referenceType,
          referenceId,
          createdByType: actorId ? 'USER' : 'SYSTEM',
          createdById: actorId,
        },
        tx,
      );

      this.logger.log(
        `Stock reserved: variant=${variantId} qty=${quantity} ref=${referenceType}:${referenceId}`,
      );

      return {
        success: true,
        availableAfter: after?.available ?? 0,
      };
    });
  }

  /**
   * Release a previously-made stock reservation.
   * Called by CheckoutModule on session expiry or cancellation,
   * and by OrdersModule on order cancellation.
   */
  async releaseStock(args: {
    variantId: string;
    quantity: number;
    reason: 'checkout_expired' | 'checkout_cancelled' | 'order_cancelled';
    referenceId: string;
    actorId?: string;
  }): Promise<{ success: boolean }> {
    const { variantId, quantity, reason, referenceId, actorId } = args;

    if (quantity <= 0) return { success: true };

    return this.repo.withTransaction(async (tx) => {
      const inv = await tx.inventory.findFirst({
        where: { productVariantId: variantId },
      });
      if (!inv) {
        // Nothing to release
        return { success: true };
      }

      await this.repo.releaseStock(inv.id, quantity, tx);

      const after = await tx.inventory.findUnique({
        where: { id: inv.id },
        select: { onHand: true, reserved: true, available: true },
      });

      await this.repo.createMovement(
        {
          inventoryId: inv.id,
          productVariantId: variantId,
          type: 'RELEASE',
          quantity: quantity,
          onHandAfter: after?.onHand ?? 0,
          reservedAfter: after?.reserved ?? 0,
          reason: `Released: ${reason} (ref: ${referenceId})`,
          referenceType: REFERENCE_TYPES.ORDER,
          referenceId,
          createdByType: 'SYSTEM',
          createdById: actorId,
        },
        tx,
      );

      this.logger.log(
        `Stock released: variant=${variantId} qty=${quantity} reason=${reason}`,
      );

      return { success: true };
    });
  }

  /**
   * Confirm sale: decrement on_hand and reserved.
   * Called by OrdersModule when payment succeeds.
   *
   * BR-INV-003: creates SALE movement
   */
  async confirmSale(args: {
    variantId: string;
    quantity: number;
    orderId: string;
    actorId?: string;
  }): Promise<{ success: boolean }> {
    const { variantId, quantity, orderId, actorId } = args;

    if (quantity <= 0) return { success: true };

    return this.repo.withTransaction(async (tx) => {
      const inv = await tx.inventory.findFirst({
        where: { productVariantId: variantId },
      });
      if (!inv) {
        throw new InventoryNotFoundException(variantId);
      }

      const updated = await this.repo.confirmSale(inv.id, quantity, tx);
      if (updated === 0) {
        throw new InsufficientStockException(
          variantId,
          quantity,
          inv.onHand,
        );
      }

      const after = await tx.inventory.findUnique({
        where: { id: inv.id },
        select: { onHand: true, reserved: true, available: true },
      });

      await this.repo.createMovement(
        {
          inventoryId: inv.id,
          productVariantId: variantId,
          type: 'SALE',
          quantity: -quantity,
          onHandAfter: after?.onHand ?? 0,
          reservedAfter: after?.reserved ?? 0,
          reason: `Sale confirmed for order ${orderId}`,
          referenceType: REFERENCE_TYPES.ORDER,
          referenceId: orderId,
          createdByType: 'SYSTEM',
          createdById: actorId,
        },
        tx,
      );

      this.logger.log(
        `Sale confirmed: variant=${variantId} qty=${quantity} order=${orderId}`,
      );

      return { success: true };
    });
  }

  /**
   * Restore stock (return or cancellation refund).
   * Called by OrdersModule when an order is cancelled or a return is accepted.
   */
  async restoreStock(args: {
    variantId: string;
    quantity: number;
    reason: 'return_received' | 'order_cancelled';
    referenceId: string;
    actorId?: string;
  }): Promise<{ success: boolean }> {
    const { variantId, quantity, reason, referenceId, actorId } = args;

    if (quantity <= 0) return { success: true };

    return this.repo.withTransaction(async (tx) => {
      const inv = await tx.inventory.findFirst({
        where: { productVariantId: variantId },
      });
      if (!inv) {
        throw new InventoryNotFoundException(variantId);
      }

      await this.repo.restoreStock(inv.id, quantity, tx);

      const after = await tx.inventory.findUnique({
        where: { id: inv.id },
        select: { onHand: true, reserved: true, available: true },
      });

      await this.repo.createMovement(
        {
          inventoryId: inv.id,
          productVariantId: variantId,
          type: 'RETURN',
          quantity: quantity,
          onHandAfter: after?.onHand ?? 0,
          reservedAfter: after?.reserved ?? 0,
          reason: `${reason} (ref: ${referenceId})`,
          referenceType: REFERENCE_TYPES.RETURN,
          referenceId,
          createdByType: actorId ? 'ADMIN_USER' : 'SYSTEM',
          createdById: actorId,
        },
        tx,
      );

      this.logger.log(
        `Stock restored: variant=${variantId} qty=${quantity} reason=${reason}`,
      );

      return { success: true };
    });
  }

  /* ============================================================== */
  /*  Admin: create inventory record                                */
  /* ============================================================== */

  async createInventory(
    dto: CreateInventoryDto,
    adminId?: string,
  ): Promise<InventoryCreateResponseDto> {
    const warehouseCode = dto.warehouseCode ?? INVENTORY_LIMITS.DEFAULT_WAREHOUSE_CODE;

    // Validate variant exists
    const variant = await this.repo.findByVariantId(dto.productVariantId, warehouseCode);
    if (!variant) {
      // Check if it exists in any warehouse
      const exists = await this.repo.existsForVariant(dto.productVariantId);
      if (exists) {
        throw new VariantAlreadyHasInventoryException(dto.productVariantId);
      }
    }

    const { id } = await this.repo.createInventory({
      productVariantId: dto.productVariantId,
      warehouseCode,
      onHand: dto.initialStock,
      reserved: dto.reserved ?? 0,
      lowStockThreshold: dto.lowStockThreshold ?? INVENTORY_LIMITS.DEFAULT_LOW_STOCK_THRESHOLD,
    });

    // Create initial IMPORT movement if non-zero stock
    if (dto.initialStock > 0) {
      await this.repo.createMovement({
        inventoryId: id,
        productVariantId: dto.productVariantId,
        type: 'IMPORT',
        quantity: dto.initialStock,
        onHandAfter: dto.initialStock,
        reservedAfter: dto.reserved ?? 0,
        reason: 'Initial stock',
        referenceType: REFERENCE_TYPES.MANUAL,
        referenceId: id,
        createdByType: adminId ? 'ADMIN_USER' : 'SYSTEM',
        createdById: adminId,
      });
    }

    const created = await this.repo.findByVariantId(dto.productVariantId, warehouseCode);
    return this.mapToStockDto(created!);
  }

  /* ============================================================== */
  /*  Admin: import stock (receive goods)                           */
  /* ============================================================== */

  async importStock(
    dto: ImportStockDto,
    adminId?: string,
  ): Promise<InventoryAdjustmentResponseDto> {
    if (!dto.productVariantId) {
      throw new Error('productVariantId is required');
    }
    if (!dto.quantity || dto.quantity < 1) {
      throw new Error('quantity must be at least 1');
    }
    const warehouseCode = dto.warehouseCode ?? INVENTORY_LIMITS.DEFAULT_WAREHOUSE_CODE;
    return await this.repo.withTransaction(async (tx) => {
      // Find or create inventory record
      let inv = await tx.inventory.findFirst({
        where: { productVariantId: dto.productVariantId, warehouseCode },
      });
      this.logger.debug(`Existing inventory: ${inv ? inv.id : 'null'}`);

      if (!inv) {
        const created = await this.repo.createInventory({
          productVariantId: dto.productVariantId,
          warehouseCode,
          onHand: dto.quantity,
          reserved: 0,
        }, tx);
        inv = await tx.inventory.findUnique({ where: { id: created.id } });
        this.logger.debug(`Created inventory: ${inv?.id}`);
      } else {
        // Atomic stock increase
        const result = await this.repo.adjustStock(inv.id, dto.quantity, tx);
        if (!result.success) {
          throw new StockReservationFailedException(
            dto.productVariantId,
            'import failed',
          );
        }
        inv = await tx.inventory.findUnique({ where: { id: inv.id } });
      }
      const previousOnHand = (inv?.onHand ?? 0) - dto.quantity;

      // Record movement
      const movement = await this.repo.createMovement(
        {
          inventoryId: inv!.id,
          productVariantId: dto.productVariantId,
          type: 'IMPORT',
          quantity: dto.quantity,
          onHandAfter: inv!.onHand,
          reservedAfter: inv!.reserved,
          reason: dto.note ?? 'Stock imported',
          referenceType: REFERENCE_TYPES.IMPORT,
          referenceId: inv!.id,
          createdByType: adminId ? 'ADMIN_USER' : 'SYSTEM',
          createdById: adminId,
        },
        tx,
      );

      this.logger.log(
        `Stock imported: variant=${dto.productVariantId} qty=${dto.quantity} by=${adminId ?? 'system'}`,
      );

      return {
        variantId: dto.productVariantId,
        previousOnHand,
        newOnHand: inv!.onHand,
        delta: dto.quantity,
        reason: dto.note ?? 'IMPORT',
        adjustmentId: movement.id,
        movementId: movement.id,
      };
    });
  }

  /* ============================================================== */
  /*  Admin: manual stock adjustment                                 */
  /* ============================================================== */

  async adjustStock(
    variantId: string,
    dto: StockAdjustmentDto,
    adminId?: string,
  ): Promise<InventoryAdjustmentResponseDto> {
    if (dto.delta === 0) {
      throw new InventoryNotFoundException(variantId);
    }

    return this.repo.withTransaction(async (tx) => {
      const inv = await tx.inventory.findFirst({
        where: { productVariantId: variantId },
      });
      if (!inv) {
        throw new InventoryNotFoundException(variantId);
      }

      // Check BR-INV-001: cannot make on_hand negative
      if (inv.onHand + dto.delta < 0) {
        throw new StockNegativePreventedException(variantId, inv.onHand, dto.delta);
      }

      const previousOnHand = inv.onHand;
      const result = await this.repo.adjustStock(inv.id, dto.delta, tx);

      if (!result.success) {
        throw new StockNegativePreventedException(
          variantId,
          inv.onHand,
          dto.delta,
        );
      }

      const afterInv = await tx.inventory.findUnique({
        where: { id: inv.id },
        select: { onHand: true, reserved: true, available: true },
      });

      // Record movement
      const movement = await this.repo.createMovement(
        {
          inventoryId: inv.id,
          productVariantId: variantId,
          type: dto.delta > 0 ? 'IMPORT' : 'EXPORT',
          quantity: dto.delta,
          onHandAfter: result.onHandAfter,
          reservedAfter: afterInv?.reserved ?? 0,
          reason: dto.note ?? dto.reason,
          referenceType: dto.referenceType ?? REFERENCE_TYPES.MANUAL,
          referenceId: dto.referenceId ?? inv.id,
          createdByType: adminId ? 'ADMIN_USER' : 'SYSTEM',
          createdById: adminId,
        },
        tx,
      );

      // Record adjustment audit record
      const adjustment = await this.repo.createAdjustment(
        {
          inventoryId: inv.id,
          productVariantId: variantId,
          quantityDelta: dto.delta,
          onHandAfter: result.onHandAfter,
          reason: dto.reason as InventoryAdjustmentReason,
          note: dto.note,
          referenceType: dto.referenceType ?? REFERENCE_TYPES.MANUAL,
          referenceId: dto.referenceId ?? inv.id,
          createdById: adminId,
        },
        tx,
      );

      this.logger.log(
        `Stock adjusted: variant=${variantId} delta=${dto.delta} reason=${dto.reason} by=${adminId ?? 'system'}`,
      );

      return {
        variantId,
        previousOnHand,
        newOnHand: result.onHandAfter,
        delta: dto.delta,
        reason: dto.reason,
        adjustmentId: adjustment.id,
        movementId: movement.id,
      };
    });
  }

  /* ============================================================== */
  /*  Admin: bulk adjustment                                          */
  /* ============================================================== */

  async bulkAdjust(
    dto: BulkAdjustmentDto,
    adminId?: string,
  ): Promise<{ processed: number; results: Array<{
    variantId: string;
    success: boolean;
    error?: string;
  }> }> {
    if (!dto.items || dto.items.length === 0) {
      return { processed: 0, results: [] };
    }

    const results: Array<{ variantId: string; success: boolean; error?: string }> = [];
    let processed = 0;

    for (const item of dto.items) {
      try {
        await this.adjustStock(item.productVariantId, {
          delta: item.delta,
          reason: dto.reason,
          note: dto.note,
        }, adminId);
        results.push({ variantId: item.productVariantId, success: true });
        processed++;
      } catch (err: any) {
        results.push({
          variantId: item.productVariantId,
          success: false,
          error: err?.message ?? String(err),
        });
      }
    }

    return { processed, results };
  }

  /* ============================================================== */
  /*  Admin: listing                                                */
  /* ============================================================== */

  async listInventory(
    query: ListInventoryQueryDto,
  ): Promise<InventoryListResponseDto> {
    const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || INVENTORY_LIMITS.DEFAULT_PAGE);
    const limit = Math.min(
      INVENTORY_LIMITS.MAX_LIMIT,
      Math.max(1, parseInt(String(query.limit ?? '20'), 10) || INVENTORY_LIMITS.DEFAULT_LIMIT),
    );

    const { items, total } = await this.repo.listInventory({
      warehouseCode: query.warehouseCode,
      status: query.status ?? 'all',
      search: query.search,
      page,
      limit,
    });

    return {
      items: items.map((row: any) => ({
        id: row.id,
        variantId: row.productVariantId,
        productVariantId: row.productVariantId,
        sku: row.variant?.sku ?? '',
        productName: row.variant?.product?.name ?? '',
        productSlug: row.variant?.product?.slug ?? '',
        warehouseCode: row.warehouseCode,
        onHand: row.onHand,
        reserved: row.reserved,
        available: row.available,
        lowStockThreshold: row.lowStockThreshold,
        lowStock: row.available <= row.lowStockThreshold,
        updatedAt: row.updatedAt?.toISOString?.() ?? new Date(0).toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async getInventoryByVariant(
    variantId: string,
  ): Promise<InventoryStockDto> {
    const inv = await this.repo.findByVariantId(variantId);
    if (!inv) {
      throw new InventoryNotFoundException(variantId);
    }
    return this.mapToStockDto(inv);
  }

  async listMovements(
    variantId: string,
    query: ListMovementsQueryDto,
  ): Promise<StockMovementListResponseDto> {
    const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '50'), 10) || 50));

    const { items, total } = await this.repo.listMovements({
      productVariantId: variantId,
      type: query.type,
      referenceType: query.referenceType,
      page,
      limit,
    });

    return {
      items: items.map((row: any) => ({
        id: row.id,
        inventoryId: row.inventoryId,
        productVariantId: row.productVariantId,
        type: row.type,
        quantity: row.quantity,
        onHandAfter: row.onHandAfter,
        reservedAfter: row.reservedAfter,
        reason: row.reason ?? null,
        referenceType: row.referenceType ?? null,
        referenceId: row.referenceId ?? null,
        createdByType: row.createdByType,
        createdById: row.createdById ?? null,
        createdAt: row.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async listLowStock(
    limit = 50,
  ): Promise<LowStockListResponseDto> {
    const items = await this.repo.findLowStock(limit);
    return {
      items: items.map((row: any) => ({
        variantId: row.productVariantId,
        sku: row.variant?.sku ?? '',
        productName: row.variant?.product?.name ?? '',
        productSlug: row.variant?.product?.slug ?? '',
        warehouseCode: row.warehouseCode,
        available: row.available,
        lowStockThreshold: row.lowStockThreshold,
        reserved: row.reserved,
        updatedAt: row.updatedAt?.toISOString?.() ?? new Date(0).toISOString(),
      })),
      total: items.length,
    };
  }

  async updateLowStockThreshold(
    variantId: string,
    dto: UpdateLowStockThresholdDto,
  ): Promise<InventoryStockDto> {
    return this.repo.withTransaction(async (tx) => {
      const inv = await tx.inventory.findFirst({
        where: { productVariantId: variantId },
      });
      if (!inv) throw new InventoryNotFoundException(variantId);

      await tx.inventory.update({
        where: { id: inv.id },
        data: { lowStockThreshold: dto.threshold },
      });

      const updated = await this.repo.findByVariantId(variantId, inv.warehouseCode);
      return this.mapToStockDto(updated!);
    });
  }

  /* ============================================================== */
  /*  Mapping helpers                                              */
  /* ============================================================== */

  private mapToStockDto(inv: any): InventoryStockDto {
    return {
      id: inv.id,
      productVariantId: inv.productVariantId,
      sku: inv.variant?.sku ?? '',
      productName: inv.variant?.product?.name ?? '',
      productSlug: inv.variant?.product?.slug ?? '',
      warehouseCode: inv.warehouseCode,
      onHand: inv.onHand,
      reserved: inv.reserved,
      available: inv.available,
      lowStockThreshold: inv.lowStockThreshold,
      lowStock: inv.available <= inv.lowStockThreshold,
      allowBackorder: inv.allowBackorder ?? false,
      lastCountedAt: inv.lastCountedAt?.toISOString?.() ?? null,
      updatedAt: inv.updatedAt?.toISOString?.() ?? new Date(0).toISOString(),
    };
  }
}


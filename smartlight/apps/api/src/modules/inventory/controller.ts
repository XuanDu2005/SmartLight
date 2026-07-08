/**
 * InventoryController \u2014 admin-only routes.
 *
 * All routes require @Roles('admin', 'inventory_manager').
 * There is no public customer-facing inventory API (stock levels are
 * surfaced through the catalog availability endpoint).
 *
 * Security model:
 *   - Role-based access control (JwtAuthGuard + @Roles)
 *   - All mutations require admin role
 *   - Actor tracking on every mutation (adminId from @CurrentUser)
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

import { InventoryService } from './service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { UserPrincipal } from '../users/interfaces/user-principal.interface';

import type {
  BulkAdjustmentDto,
  CreateInventoryDto,
  ImportStockDto,
  ListInventoryQueryDto,
  ListMovementsQueryDto,
  StockAdjustmentDto,
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

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /* ============================================================== */
  /*  Public availability (called by catalog module)               */
  /* ============================================================== */

  /**
   * GET /catalog/variants/:variantId/availability
   *
   * Public endpoint \u2014 no auth required. Returns stock availability for
   * the catalog frontend. Cached by the catalog service (30s TTL).
   */
  @Get('catalog/variants/:variantId/availability')
  async getVariantAvailability(
    @Param('variantId') variantId: string,
  ): Promise<InventoryAvailabilityDto> {
    return this.inventoryService.getAvailability(variantId);
  }

  /* ============================================================== */
  /*  Admin: inventory management                                    */
  /* ============================================================== */

  /**
   * GET /admin/inventory
   *
   * List all inventory records with filters.
   */
  @Get('admin/inventory')
  @Roles('admin', 'inventory_manager')
  async list(
    @Query() query: ListInventoryQueryDto,
  ): Promise<InventoryListResponseDto> {
    return this.inventoryService.listInventory(query);
  }

  /**
   * GET /admin/inventory/low-stock
   *
   * List variants that are at or below their low-stock threshold.
   */
  @Get('admin/inventory/low-stock')
  @Roles('admin', 'inventory_manager')
  async listLowStock(): Promise<LowStockListResponseDto> {
    return this.inventoryService.listLowStock(50);
  }

  /**
   * GET /admin/inventory/:variantId
   *
   * Get inventory detail for a specific variant.
   */
  @Get('admin/inventory/:variantId')
  @Roles('admin', 'inventory_manager')
  async getByVariant(
    @Param('variantId') variantId: string,
  ): Promise<InventoryStockDto> {
    return this.inventoryService.getInventoryByVariant(variantId);
  }

  /**
   * GET /admin/inventory/:variantId/movements
   *
   * Get stock movement history for a variant.
   */
  @Get('admin/inventory/:variantId/movements')
  @Roles('admin', 'inventory_manager')
  async getMovements(
    @Param('variantId') variantId: string,
    @Query() query: ListMovementsQueryDto,
  ): Promise<StockMovementListResponseDto> {
    return this.inventoryService.listMovements(variantId, query);
  }

  /**
   * POST /admin/inventory
   *
   * Create an inventory record for a product variant.
   * Idempotent: if the record already exists, returns conflict.
   */
  @Post('admin/inventory')
  @Roles('admin', 'inventory_manager')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() admin: UserPrincipal,
    @Body() dto: CreateInventoryDto,
  ): Promise<InventoryCreateResponseDto> {
    return this.inventoryService.createInventory(dto, admin.id);
  }

  /**
   * POST /admin/inventory/import
   *
   * Import stock into inventory (received from supplier / warehouse).
   * Increases on_hand and available.
   */
  @Post('admin/inventory/import')
  @Roles('admin', 'inventory_manager')
  async import(
    @CurrentUser() admin: UserPrincipal,
    @Body() dto: ImportStockDto,
  ): Promise<InventoryAdjustmentResponseDto> {
    return this.inventoryService.importStock(dto, admin.id);
  }

  /**
   * POST /admin/inventory/adjust
   *
   * Manual stock adjustment. Accepts a signed delta (positive or negative).
   * Creates both a StockMovement and an InventoryAdjustment record.
   */
  @Post('admin/inventory/adjust')
  @Roles('admin', 'inventory_manager')
  async adjust(
    @CurrentUser() admin: UserPrincipal,
    @Body() body: { variantId: string; adjustment: StockAdjustmentDto },
  ): Promise<InventoryAdjustmentResponseDto> {
    return this.inventoryService.adjustStock(
      body.variantId,
      body.adjustment,
      admin.id,
    );
  }

  /**
   * POST /admin/inventory/bulk-adjust
   *
   * Bulk adjustment up to 100 variants in one request.
   */
  @Post('admin/inventory/bulk-adjust')
  @Roles('admin', 'inventory_manager')
  async bulkAdjust(
    @CurrentUser() admin: UserPrincipal,
    @Body() dto: BulkAdjustmentDto,
  ): Promise<{
    processed: number;
    results: Array<{ variantId: string; success: boolean; error?: string }>;
  }> {
    return this.inventoryService.bulkAdjust(dto, admin.id);
  }

  /**
   * PATCH /admin/inventory/:variantId/threshold
   *
   * Update the low-stock threshold for a variant.
   */
  @Patch('admin/inventory/:variantId/threshold')
  @Roles('admin', 'inventory_manager')
  async updateThreshold(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateLowStockThresholdDto,
  ): Promise<InventoryStockDto> {
    return this.inventoryService.updateLowStockThreshold(variantId, dto);
  }
}
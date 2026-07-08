/**
 * Inventory response DTOs.
 */

export interface InventoryStockDto {
  id: string;
  productVariantId: string;
  sku: string;
  productName: string;
  productSlug: string;
  warehouseCode: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  lowStock: boolean;
  allowBackorder: boolean;
  lastCountedAt: string | null;
  updatedAt: string;
}

export interface InventoryAvailabilityDto {
  variantId: string;
  sku: string;
  inStock: boolean;
  availableQuantity: number;
  stockOnHand: number;
  stockReserved: number;
  lowStock: boolean;
  maxQuantityPerOrder: number;
}

export interface StockMovementDto {
  id: string;
  inventoryId: string;
  productVariantId: string;
  type: string;
  quantity: number;
  onHandAfter: number;
  reservedAfter: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdByType: string;
  createdById: string | null;
  createdAt: string;
}

export interface InventoryAdjustmentDto {
  id: string;
  inventoryId: string;
  productVariantId: string;
  quantityDelta: number;
  onHandAfter: number;
  reason: string;
  note: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdByType: string;
  createdById: string | null;
  createdAt: string;
}

export interface LowStockItemDto {
  variantId: string;
  sku: string;
  productName: string;
  productSlug: string;
  warehouseCode: string;
  available: number;
  lowStockThreshold: number;
  reserved: number;
  updatedAt: string;
}

export interface InventoryListItemDto {
  id: string;
  productVariantId: string;
  sku: string;
  productName: string;
  productSlug: string;
  warehouseCode: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  lowStock: boolean;
  updatedAt: string;
}

export interface InventoryListResponseDto {
  items: InventoryListItemDto[];
  total: number;
  page: number;
  limit: number;
}

export interface StockMovementListResponseDto {
  items: StockMovementDto[];
  total: number;
  page: number;
  limit: number;
}

export interface LowStockListResponseDto {
  items: LowStockItemDto[];
  total: number;
}

export interface InventoryCreateResponseDto extends InventoryStockDto {
  created?: boolean;
}

export interface InventoryAdjustmentResponseDto {
  variantId: string;
  previousOnHand: number;
  newOnHand: number;
  delta: number;
  reason: string;
  adjustmentId: string;
  movementId: string;
}
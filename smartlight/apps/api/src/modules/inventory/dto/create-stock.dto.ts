/**
 * Inventory request DTOs.
 */
import {
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInventoryDto {
  @IsString()
  @IsUUID()
  productVariantId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  warehouseCode?: string;

  @IsInt()
  @Min(0)
  initialStock!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reserved?: number;
}

export class StockAdjustmentDto {
  /** Signed delta: positive = increase, negative = decrease. */
  @IsInt()
  delta!: number;

  @IsString()
  @IsIn([
    'COUNT_CORRECTION',
    'DAMAGE',
    'LOSS',
    'RECEIVING',
    'TRANSFER',
    'INITIAL_STOCK',
    'OTHER',
  ])
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  referenceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  referenceId?: string;
}

export class ImportStockDto {
  @IsString()
  @IsUUID()
  productVariantId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  warehouseCode?: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class BulkAdjustmentDto {
  @IsString()
  @MaxLength(255)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** Array of `{productVariantId, delta}` objects. */
  items!: Array<{
    productVariantId: string;
    delta: number;
  }>;
}

export class ListInventoryQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  page?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  limit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  warehouseCode?: string;

  @IsOptional()
  @IsString()
  status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'all';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class ListMovementsQueryDto {
  @IsOptional()
  @IsString()
  @IsIn([
    'IMPORT',
    'EXPORT',
    'SALE',
    'RESERVATION',
    'RELEASE',
    'RETURN',
    'ADJUSTMENT',
  ])
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  page?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  limit?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;
}

export class UpdateLowStockThresholdDto {
  @IsInt()
  @Min(0)
  @Max(10000)
  threshold!: number;
}

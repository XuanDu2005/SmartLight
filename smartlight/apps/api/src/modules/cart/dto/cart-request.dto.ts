/**
 * Cart request DTOs.
 *
 * Validation lives here (class-validator). Business rules (e.g. inventory
 * checks) live in the service / repository.
 */
import {
  IsArray,
  ArrayMinSize,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CART_LIMITS } from '../constants/cart.constants';

export class AddCartItemDto {
  @IsString()
  @Length(1, 64)
  variantId!: string;

  @IsInt()
  @Min(CART_LIMITS.MIN_QUANTITY_PER_ITEM)
  @Max(CART_LIMITS.MAX_QUANTITY_PER_ITEM)
  quantity!: number;

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(CART_LIMITS.MIN_QUANTITY_PER_ITEM)
  @Max(CART_LIMITS.MAX_QUANTITY_PER_ITEM)
  quantity!: number;

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class SelectCartItemsDto {
  /** Optional subset of itemIds; if omitted, all items are targeted. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemIds?: string[];

  @IsBoolean()
  isSelected!: boolean;
}

export class BulkRemoveCartItemsDto {
  @IsArray()
  @IsString({ each: true })
  itemIds!: string[];
}

export class MergeCartItemDto {
  @IsString()
  @Length(1, 64)
  variantId!: string;

  @IsInt()
  @Min(CART_LIMITS.MIN_QUANTITY_PER_ITEM)
  @Max(CART_LIMITS.MAX_QUANTITY_PER_ITEM)
  quantity!: number;

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class MergeCartDto {
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => MergeCartItemDto)
  items!: MergeCartItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  strategy?: 'merge' | 'replace';
}

export class ApplyCouponDto {
  @IsString()
  @Length(1, 40)
  couponCode!: string;
}

export class CartQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  status?: string;
}

export class AdminListCartsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  limit?: number;
}

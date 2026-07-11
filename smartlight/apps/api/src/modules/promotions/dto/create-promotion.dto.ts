/**
 * Promotion request DTOs.
 */
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING', 'FLASH_SALE'])
  type!: string;

  @IsOptional()
  @IsString()
  @IsIn(['ORDER', 'PRODUCT', 'CATEGORY', 'BRAND'])
  scope?: string;

  /** Decimal value: percentage (0-100) or fixed amount. */
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  discountValue!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  minimumOrderValue?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  maximumDiscount?: number;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  stackable?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['UNLIMITED', 'PER_USER', 'TOTAL'])
  usageLimitType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  flashSaleStock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  bannerMediaUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  productVariantIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  brandIds?: string[];
}

export class UpdatePromotionDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  minimumOrderValue?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  maximumDiscount?: number;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  stackable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  bannerMediaUrl?: string;
}

export class CreateVoucherDto {
  @IsString()
  @IsUUID()
  promotionId!: string;

  @IsString()
  @MaxLength(64)
  code!: string;

  @IsOptional()
  @IsString()
  @IsIn(['PUBLIC', 'PRIVATE', 'AUTO_APPLY'])
  type?: string;

  @IsOptional()
  @IsString()
  @IsIn(['UNLIMITED', 'PER_USER', 'TOTAL'])
  usageLimitType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsDateString()
  expiresAt!: string;

  @IsOptional()
  @IsBoolean()
  firstOrderOnly?: boolean;
}

export class UpdateVoucherDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ValidateVoucherDto {
  @IsString()
  @MaxLength(64)
  code!: string;

  @IsOptional()
  items?: Array<{
    productVariantId: string;
    productId?: string;
    categoryId?: string;
    brandId?: string;
    quantity: number;
    unitPrice: number;
  }>;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  shippingFee?: number;

  @IsOptional()
  @IsBoolean()
  isFirstOrder?: boolean;
}

export class ApplyPromotionDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  voucherCode?: string;

  @IsArray()
  items!: Array<{
    productVariantId: string;
    productId?: string;
    categoryId?: string;
    brandId?: string;
    quantity: number;
    unitPrice: number;
  }>;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  shippingFee!: number;

  @IsOptional()
  @IsBoolean()
  isFirstOrder?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  autoApplyPromotionIds?: string[];
}

export class ListPromotionsQueryDto {
  @IsOptional()
  @IsString()
  @IsIn([
    'DRAFT',
    'SCHEDULED',
    'ACTIVE',
    'EXPIRED',
    'DISABLED',
    'ARCHIVED',
  ])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING', 'FLASH_SALE'])
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  page?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  limit?: string;
}

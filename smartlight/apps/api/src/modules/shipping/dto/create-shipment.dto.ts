/**
 * Shipping request DTOs.
 */
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PROVIDER_KEYS } from '../constants/shipping.constants';

export class AddressDto {
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MaxLength(80)
  province!: string;

  @IsString()
  @MaxLength(80)
  district!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ward?: string;

  @IsString()
  @MaxLength(255)
  detail!: string;
}

export class EstimateFeeDto {
  @ValidateNested()
  @Type(() => AddressDto)
  shipFrom!: AddressDto;

  @ValidateNested()
  @Type(() => AddressDto)
  shipTo!: AddressDto;

  @IsInt()
  @Min(1)
  @Max(50_000)
  weightGrams!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  codAmount?: number;

  @IsOptional()
  @IsString()
  @IsIn(PROVIDER_KEYS as unknown as string[])
  provider?: string;
}

export class CreateShipmentDto {
  @IsString()
  @IsUUID()
  orderId!: string;

  @IsOptional()
  @IsString()
  @IsIn(PROVIDER_KEYS as unknown as string[])
  provider?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  weightGrams?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  codAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ShipShipmentDto {
  /** Optional carrier-provided tracking number. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  trackingNumber?: string;
}

export class UpdateShipmentStatusDto {
  @IsString()
  @IsIn([
    'CREATED',
    'WAITING_PICKUP',
    'PICKED_UP',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'FAILED',
    'RETURNING',
    'RETURNED',
    'CANCELLED',
  ])
  toStatus!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class CancelShipmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class ListShipmentsQueryDto {
  @IsOptional()
  @IsString()
  @IsIn([
    'CREATED',
    'WAITING_PICKUP',
    'PICKED_UP',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'FAILED',
    'RETURNING',
    'RETURNED',
    'CANCELLED',
  ])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(PROVIDER_KEYS as unknown as string[])
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  page?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  limit?: string;
}

export class AdminListShipmentsQueryDto extends ListShipmentsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  orderId?: string;
}

export class ListProvidersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  page?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  limit?: string;
}

export class TrackingQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  page?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  limit?: string;
}

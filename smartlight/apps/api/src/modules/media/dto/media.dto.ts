/**
 * Media DTOs.
 */
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMediaFromUrlDto {
  @IsString()
  @MaxLength(2048)
  url!: string;

  @IsString()
  @MaxLength(60)
  mimeType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  providerAssetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  ownerType?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  purpose?: string;
}

export class AttachMediaDto {
  @IsString()
  mediaId!: string;

  @IsString()
  @MaxLength(40)
  ownerType!: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class ListMediaQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  ownerType?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  purpose?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class SignedUrlQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  ttlSec?: number;
}
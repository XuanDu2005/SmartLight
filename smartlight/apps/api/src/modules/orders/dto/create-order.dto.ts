/**
 * Order request DTOs.
 */
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrderDto {
  /** The RESERVED checkout session to convert into an order. */
  @IsString()
  @MaxLength(64)
  checkoutSessionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerNotes?: string;
}

export class UpdateOrderStatusDto {
  /** Target status to transition to. */
  @IsString()
  @IsIn([
    'PENDING_PAYMENT',
    'PAID',
    'PROCESSING',
    'PACKED',
    'SHIPPED',
    'DELIVERING',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
    'RETURN_REQUESTED',
    'RETURNED',
  ])
  toStatus!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reason?: string;
}

export class ListOrdersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  page?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  limit?: string;
}

export class AdminListOrdersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  page?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  limit?: string;
}

/**
 * Checkout request DTOs.
 *
 * Validation lives here (class-validator). Business rules live in the service.
 */
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CHECKOUT_LIMITS } from '../constants/checkout.constants';

export class CreateCheckoutDto {
  @IsOptional()
  @IsString()
  cartId?: string;

  /** Client-supplied idempotency key to prevent double-create. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}

export class UpdateAddressDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @Matches(CHECKOUT_LIMITS.PHONE_REGEX, {
    message: 'Phone must be a valid Vietnamese phone number (0-prefixed, 10-11 digits)',
  })
  phone!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  province!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  district!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  ward!: string;

  @IsString()
  @MinLength(CHECKOUT_LIMITS.MIN_ADDRESS_DETAIL_LENGTH)
  @MaxLength(CHECKOUT_LIMITS.MAX_ADDRESS_DETAIL_LENGTH)
  detail!: string;
}

export class AdminListCheckoutsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}


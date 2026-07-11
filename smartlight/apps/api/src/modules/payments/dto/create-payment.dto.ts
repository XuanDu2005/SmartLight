/**
 * Payment request DTOs.
 */
import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { PROVIDER_KEYS } from '../constants/payment.constants';

export class CreatePaymentDto {
  @IsString()
  @MaxLength(64)
  orderId!: string;

  @IsString()
  @IsIn(PROVIDER_KEYS as unknown as string[])
  provider!: 'momo' | 'vnpay' | 'paypal';

  /** Optional client idempotency key. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(1024)
  returnUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(1024)
  cancelUrl?: string;
}

export class RetryPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  returnUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  cancelUrl?: string;
}

export class ListPaymentsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  orderId?: string;

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

export class AdminListPaymentsQueryDto extends ListPaymentsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  provider?: string;
}

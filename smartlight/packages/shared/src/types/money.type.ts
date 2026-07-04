import { Currency } from '../enums/currency.enum';

/**
 * Money is represented as a fixed-precision decimal string on the wire
 * to avoid floating-point loss. The DB stores `Decimal(20, 4)`.
 */
export interface Money {
  amount: string; // e.g. "123456.7800"
  currency: Currency;
}

export const VND_ZERO: Money = { amount: '0.0000', currency: Currency.VND };

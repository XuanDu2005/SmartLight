import { Currency } from '../enums/currency.enum';
/**
 * Money is represented as a fixed-precision decimal string on the wire
 * to avoid floating-point loss. The DB stores `Decimal(20, 4)`.
 */
export interface Money {
    amount: string;
    currency: Currency;
}
export declare const VND_ZERO: Money;

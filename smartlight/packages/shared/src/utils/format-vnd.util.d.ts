/**
 * Formats a numeric amount in VND for display, e.g. 1234567 -> "1.234.567 \u20ab".
 * Banker's rounding only at the presentation layer; storage stays Decimal(20,4).
 */
export declare const formatVND: (amount: number | string) => string;

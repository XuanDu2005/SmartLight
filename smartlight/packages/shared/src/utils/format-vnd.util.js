"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatVND = void 0;
/**
 * Formats a numeric amount in VND for display, e.g. 1234567 -> "1.234.567 \u20ab".
 * Banker's rounding only at the presentation layer; storage stays Decimal(20,4).
 */
const formatVND = (amount) => {
    const n = typeof amount === 'string' ? Number(amount) : amount;
    if (!Number.isFinite(n))
        return '0 \u20ab';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(n);
};
exports.formatVND = formatVND;

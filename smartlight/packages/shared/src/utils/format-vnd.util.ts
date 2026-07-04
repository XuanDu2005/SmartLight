/**
 * Formats a numeric amount in VND for display, e.g. 1234567 -> "1.234.567 \u20ab".
 * Banker's rounding only at the presentation layer; storage stays Decimal(20,4).
 */
export const formatVND = (amount: number | string): string => {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return '0 \u20ab';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
};

/**
 * Format a numeric amount as VND currency.
 * No decimals for the storefront (VND is integer-valued in commerce).
 */
export const formatVND = (value: number, includeSymbol = true): string => {
  if (Number.isNaN(value) || value == null) return includeSymbol ? '0\u20ab' : '0';
  const formatted = new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(value);
  return includeSymbol ? `${formatted}\u20ab` : formatted;
};

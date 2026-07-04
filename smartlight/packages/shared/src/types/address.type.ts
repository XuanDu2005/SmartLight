/**
 * Vietnamese-format shipping address (province / district / ward / street).
 * Codes follow the official Vietnam General Statistics Office scheme.
 */
export interface VietnamAddress {
  fullName: string;
  phone: string;
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  wardCode?: string;
  wardName?: string;
  street: string;
  label?: string; // 'Home', 'Office', ...
}

/**
 * Strong-password policy.
 *
 * Per docs/04-api-design/AUTHENTICATION_API.md \u00a710:
 *   - min length 8
 *   - max length 128
 *   - composition: at least 3 of 4 (lower, upper, digit, symbol)
 *   - common-password list (kept minimal here; full list is layered on top)
 *
 * NOTE: this is a defense-in-depth check used in service code. class-validator
 * decorators on DTOs should be the first line of defense.
 */
export function isStrongPassword(pwd: string): boolean {
  if (typeof pwd !== 'string') return false;
  if (pwd.length < 8 || pwd.length > 128) return false;

  let classes = 0;
  if (/[a-z]/.test(pwd)) classes += 1;
  if (/[A-Z]/.test(pwd)) classes += 1;
  if (/[0-9]/.test(pwd)) classes += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) classes += 1;

  return classes >= 3;
}

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  '12345678',
  'qwerty123',
  'admin123',
  'letmein',
  'welcome1',
  'iloveyou',
  'smartlight',
]);

export function isCommonPassword(pwd: string): boolean {
  return COMMON_PASSWORDS.has(pwd.toLowerCase());
}
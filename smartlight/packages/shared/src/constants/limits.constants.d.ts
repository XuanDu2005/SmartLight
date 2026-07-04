/**
 * Application-wide limits. No magic numbers elsewhere.
 */
export declare const LIMITS: Readonly<{
    readonly PASSWORD_MIN_LENGTH: 10;
    readonly LOGIN_MAX_FAILED: 5;
    readonly LOGIN_LOCKOUT_MS: number;
    readonly CART_INACTIVITY_MS: number;
    readonly CART_EXPIRY_MS: number;
    readonly CHECKOUT_SESSION_MS: number;
    readonly STOCK_RESERVATION_MS: number;
    readonly IDEMPOTENCY_TTL_MS: number;
    readonly MAX_PAGE_SIZE: 100;
    readonly DEFAULT_PAGE_SIZE: 20;
    readonly ACCESS_TOKEN_TTL_SEC: 900;
    readonly REFRESH_TOKEN_TTL_SEC: number;
    readonly MAX_FILE_SIZE_BYTES: number;
    readonly VND_MINOR_UNIT: 0;
}>;
export type LimitKey = keyof typeof LIMITS;

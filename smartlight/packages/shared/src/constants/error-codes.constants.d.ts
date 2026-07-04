/**
 * Cross-module error codes referenced by both backend exceptions and frontend.
 * Names match the values documented in `docs/04-api-design/06_ERROR_STANDARD.md`.
 */
export declare const ERROR_CODES: Readonly<{
    readonly VALIDATION_FAILED: "VALIDATION_FAILED";
    readonly UNAUTHENTICATED: "UNAUTHENTICATED";
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly CONFLICT: "CONFLICT";
    readonly OUT_OF_STOCK: "OUT_OF_STOCK";
    readonly COUPON_LIMIT_REACHED: "COUPON_LIMIT_REACHED";
    readonly COUPON_EXPIRED: "COUPON_EXPIRED";
    readonly CART_EMPTY: "CART_EMPTY";
    readonly CHECKOUT_EXPIRED: "CHECKOUT_EXPIRED";
    readonly IDEMPOTENCY_KEY_REUSED: "IDEMPOTENCY_KEY_REUSED";
    readonly IDEMPOTENCY_IN_PROGRESS: "IDEMPOTENCY_IN_PROGRESS";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
    readonly PAYMENT_PROVIDER_ERROR: "PAYMENT_PROVIDER_ERROR";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly INTERNAL: "INTERNAL";
}>;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

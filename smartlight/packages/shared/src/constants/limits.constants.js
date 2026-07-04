"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIMITS = void 0;
/**
 * Application-wide limits. No magic numbers elsewhere.
 */
exports.LIMITS = Object.freeze({
    PASSWORD_MIN_LENGTH: 10,
    LOGIN_MAX_FAILED: 5,
    LOGIN_LOCKOUT_MS: 15 * 60 * 1000,
    CART_INACTIVITY_MS: 30 * 60 * 1000,
    CART_EXPIRY_MS: 30 * 24 * 60 * 60 * 1000,
    CHECKOUT_SESSION_MS: 15 * 60 * 1000,
    STOCK_RESERVATION_MS: 15 * 60 * 1000,
    IDEMPOTENCY_TTL_MS: 24 * 60 * 60 * 1000,
    MAX_PAGE_SIZE: 100,
    DEFAULT_PAGE_SIZE: 20,
    ACCESS_TOKEN_TTL_SEC: 900,
    REFRESH_TOKEN_TTL_SEC: 30 * 24 * 60 * 60,
    MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,
    VND_MINOR_UNIT: 0,
});

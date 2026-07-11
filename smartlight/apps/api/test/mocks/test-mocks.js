"use strict";
/**
 * Test mocks — factories and reusable mocks for unit tests.
 *
 *   - createMockPrisma          : prisma client mock with chainable methods
 *   - createMockRedis           : ioredis client mock with promise returns
 *   - createMockConfigService   : @nestjs/config mock
 *   - createMockJwtService      : @nestjs/jwt mock
 *   - createMockPinoLogger      : nestjs-pino Logger mock
 *   - mockAuthenticatedRequest  : express request with user
 *   - mockAnonRequest           : express request with no user
 *   - mockResponse              : express response mock
 *
 * All mocks are deterministic — no faker randomness for repeatable tests.
 *
 * `jest` is the global type from `@types/jest` (already in devDependencies).
 */
// Use the global `jest` (typed by `@types/jest`). Avoid `@jest/globals` because
// some Jest 29 setups don't expose it as a TS module.
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockVoucher = exports.mockPromotion = exports.mockPayment = exports.mockOrder = exports.mockVariant = exports.mockProduct = exports.mockUser = exports.mockResponse = exports.mockAnonRequest = exports.mockAuthenticatedRequest = exports.createMockPinoLogger = exports.createMockJwtService = exports.createMockConfigService = exports.createMockRedis = exports.createMockPrisma = void 0;
// ---------------------------------------------------------------------------
// Prisma mock — chainable (findUnique → where, findMany → where, etc.)
// ---------------------------------------------------------------------------
const createMockPrisma = () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const findFirst = jest.fn().mockResolvedValue(null);
    const findMany = jest.fn().mockResolvedValue([]);
    const create = jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'mock-id', ...data }));
    const update = jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where?.id ?? 'mock-id', ...data }));
    const upsert = jest.fn().mockImplementation(({ where, update }) => Promise.resolve({ id: where?.id ?? 'mock-id', ...update }));
    const deleteFn = jest.fn().mockResolvedValue({ id: 'mock-id' });
    const count = jest.fn().mockResolvedValue(0);
    const aggregate = jest.fn().mockResolvedValue({ _sum: {}, _avg: {} });
    const groupBy = jest.fn().mockResolvedValue([]);
    const transaction = jest
        .fn()
        .mockImplementation(async (arg) => typeof arg === 'function' ? arg(null) : Promise.all(arg));
    const $queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const $executeRaw = jest.fn().mockResolvedValue(0);
    const $connect = jest.fn().mockResolvedValue(undefined);
    const $disconnect = jest.fn().mockResolvedValue(undefined);
    const $on = jest.fn();
    // Generic chainable access — used for ad-hoc models not stubbed explicitly.
    const model = new Proxy({}, {
        get: () => ({
            findUnique,
            findFirst,
            findMany,
            create,
            update,
            upsert,
            delete: deleteFn,
            count,
            aggregate,
            groupBy,
        }),
    });
    return {
        ...model,
        $queryRaw,
        $executeRaw,
        $connect,
        $disconnect,
        $on,
        $transaction: transaction,
    };
};
exports.createMockPrisma = createMockPrisma;
// ---------------------------------------------------------------------------
// ioredis mock
// ---------------------------------------------------------------------------
const createMockRedis = () => {
    const data = new Map();
    return {
        get: jest.fn(async (k) => data.get(k) ?? null),
        set: jest.fn(async (k, v, ..._rest) => {
            data.set(k, v);
            return 'OK';
        }),
        del: jest.fn(async (...keys) => {
            let n = 0;
            for (const k of keys)
                if (data.delete(k))
                    n += 1;
            return n;
        }),
        ping: jest.fn(async () => 'PONG'),
        incr: jest.fn(async () => 1),
        expire: jest.fn(async () => 1),
        keys: jest.fn(async () => []),
        scan: jest.fn(async () => ['0', []]),
        quit: jest.fn(async () => 'OK'),
        disconnect: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        status: 'ready',
    };
};
exports.createMockRedis = createMockRedis;
// ---------------------------------------------------------------------------
// @nestjs/config mock
// ---------------------------------------------------------------------------
const createMockConfigService = (values = {}) => ({
    get: jest.fn((key) => values[key]),
    getOrThrow: jest.fn((key) => {
        if (!(key in values))
            throw new Error(`config: ${key} not set`);
        return values[key];
    }),
});
exports.createMockConfigService = createMockConfigService;
// ---------------------------------------------------------------------------
// @nestjs/jwt mock
// ---------------------------------------------------------------------------
const createMockJwtService = () => ({
    sign: jest.fn((payload, options) => ({
        token: `mock-jwt-${JSON.stringify(payload)}-${JSON.stringify(options ?? {})}`,
        payload,
        options,
    })),
    signAsync: jest.fn(async (payload) => `mock-jwt-${JSON.stringify(payload)}`),
    verify: jest.fn((token) => {
        if (!token.startsWith('mock-jwt-'))
            throw new Error('invalid token');
        return { sub: 'mock-user-id' };
    }),
    verifyAsync: jest.fn(async (token) => {
        if (!token.startsWith('mock-jwt-'))
            throw new Error('invalid token');
        return { sub: 'mock-user-id' };
    }),
    decode: jest.fn((token) => {
        if (!token.startsWith('mock-jwt-'))
            return null;
        return { sub: 'mock-user-id' };
    }),
});
exports.createMockJwtService = createMockJwtService;
// ---------------------------------------------------------------------------
// Pino logger mock — keeps call sites clean.
// ---------------------------------------------------------------------------
const createMockPinoLogger = () => {
    const fn = jest.fn();
    return {
        log: fn,
        error: fn,
        warn: fn,
        debug: fn,
        verbose: fn,
        fatal: fn,
        info: fn,
        trace: fn,
        child: jest.fn(() => (0, exports.createMockPinoLogger)()),
        level: 'info',
        silent: jest.fn(),
    };
};
exports.createMockPinoLogger = createMockPinoLogger;
// ---------------------------------------------------------------------------
// Express request / response mocks
// ---------------------------------------------------------------------------
const mockAuthenticatedRequest = (userId = 'user-1') => {
    return {
        user: { sub: userId, id: userId, roles: ['customer'] },
        headers: { authorization: 'Bearer mock-jwt-{}' },
        ip: '127.0.0.1',
        method: 'GET',
        url: '/v1/test',
        body: {},
        params: {},
        query: {},
    };
};
exports.mockAuthenticatedRequest = mockAuthenticatedRequest;
const mockAnonRequest = () => {
    return {
        user: undefined,
        headers: {},
        ip: '127.0.0.1',
        method: 'GET',
        url: '/v1/test',
        body: {},
        params: {},
        query: {},
    };
};
exports.mockAnonRequest = mockAnonRequest;
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    res.getHeader = jest.fn().mockReturnValue(undefined);
    return res;
};
exports.mockResponse = mockResponse;
// ---------------------------------------------------------------------------
// Deterministic fixtures — no faker.
// ---------------------------------------------------------------------------
exports.mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
};
exports.mockProduct = {
    id: 'product-1',
    slug: 'sample-product',
    name: 'Sample Product',
    status: 'published',
    publishedAt: new Date('2026-01-02T00:00:00Z'),
};
exports.mockVariant = {
    id: 'variant-1',
    productId: 'product-1',
    sku: 'SKU-001',
    price: 100000,
    status: 'active',
};
exports.mockOrder = {
    id: 'order-1',
    orderNumber: 'ORD-20260101-0001',
    userId: 'user-1',
    status: 'pending_payment',
    total: 100000,
    createdAt: new Date('2026-01-03T00:00:00Z'),
};
exports.mockPayment = {
    id: 'payment-1',
    orderId: 'order-1',
    provider: 'vnpay',
    status: 'pending',
    amount: 100000,
};
exports.mockPromotion = {
    id: 'promo-1',
    code: 'WELCOME10',
    type: 'percentage',
    value: 10,
    status: 'active',
    priority: 0,
};
exports.mockVoucher = {
    id: 'voucher-1',
    code: 'WELCOME10',
    promotionId: 'promo-1',
    status: 'active',
    expiresAt: new Date('2027-01-01T00:00:00Z'),
};

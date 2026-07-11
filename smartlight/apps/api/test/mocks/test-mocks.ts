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

// ---------------------------------------------------------------------------
// Prisma mock — chainable (findUnique → where, findMany → where, etc.)
// ---------------------------------------------------------------------------
export const createMockPrisma = () => {
  const findUnique = jest.fn().mockResolvedValue(null);
  const findFirst = jest.fn().mockResolvedValue(null);
  const findMany = jest.fn().mockResolvedValue([]);
  const create = jest.fn().mockImplementation(({ data }: any) =>
    Promise.resolve({ id: 'mock-id', ...data }),
  );
  const update = jest.fn().mockImplementation(({ where, data }: any) =>
    Promise.resolve({ id: where?.id ?? 'mock-id', ...data }),
  );
  const upsert = jest.fn().mockImplementation(({ where, update }: any) =>
    Promise.resolve({ id: where?.id ?? 'mock-id', ...update }),
  );
  const deleteFn = jest.fn().mockResolvedValue({ id: 'mock-id' });
  const count = jest.fn().mockResolvedValue(0);
  const aggregate = jest.fn().mockResolvedValue({ _sum: {}, _avg: {} });
  const groupBy = jest.fn().mockResolvedValue([]);
  const transaction = jest
    .fn()
    .mockImplementation(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (db: unknown) => unknown)(null) : Promise.all(arg as Promise<unknown>[]),
    );
  const $queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
  const $executeRaw = jest.fn().mockResolvedValue(0);
  const $connect = jest.fn().mockResolvedValue(undefined);
  const $disconnect = jest.fn().mockResolvedValue(undefined);
  const $on = jest.fn();

  // Generic chainable access — used for ad-hoc models not stubbed explicitly.
  const model: Record<string, unknown> = new Proxy(
    {},
    {
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
    },
  );

  return {
    ...model,
    $queryRaw,
    $executeRaw,
    $connect,
    $disconnect,
    $on,
    $transaction: transaction,
  } as unknown as ConstructorParameters<typeof import('@prisma/client').PrismaClient>[0] & {
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
    $on: jest.Mock;
  };
};

// ---------------------------------------------------------------------------
// ioredis mock
// ---------------------------------------------------------------------------
export const createMockRedis = () => {
  const data = new Map<string, string>();
  return {
    get: jest.fn(async (k: string) => data.get(k) ?? null),
    set: jest.fn(async (k: string, v: string, ..._rest: unknown[]) => {
      data.set(k, v);
      return 'OK';
    }),
    del: jest.fn(async (...keys: string[]) => {
      let n = 0;
      for (const k of keys) if (data.delete(k)) n += 1;
      return n;
    }),
    ping: jest.fn(async () => 'PONG'),
    incr: jest.fn(async () => 1),
    expire: jest.fn(async () => 1),
    keys: jest.fn(async () => []),
    scan: jest.fn(async () => ['0', [] as string[]]),
    quit: jest.fn(async () => 'OK'),
    disconnect: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    status: 'ready',
  };
};

// ---------------------------------------------------------------------------
// @nestjs/config mock
// ---------------------------------------------------------------------------
export const createMockConfigService = (
  values: Record<string, unknown> = {},
) => ({
  get: jest.fn((key: string) => values[key]),
  getOrThrow: jest.fn((key: string) => {
    if (!(key in values)) throw new Error(`config: ${key} not set`);
    return values[key];
  }),
});

// ---------------------------------------------------------------------------
// @nestjs/jwt mock
// ---------------------------------------------------------------------------
export const createMockJwtService = () => ({
  sign: jest.fn(
    (payload: object, options?: { expiresIn?: string | number }) => ({
      token: `mock-jwt-${JSON.stringify(payload)}-${JSON.stringify(options ?? {})}`,
      payload,
      options,
    }),
  ),
  signAsync: jest.fn(
    async (payload: object) => `mock-jwt-${JSON.stringify(payload)}`,
  ),
  verify: jest.fn(<T,>(token: string) => {
    if (!token.startsWith('mock-jwt-')) throw new Error('invalid token');
    return { sub: 'mock-user-id' } as T;
  }),
  verifyAsync: jest.fn(async <T,>(token: string) => {
    if (!token.startsWith('mock-jwt-')) throw new Error('invalid token');
    return { sub: 'mock-user-id' } as T;
  }),
  decode: jest.fn(<T,>(token: string) => {
    if (!token.startsWith('mock-jwt-')) return null;
    return { sub: 'mock-user-id' } as T;
  }),
});

// ---------------------------------------------------------------------------
// Pino logger mock — keeps call sites clean.
// ---------------------------------------------------------------------------
export const createMockPinoLogger = (): any => {
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
    child: jest.fn(() => createMockPinoLogger()),
    level: 'info',
    silent: jest.fn(),
  };
};

// ---------------------------------------------------------------------------
// Express request / response mocks
// ---------------------------------------------------------------------------
export const mockAuthenticatedRequest = (userId = 'user-1'): unknown => {
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

export const mockAnonRequest = (): unknown => {
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

export const mockResponse = (): unknown => {
  const res: Record<string, unknown> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.getHeader = jest.fn().mockReturnValue(undefined);
  return res;
};

// ---------------------------------------------------------------------------
// Deterministic fixtures — no faker.
// ---------------------------------------------------------------------------
export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  status: 'active',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

export const mockProduct = {
  id: 'product-1',
  slug: 'sample-product',
  name: 'Sample Product',
  status: 'published',
  publishedAt: new Date('2026-01-02T00:00:00Z'),
};

export const mockVariant = {
  id: 'variant-1',
  productId: 'product-1',
  sku: 'SKU-001',
  price: 100000,
  status: 'active',
};

export const mockOrder = {
  id: 'order-1',
  orderNumber: 'ORD-20260101-0001',
  userId: 'user-1',
  status: 'pending_payment',
  total: 100000,
  createdAt: new Date('2026-01-03T00:00:00Z'),
};

export const mockPayment = {
  id: 'payment-1',
  orderId: 'order-1',
  provider: 'vnpay',
  status: 'pending',
  amount: 100000,
};

export const mockPromotion = {
  id: 'promo-1',
  code: 'WELCOME10',
  type: 'percentage',
  value: 10,
  status: 'active',
  priority: 0,
};

export const mockVoucher = {
  id: 'voucher-1',
  code: 'WELCOME10',
  promotionId: 'promo-1',
  status: 'active',
  expiresAt: new Date('2027-01-01T00:00:00Z'),
};
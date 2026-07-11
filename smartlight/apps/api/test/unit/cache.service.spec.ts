/**
 * Unit tests for CacheService.
 *
 * Covers:
 *   - get returns cached value when present
 *   - get returns null on miss
 *   - get tolerates Redis errors (returns null)
 *   - set writes JSON-encoded value
 *   - getOrLoad: hit path, miss path, loader-error path
 *   - invalidate: single key, wildcard pattern
 *   - graceful degradation when Redis is null
 */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { CacheService } from '../../src/platform/cache/cache.service';
import { REDIS_CLIENT } from '../../src/platform/redis/redis.module';
import { MetricsService } from '../../src/platform/metrics/metrics.service';
import {
  createMockPinoLogger,
  createMockRedis,
} from '../mocks/test-mocks';

describe('CacheService', () => {
  let cache: CacheService;
  let redis: ReturnType<typeof createMockRedis>;
  let metrics: { recordCacheHit: jest.Mock; recordCacheMiss: jest.Mock };
  let logger: ReturnType<typeof createMockPinoLogger>;

  beforeEach(async () => {
    redis = createMockRedis();
    metrics = {
      recordCacheHit: jest.fn(),
      recordCacheMiss: jest.fn(),
    };
    logger = createMockPinoLogger();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: Logger, useValue: logger },
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: MetricsService, useValue: metrics },
      ],
    }).compile();

    cache = moduleRef.get(CacheService);
  });

  it('returns cached value on hit', async () => {
    redis.set('foo', JSON.stringify({ x: 1 }), 'EX', 60);
    const v = await cache.get<{ x: number }>('foo');
    expect(v).toEqual({ x: 1 });
    expect(metrics.recordCacheHit).toHaveBeenCalledWith('foo');
  });

  it('returns null on miss', async () => {
    const v = await cache.get('missing');
    expect(v).toBeNull();
    expect(metrics.recordCacheHit).not.toHaveBeenCalled();
  });

  it('tolerates Redis errors in get', async () => {
    (redis.get as jest.Mock) = jest.fn(async () => {
      throw new Error('redis down');
    });
    const v = await cache.get('k');
    expect(v).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('writes JSON-encoded value on set', async () => {
    await cache.set('a', { hello: 'world' }, 30);
    expect(redis.set).toHaveBeenCalledWith('a', JSON.stringify({ hello: 'world' }), 'EX', 30);
  });

  it('tolerates Redis errors in set', async () => {
    (redis.set as jest.Mock) = jest.fn(async () => {
      throw new Error('redis down');
    });
    await expect(cache.set('a', { x: 1 }, 30)).resolves.toBeUndefined();
  });

  it('returns cached value via getOrLoad (hit path)', async () => {
    redis.set('users:1', JSON.stringify({ id: 1 }), 'EX', 60);
    const loader = jest.fn(async () => ({ id: 99 }));
    const v = await cache.getOrLoad('users:1', 60, loader);
    expect(v).toEqual({ id: 1 });
    expect(loader).not.toHaveBeenCalled();
    expect(metrics.recordCacheHit).toHaveBeenCalledWith('users');
  });

  it('calls loader and writes through on miss', async () => {
    const loader = jest.fn(async () => ({ id: 99 }));
    const v = await cache.getOrLoad('users:99', 60, loader);
    expect(v).toEqual({ id: 99 });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(metrics.recordCacheMiss).toHaveBeenCalledWith('users');
    // Fire-and-forget — give it a microtask.
    await new Promise((r) => setImmediate(r));
    expect(redis.set).toHaveBeenCalledWith(
      'users:99',
      JSON.stringify({ id: 99 }),
      'EX',
      60,
    );
  });

  it('propagates loader errors (does not poison the cache)', async () => {
    const loader = jest.fn(async () => {
      throw new Error('db error');
    });
    await expect(cache.getOrLoad('users:100', 60, loader)).rejects.toThrow(
      'db error',
    );
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('invalidates a single key', async () => {
    await cache.invalidate('users:1');
    expect(redis.del).toHaveBeenCalledWith('users:1');
  });

  it('invalidates by SCAN match', async () => {
    redis.scan = jest
      .fn()
      .mockResolvedValueOnce(['10', ['users:1', 'users:2']])
      .mockResolvedValueOnce(['0', ['users:3']]);
    redis.del = jest
      .fn()
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    const n = await cache.invalidate({ match: 'users:*' });
    expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', 'users:*', 'COUNT', 100);
    expect(n).toBe(3);
  });

  it('returns immediately when Redis is null', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: Logger, useValue: logger },
        { provide: REDIS_CLIENT, useValue: null },
        { provide: MetricsService, useValue: metrics },
      ],
    }).compile();
    const c = moduleRef.get(CacheService);
    expect(await c.get('any')).toBeNull();
    await expect(c.set('any', { x: 1 }, 60)).resolves.toBeUndefined();
  });
});
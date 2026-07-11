"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const testing_1 = require("@nestjs/testing");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../src/platform/cache/cache.service");
const redis_module_1 = require("../../src/platform/redis/redis.module");
const metrics_service_1 = require("../../src/platform/metrics/metrics.service");
const test_mocks_1 = require("../mocks/test-mocks");
describe('CacheService', () => {
    let cache;
    let redis;
    let metrics;
    let logger;
    beforeEach(async () => {
        redis = (0, test_mocks_1.createMockRedis)();
        metrics = {
            recordCacheHit: jest.fn(),
            recordCacheMiss: jest.fn(),
        };
        logger = (0, test_mocks_1.createMockPinoLogger)();
        const moduleRef = await testing_1.Test.createTestingModule({
            providers: [
                cache_service_1.CacheService,
                { provide: nestjs_pino_1.Logger, useValue: logger },
                { provide: redis_module_1.REDIS_CLIENT, useValue: redis },
                { provide: metrics_service_1.MetricsService, useValue: metrics },
            ],
        }).compile();
        cache = moduleRef.get(cache_service_1.CacheService);
    });
    it('returns cached value on hit', async () => {
        redis.set('foo', JSON.stringify({ x: 1 }), 'EX', 60);
        const v = await cache.get('foo');
        expect(v).toEqual({ x: 1 });
        expect(metrics.recordCacheHit).toHaveBeenCalledWith('foo');
    });
    it('returns null on miss', async () => {
        const v = await cache.get('missing');
        expect(v).toBeNull();
        expect(metrics.recordCacheHit).not.toHaveBeenCalled();
    });
    it('tolerates Redis errors in get', async () => {
        redis.get = jest.fn(async () => {
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
        redis.set = jest.fn(async () => {
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
        expect(redis.set).toHaveBeenCalledWith('users:99', JSON.stringify({ id: 99 }), 'EX', 60);
    });
    it('propagates loader errors (does not poison the cache)', async () => {
        const loader = jest.fn(async () => {
            throw new Error('db error');
        });
        await expect(cache.getOrLoad('users:100', 60, loader)).rejects.toThrow('db error');
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
        const moduleRef = await testing_1.Test.createTestingModule({
            providers: [
                cache_service_1.CacheService,
                { provide: nestjs_pino_1.Logger, useValue: logger },
                { provide: redis_module_1.REDIS_CLIENT, useValue: null },
                { provide: metrics_service_1.MetricsService, useValue: metrics },
            ],
        }).compile();
        const c = moduleRef.get(cache_service_1.CacheService);
        expect(await c.get('any')).toBeNull();
        await expect(c.set('any', { x: 1 }, 60)).resolves.toBeUndefined();
    });
});

/**
 * CacheService — centralized Redis caching for read-heavy endpoints.
 *
 * Usage:
 *   const data = await this.cache.getOrLoad('products:list:page:1', 60, async () => {
 *     return this.repo.findMany(...);
 *   });
 *
 * Behavior:
 *   - Returns the cached value if present.
 *   - Otherwise invokes `loader`, caches its return for `ttlSeconds`, returns it.
 *   - On loader error: propagates (the cache is not poisoned).
 *   - On Redis error: logs a warning and falls through to `loader`. The API
 *     is never blocked by cache failures.
 *
 * The `prefix` argument is used as the metrics label so cache hit rates
 * can be visualized per resource type.
 */
import { Inject, Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class CacheService {
  constructor(
    private readonly logger: Logger,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
    private readonly metrics: MetricsService,
  ) {}

  /**
   * Returns the cached JSON value at `key`, or `null` if not present.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(key);
      if (raw === null) return null;
      this.metrics.recordCacheHit(this.prefixOf(key));
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(
        { err: (err as Error).message, key },
        'cache get failed',
      );
      return null;
    }
  }

  /**
   * Sets `value` (JSON-encoded) at `key` for `ttlSeconds`.
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(
        { err: (err as Error).message, key },
        'cache set failed',
      );
    }
  }

  /**
   * `get` + `set` combined. Returns the cached value or loads + caches.
   */
  async getOrLoad<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit !== null) return hit;
    this.metrics.recordCacheMiss(this.prefixOf(key));
    const fresh = await loader();
    // Fire-and-forget the cache write so the caller isn't blocked.
    void this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  /**
   * Invalidate one key, or all keys matching `pattern` (`*` wildcard).
   */
  async invalidate(key: string): Promise<void>;
  async invalidate(pattern: { match: string }): Promise<number>;
  async invalidate(target: string | { match: string }): Promise<number | void> {
    if (!this.redis) return;
    try {
      if (typeof target === 'string') {
        await this.redis.del(target);
        return;
      }
      // SCAN-based delete to avoid blocking on large keyspaces.
      let cursor = '0';
      let deleted = 0;
      do {
        const [next, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          target.match,
          'COUNT',
          100,
        );
        cursor = next;
        if (keys.length > 0) {
          deleted += await this.redis.del(...keys);
        }
      } while (cursor !== '0');
      return deleted;
    } catch (err) {
      this.logger.warn(
        { err: (err as Error).message, target },
        'cache invalidate failed',
      );
    }
  }

  private prefixOf(key: string): string {
    return key.split(':')[0] ?? 'unknown';
  }
}
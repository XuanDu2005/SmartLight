# 11 — Caching Architecture

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document defines the **caching strategy** for SmartLight: what to cache, where, TTLs, invalidation, and the cache layers.

---

## 2. Caching Principles

1. **Cache as needed, not by default** — measure first; cache hot paths.
2. **Invalidate on write** — never serve stale data after a mutation.
3. **TTL as backup** — invalidation may fail; TTL is safety net.
4. **Cache miss = OK** — never break the request because of cache.
5. **No PII in cache** — sessions are an exception (with care).

---

## 3. Cache Layers

```
┌─────────────────────────────────────────────────┐
│ 1. HTTP Cache                                    │
│    - Cache-Control headers                       │
│    - CDN (Vercel + Cloudflare)                   │
│    - Per-endpoint TTL                            │
├─────────────────────────────────────────────────┤
│ 2. Application Cache (in-memory)                │
│    - LRU / LFU per process                       │
│    - TinyKV-style; one-shot data                 │
│    - Lost on restart                             │
├─────────────────────────────────────────────────┤
│ 3. Distributed Cache (Redis)                    │
│    - Upstash                                     │
│    - Cross-process consistency                   │
│    - Sessions, idempotency, rate limit           │
├─────────────────────────────────────────────────┤
│ 4. Database Cache                                │
│    - PostgreSQL buffer cache                     │
│    - Neon Read Replicas (V1.5+)                  │
└─────────────────────────────────────────────────┘
```

---

## 4. Redis Cache Strategy

### 4.1 Redis Instance

| Concern | Setup |
|---|---|
| Provider | Upstash (V1) |
| Topology | Single-region, multi-AZ |
| Replication | Upstash HA |
| Persistence | AOF |
| Eviction | `allkeys-lru` |
| Memory | Plan scales with traffic |

### 4.2 Cache Module

```
src/platform/cache/
├── cache.module.ts            # Global
├── cache.service.ts           # Get, set, del, del-pattern
├── redis.provider.ts          # Redis client factory
├── cache-keys.ts              # Key conventions
├── cache.config.ts            # TTL config
└── index.ts
```

### 4.3 Cache Service API

```
interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: { ttl?: number }): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<number>;  // glob-style
  exists(key: string): Promise<boolean>;
  ttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<void>;
  withCache<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T>;
}
```

---

## 5. Cache Key Convention

```
{namespace}:{entity}:{identifier}:{modifier}

Examples:
  catalog:product:{productId}
  catalog:product:{productId}:variants
  catalog:category:tree
  catalog:brands:active
  inventory:variant:{variantId}:availability
  user:profile:{userId}
  user:cart:{cartId}
  user:session:{sessionId}
  promotion:active:{date}
  promotion:voucher:{code}:{cartHash}
  config:feature_flag:{key}
  config:system_config:{key}
  ratelimit:{identifier}:{window}
  idempotency:{key}
```

Rules:
- Lowercase
- Colon-separated
- No PII in keys (use IDs only)

---

## 6. What to Cache

### 6.1 Catalog (Read-Heavy)

| Key | TTL | Invalidated On |
|---|---|---|
| `catalog:category:tree` | 1h | category.created/updated/deleted |
| `catalog:brands:active` | 1h | brand.created/updated/deleted |
| `catalog:product:{id}` | 5min | product.updated |
| `catalog:product:{id}:variants` | 5min | variant.updated |
| `catalog:product:{id}:variants:availability` | 30s | inventory.changed |
| `catalog:products:featured` | 5min | product.featured.changed |
| `catalog:products:best-sellers:{period}` | 10min | order.paid |
| `catalog:products:new-arrivals` | 10min | product.published |
| `catalog:attributes:all` | 30min | attribute.changed |
| `catalog:search:{queryHash}:{filterHash}` | 1min | (no invalidation; rely on TTL) |

### 6.2 Cart / Checkout

| Key | TTL | Invalidated On |
|---|---|---|
| `user:cart:{userId}` | 1h | cart mutation |
| `cart:guest:{sessionToken}` | 7 days | cart mutation |
| `checkout:session:{sessionId}` | 15min | TTL only |
| `cart:voucher:validate:{code}:{cartHash}` | 60s | (TTL only) |

### 6.3 Pricing / Tax

| Key | TTL | Invalidated On |
|---|---|---|
| `tax:rate:{countryCode}` | 1h | tax.rate.changed |
| `shipping:quote:{addressHash}:{itemHash}` | 5min | shipping.rate.changed |

### 6.4 User

| Key | TTL | Invalidated On |
|---|---|---|
| `user:profile:{userId}` | 5min | user.updated |
| `user:addresses:{userId}` | 5min | address.mutated |
| `user:permissions:{userId}` | 15min | role.changed |

### 6.5 Promotion

| Key | TTL | Invalidated On |
|---|---|---|
| `promotion:active:{date}` | 1min | promotion.changed |
| `promotion:voucher:{code}` | 1min | voucher.changed |

### 6.6 Session / Idempotency / Rate Limit

| Key | TTL | Notes |
|---|---|---|
| `session:{sessionId}` | 7 days | Refresh token data |
| `idempotency:{key}` | 24h | Cached response |
| `ratelimit:{identifier}:{window}` | 1min | Rate counter |

---

## 7. Cache Patterns

### 7.1 Cache-Aside (Lazy Loading)

```
async getProduct(id: string): Promise<Product> {
  const cached = await cache.get<Product>(`catalog:product:${id}`);
  if (cached) return cached;
  
  const product = await repo.findById(id);
  if (!product) throw new ResourceNotFoundException('Product', id);
  
  await cache.set(`catalog:product:${id}`, product, { ttl: 300 });
  return product;
}
```

### 7.2 Write-Through

```
async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
  const product = await this.repo.update(id, input);
  await this.cache.set(`catalog:product:${id}`, product, { ttl: 300 });
  await this.cache.delPattern(`catalog:products:list:*`);  // invalidate lists
  return product;
}
```

### 7.3 Cache Invalidation on Event

```
@OnEvent('product.updated')
async handleProductUpdated(event: ProductUpdatedEvent) {
  await this.cache.del(`catalog:product:${event.productId}`);
  await this.cache.del(`catalog:product:${event.productId}:variants`);
}
```

### 7.4 Distributed Lock (Cache Stampede)

```
async getProduct(id: string): Promise<Product> {
  const cached = await cache.get<Product>(`catalog:product:${id}`);
  if (cached) return cached;
  
  return await this.lock.withLock(`lock:catalog:product:${id}`, 5000, async () => {
    // double-check
    const cached2 = await cache.get<Product>(`catalog:product:${id}`);
    if (cached2) return cached2;
    
    const product = await repo.findById(id);
    await cache.set(`catalog:product:${id}`, product, { ttl: 300 });
    return product;
  });
}
```

---

## 8. Cache Invalidation Strategy

### 8.1 Invalidation by Domain Event

When a state-changing event fires, the cache layer subscribes and invalidates:

| Event | Invalidates |
|---|---|
| `product.updated` | `catalog:product:{id}` and list caches |
| `product.published` | lists |
| `inventory.low_stock` | availability |
| `price.changed` | product, cart |
| `user.profile_updated` | `user:profile:{id}` |
| `role.changed` | `user:permissions:{id}` |
| `voucher.activated` | `promotion:active:*` |

### 8.2 TTL as Safety Net

Every cache entry has a TTL. If invalidation fails, TTL ensures eventual consistency.

### 8.3 Versioned Keys (Optional)

For very hot data, include a version in the key:

```
catalog:products:list:v{configVersion}:{filterHash}
```

When `configVersion` bumps, all old keys become orphaned and TTL out.

---

## 9. Cache Stampede Prevention

For popular keys (e.g., homepage), prevent thundering herd:

| Strategy | Implementation |
|---|---|
| **Lock-based** | Distributed lock during regeneration |
| **Probabilistic** | Recompute before TTL expiry (XFetch algorithm) |
| **Stale-while-revalidate** | Serve stale + async refresh |

Default: **stale-while-revalidate** for public catalog; **lock-based** for transactional data.

---

## 10. Negative Caching

Cache "not found" too:

```
const key = `catalog:product:${id}`;
const cached = await cache.get(key);  // can be null OR sentinel
if (cached === NOT_FOUND_SENTINEL) throw new ResourceNotFoundException('Product', id);
```

TTL: 30 seconds (so soft-deleted items eventually show).

---

## 11. Cache Warming (Post-Deploy)

On startup, prime hot caches:

```
async onApplicationBootstrap() {
  await Promise.all([
    this.cache.set('catalog:category:tree', await this.repo.getCategoryTree(), { ttl: 3600 }),
    this.cache.set('catalog:brands:active', await this.repo.getActiveBrands(), { ttl: 3600 }),
    this.cache.set('catalog:attributes:all', await this.repo.getAllAttributes(), { ttl: 1800 }),
  ]);
}
```

---

## 12. Cache Metrics

Tracked per cache key:

- Hit rate (per key, per namespace)
- Miss rate
- Average latency (hit / miss)
- Eviction count
- Memory usage (estimated)

Exposed via `/v1/admin/dashboard/cache-stats` (admin only).

---

## 13. Cache Configuration

### 13.1 TTL Defaults

```
const DEFAULT_TTL = {
  PUBLIC_READ: 60,         // 1 min
  CATALOG_ENTITY: 300,     // 5 min
  CATEGORY_TREE: 3600,     // 1h
  USER_PROFILE: 300,       // 5 min
  PERMISSIONS: 900,        // 15 min
  SEARCH: 60,              // 1 min
  AVAILABILITY: 30,        // 30s
  IDEMPOTENCY: 86400,      // 24h
};
```

### 13.2 Per-Environment

| Env | Behavior |
|---|---|
| local | No cache (for testing) |
| preview | Reduced TTLs |
| staging | Same as prod |
| production | Full TTLs |

---

## 14. Cache Failure Handling

| Failure | Behavior |
|---|---|
| Redis down | Fall through to DB; log warning; degrade gracefully |
| Cache deserialization error | Treat as miss; log; refetch |
| Cache write timeout | Continue (cache is best-effort) |

> Cache is **never** the source of truth. The database is.

---

## 15. Multi-Region (V2)

In V2 with multiple regions:

- Each region has its own Redis
- Cross-region via Redis replication or pub/sub
- TTL-based consistency acceptable

---

## 16. Coverage Validation

| Check | Status |
|---|---|
| Cache layers documented | ✓ |
| Cache key convention | ✓ |
| Cache contents by context | ✓ |
| Cache patterns (aside, write-through, etc.) | ✓ |
| Invalidation strategy | ✓ |
| Stampede prevention | ✓ |
| Negative caching | ✓ |
| Cache warming | ✓ |
| Metrics | ✓ |
| Configuration | ✓ |
| Failure handling | ✓ |

---

## 17. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial caching architecture: Redis strategy, keys, patterns, invalidation |

---

**End of 11_CACHING_ARCHITECTURE.md**
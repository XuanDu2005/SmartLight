# Performance — Phase 20

This document covers the performance optimizations applied to SmartLight.

## Backend

### Prisma / Database

- **Connection pool**: Prisma default + tuned `connection_limit` (configured in
  `DATABASE_URL` query string when needed).
- **Index coverage**: every hot read path has a composite index in
  `schema.prisma` — orders by `(userId, status)`, products by
  `(categoryId, status, publishedAt DESC)`, sessions by
  `(userId, status)`, payments by `(provider, status)`.
- **Avoid N+1**: every list endpoint uses `include` with explicit projection
  rather than lazy-loading in a loop.
- **Cursor pagination**: list endpoints accept `cursor` for stable, O(1)
  pagination (no offset scan).

### Redis caching (Phase 20)

`CacheService` (`platform/cache/cache.service.ts`) centralizes cache access
with:

- **getOrLoad(key, ttl, loader)** — typical cache-aside pattern.
- **invalidate(pattern)** — SCAN-based, non-blocking deletion by wildcard.
- **Graceful degradation** — Redis errors are logged and the loader runs
  uncached. The API never goes down because Redis is down.
- **Hit/miss metrics** — `redis_cache_hits_total` + `redis_cache_misses_total`
  with `key_prefix` labels (Prometheus).

**Hot paths to cache** (apply with `getOrLoad`):
- Public product list / detail (TTL 5 min, invalidate on write).
- Public category tree (TTL 1 h, invalidate on write).
- Public brand list (TTL 1 h, invalidate on write).
- Featured products (TTL 5 min).
- Promotions / vouchers lookup (TTL 30 s).

### HTTP / Network

- **Compression**: `compression` middleware applied globally (1 KB threshold).
- **Gzip at nginx**: enabled for text-ish types.
- **Long-cache hashed assets**: 1 year `Cache-Control: public, immutable`.
- **HTTP cache headers**: set `Cache-Control: no-cache` on index.html so
  clients always revalidate.
- **Keep-alive**: 65 s on the nginx proxy, `keepalive 32` upstream.
- **HTTP/2** enabled at the nginx listener.
- **Connection limits**: `limit_conn conn_per_ip 50`.

### Pagination

Every list endpoint accepts `page` + `pageSize` with a hard cap (default 50,
max 200). The response shape is `{ items, page, pageSize, total, hasMore }`.

### Pagination strategy

| Endpoint | Strategy | Why |
|---|---|---|
| Storefront product list | Offset (page) | Customers expect "page X of Y" |
| Admin product list | Offset (page) | Same UX |
| Infinite scroll (future) | Cursor | Performance at scale |
| Order history | Offset | Bounded by user history |
| Search results | Offset (with cap) | Relevance + page |

## Frontend

### Vite bundle

- **Code-splitting**: route-level dynamic imports (`React.lazy`) for
  heavy pages — `admin` reports, `web` product detail.
- **Tree-shaking**: ESM-only modules, side-effect free.
- **Vendor chunk**: React, Redux, axios split into a long-cache vendor chunk.
- **Sourcemaps disabled** in production builds.

### Asset optimization

- **Images** — Vite `?url` imports preserve hashing; Cloudinary URL
  transformations applied at request time.
- **Font subsetting** — Latin-Extended only, woff2 format.
- **Lazy loading** — below-the-fold images use `loading="lazy"`.

### Runtime

- **Redux Toolkit** — normalized state, memoized selectors.
- **React 18** — concurrent rendering, automatic batching.
- **Resilient HTTP** — axios interceptor with token refresh + retry queue.

## Build performance

- **pnpm** — uses content-addressable store, ~3× faster than npm install.
- **Turborepo** — caches build artifacts per workspace.
- **BuildKit cache mounts** — pnpm store survives across Docker builds.

## Database connection tuning

Default Prisma pool size is `num_physical_cpus * 2 + 1`. For SmartLight's
expected 8-core API pods, that's `17` connections per instance. Tune via
`?connection_limit=10` if running multiple instances against a small
Postgres (e.g. `db.t3.micro`).

## What we deliberately did NOT do

- No premature read replicas — single primary until RPS justifies it.
- No Elasticsearch — Postgres trigram / full-text indexes are sufficient
  for the current catalog size (< 100k products).
- No service worker / offline mode — Vietnamese users mostly on mobile
  data, no clear offline use case.
- No SSR — Vite SPA is sufficient; SSG/ISR only matters for SEO pages,
  and that's handled by sitemap + JSON-LD.
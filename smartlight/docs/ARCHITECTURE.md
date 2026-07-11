# SmartLight — Architecture

## High-Level Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              Browser (Vite SPA)                          │
│  apps/web (Customer)         apps/admin (Staff)                          │
└────────────┬─────────────────────────────────────┬──────────────────────┘
             │ HTTPS (nginx reverse proxy)          │
             ▼                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  NestJS API (apps/api)                                                   │
│  ┌─────────────┬─────────────┬──────────────┬──────────────┬───────────┐ │
│  │   Auth      │   Catalog   │  Inventory   │    Cart      │ Checkout  │ │
│  ├─────────────┼─────────────┼──────────────┼──────────────┼───────────┤ │
│  │   Orders    │  Payments   │  Shipping    │  Promotions  │  Review   │ │
│  ├─────────────┼─────────────┼──────────────┼──────────────┼───────────┤ │
│  │ Notification│   Media     │   Admin      │   Audit      │  Users    │ │
│  └─────────────┴─────────────┴──────────────┴──────────────┴───────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
             │                              │
             ▼                              ▼
       ┌──────────┐                  ┌──────────┐
       │ Postgres │                  │  Redis   │
       │ (Prisma) │                  │ (cache + │
       │          │                  │  BullMQ) │
       └──────────┘                  └──────────┘
```

## Backend (NestJS) — Modular Monolith

We chose **modular monolith** over microservices for V1 because:

1. **Single deploy unit** — easier operations, smaller blast radius.
2. **Shared schema** — products, variants, prices live in one DB; no inter-service consistency.
3. **Lower latency** — function calls instead of HTTP.
4. **Easier to refactor later** — module boundaries enforce separation.

When to split:
- > 5M MAU
- A team owns a single module end-to-end
- A module has different scaling needs (e.g. notifications need 10× more workers)

### Bounded contexts

| Module | Responsibility | External deps |
|---|---|---|
| `auth` | JWT, OAuth, sessions | argon2, passport-jwt, passport-google, passport-facebook |
| `users` | Customer + admin profiles | — |
| `catalog` | Products, variants, images, categories, brands | Cloudinary (media) |
| `inventory` | Stock levels, reservations, movements, thresholds | — |
| `cart` | Persistent cart, anonymous + authenticated | — |
| `checkout` | Address, shipping calc, payment intent | (delegates) |
| `orders` | Order lifecycle, status history, audit | — |
| `payments` | VNPay, MoMo, ZaloPay, PayPal integration + webhooks | (external) |
| `shipping` | GHN, GHTK, Viettel Post, internal carriers | (external) |
| `promotions` | Promotion engine + voucher codes | — |
| `review` | Product reviews + ratings | — |
| `notification` | Email / SMS via Resend + adapters | BullMQ, Resend |
| `media` | Image upload, transformation, optimization | Cloudinary |
| `admin` | Admin-specific endpoints (RBAC) | — |
| `audit` | Audit log of admin actions | — |

### Platform (cross-cutting)

| Platform module | Purpose |
|---|---|
| `platform/config` | Env loading + validation |
| `platform/database` | Prisma client + lifecycle |
| `platform/redis` | ioredis client + null-safe DI token |
| `platform/queue` | BullMQ queue factory |
| `platform/logger` | Pino config + correlation IDs |
| `platform/metrics` | Prometheus registry + /metrics |
| `platform/cache` | Redis cache-aside helper |
| `platform/health` | /health, /health/ready, /health/status |
| `platform/filters` | Global exception filter |

### Guard order

```
Request
  → ThrottlerGuard  (rate limit)
  → JwtAuthGuard    (extract + verify JWT, attach user)
  → RolesGuard      (RBAC)
  → PermissionsGuard (ABAC)
  → Controller
```

## Database (PostgreSQL + Prisma)

### Schema highlights

- `Product` ↔ `ProductVariant` (1-N) — variants hold SKU + price + attributes
- `Product` ↔ `ProductImage` (1-N) — display-order + alt text
- `Product` ↔ `Category` (N-1) + `Brand?` (N-1)
- `Cart` ↔ `CartItem` (1-N) + `ProductVariant` (N-1)
- `Order` ↔ `OrderItem` (1-N, immutable price snapshot) + `OrderStatusHistory`
- `Payment` ↔ `PaymentTransaction` (1-N) + `PaymentWebhook` (1-N)
- `Promotion` ↔ `Voucher` (1-N)
- `StockReservation` — soft lock during checkout; converted to permanent decrement on payment success
- `User` + `AdminUser` — separate tables; role discrimination via separate sessions

### Indexes

Every hot read path has a composite index in `schema.prisma`:

| Table | Index | Use case |
|---|---|---|
| `product` | `(categoryId, status, publishedAt DESC)` | Category listing |
| `product` | `(brandId, status)` | Brand listing |
| `product` | `(status, publishedAt DESC)` | New arrivals |
| `product` | `(isFeatured, status)` | Homepage featured |
| `order` | `(userId, status)` | User order history |
| `order` | `(status, createdAt DESC)` | Admin order queue |
| `payment` | `(provider, status)` | Reconciliation |
| `session` | `(userId, status)` + `(status, expiresAt)` | Session sweep |
| `stock_reservation` | `(checkoutSessionId)` + `(cartId)` | Checkout cleanup |

### Migrations

```bash
# Dev
pnpm --filter @smartlight/api prisma:migrate

# Prod
pnpm --filter @smartlight/api prisma:deploy

# Seed (dev/demo only — NEVER run in prod)
pnpm --filter @smartlight/api prisma:seed
```

## Frontend Architecture

### apps/web (Customer storefront)

```
src/
├── app/         (router setup)
├── api/         (axios client + typed endpoints)
├── components/  (reusable presentational)
├── features/    (domain-specific: cart, checkout, product)
├── hooks/       (custom React hooks)
├── layouts/     (page chrome: header, footer, nav)
├── pages/       (route-level components)
├── store/       (Redux Toolkit slices: cart)
├── types/       (TS types mirroring API DTOs)
├── utils/       (formatting, helpers)
└── lib/         (AuthContext, axios instance)
```

- **React 18** + **TypeScript** + **Vite**
- **Routing**: React Router 6 with code-splitting via `React.lazy`
- **State**: Redux Toolkit for cart; Context API for auth
- **HTTP**: axios with interceptors for token refresh + 401 handling
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts (admin only)
- **UI**: shadcn-style components in `packages/ui`

### apps/admin (Staff dashboard)

Same structure. Differences:
- **Stricter CSP** — `frame-ancestors 'none'`
- **Stricter route guards** — requires admin role
- **Heavy widgets** — Recharts, data tables, exporters

## Shared Packages

| Package | Purpose |
|---|---|
| `@smartlight/shared` | DTOs, types, error codes, validation schemas |
| `@smartlight/config` | Env loading + zod validation (api / web / admin) |
| `@smartlight/ui` | Reusable UI components (Button, Card, Drawer, …) |

## Network Topology (Production)

```
public internet
   │
   ▼
[ nginx :80, :443 ]    ◀── only public-facing entry
   │
   ├─ /v1/*    → upstream api:4000
   ├─ /        → upstream web:5173 (SPA)
   └─ /admin/* → upstream admin:5174 (SPA)
                        │
              ┌─────────┴──────────┐
              ▼                    ▼
       [ api:4000 ]       [ web/admin SPAs ]
              │
       ┌──────┴──────┐
       ▼             ▼
[ postgres ]   [ redis ]
```

3 internal Docker networks:
- `smartlight_frontend` — nginx ↔ web/admin
- `smartlight_backend` — nginx ↔ api
- `smartlight_data` — api ↔ postgres/redis

Postgres and Redis are **never** reachable from the public internet — only
the API talks to them.

## Request Lifecycle

```
1. Browser → nginx (TLS termination, rate limit, security headers)
2. nginx → api container (proxy_pass)
3. CorrelationIdMiddleware (UUID or echoed X-Request-ID)
4. Helmet (security headers)
5. Compression (gzip if >1 KB)
6. ThrottlerGuard (per-IP rate limit)
7. JwtAuthGuard (extract user from Authorization / cookie)
8. RolesGuard + PermissionsGuard (RBAC + ABAC)
9. ValidationPipe (whitelist + transform)
10. Controller (business logic via services)
11. Service (transactional via Prisma)
12. CacheService (read-through when applicable)
13. Response with X-Request-ID header
14. Pino logs the request + response time
15. MetricsService records http_requests_total + duration
```

## Why these choices

- **NestJS over Express + raw**: opinionated structure, DI, decorators, guards.
- **Prisma over TypeORM**: better TS types, easier migrations, faster DX.
- **Postgres over MySQL**: better JSON support, row-level security (future).
- **Redis over Memcached**: AOF persistence, pub/sub, streams, sorted sets.
- **Pino over Winston**: ~5× faster, better TS types, JSON-first.
- **pnpm over npm/yarn**: content-addressable store, hardlinks save disk.
- **Turborepo over Lerna/Nx**: simpler config, great caching.
- **nginx over Traefik/Caddy**: battle-tested, easy TLS, low memory.
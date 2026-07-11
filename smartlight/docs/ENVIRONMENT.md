# SmartLight — Environment Variables Reference

This is the comprehensive reference for every environment variable SmartLight
consumes. Variables are grouped by the service that consumes them.

> **Important:** Never commit `.env.prod`. Always start from `.env.example`
> and rotate secrets per environment.

## Application Metadata

| Variable | Default | Required | Description |
|---|---|---|---|
| `APP_VERSION` | `dev` | no | Image tag, surfaced in `/health/status` |
| `LOG_LEVEL` | `info` | no | `trace` / `debug` / `info` / `warn` / `error` / `fatal` |
| `NODE_ENV` | `development` | no | `development` / `production` / `test` |

## API (apps/api)

### Server

| Variable | Default | Required | Description |
|---|---|---|---|
| `API_PORT` | `4000` | no | HTTP listener port |
| `API_BASE_URL` | `http://localhost:4000` | yes (in prod) | Used in OAuth redirect_uri |
| `API_CORS_ORIGINS` | `http://localhost:5173,http://localhost:5174` | yes | Comma-separated allowed origins |

### Database

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Prisma connection string (`postgresql://...`) |
| `DIRECT_URL` | no | Bypasses PgBouncer for migrations (`postgresql://...`) |

### Redis

| Variable | Required | Description |
|---|---|---|
| `REDIS_URL` | no | `redis://...`. Code degrades gracefully if absent. |

### JWT

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_ACCESS_SECRET` | yes | — | Min 32 bytes. `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | yes | — | Min 32 bytes. `openssl rand -hex 64` |
| `JWT_ACCESS_TTL_SEC` | no | `900` | Access-token TTL (15 min) |
| `JWT_REFRESH_TTL_SEC` | no | `604800` | Refresh-token TTL (7 d) |
| `JWT_REMEMBER_ME_TTL_SEC` | no | `2592000` | Remember-me TTL (30 d) |

### Rate limiting

| Variable | Default | Description |
|---|---|---|
| `THROTTLE_TTL_SEC` | `60` | Window size (seconds) |
| `THROTTLE_LIMIT` | `120` | Max requests per window per IP |

### OAuth

| Variable | Description |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth app client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth app client secret |
| `GOOGLE_OAUTH_CALLBACK_URL` | Default `https://api.smartlight.vn/v1/auth/oauth/google/callback` |
| `FACEBOOK_OAUTH_CLIENT_ID` | Facebook app ID |
| `FACEBOOK_OAUTH_CLIENT_SECRET` | Facebook app secret |
| `FACEBOOK_OAUTH_CALLBACK_URL` | Default `https://api.smartlight.vn/v1/auth/oauth/facebook/callback` |

### Frontend URLs

| Variable | Description |
|---|---|
| `FRONTEND_BASE_URL` | Customer storefront URL (used in OAuth redirect) |
| `ADMIN_BASE_URL` | Admin SPA URL |

### Cloudinary (image storage)

| Variable | Description |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account |
| `CLOUDINARY_API_KEY` | API key |
| `CLOUDINARY_API_SECRET` | API secret |
| `STORAGE_PROVIDER` | `cloudinary` (V1) |

### Email (Resend)

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Verified sender address |

### Payment providers (Vietnam)

| Variable | Description |
|---|---|
| `PAYMENT_VNPAY_TMN_CODE` | VNPay terminal code |
| `PAYMENT_VNPAY_HASH_SECRET` | VNPay hash secret |
| `PAYMENT_MOMO_PARTNER_CODE` | MoMo partner code |
| `PAYMENT_MOMO_ACCESS_KEY` | MoMo access key |
| `PAYMENT_MOMO_SECRET_KEY` | MoMo secret key |
| `PAYMENT_ZALOPAY_APP_ID` | ZaloPay app ID |
| `PAYMENT_ZALOPAY_KEY1` | ZaloPay key 1 |
| `PAYMENT_ZALOPAY_KEY2` | ZaloPay key 2 |

### Shipping carriers

| Variable | Description |
|---|---|
| `SHIPPING_GHN_TOKEN` | Giao Hàng Nhanh token |
| `SHIPPING_GHTK_TOKEN` | Giao Hàng Tiết Kiệm token |
| `SHIPPING_VIETTEL_POST_TOKEN` | Viettel Post token |

### Monitoring (Phase 20)

| Variable | Default | Description |
|---|---|---|
| `METRICS_ENABLED` | `false` | Enable `/metrics` endpoint |
| `METRICS_SCRAPE_TOKEN` | — | Bearer token required by Prometheus |

## Customer Web (apps/web)

Only `VITE_*` prefixed vars are bundled. Others are dropped.

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API URL (baked at build) |
| `VITE_APP_NAME` | Public app name |
| `VITE_DEFAULT_LOCALE` | Locale (`vi-VN`) |
| `VITE_SENTRY_DSN` | Sentry DSN for client errors |
| `VITE_GTAG_ID` | Google Analytics tag |
| `VITE_META_PIXEL_ID` | Meta Pixel ID |
| `VITE_ENABLE_REVIEWS` | Feature flag |
| `VITE_ENABLE_WISHLIST` | Feature flag |
| `VITE_ENABLE_CHAT` | Feature flag |

## Admin (apps/admin)

| Variable | Description |
|---|---|
| `VITE_ADMIN_API_BASE_URL` | Backend API URL (baked at build) |
| `VITE_ADMIN_APP_NAME` | Public admin app name |
| `VITE_DEFAULT_LOCALE` | Locale |
| `VITE_SENTRY_DSN` | Sentry DSN (separate project for admin) |
| `VITE_ENABLE_AUDIT_LOG` | Feature flag |
| `VITE_ENABLE_TWO_FACTOR` | Feature flag |

## Production Secrets Checklist

```bash
# Generate strong secrets
openssl rand -hex 64     # JWT secrets
openssl rand -hex 32     # API base URL hmac, etc.
openssl rand -base64 48  # METRICS_SCRAPE_TOKEN
```

Always store secrets in:
- GitHub Actions secrets (for CI)
- Docker secrets / HashiCorp Vault / AWS Secrets Manager (for prod)
- **Never** in env files committed to git.

## Env Validation

`apps/api` runs `class-validator`-based env validation at boot. If a
required var is missing, the process exits with a clear error BEFORE
binding to a port — no partial-config boots.

See `apps/api/src/config/env.validation.ts` for the source of truth.
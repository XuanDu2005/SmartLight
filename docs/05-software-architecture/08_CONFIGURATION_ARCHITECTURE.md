# 08 — Configuration Architecture

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document describes how SmartLight **loads, validates, distributes, and protects configuration**: environment variables, runtime config, secrets, and feature flags.

---

## 2. Configuration Layers

```
┌────────────────────────────────────────────────┐
│ 1. Build-time                                  │
│    - Bundled constants                         │
│    - Compile flags                             │
├────────────────────────────────────────────────┤
│ 2. Environment Variables (env)                 │
│    - Per-environment overrides                 │
│    - Secrets, DSNs, flags                      │
├────────────────────────────────────────────────┤
│ 3. Database (system_config)                    │
│    - Runtime mutable config                    │
│    - Audited, cached                           │
├────────────────────────────────────────────────┤
│ 4. Feature Flags (feature_flag)                │
│    - Boolean / string / number / json          │
│    - Per-user / per-segment overrides          │
└────────────────────────────────────────────────┘
```

---

## 3. Environment Variables

### 3.1 Categories

| Category | Examples | Required |
|---|---|---|
| **Runtime** | `NODE_ENV`, `PORT`, `APP_VERSION` | Yes |
| **Database** | `DATABASE_URL` | Yes |
| **Cache / Queue** | `REDIS_URL` | Yes |
| **Auth** | `JWT_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` | Yes |
| **Payment Providers** | `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`, `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET` | Yes (per provider) |
| **Shipping Providers** | `GHN_TOKEN`, `GHTK_TOKEN`, `VIETTEL_POST_TOKEN` | Yes |
| **Storage** | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Yes |
| **Email** | `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME` | Yes |
| **External URLs** | `APP_URL`, `API_URL`, `STOREFRONT_URL`, `ADMIN_URL` | Yes |
| **CORS** | `CORS_ALLOWED_ORIGINS` | Yes |
| **Rate Limit** | `RATE_LIMIT_*` | No (defaults) |
| **Telemetry** | `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT` | No |
| **Feature Flags** | `FF_*` (initial defaults) | No |

### 3.2 Naming Convention

- `UPPER_SNAKE_CASE`
- Prefix by category: `DB_`, `REDIS_`, `JWT_`, `EMAIL_`, etc.
- Secrets prefixed `SECRET_` for clarity (e.g., `SECRET_VNPAY_HASH`)

### 3.3 Storage by Environment

| Env | Source |
|---|---|
| Local | `.env.local` (gitignored) |
| Preview (PR) | GitHub Actions secrets |
| Staging | Railway/Render env vars |
| Production | Neon/Vercel secret manager |

---

## 4. Configuration Module

### 4.1 Structure

```
src/platform/config/
├── config.module.ts          # Global module
├── env.schema.ts             # Zod schema for validation
├── env.loader.ts             # Loads from process.env
├── app.config.ts             # App-level (name, version, env)
├── database.config.ts        # DB connection
├── redis.config.ts           # Redis connection
├── auth.config.ts            # JWT, refresh, lockout
├── payment.config.ts         # Payment providers
├── shipping.config.ts        # Shipping providers
├── email.config.ts           # Email provider
├── storage.config.ts         # Cloudinary
├── cors.config.ts            # CORS origins
├── rate-limit.config.ts      # Rate limit defaults
└── index.ts                  # Re-exports typed ConfigService
```

### 4.2 Validation

At startup, all env vars are validated against the schema:

```
import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  // ...
});
```

> **Fail fast:** invalid env = startup failure.

### 4.3 Typed Access

```
@Injectable()
class DatabaseService {
  constructor(private config: ConfigService<EnvSchema>) {}
  
  getUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }
}
```

---

## 5. Secrets Handling

### 5.1 Categorization

| Secret Type | Storage |
|---|---|
| JWT signing key | Env var |
| DB password | Neon secret store |
| Third-party API keys | Env var per env |
| Encryption keys (V1.5+) | Managed KMS (Vercel/Railway) |

### 5.2 Rules

- ✗ No secrets in code
- ✗ No secrets in git
- ✗ No secrets in error messages
- ✗ No secrets in logs (Pino redact)
- ✓ Use Vercel/Railway/Neon secret manager
- ✓ Rotate quarterly
- ✓ Read at startup only (not per-request)

### 5.3 Secret Rotation

```
1. Add new key alongside old (zero-downtime)
2. Update consumers to recognize new key
3. Mark old key as deprecated
4. Remove old key after grace period
```

JWT key rotation (V1.5+): dual-key validation; new tokens with new key; old tokens valid until expiry.

---

## 6. Runtime Configuration (Database)

### 6.1 `system_config` Table

Holds runtime-mutable config:

| Column | Type | Description |
|---|---|---|
| `id` | UUID | PK |
| `key` | string | Unique key (e.g., `payment.vnpay.enabled`) |
| `value` | JSONB | Value |
| `valueType` | enum | `boolean`, `string`, `number`, `json` |
| `description` | string | Admin-facing description |
| `category` | string | Grouping |
| `isSecret` | boolean | Whether to redact in UI |
| `updatedBy` | UUID | Last modifier |
| `updatedAt` | timestamp | Last update |
| `createdAt` | timestamp | Creation |

### 6.2 Access Pattern

```
class ConfigService {
  async get<T>(key: string): Promise<T | null> {
    // 1. Check cache (Redis)
    const cached = await this.cache.get(`config:${key}`);
    if (cached) return JSON.parse(cached);
    
    // 2. Fall back to DB
    const row = await this.db.systemConfig.findUnique({ where: { key } });
    if (!row) return null;
    
    // 3. Cache for 5 min
    await this.cache.set(`config:${key}`, JSON.stringify(row.value), { ttl: 300 });
    return row.value as T;
  }
  
  async set(key, value, actor): Promise<void> {
    await this.db.systemConfig.upsert({ where: { key }, create: { key, value, ... }, update: { value, updatedBy: actor } });
    await this.cache.del(`config:${key}`);
    this.events.emit('system_config.changed', { key, value });
  }
}
```

### 6.3 Audit

Every config change recorded:

```
audit_log {
  action: 'system_config.updated',
  entityType: 'SystemConfig',
  entityId: 'payment.vnpay.enabled',
  actor: { id, type: 'admin' },
  before: 'true',
  after: 'false',
  ...
}
```

---

## 7. Feature Flags

### 7.1 `feature_flag` Table

| Column | Type | Description |
|---|---|---|
| `id` | UUID | PK |
| `key` | string | URL-safe unique key (e.g., `use_ai_search`) |
| `description` | string | What it controls |
| `valueType` | enum | `boolean`, `string`, `number`, `json` |
| `defaultValue` | JSONB | Default when no override |
| `enabled` | boolean | Whether the flag is active |
| `updatedBy` | UUID | Last modifier |
| `createdAt`, `updatedAt` | timestamp | |

### 7.2 Override Table

| Column | Type | Description |
|---|---|---|
| `id` | UUID | PK |
| `flagId` | UUID | FK to feature_flag |
| `targetType` | enum | `user`, `segment`, `percentage` |
| `targetId` | string | User ID, segment name, or percentage bucket |
| `value` | JSONB | Override value |
| `expiresAt` | timestamp | Optional expiry |
| `createdBy`, `createdAt` | | |

### 7.3 Resolution

```
FeatureFlagService.isEnabled(key, context?): boolean
  1. Check user override (if context.userId)
  2. Check percentage bucket (if percentage rollouts)
  3. Check segment override (if context.segment)
  4. Fall back to defaultValue
```

### 7.4 Use Cases

| Flag | Default | Purpose |
|---|---|---|
| `use_ai_search` | false | Toggle AI search |
| `enable_paypal` | true | Provider toggle |
| `enable_ghn` | true | Shipping provider toggle |
| `rate_limit.cart.enabled` | true | Disable in emergencies |
| `payment.bank_transfer.enabled` | false | V1.1 feature |
| `experiment.new_checkout` | false | A/B test |

### 7.5 Caching

Resolved flags cached in Redis:

```
Key: feature_flag:{key}
TTL: 5 minutes
Invalidation: on `feature_flag.changed` event
```

---

## 8. Environment Separation

### 8.1 Environments

| Env | Purpose | Data |
|---|---|---|
| **local** | Developer machine | Local Postgres / Redis |
| **preview** | PR review | Ephemeral Neon branch + Upstash |
| **staging** | Pre-prod QA | Anonymized production copy |
| **production** | Live | Real data |

### 8.2 Configuration per Environment

| Setting | Local | Preview | Staging | Production |
|---|---|---|---|---|
| LOG_LEVEL | debug | info | info | warn |
| DEBUG_MODE | true | false | false | false |
| SEED_DATA | true | true | false | false |
| EMAIL_DELIVERY | mailtrap | mailtrap | sandbox | real |
| PAYMENT_MODE | sandbox | sandbox | sandbox | live |
| CDN | cloudinary | cloudinary | cloudinary | cloudinary |
| METRICS | off | off | on | on |

---

## 9. Local Development Configuration

### 9.1 .env.local Structure

```
# App
NODE_ENV=development
PORT=3000
APP_NAME=smartlight
APP_VERSION=0.1.0

# Database
DATABASE_URL=postgresql://smartlight:smartlight@localhost:5432/smartlight_dev

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=dev-secret-at-least-32-characters-long-not-for-prod
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800

# Payment (sandbox)
VNPAY_TMN_CODE=TEST_VNPAY
VNPAY_HASH_SECRET=TEST_SECRET

# Shipping (sandbox)
GHN_TOKEN=TEST_TOKEN

# Cloudinary (dev)
CLOUDINARY_CLOUD_NAME=dev
CLOUDINARY_API_KEY=dev
CLOUDINARY_API_SECRET=dev

# Email (mailtrap)
EMAIL_PROVIDER=mailtrap
EMAIL_FROM=hello@smartlight.vn

# URLs
APP_URL=http://localhost:3000
STOREFRONT_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

# Telemetry
SENTRY_DSN=
```

### 9.2 .env.example (committed)

A template `.env.example` ships with the repo, documenting all required vars.

---

## 10. Configuration Loading Order

```
1. process.env (set by runtime)
2. .env.local (local dev only)
3. .env (commit-safe defaults)
4. Schema validation (Zod)
5. Type-coerced access via ConfigService
```

If schema validation fails, **startup fails loudly**.

---

## 11. Hot Reload of Runtime Config

For `system_config` and `feature_flag` changes, no restart required:

```
Admin updates flag
  ↓
POST /v1/admin/feature-flags
  ↓
Cache invalidated
  ↓
Next request reads new value
```

For env var changes, restart required (with appropriate cache warming).

---

## 12. Configuration Validation at Runtime

| Concern | Validation |
|---|---|
| Required env vars present | Zod schema at startup |
| DSNs reachable | Connection check at startup |
| JWT secret length | ≥ 32 chars |
| Currency consistency | All money values in xu |
| Vietnamese locale | `vi-VN` default |

---

## 13. Configuration Anti-Patterns

| Anti-Pattern | Forbidden Because |
|---|---|
| Hard-coded URLs in code | Should come from config |
| Hard-coded secrets | Should come from env |
| Reading env directly (`process.env.X`) in modules | Bypass ConfigService; untyped |
| Reading DB config outside startup | Risk of stale values |
| Sharing config across envs (e.g., dev using prod DSN) | Data leakage |
| Logging secrets | Compliance violation |

---

## 14. Coverage Validation

| Check | Status |
|---|---|
| Configuration layers defined | ✓ |
| Env var catalog | ✓ |
| Config module structure | ✓ |
| Validation strategy (Zod) | ✓ |
| Secrets management | ✓ |
| Runtime config (DB) | ✓ |
| Feature flags | ✓ |
| Environment separation | ✓ |
| Local dev config | ✓ |
| Hot reload strategy | ✓ |
| Anti-patterns documented | ✓ |

---

## 15. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial configuration architecture: env, secrets, runtime config, flags |

---

**End of 08_CONFIGURATION_ARCHITECTURE.md**
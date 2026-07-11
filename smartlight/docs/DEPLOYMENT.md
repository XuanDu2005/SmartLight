# SmartLight — Deployment Guide

This document walks through deploying SmartLight to a production environment.

## Architecture Overview

```
                ┌─────────────────────────────────────────────────────┐
                │                    nginx (TLS)                      │
                │  :443 ─┬─ /              → web SPA                  │
                │        ├─ /v1/*         → api (NestJS)              │
                │        └─ /admin/*      → admin SPA                 │
                │  :80  ─→ 301 HTTPS                                   │
                └─────┬───────────┬───────────────────────────────────┘
                      │           │
              ┌───────▼────┐ ┌────▼─────────┐
              │  web SPA   │ │  admin SPA   │
              │  (nginx)   │ │  (nginx)     │
              └────────────┘ └──────────────┘
                      │
              ┌───────▼────────────┐
              │  api (NestJS)      │
              │  :4000 inside     │
              └─┬────────────┬─────┘
                │            │
        ┌───────▼──┐  ┌──────▼─────┐
        │ postgres │  │   redis    │
        │  (DB)    │  │ (cache+q)  │
        └──────────┘  └────────────┘
```

## Deployment Options

### Option A — Docker Compose (single-host, recommended for SMB)

Best for: < 100k MAU, single-region, small team.

```bash
# 1. Clone the repo
git clone https://github.com/<org>/smartlight.git
cd smartlight

# 2. Create the .env.prod from template
cp .env.example .env.prod
$EDITOR .env.prod   # fill in real secrets

# 3. Generate strong JWT secrets
echo "JWT_ACCESS_SECRET=$(openssl rand -hex 64)" >> .env.prod
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 64)" >> .env.prod

# 4. Boot the stack
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 5. Wait for healthchecks
docker compose -f docker-compose.prod.yml ps

# 6. Run database migrations
docker compose -f docker-compose.prod.yml exec api pnpm prisma:migrate:deploy

# 7. (Optional) Seed demo data
docker compose -f docker-compose.prod.yml exec api pnpm prisma:seed
```

### Option B — Kubernetes (HA, recommended for enterprise)

Best for: > 100k MAU, multi-region, SRE team.

Manifests in `infrastructure/k8s/` (TODO V1.1). Use the same Docker images
built by `release.yml`.

### Option C — Single VM (smoke test only)

Use the Docker Compose stack on a single 4-vCPU / 8 GB VM.

## Pre-flight Checklist

- [ ] DNS A records: `smartlight.vn`, `www.smartlight.vn`, `admin.smartlight.vn`, `api.smartlight.vn`
- [ ] TLS certificates (Let's Encrypt via certbot)
- [ ] Postgres 16+ available
- [ ] Redis 7+ available
- [ ] Outbound HTTPS to external services (Cloudinary, Resend, payment providers)
- [ ] `.env.prod` filled in with all required secrets

## Post-deployment Verification

```bash
# Liveness
curl -fsS https://api.smartlight.vn/health

# Readiness
curl -fsS https://api.smartlight.vn/health/ready

# Deep status (for ops dashboards)
curl -fsS https://api.smartlight.vn/health/status | jq

# Prometheus metrics (requires bearer token)
curl -fsS -H "Authorization: Bearer $METRICS_SCRAPE_TOKEN" \
  https://api.smartlight.vn/metrics | head

# Public storefront
curl -fsS https://smartlight.vn/

# Admin (should serve SPA shell)
curl -fsS https://admin.smartlight.vn/

# Swagger docs
curl -fsS https://api.smartlight.vn/api/docs/
```

## Zero-downtime Deploys

`docker compose -f docker-compose.prod.yml up -d --no-deps --build api` rebuilds
only the API. Postgres / Redis / nginx stay up. Wait for the API healthcheck
to return ok before declaring the deploy successful.

For Kubernetes, use a RollingUpdate strategy with `maxUnavailable: 0` and
`maxSurge: 1`.

## Rollback

```bash
# Docker Compose
docker compose -f docker-compose.prod.yml pull smartlight/api:previous-tag
docker compose -f docker-compose.prod.yml up -d --no-deps api

# Kubernetes
kubectl rollout undo deployment/smartlight-api
```

## Database Migrations

Migrations are forward-only and idempotent. Run:

```bash
docker compose exec api pnpm prisma:migrate:deploy
```

Migrations are safe to run while the API is serving traffic — old and new
schemas are supported during the rolling restart.

## Disaster Recovery

See `BACKUP.md` and `RESTORE.md` for full procedures.

Quick reference:

- Postgres: `pg_dump` daily to S3, point-in-time recovery enabled.
- Redis: AOF persistence enabled; treat as cache (data loss is acceptable).
- Application: stateless — all state in Postgres + Redis. Containers are
  cattle, not pets.
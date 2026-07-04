# 18 — Deployment Architecture

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document describes the **deployment topology** for SmartLight: services, environments, networking, scaling, and operational concerns for MVP and beyond.

---

## 2. Deployment Principles

1. **Cloud-first, cloud-agnostic** — easy to migrate providers.
2. **Serverless when convenient**; containers when needed.
3. **Stateless app tier** — all state in managed services.
4. **Multi-environment** — local / preview / staging / production.
5. **Zero-downtime deploys** — graceful rollouts.
6. **Single source of truth for config** — env vars, secret manager.

---

## 3. Environment Matrix

| Env | Purpose | Data | URL |
|---|---|---|---|
| **local** | Dev machine | Local Postgres | localhost:3000 |
| **preview** | PR review | Ephemeral Neon branch | per-PR URL |
| **staging** | Pre-prod QA | Sanitized prod copy | staging.smartlight.vn |
| **production** | Live | Real | smartlight.vn, api.smartlight.vn |

---

## 4. MVP Topology

```
                          INTERNET
                              │
                              ▼
                  ┌──────────────────────────┐
                  │   Cloudflare DNS (DNS)   │
                  └──────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼                           ▼
       storefront.vn                  api.vn
                │                           │
                ▼                           │
       ┌─────────────────┐                  │
       │ Vercel          │                  │
       │ (Storefront SPA)│                  │
       │ Global Edge CDN │                  │
       └─────────────────┘                  │
                                            ▼
                                  ┌─────────────────┐
                                  │ Vercel Edge →   │
                                  │ API Gateway     │
                                  └─────────────────┘
                                            │
                                            ▼
                                  ┌─────────────────┐
                                  │ Railway         │
                                  │ (NestJS API +   │
                                  │  Worker)        │
                                  └─────────────────┘
                                            │
              ┌─────────────┬───────────────┼───────────────┐
              ▼             ▼               ▼               ▼
        ┌─────────┐  ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ Neon    │  │ Upstash  │    │Cloudinary│    │External  │
        │ Postgres│  │ Redis    │    │          │    │Providers │
        └─────────┘  └──────────┘    └──────────┘    └──────────┘
```

---

## 5. Component Deployment

### 5.1 Storefront (Vercel)

| Concern | Setup |
|---|---|
| Domain | `smartlight.vn` (apex), `www.smartlight.vn` |
| CDN | Vercel global edge |
| Build | Vite build → static + SSR (if used) |
| Cache | `Cache-Control: public, max-age=31536000, immutable` for hashed assets |
| Preview | Auto per PR |
| Custom headers | via `vercel.json` |
| Env | `VITE_*` baked at build |
| DNS | Cloudflare proxy |

### 5.2 Admin Portal (Vercel)

| Concern | Setup |
|---|---|
| Domain | `admin.smartlight.vn` |
| Subdomain | Separate Vercel project for isolation |
| Auth | Admin session (separate cookie domain) |
| Build | Same Vite template; different entrypoint |

### 5.3 NestJS API (Railway)

| Concern | Setup |
|---|---|
| Service | NestJS API |
| Region | Singapore (closest to VN users) |
| Container | `smartlight/api:v1.x.x` |
| Replicas | 1 (V1); 2 (V1.5+) with sticky session disabled |
| Health check | `/health/ready` |
| Logging | stdout → BetterStack |
| Scaling | CPU-based (V2) |
| Auto-restart | Yes (Railway policy) |
| Graceful shutdown | SIGTERM handler |

### 5.4 Worker (V1 same as API)

V1 has worker running alongside API in the same Railway service.

V1.5+ will split into separate services.

### 5.5 Database (Neon)

| Concern | Setup |
|---|---|
| Service | Neon PostgreSQL |
| Region | Singapore (or AWS Asia Pacific) |
| Version | PostgreSQL 16 |
| Storage | 10 GB initial; auto-scaling |
| Backups | Daily automatic; 7-day retention (V1); 30-day (V2) |
| Connection pooling | Neon pooler (PgBouncer-compatible) |
| Read replica (V2) | Same region, async replication |
| Branching | Per PR (preview env) |

### 5.6 Cache (Upstash)

| Concern | Setup |
|---|---|
| Service | Upstash Redis |
| Region | Global with replication |
| TLS | Required |
| Auth | token-based |
| Limits | Tier-based; auto-upgrade |

### 5.7 Storage (Cloudinary)

| Concern | Setup |
|---|---|
| Account | SmartLight tenant |
| Storage | Unlimited tier |
| CDN | Cloudinary CDN |
| Folders | `smartlight/{env}/...` |
| Restrictions | Default allowed list |

---

## 6. Networking

### 6.1 DNS

| Domain | Provider | Points to |
|---|---|---|
| `smartlight.vn` | Cloudflare | Vercel |
| `www.smartlight.vn` | Cloudflare | Vercel |
| `admin.smartlight.vn` | Cloudflare | Vercel |
| `api.smartlight.vn` | Cloudflare | Railway (custom domain) |
| `staging.smartlight.vn` | Cloudflare | Railway (staging) |
| `api-staging.smartlight.vn` | Cloudflare | Railway (staging) |

### 6.2 TLS

- TLS 1.2+ only
- Issuer: Let's Encrypt (via Vercel / Railway)
- Auto-renewal
- HSTS preload (after stable)

### 6.3 CORS

- Strict origin allowlist
- Credentials allowed (for cookies)

### 6.4 Internal Traffic

- Backend → Neon: TLS via Neon pooler
- Backend → Upstash: TLS via rediss://
- Backend → Cloudinary: HTTPS
- All from Railway private network or public internet

---

## 7. Zero-Downtime Deployment

### 7.1 Frontend (Vercel)

- Atomic deployment per atomic build
- Instant rollback via Vercel dashboard

### 7.2 Backend (Railway)

V1 plan:
- Railway supports zero-downtime deploys via health-check gating
- New version started
- After `/health/ready` returns 200, traffic shifts
- Old container drains then stops

### 7.3 Database (Neon)

- Schema migrations via Prisma (always forward)
- Backward-compatible migration only during deploy
- Revert via new migration (never destructive)

---

## 8. Disaster Recovery

### 8.1 Backup Strategy

| Resource | Backup | Frequency | Retention |
|---|---|---|---|
| Postgres (Neon) | PITR + daily snapshot | continuous / daily | 7 days V1; 30 days V2 |
| Redis | RDB snapshot | daily | 1 day (cache only; loss OK) |
| Cloudinary | Cloudinary backup | daily (provider-managed) | 30 days |
| Application config | Git | N/A | Forever |
| Secrets | Secret manager | N/A | N/A |

### 8.2 RTO / RPO

| Scenario | RTO | RPO |
|---|---|---|
| App tier crash | < 1 min | 0 (stateless) |
| Database corruption | < 1h (PITR) | < 5 min |
| Cache eviction | < 5 min | 0 (cache only) |
| Region failure | < 4h | < 15 min |
| Accidental data delete | < 1h | < 5 min (PITR) |

---

## 9. Operational Procedures

### 9.1 Deploy Procedure

```
1. PR merged to main
2. CI runs lint + tests + build
3. CI builds image, pushes to GHCR
4. CI triggers Railway deploy
5. Railway pulls image; starts new container
6. Health check passes; traffic shifts
7. CI runs smoke tests against api.smartlight.vn
8. Slack notification on success/failure
```

### 9.2 Rollback Procedure

```
1. Identify issue (alerts, customer report)
2. Click rollback in Railway (or `railway up --rollback`)
3. Vercel: click rollback in dashboard
4. Verify via smoke tests
5. Post-mortem within 24h
```

### 9.3 Database Migration Procedure

```
1. PR includes migration file
2. CI runs migration against test DB
3. Deploy backend
4. Run migration against staging DB
5. Run migration against production (manual approval)
6. Verify with smoke tests
7. Notify team
```

---

## 10. Configuration Management

| Env | Source |
|---|---|
| Local | `.env.local` |
| Preview | GitHub Actions secrets |
| Staging | Railway env vars |
| Production | Railway secret reference + platform env |

> See `08_CONFIGURATION_ARCHITECTURE.md`.

---

## 11. Scaling

### 11.1 V1 Manual

| Service | Replicas |
|---|---|
| Storefront | Vercel auto |
| Admin | Vercel auto |
| API | 1 (Vercel scales via Railway plan) |
| Worker | 1 (V1 same process) |
| Postgres | Neon auto-scale on storage |
| Redis | Upstash plan tier |

### 11.2 V1.5+

- API: 2+ replicas behind LB
- Workers: split; scale independently
- Postgres: read replica added

### 11.3 V2

See `20_SCALABILITY_PLAN.md` and `21_MICROSERVICE_MIGRATION_PLAN.md`.

---

## 12. Future: Kubernetes (V2)

When traffic justifies:

- Migrate API + workers to K8s
- Use managed K8s (EKS / DOKS)
- Helm charts per service
- ArgoCD for gitops
- Cluster autoscaler
- Pod autoscaler (HPA)
- Service mesh (Istio / Linkerd)

---

## 13. Future: Multi-Region (V2+)

| Concern | Approach |
|---|---|
| Active-active API | Multi-region deployment |
| Read replicas per region | Cross-region replication |
| Cache locality | Redis per region; cross-region invalidation |
| Object storage | Cloudinary global; or region-specific S3 |
| Database | Single-primary + multi-region replicas |
| DNS | Latency-based routing |

---

## 14. CDN Strategy

| Layer | CDN |
|---|---|
| Static frontend | Vercel Edge |
| API responses (cacheable) | Vercel Edge (V1.5+) |
| Media | Cloudinary CDN |
| Vendor scripts (V1.5) | Cloudflare |

---

## 15. Secrets by Environment

| Env | Source |
|---|---|
| Local | `.env.local` (gitignored) |
| Preview | GitHub Actions repository secrets |
| Staging | Railway project env vars |
| Production | Railway reference secrets + Neon/Vercel secret stores |

> Secrets never written to git or images.

---

## 16. Coverage Validation

| Check | Status |
|---|---|
| Environment matrix | ✓ |
| MVP topology diagram | ✓ |
| Component deployment (frontend/API/DB/cache/storage) | ✓ |
| Networking & DNS | ✓ |
| Zero-downtime deploy | ✓ |
| DR (backups, RTO/RPO) | ✓ |
| Operational procedures | ✓ |
| Configuration management | ✓ |
| Scaling at each phase | ✓ |
| Future K8s plan | ✓ |
| Multi-region | ✓ |
| CDN | ✓ |
| Secrets | ✓ |

---

## 17. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial deployment architecture: Vercel + Railway + Neon + Upstash + Cloudinary |

---

**End of 18_DEPLOYMENT_ARCHITECTURE.md**
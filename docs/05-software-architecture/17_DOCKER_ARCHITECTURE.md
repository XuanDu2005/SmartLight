# 17 — Docker Architecture

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft — Documentation Only
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document describes the **container architecture** for SmartLight: how the application is containerized for development and production. **No actual `Dockerfile` or `docker-compose.yml` is generated in this phase.**

---

## 2. Container Principles

1. **One process per container** — explicit entrypoint; no init scripts.
2. **Minimal base image** — `node:20-alpine` (V1); distroless in V2 (security).
3. **Layer caching** — order commands to leverage cache.
4. **No secrets in image** — runtime env only.
5. **Health checks** — every container has one.
6. **Non-root user** — run as UID 1001+.
7. **Read-only root filesystem** — V2 hardening.

---

## 3. Image Inventory

| Image | Base | Process | Purpose |
|---|---|---|---|
| `smartlight/api` | `node:20-alpine` | NestJS API | Main backend |
| `smartlight/worker` | `node:20-alpine` | BullMQ worker | Async jobs |
| `smartlight/migrator` | `node:20-alpine` | Prisma migrate | DB migrations |
| `smartlight/storefront` | `node:20-alpine` (build) → nginx | Static files | Customer UI |
| `smartlight/admin` | `node:20-alpine` (build) → nginx | Static files | Admin UI |

> V1 may combine `api` and `worker` into one image (different entrypoint args).
> V1.5 splits workers into separate deployments for independent scaling.

---

## 4. Image Layering Convention

```
Layer 1: OS + curl + tini (init system)
Layer 2: pnpm (package manager)
Layer 3: package.json + pnpm-lock.yaml
Layer 4: installed dependencies (cached)
Layer 5: source code (changes most often)
Layer 6: build artifacts (prisma generated, dist)
Layer 7: production deps only (V2 multi-stage)
```

### 4.1 Multi-Stage Build Pattern (V1)

```
Stage 1 — Builder:
  - Install all deps (dev + prod)
  - Generate Prisma client
  - Build TypeScript → dist/
  - Run linter / typecheck (CI build arg)

Stage 2 — Production:
  - From minimal base (alpine)
  - Copy only production deps
  - Copy build artifacts (dist, prisma generated)
  - Add non-root user
  - Set entrypoint
```

---

## 5. Image Tagging Strategy

### 5.1 Tag Pattern

```
{registry}/{image}:{version}-{sha}-{env}
```

Examples:
- `ghcr.io/smartlight/api:1.4.2-a1b2c3d-production`
- `ghcr.io/smartlight/api:1.4.2-a1b2c3d-staging`
- `ghcr.io/smartlight/api:v1.4`
- `ghcr.io/smartlight/api:latest` (latest stable)

### 5.2 Immutability

- Once pushed, tags are immutable
- New sha → new tag (no rewriting)

---

## 6. Container Runtime Configuration

### 6.1 API Container

```
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s \
  CMD curl -fsS http://localhost:3000/health/ready || exit 1
USER 1001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
```

### 6.2 Worker Container

```
ENV NODE_ENV=production
ENV WORKER_TYPE=email
ENV CONCURRENCY=5
USER 1001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/workers/main.js"]
```

### 6.3 Migrator Container

```
ENV NODE_ENV=migration
USER 1001
CMD ["node", "node_modules/.bin/prisma", "migrate", "deploy"]
```

---

## 7. Networking

### 7.1 Development Network

```
Backend service       — port 3000 (host: localhost:3000)
PostgreSQL            — port 5432
Redis                 — port 6379
MailHog (dev email)   — port 8025
MinIO (optional)      — port 9000 / 9001
```

### 7.2 Production Network

- Internal: services on private network
- Public: ALB → API containers
- Frontend on Vercel (no container)

### 7.3 Service Discovery

- V1: compose / Railway service names
- V2 (K8s): DNS service names (`postgres.cluster.local`)

---

## 8. Volumes

### 8.1 Development

| Volume | Mount | Purpose |
|---|---|---|
| Postgres data | `/var/lib/postgresql/data` | Persistence |
| Redis data | `/data` | Persistence (optional) |
| MinIO data | `/data` | Local storage |
| Source code (dev) | `/app` | Hot reload |

### 8.2 Production

| Volume | Mount | Purpose |
|---|---|---|
| Postgres data | Managed by Neon | Persistence (cloud) |
| Redis data | Managed by Upstash | Persistence (cloud) |
| No on-disk volumes for app containers | — | Stateless |

> Application containers are **stateless**. State lives in managed services.

---

## 9. Development Stack (Local)

### 9.1 Tooling

- Docker Desktop (or colima / Rancher Desktop)
- docker-compose for dev orchestration
- Node.js 20 LTS for IDE tools
- pnpm for monorepo tooling

### 9.2 Local Service Map

```
Developer
  ↓
docker-compose up
  ↓
[api] [worker] [mailhog] [postgres] [redis] [minio]
  ↓
Seed data (npm script)
```

### 9.3 Hot Reload

- Volume mount: source code into `/app`
- API container runs `pnpm dev` (tsx watch)
- Auto reload on file change

---

## 10. Production Stack

### 10.1 Container Orchestration

- V1: **Railway / Render** — managed PaaS
- V1.5+: same with split worker containers
- V2: **Kubernetes** (EKS or DigitalOcean K8s)

### 10.2 Production Considerations

| Concern | Approach |
|---|---|
| Zero-downtime deploy | New container starts before old stops |
| Graceful shutdown | SIGTERM handler (30s timeout) |
| Health gating | ELB only routes to healthy containers |
| Resource limits | CPU/mem limits per container |
| Auto-restart | Always-on policy |
| Rollback | Image tag rollback |
| Logs to stdout | Aggregator picks up |

---

## 11. Resource Sizing (Initial)

| Container | CPU | Memory | Replicas |
|---|---|---|---|
| API (Railway/Render) | 1 vCPU | 1 GB | 1–2 |
| Worker (V1 same as API) | shared | shared | shared |
| Worker (V1.5 split) | 0.5 | 512 MB | 1–4 (auto) |
| Migrator | 0.5 | 256 MB | 0 (cron-like) |

---

## 12. Image Registry

| Env | Registry |
|---|---|
| Local | `localhost` (dev registry) |
| Production | **GitHub Container Registry** (`ghcr.io`) |

### 12.1 Registry Authentication

- Production: short-lived credentials via GitHub Actions OIDC
- Image signing (V2): cosign

---

## 13. Build Optimization

### 13.1 Layer Caching

```
Layer A: pnpm-lock.yaml changes rarely
Layer B: src/** changes frequently
```

`COPY pnpm-lock.yaml package.json ./` BEFORE `COPY . .`

### 13.2 BuildKit Cache Mounts

V1.5+: Use BuildKit cache mounts for `pnpm install` to keep cache across CI runs.

### 13.3 Prisma Client in Image

```
RUN pnpm prisma generate
```

The generated client is built into the image (or copied from artifact).

---

## 14. Security Hardening

| Control | Implementation |
|---|---|
| Non-root user | USER 1001 |
| Distroless base (V2) | google/distroless/nodejs20 |
| Read-only root fs | --read-only flag |
| Drop capabilities | --cap-drop=ALL |
| No new privs | --security-opt=no-new-privileges |
| Health check | mandatory |
| Secret env | only at runtime, not in image |
| SBOM | added to image metadata (V1.5+) |
| Image scanning | Trivy / Snyk in CI |
| Vulnerable base alerts | auto from scanner |

---

## 15. CI/CD Linkage

See `19_CI_CD_ARCHITECTURE.md`. Pipeline:

1. Lint + test (no image needed)
2. Build image (multi-stage)
3. Push to registry
4. Deploy via Railway/Render (or K8s in V2)
5. Smoke tests post-deploy

---

## 16. Local Dev vs Production

| Aspect | Local | Production |
|---|---|---|
| Orchestration | docker-compose | PaaS / K8s |
| Hot reload | Yes | No |
| Source in container | Yes (volume) | No |
| Database | Local container | Neon |
| Redis | Local container | Upstash |
| Email | MailHog | Resend |
| Storage | MinIO | Cloudinary |
| Logs | stdout | stdout + aggregator |
| Secrets | `.env.local` | Managed secret store |

---

## 17. Disaster Recovery

| Concern | RTO | RPO |
|---|---|---|
| Container failure | < 30s (restart) | N/A (stateless) |
| Database loss | < 1h (PITR) | < 5 min |
| Redis loss | < 1 min (restart) | < 1 min (cache cold) |
| Region loss | < 4h | < 15 min |

---

## 18. Coverage Validation

| Check | Status |
|---|---|
| Image inventory documented | ✓ |
| Layering convention | ✓ |
| Tagging strategy | ✓ |
| Runtime configuration per image | ✓ |
| Networking | ✓ |
| Volumes | ✓ |
| Dev stack | ✓ |
| Production stack | ✓ |
| Resource sizing | ✓ |
| Registry choice | ✓ |
| Security hardening | ✓ |
| CI/CD linkage | ✓ |
| DR (RTO/RPO) | ✓ |

---

## 19. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial Docker architecture (documentation only, no Dockerfiles) |

---

**End of 17_DOCKER_ARCHITECTURE.md**
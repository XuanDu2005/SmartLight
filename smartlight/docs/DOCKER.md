# SmartLight — Docker Reference

## Image Inventory

| Image | Base | Final Size Target | Notes |
|---|---|---|---|
| `smartlight/api` | `node:20-alpine` | < 250 MB | 3-stage build (deps → build → runtime with `--prod`) |
| `smartlight/web` | `nginx:1.27-alpine` | < 50 MB | Vite-bundled SPA served by hardened nginx |
| `smartlight/admin` | `nginx:1.27-alpine` | < 50 MB | Same as web, different SPA + CSP |

All images:
- Run as non-root user (`smartlight`, UID 1001)
- Have a HEALTHCHECK
- Use `tini` as PID 1
- Include BuildKit cache mounts for fast rebuilds

## Build

```bash
# All three images
docker buildx build \
  --file Dockerfile.api \
  --tag smartlight/api:1.0.0 \
  --tag smartlight/api:latest \
  --load \
  .

# Web
docker buildx build \
  --file Dockerfile.web \
  --build-arg VITE_API_BASE_URL=https://smartlight.vn \
  --tag smartlight/web:1.0.0 \
  --tag smartlight/web:latest \
  --load \
  .

# Admin
docker buildx build \
  --file Dockerfile.admin \
  --build-arg VITE_ADMIN_API_BASE_URL=https://smartlight.vn \
  --tag smartlight/admin:1.0.0 \
  --tag smartlight/admin:latest \
  --load \
  .
```

For multi-arch (e.g. `linux/amd64,linux/arm64`) replace `--load` with `--push`.

## Run

### Production stack

```bash
docker compose \
  --file docker-compose.prod.yml \
  --env-file .env.prod \
  up -d
```

### Dev stack (with source mount)

```bash
docker compose up -d
```

## Dockerfile Patterns

### 3-stage API Dockerfile

```
deps      → installs ALL workspace deps for building
build     → runs `nest build` + `prisma generate`
runtime   → installs PROD-ONLY deps + copies compiled output
```

Why 3 stages and not 2:
- Stage 2 keeps the `node_modules` from the builder (which includes devDeps)
  if you copy `node_modules` wholesale — bloats the image.
- Reinstalling with `--prod` in stage 3 drops devDeps (prisma CLI, eslint,
  jest, ts-node) → smaller image.
- `pnpm store prune` then removes the package cache.

### Web/Admin Dockerfile

```
builder  → Vite production build → static assets
runtime  → nginx serving the static bundle
```

Why a custom `nginx.conf`:
- Long-cache hashed assets (`/assets/*` → 1 year, immutable)
- SPA fallback to `index.html` so React Router works
- Security headers (CSP, X-Frame-Options, etc.)
- Gzip on text-ish content

## Caching Strategy

BuildKit cache mounts:

```dockerfile
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
```

The pnpm store survives across rebuilds. Only changed packages are
re-downloaded. Cuts CI build times from ~5 min to ~30 s on a typical
change.

## Healthchecks

| Image | Probe | Command | Interval |
|---|---|---|---|
| api | HTTP /health | `curl -fsS http://localhost:4000/health` | 15 s |
| web | HTTP /health | `wget -q --spider http://localhost/health` | 15 s |
| admin | HTTP /health | `wget -q --spider http://localhost/health` | 15 s |
| nginx (compose) | HTTP /nginx-health | `wget -q --spider http://localhost/nginx-health` | 15 s |
| postgres | `pg_isready` | `pg_isready -U $POSTGRES_USER` | 10 s |
| redis | `redis-cli ping` | `redis-cli ping` | 10 s |

## Non-root User

All images run as UID 1001 (`smartlight` group). This matches the
Kubernetes `runAsUser: 1001` recommendation and avoids CVE escalations
via `nobody`.

## Pinned Versions

| Component | Version |
|---|---|
| Node | 20-alpine |
| pnpm | 9.12.0 |
| nginx | 1.27-alpine |
| postgres | 16-alpine |
| redis | 7-alpine |

## Troubleshooting

```bash
# Inspect a running container's filesystem
docker compose exec api sh

# Tail logs
docker compose logs --tail=100 -f api

# Force a rebuild from scratch
docker compose build --no-cache api

# Show image layers
docker history smartlight/api:latest
```
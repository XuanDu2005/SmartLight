# SmartLight — Backup Procedures

## What to Back Up

| Asset | Critical? | Tool | Frequency | Retention |
|---|---|---|---|---|
| PostgreSQL database | YES | `pg_dump` + WAL archiving | Daily full + continuous WAL | 30 days |
| Redis | No | AOF + RDB | Continuous | 7 days |
| Uploaded media | YES | Cloudinary replication | Continuous (provider) | Indefinite |
| TLS certificates | YES | Certbot renewal + off-host copy | On renewal | 90 days |
| Environment files | YES | Sealed Secrets / Vault | On change | 1 year |
| Application images | No | GHCR retention | On release | 10 tags |

## PostgreSQL Backup

### Logical backup (`pg_dump`)

```bash
# Single database, plain SQL
docker compose exec postgres pg_dump -U smartlight -d smartlight -F p -f /tmp/backup.sql
docker compose cp postgres:/tmp/backup.sql ./backups/smartlight-$(date +%Y%m%d).sql

# Compressed custom format (faster restore)
docker compose exec postgres pg_dump -U smartlight -d smartlight -F c -f /tmp/backup.dump
docker compose cp postgres:/tmp/backup.dump ./backups/smartlight-$(date +%Y%m%d).dump
```

### Continuous WAL archiving (point-in-time recovery)

`postgresql.conf` additions:

```ini
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/wal-archive/%f && cp %p /var/lib/postgresql/wal-archive/%f'
archive_timeout = 60
```

WAL files are pushed to S3 via a sidecar (e.g. `wal-g`):

```bash
wal-g backup-push $PGDATA --config ~/.walg.json
```

### Off-host copy

```bash
# Cron: 02:00 daily
docker compose exec postgres pg_dump -U smartlight -F c smartlight \
  | aws s3 cp - s3://smartlight-backups/db/$(date +%Y/%m/%d)/smartlight.dump
```

### Encryption

Backups are encrypted with `gpg` (AES-256) before upload:

```bash
gpg --symmetric --cipher-algo AES256 ./backups/smartlight-*.dump
aws s3 cp ./backups/smartlight-*.dump.gpg s3://smartlight-backups/db/$(date +%Y/%m/%d)/
```

## Redis Backup

Redis is **cache + queue**, not primary state. Treat as disposable.

```bash
# RDB snapshot (every 5 min via redis.conf)
docker compose exec redis redis-cli BGSAVE

# AOF rewrite
docker compose exec redis redis-cli BGREWRITEAOF
```

Persistence is enabled in `docker-compose.prod.yml`:
- `appendonly yes`
- `appendfsync everysec`

## Media (Cloudinary)

Cloudinary handles replication across regions automatically. The only thing
to back up is the **asset ID list**, which we store in our DB
(`MediaAsset.cloudinaryPublicId`).

For regulatory compliance (e.g. GDPR), `media.service.ts` exposes a delete
API that purges both DB and Cloudinary in one transaction.

## TLS Certificates

Certbot writes certs to `/etc/letsencrypt/`. We mount that to a Docker
volume (`certs`). Back up the entire `/etc/letsencrypt/` directory.

```bash
# Cron: weekly
tar czf ./backups/letsencrypt-$(date +%Y%m%d).tgz /etc/letsencrypt/
aws s3 cp ./backups/letsencrypt-*.tgz s3://smartlight-backups/tls/
```

## Environment Files

`/etc/smartlight/.env.prod` and all child env files are kept in
HashiCorp Vault. The on-disk file is a single-use token, not the source
of truth.

## Verification

Run a **monthly restore drill**:

1. Spin up a clean Postgres in a test container.
2. Restore the most recent dump.
3. Run `pnpm --filter @smartlight/api prisma migrate deploy`.
4. Boot the API against the restored DB.
5. Run smoke tests (`/health`, `/health/status`, login, list products).
6. Document the time-to-restore and any gaps.

## Storage Layout (S3)

```
s3://smartlight-backups/
├── db/
│   └── 2026/07/11/
│       ├── smartlight-20260711.dump.gpg
│       └── smartlight-20260711.dump.gpg.sha256
├── tls/
│   └── 2026/07/08/
│       └── letsencrypt-20260708.tgz.gpg
└── env/
    └── 2026/07/01/
        └── env-20260701.sealed.json
```

Lifecycle policy:
- `db/`: transition to Glacier after 30 d, expire after 365 d
- `tls/`: expire after 365 d
- `env/`: never expire
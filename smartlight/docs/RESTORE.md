# SmartLight — Disaster Recovery (Restore)

## Recovery Time Objectives

| Scenario | RTO | RPO |
|---|---|---|
| Single container crash | < 30 s | 0 |
| Single VM failure (Docker Compose) | < 5 min | < 1 min (WAL) |
| Postgres data corruption (logical) | < 30 min | < 1 min (WAL) |
| Postgres hardware failure | < 2 h | < 5 min (WAL + replica) |
| Full region loss (AWS) | < 24 h | < 5 min (cross-region replica) |
| Accidental `DROP TABLE` | < 30 min | < 1 min (PITR) |

## Restore: Full Database

```bash
# 1. Identify the most recent backup
aws s3 ls s3://smartlight-backups/db/$(date +%Y/%m/%d)/ --recursive

# 2. Download + decrypt
aws s3 cp s3://smartlight-backups/db/2026/07/11/smartlight-20260711.dump.gpg .
gpg --decrypt smartlight-20260711.dump.gpg > smartlight.dump

# 3. Stop the API (write traffic off)
docker compose -f docker-compose.prod.yml stop api web admin nginx

# 4. Wipe + restore the DB
docker compose exec postgres dropdb -U smartlight smartlight --if-exists
docker compose exec postgres createdb -U smartlight smartlight
docker compose exec -T postgres pg_restore -U smartlight -d smartlight < smartlight.dump

# 5. Re-run migrations (idempotent — applies any new ones)
docker compose run --rm api pnpm prisma:migrate:deploy

# 6. Restart the stack
docker compose -f docker-compose.prod.yml up -d

# 7. Verify
curl -fsS https://api.smartlight.vn/health/status | jq
```

## Restore: Point-in-Time Recovery (PITR)

Useful for: "I just ran `DELETE FROM ...` by accident — bring me back to 14:32".

Requires continuous WAL archiving (see `BACKUP.md`).

```bash
# 1. Stop the API
docker compose stop api

# 2. Restore the most recent base backup
docker compose down postgres
docker compose run --rm restore \
  bash -c "
    pg_basebackup -h postgres -D /var/lib/postgresql/data -U replicator -P -X stream
  "

# 3. Create recovery.signal + set recovery_target_time
docker compose exec postgres bash -c "
  touch /var/lib/postgresql/data/recovery.signal
  echo \"recovery_target_time = '2026-07-11 14:32:00 UTC'\" >> /var/lib/postgresql/data/postgresql.auto.conf
  echo \"restore_command = 'cp /var/lib/postgresql/wal-archive/%f %p'\" >> /var/lib/postgresql/data/postgresql.auto.conf
"

# 4. Start Postgres — it'll replay WAL up to the target time
docker compose up -d postgres
docker compose logs -f postgres   # watch for "recovery complete"

# 5. Verify + restart API
docker compose exec postgres psql -U smartlight -d smartlight -c "SELECT count(*) FROM \"user\";"
docker compose up -d api
```

## Restore: Single Table

```bash
# 1. Restore the backup to a TEMPORARY database
createdb -U smartlight smartlight_restore
pg_restore -U smartlight -d smartlight_restore ./smartlight.dump

# 2. Copy the table back
pg_dump -U smartlight -t '<table_name>' smartlight_restore \
  | psql -U smartlight smartlight

# 3. Drop the temp DB
dropdb -U smartlight smartlight_restore
```

## Restore: Redis

Redis is disposable — it will rebuild from the primary source (Postgres)
on next access.

```bash
# Stop redis
docker compose stop redis

# Wipe the volume (data is fine to lose)
docker volume rm smartlight_redis_data

# Restart (empty)
docker compose up -d redis
```

The API will reconnect on next request. Cache miss penalty is one DB hit
per unique key, then back to normal.

## Restore: Application Images

If GHCR is unreachable:

```bash
# Pull from a backup registry mirror
docker pull <backup-registry>/smartlight/api:1.0.0

# Re-tag locally
docker tag <backup-registry>/smartlight/api:1.0.0 smartlight/api:1.0.0

# Bring stack up
docker compose -f docker-compose.prod.yml up -d
```

If GHCR has been wiped entirely:

```bash
# Re-build from source (slow, ~10 min)
git clone https://github.com/<org>/smartlight.git
cd smartlight
git checkout v1.0.0
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## Restore: TLS Certificates

```bash
# 1. Restore from backup
aws s3 cp s3://smartlight-backups/tls/2026/07/08/letsencrypt-20260708.tgz.gpg .
gpg --decrypt letsencrypt-20260708.tgz.gpg | tar xzf - -C /etc/

# 2. Restart nginx
docker compose restart nginx

# 3. Verify
echo | openssl s_client -connect smartlight.vn:443 2>/dev/null | openssl x509 -noout -dates
```

## Verification Checklist

After any restore:

- [ ] `curl https://api.smartlight.vn/health` → `200 ok`
- [ ] `curl https://api.smartlight.vn/health/ready` → `200 ok`
- [ ] `curl https://api.smartlight.vn/health/status` → no degraded components
- [ ] Login flow works (POST `/v1/auth/login`)
- [ ] Product list returns expected items
- [ ] Admin login works
- [ ] Place a test order end-to-end

## Post-mortem Template

```markdown
## Incident: <title>

**Date / Time**: <UTC>
**Detected by**: <alert|user|monitor>
**Resolved at**: <UTC>

### Impact
- Users affected: <N>
- Revenue lost: $<X>
- SLA breach: yes/no

### Timeline
- HH:MM — first signal
- HH:MM — escalation
- HH:MM — root cause identified
- HH:MM — mitigation
- HH:MM — full restore

### Root cause
<one paragraph>

### What worked
- <bullet>

### What didn't
- <bullet>

### Action items
- [ ] <fix 1> — owner — due
- [ ] <fix 2> — owner — due
```
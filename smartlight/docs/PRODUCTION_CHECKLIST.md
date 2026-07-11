# SmartLight — Production Deployment Checklist

> **Use this checklist before every production deployment.** Tick each box
> with the operator's initials and the timestamp. Keep the completed
> checklist in the incident log.

**Release**: _____________  **Date**: _____________  **Operator**: _____________

---

## 1. Pre-Deployment

### Code Quality

- [ ] All PRs merged to `main` via code review (≥ 1 reviewer)
- [ ] CI pipeline green: install, lint, typecheck, unit tests, e2e tests, build
- [ ] No `console.log` left in production code (only in `env.validation.ts` and bootstrap fatal handler)
- [ ] No TODO/FIXME left in release-blocking paths
- [ ] CHANGELOG updated
- [ ] Migration scripts tested on a staging DB copy

### Secrets

- [ ] All required env vars filled in `.env.prod` (run `pnpm --filter @smartlight/api exec ts-node -e "require('./dist/apps/api/src/config/env.validation').assertValidEnv()"` to verify)
- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are unique per environment (≥ 64 random bytes)
- [ ] `METRICS_SCRAPE_TOKEN` is unique and rotated since last deploy
- [ ] Database password rotated since last deploy (≥ 30 days)
- [ ] All third-party API keys (Cloudinary, Resend, VNPay, MoMo, ZaloPay, GHN, GHTK, Viettel Post) verified against staging
- [ ] OAuth callback URLs updated for new production domain (if changed)

### Infrastructure

- [ ] DNS A records resolve to the new host: `smartlight.vn`, `www.smartlight.vn`, `admin.smartlight.vn`, `api.smartlight.vn`
- [ ] TLS certificate valid for ≥ 30 days (check: `openssl s_client -connect smartlight.vn:443 < /dev/null 2>/dev/null | openssl x509 -noout -dates`)
- [ ] Postgres 16+ running with WAL archiving enabled
- [ ] Redis 7+ running with AOF persistence enabled
- [ ] Outbound HTTPS from the API host to all third-party services verified
- [ ] Firewall: only ports 80, 443 open to public; Postgres/Redis on private network only

---

## 2. Security

- [ ] **TLS**: A+ rating on SSL Labs (`https://www.ssllabs.com/ssltest/analyze.html?d=smartlight.vn`)
- [ ] **HSTS**: enabled in nginx + Helmet, `max-age=63072000`
- [ ] **CSP**: set on storefront and admin (verified in DevTools → Network → response headers)
- [ ] **CORS**: `API_CORS_ORIGINS` is a strict allowlist (no `*`)
- [ ] **Cookies**: `Secure`, `HttpOnly`, `SameSite=Lax|Strict`
- [ ] **Rate limit**: 5 r/s on auth endpoints (verify with `curl` loop)
- [ ] **Helmet**: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` present
- [ ] **JWT**: secrets ≥ 64 bytes, rotated per environment
- [ ] **Argon2id**: password hashing verified (login flow)
- [ ] **SQL injection**: all queries use Prisma parameterized inputs
- [ ] **XSS**: all user-supplied content escaped in React (default behavior)
- [ ] **CSRF**: refresh cookies are `SameSite=Strict` (V1.1: add double-submit token)
- [ ] **Penetration test**: scheduled before GA

### Dependency audit

- [ ] `pnpm audit --prod` → 0 high/critical vulnerabilities
- [ ] Outdated deps reviewed (`pnpm outdated`)

---

## 3. Performance

- [ ] **Bundle size**: `apps/web/dist` + `apps/admin/dist` each < 1 MB gzipped
- [ ] **Time to First Byte**: < 200 ms for `/v1/products` (verify with `curl -w '%{time_starttransfer}\n'`)
- [ ] **Time to Interactive**: < 3 s on a 4G mobile connection (verify with Lighthouse)
- [ ] **Database indexes**: every hot read path has an index in `schema.prisma`
- [ ] **Connection pool**: tuned per service tier
- [ ] **Compression**: gzip on JSON responses > 1 KB (verify: `curl -H 'Accept-Encoding: gzip' -I /v1/products`)
- [ ] **Static assets**: long cache on `/assets/*` (1 year, immutable)
- [ ] **HTTP/2**: enabled at the nginx listener
- [ ] **Lazy loading**: below-the-fold images use `loading="lazy"`
- [ ] **Code splitting**: route-level dynamic imports confirmed

### Lighthouse (run on production URL)

- [ ] Performance ≥ 90
- [ ] Accessibility ≥ 95
- [ ] Best Practices ≥ 95
- [ ] SEO ≥ 90

---

## 4. Backup

- [ ] **Postgres logical backup**: scheduled daily (`crontab -l` shows the job)
- [ ] **Postgres WAL archiving**: enabled and uploading to S3
- [ ] **Redis**: AOF enabled (acceptable to lose)
- [ ] **Media**: Cloudinary replication enabled (provider default)
- [ ] **TLS certs**: backed up off-host (weekly cron)
- [ ] **Env files**: stored in Vault (NOT in version control)
- [ ] **Restore drill**: completed within the last 30 days (RTO documented)
- [ ] **Encryption**: backups encrypted with `gpg --cipher-algo AES256` before upload

---

## 5. Logging

- [ ] **Format**: JSON on stdout (verify: `docker compose logs api | head -1 | jq .`)
- [ ] **Correlation IDs**: present in every request (verify with `curl -i -H 'X-Request-ID: my-trace' /v1/products`)
- [ ] **Redaction**: passwords, tokens, secrets absent from logs (verify with grep)
- [ ] **Centralization**: logs shipped to BetterStack / Loki / CloudWatch
- [ ] **Retention**: ≥ 30 days hot, ≥ 365 days cold
- [ ] **Alerting**: PagerDuty / Slack integration tested

---

## 6. Monitoring

- [ ] **Prometheus**: scraping `/metrics` (verify: `curl -H "Authorization: Bearer $METRICS_SCRAPE_TOKEN" /metrics | head`)
- [ ] **Grafana dashboards**: 3 dashboards provisioned (API, DB, Business KPIs)
- [ ] **Alertmanager rules**: deployed (runbook URLs filled in)
- [ ] **Alert routing**: PagerDuty / Slack / email verified
- [ ] **Blackbox exporter**: probing `/health` and `/health/ready` on all 3 apps
- [ ] **Synthetic checks**: storefront returns 200, admin login page renders
- [ ] **On-call rotation**: published + contactable
- [ ] **Runbook URLs**: linked from each alert

### Critical alerts (must be enabled)

- [ ] `ApiDown` — page on-call after 2 min
- [ ] `HighErrorRate` (> 5% 5xx for 5 min)
- [ ] `SlowP99Latency` (> 1 s for 10 min)
- [ ] `DiskSpaceLow` (< 5 GB available)
- [ ] `HighMemoryUsage` (> 1.5 GB RSS for 5 min)
- [ ] `EventLoopLagging` (> 0.5 s for 2 min)

---

## 7. Database

- [ ] **Schema migrations**: applied (`prisma migrate deploy`)
- [ ] **Seed data**: NOT applied in prod (only in dev/demo)
- [ ] **Connection pool**: `connection_limit` set in `DATABASE_URL` if needed
- [ ] **Backups**: scheduled + verified
- [ ] **Replication**: read replica configured (V1.1)
- [ ] **Index review**: hot paths analyzed with `EXPLAIN ANALYZE`
- [ ] **Vacuum / analyze**: scheduled (autovacuum tuned for write-heavy tables)
- [ ] **Point-in-time recovery**: tested within last 30 days

---

## 8. SSL / TLS

- [ ] **Certificate**: valid, not self-signed
- [ ] **Issuer**: trusted CA (Let's Encrypt, DigiCert, etc.)
- [ ] **Expiry**: ≥ 30 days remaining
- [ ] **Auto-renewal**: certbot hook in place
- [ ] **HSTS preload**: submitted to hstspreload.org
- [ ] **OCSP stapling**: enabled
- [ ] **Protocols**: TLS 1.2 + 1.3 only (no TLS 1.0/1.1, no SSLv3)
- [ ] **Ciphers**: AEAD-only (no CBC, no RC4, no 3DES)
- [ ] **DH params**: 2048-bit (or X25519 ECDH)

---

## 9. DNS

- [ ] **A records**: smartlight.vn, www.smartlight.vn, admin.smartlight.vn, api.smartlight.vn → public IP
- [ ] **CNAME**: www → smartlight.vn
- [ ] **CAA records**: restricting CAs that can issue certs for the domain
- [ ] **DNSSEC**: enabled (if registrar supports)
- [ ] **TTL**: 300 s during initial rollout; 3600 s after stabilization
- [ ] **Health checks**: Route 53 / Cloudflare health-check enabled

---

## 10. Deployment

- [ ] **Image tags**: `smartlight/api:v1.0.0` etc. built and pushed to registry
- [ ] **Rollout strategy**: RollingUpdate with `maxUnavailable: 0`
- [ ] **Smoke test**: post-deploy curl checks (`/health`, `/health/ready`, `/health/status`)
- [ ] **Synthetic transaction**: place a test order end-to-end
- [ ] **Log monitoring**: dashboards refreshed, no spike in errors
- [ ] **Metric baseline**: 15 min after deploy, compare to pre-deploy
- [ ] **Customer-facing announcement**: changelog / status page updated
- [ ] **Stakeholders notified**: ops, support, marketing

---

## 11. Rollback Plan

- [ ] **Previous image tag**: known and pulled (`smartlight/api:v0.9.0`)
- [ ] **DB migration**: reverse script written (if schema changed)
- [ ] **Rollback command**: documented in DEPLOYMENT.md and rehearsed
- [ ] **Rollback decision criteria**: defined (e.g. > 10% error rate for > 5 min)
- [ ] **Stakeholders notified**: rollback procedure documented in runbook
- [ ] **DNS rollback**: if needed, lower TTL 30 min before deploy

---

## 12. Post-Deployment

- [ ] **Hour 1**: monitor error rate, latency, memory
- [ ] **Hour 4**: review customer feedback / support tickets
- [ ] **Day 1**: review Grafana dashboards, log for anomalies
- [ ] **Day 7**: retrospective, document any issues
- [ ] **Day 30**: schedule the next deploy + security review

---

## Sign-off

| Role | Name | Initials | Date / Time |
|---|---|---|---|
| Release Manager | | | |
| Tech Lead | | | |
| SRE / DevOps | | | |
| Security Lead | | | |
| Product Owner | | | |

---

## Appendix — Quick Verification Script

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "==> Liveness"
curl -fsS https://api.smartlight.vn/health

echo "==> Readiness"
curl -fsS https://api.smartlight.vn/health/ready

echo "==> Deep status"
curl -fsS https://api.smartlight.vn/health/status | jq

echo "==> Metrics (with token)"
curl -fsS -H "Authorization: Bearer $METRICS_SCRAPE_TOKEN" \
  https://api.smartlight.vn/metrics | head

echo "==> Storefront"
curl -fsS https://smartlight.vn/ | head -5

echo "==> Admin SPA"
curl -fsS https://admin.smartlight.vn/ | head -5

echo "==> TLS"
echo | openssl s_client -connect smartlight.vn:443 -servername smartlight.vn 2>/dev/null \
  | openssl x509 -noout -subject -dates -issuer

echo "==> Headers"
curl -sI https://smartlight.vn/ | grep -iE 'strict-transport-security|x-frame|content-security|x-content-type-options'

echo "All checks passed ✓"
```
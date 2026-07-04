# 16 — Observability

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document defines SmartLight's **observability architecture**: health checks, metrics, monitoring, alerting, and tracing.

---

## 2. Observability Pillars

| Pillar | Purpose |
|---|---|
| **Logs** | "What happened?" — see `09_LOGGING_ARCHITECTURE.md` |
| **Metrics** | "How much / how fast?" |
| **Traces** | "Where did time go?" |
| **Health checks** | "Is it alive?" |

---

## 3. Health Checks

### 3.1 Endpoints

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /health/live` | Liveness — process up | None |
| `GET /health/ready` | Readiness — dependencies OK | None |
| `GET /health/startup` | Startup — first-time init done | None |
| `GET /health` (admin) | Verbose, full report | Admin |

### 3.2 Liveness Probe

Just confirms the process is responding:

```
GET /health/live → 200 OK
{ "status": "up", "uptimeSec": 3600 }
```

### 3.3 Readiness Probe

Confirms dependencies are reachable:

```
GET /health/ready → 200 OK
{
  "status": "ready",
  "checks": {
    "database": { "status": "up", "latency_ms": 12 },
    "redis":    { "status": "up", "latency_ms": 3 },
    "cloudinary": { "status": "up" },
    "queue":    { "status": "up", "active": 2, "waiting": 0 }
  }
}
```

If any check fails → 503.

### 3.4 Startup Probe

Indicates initialization complete (DB migrations, cache warming). Differentiates from readiness.

### 3.5 Implementation

```
nestjs-termii (or custom)
  ↓
checks = [
  new DatabaseHealthCheck(),
  new RedisHealthCheck(),
  new CloudinaryHealthCheck(),
  new QueueHealthCheck(),
];
```

---

## 4. Metrics

### 4.1 Metrics Type

SmartLight uses **Prometheus-style metrics** exposed at `/metrics` (admin-only):

- **Counters** — cumulative
- **Gauges** — current value
- **Histograms** — distribution
- **Summaries** — quantiles

### 4.2 Application Metrics

| Name | Type | Labels | Use |
|---|---|---|---|
| `http_requests_total` | counter | method, route, status | request count |
| `http_request_duration_seconds` | histogram | method, route | latency |
| `http_request_size_bytes` | histogram | method, route | payload size |
| `http_response_size_bytes` | histogram | method, route | response size |
| `http_requests_in_flight` | gauge | — | active requests |
| `active_sessions` | gauge | — | total active users |
| `orders_placed_total` | counter | channel, payment_method | business KPI |
| `cart_created_total` | counter | source | conversion |
| `payment_success_total` | counter | provider | revenue |
| `payment_failure_total` | counter | provider, reason | failures |
| `email_sent_total` | counter | template_code, status | delivery |
| `webhook_received_total` | counter | provider, event, status | inbound |
| `webhook_delivered_total` | counter | target, status | outbound |
| `cache_hits_total` | counter | namespace, key | cache effectiveness |
| `cache_misses_total` | counter | namespace, key | cache effectiveness |
| `cache_set_duration_seconds` | histogram | — | cache performance |
| `db_query_duration_seconds` | histogram | operation, table | DB latency |
| `db_connections_active` | gauge | — | pool |
| `db_connections_idle` | gauge | — | pool |
| `job_processed_total` | counter | queue, status | jobs |
| `job_duration_seconds` | histogram | queue, type | job perf |
| `job_active` | gauge | queue | concurrency |
| `job_waiting` | gauge | queue | backlog |
| `job_dlq_depth` | gauge | queue | alerts |
| `rate_limit_blocks_total` | counter | endpoint, identifier | abuse |
| `auth_login_total` | counter | result, type | auth health |

### 4.3 System Metrics (Auto from Runtime)

- `process_cpu_seconds_total`
- `process_memory_bytes`
- `nodejs_eventloop_lag_seconds`
- `nodejs_heap_size_used_bytes`
- `nodejs_active_handles_total`
- `nodejs_active_requests_total`

### 4.4 Infrastructure Metrics (V1.5+)

- Postgres connections, replication lag
- Redis memory, hit rate
- Cloudinary quota
- Provider response times

---

## 5. Tracing

### 5.1 V1.5+: OpenTelemetry

Adopt OpenTelemetry SDK for distributed tracing.

### 5.2 Span Conventions

- HTTP server spans (per request)
- Database client spans (per query)
- Redis spans (per operation)
- External API spans (per provider call)
- Queue producer spans (per job enqueue)
- Queue consumer spans (per job process)

### 5.3 Span Attributes

- `requestId`
- `userId`
- `correlationId`
- `traceId`
- `userAgent`
- Custom: `orderId`, `paymentId`, etc.

### 5.4 Sampling

| Strategy | When |
|---|---|
| **Always on** | Errors |
| **Head-based** | 10% of requests (configurable) |
| **Tail-based** | 100% of slow requests (>2s) |

### 5.5 Backend (V1.5+)

- **Grafana Tempo** or **Honeycomb**
- Service map
- Latency breakdown

### 5.6 V1 Simple Approach

- Correlation via `X-Request-ID` header (already implemented)
- Log-based trace stitching
- Acceptable for low-traffic MVP

---

## 6. Monitoring

### 6.1 Dashboard Set

| Dashboard | Purpose |
|---|---|
| **Overview** | Health, traffic, errors at a glance |
| **API Performance** | Latency by endpoint, error rate |
| **Database** | Slow queries, connections |
| **Queues** | Backlog, DLQ, processing rate |
| **Business** | Orders, payments, conversions |
| **Security** | Failed logins, rate limit hits, MFA events |
| **Cache** | Hit rate, memory |
| **Notifications** | Email delivery, bounces |
| **Storage** | Quota usage |

### 6.2 V1 Tool

- **BetterStack** or **Highlight.io** for logs + basic metrics
- Vercel native for frontend

### 6.3 V1.5+ Tool

- **Grafana Cloud** (free tier for startup)
- Prometheus + Loki + Tempo
- One Grafana instance with multiple dashboards

---

## 7. Alerting

### 7.1 Alert Levels

| Level | When | Notification |
|---|---|---|
| **Info** | FYI | Slack channel |
| **Warning** | Degraded | Slack + email |
| **Critical** | Outage / data risk | Slack + email + phone |

### 7.2 Alert Catalog

| Alert | Condition | Severity |
|---|---|---|
| API 5xx spike | > 1% error rate for 5 min | Critical |
| API latency P95 | > 3s for 5 min | Warning |
| Database connection pool exhausted | > 90% used for 2 min | Critical |
| Redis connection failed | 3+ failures in 1 min | Critical |
| Queue depth spike | > 1000 jobs for 10 min | Warning |
| DLQ growth | > 5 new entries in 5 min | Critical |
| Disk/memory > 85% | sustained | Warning |
| Payment success rate < 95% | per provider, 15 min | Critical |
| Email bounce rate > 5% | per template, 1h | Warning |
| Failed login storm | > 100 in 5 min from same IP range | Critical |
| Cert expiry | < 14 days | Warning |
| Cert expiry | < 3 days | Critical |
| Version mismatch | API version desync | Warning |
| Backup failure | nightly success | Warning |
| Token issuer error | any | Critical |
| Provider rate limit hit | per provider | Warning |

### 7.3 Notification Channels

| Channel | Setup |
|---|---|
| Slack | Webhook per severity |
| Email | SMTP via email provider |
| Phone | V2 only (PagerDuty-style) |
| Ticketing | V2 (auto-file ticket) |

### 7.4 On-Call Rotation

V1: founders share; no formal rotation.

V1.5+: PagerDuty / Opsgenie integration.

---

## 8. SLI / SLO

### 8.1 SLI Definitions

| SLI | Definition | Target |
|---|---|---|
| **Availability** | uptime / total time | 99.9% (V1) |
| **Latency P95** | HTTP P95 response time | < 1.5s |
| **Latency P99** | HTTP P99 response time | < 3s |
| **Error rate** | 5xx / total | < 0.5% |
| **Payment success** | payment.captured / payment.created | > 95% |
| **Email delivery** | sent / sent+failed within 5 min | > 99% |

### 8.2 Error Budget

- 30-day budget based on SLO
- Burn rate alerts

---

## 9. Distributed Tracing Examples

### 9.1 Order Place Flow Traces

```
[API Gateway] POST /v1/checkout/{id}/place-order (245ms)
  └─ [Nest Handler] CheckoutOrchestrator (240ms)
       ├─ [Prisma] order.create (45ms)
       ├─ [Prisma] order_item.create (10ms)
       ├─ [Prisma] order_address.create (8ms)
       ├─ [Prisma] order_status_history.create (8ms)
       ├─ [Domain] emit OrderPlaced (3ms)
       ├─ [BullMQ] enqueue notification.email.order-confirmed (2ms)
       └─ [Prisma] tx.commit (150ms)
```

---

## 10. Synthetic Monitoring (V1.5+)

- Periodic checks of: storefront, admin, key APIs
- From external locations
- Alerts on failure

---

## 11. RUM (Real User Monitoring)

V1.5+:

- Vercel Analytics (basic)
- PostHog or Sentry session replay
- Web Vitals reported

---

## 12. Admin Observability

### 12.1 Admin Dashboard

```
GET /v1/admin/dashboard
{
  "summary": {
    "today": { "orders": 120, "revenue": 24000000000, "errors": 5 },
    "alerts": [...],
    "topErrors": [...],
    "slowEndpoints": [...]
  },
  "cacheHitRate": 0.82,
  "queueDepth": 17,
  "lastDeploymentAt": "..."
}
```

### 12.2 Admin Health Page

Admin-visible health report:
- Per-component status
- Recent incidents
- Scheduled maintenance

---

## 13. Capacity Monitoring

| Metric | Threshold |
|---|---|
| DB connections | < 80% of max |
| Redis memory | < 70% of max |
| Disk space | > 25% free |
| API P95 latency | < 1.5s |
| Provider quota | < 80% used |

---

## 14. Coverage Validation

| Check | Status |
|---|---|
| Health check endpoints | ✓ |
| Metrics catalog | ✓ |
| Tracing strategy | ✓ |
| Monitoring dashboards | ✓ |
| Alerting rules | ✓ |
| SLO / SLI | ✓ |
| Admin dashboard | ✓ |
| Capacity monitoring | ✓ |

---

## 15. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial observability architecture: health, metrics, traces, alerts, SLOs |

---

**End of 16_OBSERVABILITY.md**
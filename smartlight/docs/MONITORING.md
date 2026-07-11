# SmartLight — Monitoring

## Overview

SmartLight exposes Prometheus metrics on `/metrics` (Bearer-token gated) and
health probes on `/health`, `/health/ready`, `/health/status`.

```
   ┌──────────────┐      scrape :15s
   │ Prometheus   │ ─────────────────► api:4000/metrics
   └──────┬───────┘
          │ remote_write
          ▼
   ┌──────────────┐
   │   Grafana    │  (dashboards)
   └──────┬───────┘
          │ alert
          ▼
   ┌──────────────┐
   │ Alertmanager │ ─► PagerDuty / Slack / email
   └──────────────┘

   ┌──────────────┐      poll :15s
   │ Blackbox     │ ─────────────────► /health, /health/ready
   │ exporter     │
   └──────────────┘
```

## Prometheus Configuration

```yaml
# /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: smartlight-api
    scheme: https
    metrics_path: /metrics
    bearer_token: ${METRICS_SCRAPE_TOKEN}   # from Vault
    static_configs:
      - targets: ['api.smartlight.vn:443']
    scrape_interval: 15s
    scrape_timeout: 10s

  - job_name: smartlight-blackbox
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://smartlight.vn/health
          - https://admin.smartlight.vn/health
          - https://api.smartlight.vn/health
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

## Key Metrics

### HTTP

| Metric | Type | Use |
|---|---|---|
| `http_requests_total{method,route,status}` | counter | Request rate by route |
| `http_request_duration_seconds_bucket{method,route,status}` | histogram | Latency percentiles |

**Useful queries:**

```promql
# p50 / p95 / p99 latency for an endpoint
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket{route="/v1/products/:id"}[5m])) by (le)
)

# Error rate (5xx)
sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
sum(rate(http_requests_total[5m]))
```

### Database

| Metric | Use |
|---|---|
| `db_queries_total{model,action}` | Query rate per model |
| `db_query_duration_seconds_bucket` | Slow-query detection |

**Useful queries:**

```promql
# p99 query latency for Order
histogram_quantile(0.99,
  sum(rate(db_query_duration_seconds_bucket{model="order"}[5m])) by (le)
)

# Top 10 slowest models
topk(10,
  sum(rate(db_query_duration_seconds_sum[5m])) by (model)
  /
  sum(rate(db_query_duration_seconds_count[5m])) by (model)
)
```

### Redis

| Metric | Use |
|---|---|
| `redis_commands_total{command,status}` | Command rate |
| `redis_command_duration_seconds_bucket` | Cache latency |
| `redis_cache_hits_total{key_prefix}` | Cache effectiveness |
| `redis_cache_misses_total{key_prefix}` | Cache effectiveness |

**Cache hit ratio:**

```promql
sum(rate(redis_cache_hits_total[5m]))
  /
(sum(rate(redis_cache_hits_total[5m])) + sum(rate(redis_cache_misses_total[5m])))
```

### Business KPIs

| Metric | Use |
|---|---|
| `orders_placed_total{payment_provider}` | Order volume |
| `payments_completed_total{provider}` | Payment success |
| `checkouts_abandoned_total` | Funnel drop-off |

### Process (Node.js defaults)

- `process_cpu_user_seconds_total` / `process_cpu_system_seconds_total`
- `process_resident_memory_bytes`
- `nodejs_heap_size_total_bytes` / `nodejs_heap_size_used_bytes`
- `nodejs_eventloop_lag_seconds` — alert if > 0.5s
- `nodejs_active_handles_total` / `nodejs_active_requests_total`

## Alertmanager Rules

```yaml
# /etc/prometheus/rules/smartlight.yml
groups:
  - name: smartlight-api
    interval: 30s
    rules:
      - alert: ApiDown
        expr: up{job="smartlight-api"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "API is unreachable"
          runbook: "https://wiki.example.com/runbooks/api-down"

      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m]))
          > 0.05
        for: 5m
        labels:
          severity: warning

      - alert: SlowP99Latency
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 1.0
        for: 10m
        labels:
          severity: warning

      - alert: DbConnectionPoolExhausted
        expr: pg_stat_activity_count > 80  # if exporter installed
        for: 2m
        labels:
          severity: warning

      - alert: EventLoopLagging
        expr: nodejs_eventloop_lag_seconds > 0.5
        for: 2m
        labels:
          severity: warning

      - alert: DiskSpaceLow
        expr: nodejs_filesystem_available_bytes < 5e9  # < 5 GB
        for: 10m
        labels:
          severity: warning

      - alert: HighMemoryUsage
        expr: |
          process_resident_memory_bytes > 1.5e9  # > 1.5 GB
        for: 5m
        labels:
          severity: warning
```

## Grafana Dashboards

Three primary dashboards:

1. **API Overview** — request rate, error rate, p50/p95/p99 latency, top routes, status-code distribution
2. **Database** — query rate per model, slow queries, connection pool, replication lag (when replica added)
3. **Business KPIs** — orders/hour, revenue/hour, payment success rate, cart abandonment

JSON definitions are exported to `infrastructure/grafana/` (V1.1).

## Logging

- **Format**: JSON (one event per line)
- **Destination**: stdout → Docker → log driver → BetterStack / Loki / CloudWatch
- **Required fields**: `level`, `time`, `service`, `env`, `version`, `pid`, `msg`, `req.id`
- **Redacted**: passwords, tokens, secrets, cookies (23 paths)

**Sample query (Loki):**

```logql
{service="smartlight-api"} | json | level="error" | line_format "{{.msg}} ({{.err.message}})"
```

## Health Probes

| Endpoint | Purpose | Used by |
|---|---|---|
| `GET /health` | Cheap liveness (DB snapshot only) | Docker HEALTHCHECK |
| `GET /health/ready` | Readiness (pings DB + Redis, 503 if degraded) | Kubernetes readinessProbe, load balancer |
| `GET /health/status` | Deep status (DB, Redis, disk, memory, CPU, version) | Ops dashboards, on-call investigation |

**Kubernetes manifest:**

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 10
livenessProbe:
  httpGet:
    path: /health
    port: 4000
  initialDelaySeconds: 30
  periodSeconds: 30
  failureThreshold: 3
```

## On-Call Runbook

1. **Page received** → check `https://grafana.example.com/d/api-overview`
2. **API Down** → `kubectl describe pod`, `docker logs`, recent deploys?
3. **High error rate** → grep logs for `level=error` in last 5 min
4. **Slow latency** → check DB metrics (`db_query_duration_seconds`), Redis hit ratio
5. **Disk space** → `du -sh /var/lib/docker` and `du -sh /var/lib/postgresql`
6. **Memory** → `nodejs_heap_*` metrics, restart pod to clear
7. **Escalate** → Slack #ops-incidents
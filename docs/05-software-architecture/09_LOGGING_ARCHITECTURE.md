# 09 — Logging Architecture

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document defines the **centralized logging architecture** for SmartLight: log levels, formats, correlation IDs, audit logs, and log aggregation.

---

## 2. Logging Principles

1. **Structured logging** — JSON output; machine-parseable.
2. **Correlation everywhere** — every log carries `requestId`, `traceId`, `userId`.
3. **Levels respected** — debug in dev; info in staging; warn in production.
4. **PII safe** — sensitive fields redacted.
5. **Audit separated** — audit logs persisted in DB, not stdout.

---

## 3. Log Levels

| Level | Purpose | When Used |
|---|---|---|
| `error` | Operation failed; needs investigation | Exceptions, failed external calls |
| `warn` | Unexpected but recoverable | Retry, deprecation, cache miss |
| `info` | Normal operation milestone | Request started/completed, state transitions |
| `debug` | Diagnostic detail | Local dev only |
| `trace` | Very verbose | Disabled by default |

### 3.1 Level per Environment

| Env | Root Level | HTTP Level | App Level |
|---|---|---|---|
| local | debug | debug | debug |
| preview | info | info | debug |
| staging | info | info | info |
| production | warn | info | info |

---

## 4. Log Format

### 4.1 JSON Structure

```
{
  "timestamp": "2026-07-04T15:30:00.000Z",
  "level": "info",
  "service": "smartlight-api",
  "version": "1.0.0",
  "env": "production",
  "requestId": "0192ca3e-c5d8-7e1f-a012-3456789abcde",
  "traceId": "abc123def456",
  "userId": "user-uuid",
  "actor": { "type": "user", "id": "user-uuid" },
  "context": "OrderService",
  "msg": "Order placed",
  "data": {
    "orderId": "order-uuid",
    "orderNumber": "20260704-0001",
    "total": 217000000
  },
  "duration_ms": 245
}
```

### 4.2 Standard Fields

| Field | Type | Description |
|---|---|---|
| `timestamp` | ISO 8601 | When logged |
| `level` | string | log level |
| `service` | string | service name (e.g., `smartlight-api`) |
| `version` | string | App version |
| `env` | string | Environment |
| `requestId` | UUID | Per-request correlation |
| `traceId` | string | Distributed trace ID |
| `spanId` | string | Distributed span ID |
| `userId` | UUID | Authenticated user (if any) |
| `actor` | object | { type, id } of action performer |
| `context` | string | Logger context (class/module) |
| `msg` | string | Human-readable message |
| `data` | object | Structured metadata |
| `duration_ms` | number | Operation duration |
| `error.code` | string | Error code (if applicable) |
| `error.stack` | string | Stack trace (errors only) |

---

## 5. Logging Library

### 5.1 Choice

- **Pino** (high-performance JSON logger)
- **nestjs-pino** (NestJS integration)
- Log levels via `LOG_LEVEL` env var
- Pretty-print in local dev (`pino-pretty`)
- Raw JSON in production

### 5.2 Logger Module

```
src/platform/logger/
├── logger.module.ts           # Global module
├── logger.config.ts           # Pino config
├── pino-http.config.ts        # HTTP request logging
├── redact.ts                  # Sensitive field redaction
└── context.ts                 # Async context (CLS) helpers
```

---

## 6. Correlation ID Strategy

### 6.1 `requestId`

- Generated per HTTP request
- Either client-supplied (`X-Request-ID`) or server-generated (UUID v7)
- Echoed in response header
- Attached to all logs within the request scope

### 6.2 `traceId` and `spanId`

- OpenTelemetry-compatible
- Propagated via `traceparent` header (W3C)
- Used for distributed tracing (V1.5+)

### 6.3 Async Context Storage

Use `cls-hooked` (or Node `AsyncLocalStorage`) to attach request context to all logs in the same async call stack.

```
class OrderService {
  private logger = new Logger(OrderService.name);
  
  async placeOrder(input: PlaceOrderInput) {
    this.logger.log({ msg: 'Placing order', data: { input } });
    // ...
  }
}
```

> Logger auto-attaches requestId/traceId/userId from context.

---

## 7. HTTP Request Logging

### 7.1 Request Log

```
{
  "level": "info",
  "msg": "Request received",
  "req": {
    "method": "POST",
    "url": "/v1/checkout/{id}/place-order",
    "remoteAddress": "1.2.3.4",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### 7.2 Response Log

```
{
  "level": "info",
  "msg": "Request completed",
  "req": { "method": "POST", "url": "/v1/checkout/{id}/place-order" },
  "res": {
    "statusCode": 201,
    "duration_ms": 245
  }
}
```

### 7.3 Slow Request Warning

Requests > 1000ms logged at `warn`:

```
{
  "level": "warn",
  "msg": "Slow request",
  "duration_ms": 1234,
  "req": {...},
  "res": {...}
}
```

### 7.4 Error Request

Requests with 5xx response logged at `error` with stack trace.

---

## 8. Sensitive Data Redaction

### 8.1 Fields to Redact

| Field | Reason |
|---|---|
| `password` | Credential |
| `passwordHash` | Hash |
| `token` | Auth |
| `accessToken` | JWT |
| `refreshToken` | Auth |
| `mfaSecret` | MFA |
| `recoveryCode` | MFA |
| `cookie` | Session |
| `Authorization` header | Auth |
| `email` (in some logs) | PII |
| `phone` | PII |
| `paymentMethod.card` | PCI |
| `*.creditCardNumber` | PCI |

### 8.2 Implementation

```
const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.refreshToken',
  '*.accessToken',
  '*.mfaSecret',
  '*.recoveryCode'
];

const logger = pino({ redact: { paths: redactPaths, censor: '[REDACTED]' } });
```

---

## 9. Domain / Application Logging

### 9.1 What to Log per Layer

| Layer | Log Events |
|---|---|
| Interface | HTTP request start/end |
| Application | Command started, command completed, command failed |
| Domain | Invariant violations (as exceptions, not logs) |
| Infrastructure | External call started/completed/failed, retry |

### 9.2 Command Logging Example

```
{
  "level": "info",
  "msg": "Command started",
  "command": "PlaceOrderCommand",
  "input": { "sessionId": "..." }
}

{
  "level": "info",
  "msg": "Command completed",
  "command": "PlaceOrderCommand",
  "result": { "orderId": "..." },
  "duration_ms": 245
}

{
  "level": "error",
  "msg": "Command failed",
  "command": "PlaceOrderCommand",
  "error": { "code": "INSUFFICIENT_STOCK", "message": "..." },
  "duration_ms": 50
}
```

---

## 10. Audit Logging

### 10.1 Separation

Audit logs are **separate from application logs**:

| Aspect | App Log | Audit Log |
|---|---|---|
| Destination | stdout → aggregator | DB (`audit_log`) |
| Format | JSON | Structured row |
| Retention | 30 days (configurable) | 7 years |
| Searchability | By traceId | By entity, action, actor, date |
| Immutability | No | Append-only |

### 10.2 What Gets Audited

- All authentication events
- All authorization denials
- All admin mutations
- All payment events
- All order state transitions
- All inventory adjustments
- All PDPD-related actions (data export, anonymization)

### 10.3 Audit Service

```
class AuditService {
  async record(input: {
    action: string,
    entityType: string,
    entityId: string,
    actor: { type, id },
    before?: object,
    after?: object,
    metadata?: object
  }): Promise<void> {
    await this.db.auditLog.create({ data: input });
    // Optional: also publish `audit.written` event
  }
}
```

---

## 11. Error Logging

### 11.1 What to Include

| Field | Always | Sometimes |
|---|---|---|
| `error.code` | ✓ | |
| `error.message` | ✓ | |
| `error.stack` | ✓ (errors only) | |
| `requestId` | ✓ | |
| `userId` | ✓ | |
| `error.cause` | ✓ | (when chained) |
| `error.context` | ✓ | (additional data) |

### 11.2 Stack Trace Policy

- Development: full stack
- Production: stack (for debugging) BUT scrub PII

---

## 12. Performance Logging

### 12.1 Slow Operation Threshold

| Operation | Threshold |
|---|---|
| HTTP request | 1000ms (warn) |
| DB query | 500ms (warn) |
| External call | 3000ms (warn) |
| Cache miss | not separately logged |
| Queue job | 5000ms (warn) |

### 12.2 Format

```
{
  "level": "warn",
  "msg": "Slow operation",
  "operation": "DB_QUERY",
  "duration_ms": 1234,
  "data": { "query": "...", "params": "..." }
}
```

---

## 13. Log Aggregation (Production)

### 13.1 Pipeline

```
App (stdout JSON) → Log Shipper → Storage → Query UI
       ↓
   Filebeat / Vector / Vercel Log Drain
       ↓
   BetterStack / Datadog / Grafana Loki
       ↓
   Query UI / Alerts
```

### 13.2 V1 Choice

- **BetterStack** (primary) — startup-friendly, easy setup
- Vercel native logging for frontend

### 13.3 Retention

| Log Type | Retention |
|---|---|
| App logs | 30 days |
| Error logs | 90 days |
| Audit logs | 7 years (DB) |
| Performance metrics | 90 days |

---

## 14. Log Querying

### 14.1 Common Queries

- "Show all errors in last 1 hour" → `level:error`
- "Trace a request" → `requestId:"..."`
- "Find user activity" → `userId:"..."`
- "Find failed payments" → `action:payment.failed`

### 14.2 Dashboard Examples

- Error rate by endpoint
- Slow endpoint leaderboard
- Failed login attempts
- Payment success rate

---

## 15. Sampling

For high-volume endpoints (catalog browse, search), apply sampling:

```
if (env === 'production' && endpoint === 'catalog') {
  sampleRate = 0.01; // log 1% of requests
}
```

> Errors always logged (no sampling).

---

## 16. Coverage Validation

| Check | Status |
|---|---|
| Log levels defined | ✓ |
| JSON format specified | ✓ |
| Correlation IDs (requestId, traceId) | ✓ |
| HTTP request logging | ✓ |
| Sensitive data redaction | ✓ |
| Domain/application logging | ✓ |
| Audit logging (separate) | ✓ |
| Error logging | ✓ |
| Performance logging | ✓ |
| Aggregation pipeline | ✓ |
| Sampling strategy | ✓ |

---

## 17. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial logging architecture: Pino, correlation IDs, audit separation |

---

**End of 09_LOGGING_ARCHITECTURE.md**
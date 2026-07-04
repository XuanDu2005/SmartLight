# 15 — Background Job Architecture

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document defines SmartLight's **background job architecture**: queues, jobs, retry, dead-letter handling, and observability. Built on **BullMQ** + **Redis**.

---

## 2. Job Principles

1. **Async-first** — heavy work never on the request path.
2. **Idempotent** — repeat-safe; same effect on retry.
3. **Observable** — every job logged and measured.
4. **Bounded retry** — finite attempts; DLQ on permanent failure.
5. **Backpressure-aware** — queue depth alerts.

---

## 3. Queue Topology

```
┌─────────────────────────────────────────────────────────┐
│                       API Process                       │
│  producers (controllers) enqueue jobs to queues        │
└─────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│                        Redis                            │
│  Queue name → list of jobs (BullMQ)                     │
└─────────────────────────────────────────────────────────┘
        ↑
┌─────────────────────────────────────────────────────────┐
│                    Workers (V1 same process; V2 separate) │
│  Consumers pick up jobs and execute                     │
└─────────────────────────────────────────────────────────┘
```

### 3.1 V1 (MVP)

- Workers run **in the same process** as the API
- Concurrency controlled per queue
- Sufficient for low-to-medium volume

### 3.2 V1.5+

- Workers split into separate containers
- Independent scaling
- Different concurrency per worker type

---

## 4. Queue Catalog

| Queue | Purpose | Concurrency | Retention |
|---|---|---|---|
| `email` | Transactional & marketing emails | 5 | 1000 completed / 7d |
| `webhook.delivery` | Outbound webhooks (e.g., to internal BI) | 10 | 1000 / 7d |
| `webhook.inbound_retry` | Retries for downstream replies | 5 | 1000 / 7d |
| `inventory.reconcile` | Stock reconciliation runs | 2 | 100 / 30d |
| `inventory.low_stock_check` | Periodic low-stock alerts | 1 | 100 / 30d |
| `image.process` | Cloudinary transformations | 5 | 1000 / 3d |
| `order.scheduled` | Order cancel-past-pending (V1.1+) | 2 | 100 / 30d |
| `cart.abandoned` | Cart-reminder emails | 2 | 100 / 7d |
| `email.retry` | Bounced/pending email retry | 5 | 500 / 7d |
| `cleanup` | Daily cleanup (logs, temp files) | 1 | 100 / 30d |
| `analytics.flush` | Analytics batch flush | 2 | 100 / 7d |
| `audit.archive` | Audit log archival (V1.5) | 1 | 100 / 30d |
| `dlq` | Dead letter queue (one per queue above) | — | 5000 / 90d |

> Each work queue has its own DLQ.

---

## 5. Job Catalog (Examples)

### 5.1 `email.send`

```
queue: 'email'
jobName: 'send'

payload:
  notificationLogId: UUID,
  channel: 'email',
  templateCode: string,
  recipient: { email, name },
  payload: object,
  locale: string,
  priority: 'high' | 'normal' | 'low'

processes:
  - Resolve template (locale)
  - Render (HTML + text)
  - Send via Resend
  - Update notification_log
  - Emit notification.sent / failed
```

### 5.2 `webhook.delivery`

```
queue: 'webhook.delivery'
jobName: 'send'

payload:
  webhookEventId: UUID,
  targetUrl: string,
  body: object,
  signature: string,
  providerCode: string

processes:
  - POST to target URL
  - Verify response 2xx
  - Retry on 5xx / timeout
```

### 5.3 `inventory.low_stock_check`

```
queue: 'inventory.low_stock_check'
jobName: 'check'

cron: '0 8,18 * * *' (twice daily)

processes:
  - Find variants below threshold
  - For each, queue `email.send` → admin alert
```

### 5.4 `cart.abandoned`

```
queue: 'cart.abandoned'
jobName: 'reminder'

delay: 24h after cart.updated
unique: per (userId|cartId)

processes:
  - Check cart still exists and is abandoned
  - If so, send reminder email
```

---

## 6. Job Conventions

### 6.1 Payload Structure

```
{
  jobId: UUID,                // auto
  type: string,                // 'email.send', etc.
  attempt: number,             // auto
  enqueuedAt: ISO,
  payload: object,
  context: {
    correlationId: UUID,      // trace
    causationId: UUID?,       // originating event
    actorId: UUID?,
    actorType?: 'user' | 'admin' | 'system'
  }
}
```

### 6.2 Naming

- `verb.noun` — `send.email`, `check.low_stock`
- Lowercase, dot-separated

### 6.3 Idempotency

Each job **must** be idempotent. Strategies:

- DB unique constraint on `(job_id, resource)` 
- Check resource state before mutating (e.g., "order already cancelled? skip")
- Event ID dedup

### 6.4 Priority

| Priority | Use |
|---|---|
| `high` | Auth, password reset, security alerts |
| `normal` | Order confirmations, payment receipts |
| `low` | Marketing, analytics |

---

## 7. Retry Policy

### 7.1 Default Retry

```
attempts: 5
backoff:
  type: exponential
  delay: 1000ms initial
  multiplier: 3
  max: 1h
```

| Attempt | Delay |
|---|---|
| 1 | 0 |
| 2 | 1s |
| 3 | 3s |
| 4 | 9s |
| 5 | 27s |
| 6 (DLQ) | — |

### 7.2 Per-Queue Retry Settings

| Queue | Attempts | Max Delay | DLQ |
|---|---|---|---|
| `email` | 5 | 1h | `email.dlq` |
| `webhook.delivery` | 5 | 6h | `webhook.delivery.dlq` |
| `image.process` | 3 | 30s | `image.process.dlq` |
| `cart.abandoned` | 3 | 1h | `cart.abandoned.dlq` |

### 7.3 Retry Triggers

| Failure | Retry? |
|---|---|
| Network timeout | Yes |
| 5xx response | Yes |
| 4xx response | No (DLQ) |
| ValidationException | No (DLQ) |
| PermissionDeniedException | No (DLQ) |
| ExternalApiException with `retryable: false` | No (DLQ) |
| Unknown exception | Yes (treat as transient) |

---

## 8. Dead Letter Queue

### 8.1 Purpose

When a job exhausts attempts, it's moved to a DLQ. The DLQ:

- Holds the job indefinitely (90 days)
- Has a separate dashboard for admin review
- Allows manual replay
- Alerts on significant growth

### 8.2 DLQ Shape

```
{
  originalQueue: string,
  originalJobId: string,
  originalPayload: object,
  failedAt: ISO,
  attempts: number,
  lastError: {
    message: string,
    stack: string,
    code: string,
  },
  replayHistory: [{
    replayedAt, replayedBy, result
  }]
}
```

### 8.3 Admin Operations

- List DLQ entries (`GET /v1/admin/jobs/dlq`)
- Inspect job (`GET /v1/admin/jobs/dlq/{jobId}`)
- Replay (`POST /v1/admin/jobs/dlq/{jobId}/replay`)
- Discard (`DELETE /v1/admin/jobs/dlq/{jobId}`)

---

## 9. Scheduling (Cron-like)

BullMQ supports cron-like repeatable jobs.

| Job | Cron | Reason |
|---|---|---|
| `inventory.low_stock_check` | `0 8,18 * * *` | Twice daily |
| `cleanup.daily` | `0 3 * * *` | 03:00 daily |
| `analytics.flush` | `*/15 * * * *` | Every 15 min |
| `audit.archive` | `0 4 * * 0` | Weekly Sunday |
| `cache.warm` | `0 2 * * *` | 02:00 daily |
| `db.stats` | `0 5 * * *` | 05:00 daily |
| `rbac.cache.refresh` | `0 */6 * * *` | Every 6h |

---

## 10. Workers

### 10.1 Worker (Same Process V1)

```
class EmailWorker {
  @Process('email')
  async process(job: Job) {
    try {
      await this.emailService.execute(job.data);
    } catch (err) {
      if (err instanceof ValidationException) {
        await this.notificationLog.update(job.data.notificationLogId, { status: 'failed', reason: err.code });
        return;  // do not rethrow; mark failed
      }
      throw err;  // rethrow for retry/DLQ
    }
  }
  
  @OnQueueActive
  onActive(job: Job) {
    this.logger.debug({ jobId: job.id, type: job.name, msg: 'Job started' });
  }
  
  @OnQueueCompleted
  onComplete(job: Job, result: any) {
    this.logger.info({ jobId: job.id, type: job.name, msg: 'Job completed', duration_ms: job.processedOn - job.timestamp });
  }
  
  @OnQueueFailed
  onFail(job: Job, err: Error) {
    this.logger.warn({ jobId: job.id, type: job.name, msg: 'Job failed', err: err.message, attempt: job.attemptsMade });
  }
}
```

### 10.2 Concurrency

```
queue('email', { concurrency: 5 });
queue('webhook', { concurrency: 10 });
```

### 10.3 Rate Limiting

Per-queue rate limit to protect providers:

```
queue('email', {
  limiter: { max: 100, duration: 60000 }  // 100/min
});
```

### 10.4 Graceful Shutdown

On SIGTERM:
- Workers stop accepting new jobs
- Wait for in-flight to complete (max 30s)
- Then exit

---

## 11. Observability

### 11.1 Per-Queue Metrics

| Metric | Source |
|---|---|
| Active count | BullMQ `getActiveCount` |
| Waiting count | `getWaitingCount` |
| Completed count | `getCompletedCount()` |
| Failed count | `getFailedCount()` |
| Delayed count | `getDelayedCount()` |
| Average duration | from job `processedOn - timestamp` |
| Retry rate | `failed.count / (completed.count + failed.count)` |
| DLQ depth | per DLQ |

### 11.2 Dashboard

`GET /v1/admin/jobs/stats` (admin only):

```
{
  "queues": [
    {
      "name": "email",
      "active": 2,
      "waiting": 5,
      "completed": 12345,
      "failed": 12,
      "delayed": 0,
      "dlqDepth": 0
    }
  ]
}
```

### 11.3 Alerts

| Alert | Trigger |
|---|---|
| Queue depth > 1000 | For 5 min |
| DLQ growth | Any new entries |
| Job failure rate > 10% | For 15 min |
| Worker not running | Job waiting + no active for 5 min |

---

## 12. Job Module Structure

```
src/platform/jobs/
├── jobs.module.ts
├── queue.constants.ts          # Queue name tokens
├── queue.factory.ts            # Queue registration
├── worker.factory.ts           # Worker registration
├── decorators/
│   ├── process.decorator.ts
│   └── on-*.decorator.ts
├── schedulers/
│   ├── inventory.scheduler.ts
│   ├── cleanup.scheduler.ts
│   └── ...
└── dlq/
    ├── dlq.service.ts
    └── dlq-admin.controller.ts
```

---

## 13. Idempotency (Job-Specific)

For jobs that need strict idempotency (e.g., payment capture):

```
queue('payment.capture', {
  jobId: `capture:${paymentId}`  // prevents duplicate enqueue
});

class PaymentCaptureHandler {
  @Process('payment.capture')
  async process(job) {
    if (await this.alreadyProcessed(job.data.paymentId)) {
      return;  // idempotent skip
    }
    await this.capture(...);
    await this.markProcessed(...);
  }
}
```

---

## 14. Failure Recovery

| Scenario | Recovery |
|---|---|
| Worker process killed mid-job | BullMQ requeues (unacked → waiting) |
| Redis flushed | BullMQ stateless; jobs lost → use AOF persistence |
| Long-running job blocks queue | Increase concurrency or split into sub-jobs |
| Provider permanently down | DLQ growth → admin intervention |

---

## 15. Coverage Validation

| Check | Status |
|---|---|
| Queue topology defined | ✓ |
| Queue catalog | ✓ |
| Job examples | ✓ |
| Conventions (naming, payload, priority) | ✓ |
| Retry policy per queue | ✓ |
| DLQ strategy | ✓ |
| Cron schedule | ✓ |
| Worker structure | ✓ |
| Observability | ✓ |
| Idempotency | ✓ |
| Failure recovery | ✓ |

---

## 16. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial background job architecture: BullMQ + DLQ + schedulers |

---

**End of 15_BACKGROUND_JOB_ARCHITECTURE.md**
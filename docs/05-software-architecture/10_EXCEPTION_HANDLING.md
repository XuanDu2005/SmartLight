# 10 — Exception Handling

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document defines SmartLight's **exception handling strategy**: taxonomy, propagation, mapping to HTTP, retry, and observability.

> Maps directly to `docs/04-api-design/ERROR_RESPONSE_STANDARD.md` (response format) and `docs/03-database-design/EXCEPTION_HANDLING.md` (data-side).

---

## 2. Principles

1. **Typed exceptions** — every failure has a class.
2. **Translated at the edge** — domain exceptions never leak HTTP semantics.
3. **No swallowed errors** — every exception is logged.
4. **Predictable responses** — clients get the documented error envelope.
5. **Safe defaults** — unknown exceptions become generic 500.

---

## 3. Exception Taxonomy

```
BaseException (abstract)
│
├── DomainException (business rule violations)
│   ├── ValidationException
│   ├── BusinessRuleException
│   ├── ResourceNotFoundException
│   ├── ResourceConflictException
│   ├── InvalidStateTransitionException
│   ├── InsufficientStockException
│   ├── PaymentException
│   │   ├── PaymentDeclinedException
│   │   ├── InsufficientFundsException
│   │   └── PaymentExpiredException
│   └── AuthorizationException
│       ├── PermissionDeniedException
│       └── ResourceAccessDeniedException
│
├── ApplicationException (orchestration failures)
│   ├── OrchestrationFailedException
│   ├── ExternalServiceUnavailableException
│   └── TimeoutException
│
├── InfrastructureException
│   ├── DatabaseException
│   ├── CacheException
│   ├── QueueException
│   ├── StorageException
│   └── ExternalApiException
│
└── FrameworkException (NestJS / Express built-ins)
    ├── NotFoundException (HTTP)
    ├── UnauthorizedException (HTTP)
    ├── ForbiddenException (HTTP)
    ├── BadRequestException (HTTP)
    └── ...
```

---

## 4. Exception Hierarchy Details

### 4.1 BaseException

```
abstract class BaseException extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly isOperational: boolean;       // true for expected errors
  readonly metadata?: Record<string, any>;
  readonly cause?: Error;
  
  constructor(
    message: string,
    options?: { code?: string; metadata?: object; cause?: Error }
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = options?.code ?? this.constructor.name;
    this.metadata = options?.metadata;
    this.cause = options?.cause;
  }
  
  toErrorResponse(): ErrorResponse { /* ... */ }
}
```

### 4.2 Domain Exceptions

#### ValidationException

```
class ValidationException extends DomainException {
  readonly httpStatus = 422;
  readonly code = 'VALIDATION_ERROR';
  readonly details: ErrorDetail[];
  
  constructor(details: ErrorDetail[]) {
    super('Validation failed');
    this.details = details;
  }
}

class ErrorDetail {
  field: string;
  code: string;          // INVALID_EMAIL, REQUIRED_FIELD_MISSING, etc.
  message: string;
  expectedFormat?: string;
  requirements?: string[];
}
```

#### ResourceNotFoundException

```
class ResourceNotFoundException extends DomainException {
  readonly httpStatus = 404;
  readonly code = 'NOT_FOUND';
  
  constructor(resource: string, id: string) {
    super(`${resource} not found`);
    this.metadata = { resource, id };
  }
}
```

#### BusinessRuleException

```
class BusinessRuleException extends DomainException {
  readonly httpStatus = 422;
  
  constructor(code: string, message: string, metadata?: object) {
    super(message, { code, metadata });
  }
}
```

#### InvalidStateTransitionException

```
class InvalidStateTransitionException extends DomainException {
  readonly httpStatus = 409;
  readonly code = 'CANNOT_TRANSITION_STATUS';
  
  constructor(entity: string, fromStatus: string, toStatus: string) {
    super(`Cannot transition ${entity} from ${fromStatus} to ${toStatus}`);
  }
}
```

#### InsufficientStockException

```
class InsufficientStockException extends DomainException {
  readonly httpStatus = 409;
  readonly code = 'INSUFFICIENT_STOCK';
  
  constructor(items: { variantId, sku, requested, available }[]) {
    super('Insufficient stock for one or more items');
    this.metadata = { items };
  }
}
```

#### AuthorizationException

```
class PermissionDeniedException extends DomainException {
  readonly httpStatus = 403;
  readonly code = 'INSUFFICIENT_PERMISSIONS';
}

class ResourceAccessDeniedException extends DomainException {
  readonly httpStatus = 403;
  readonly code = 'FORBIDDEN';
}
```

### 4.3 Application Exceptions

```
class ExternalServiceUnavailableException extends ApplicationException {
  readonly httpStatus = 503;
  readonly code = 'EXTERNAL_SERVICE_UNAVAILABLE';
  
  constructor(service: string, cause?: Error) {
    super(`${service} is currently unavailable`, { cause });
  }
}

class TimeoutException extends ApplicationException {
  readonly httpStatus = 504;
  readonly code = 'TIMEOUT';
}
```

### 4.4 Infrastructure Exceptions

```
class DatabaseException extends InfrastructureException {
  readonly httpStatus = 500;
  readonly code = 'DATABASE_ERROR';
}

class ExternalApiException extends InfrastructureException {
  readonly httpStatus = 502;
  readonly code = 'EXTERNAL_API_ERROR';
  
  constructor(provider: string, status: number, body: any) {
    super(`${provider} returned ${status}`);
  }
}
```

---

## 5. Throwing Exceptions

### 5.1 Where to Throw

| Layer | What | Example |
|---|---|---|
| Domain | Invariant violations, business rule failures | `if (!order.canCancel()) throw new InvalidStateTransitionException(...)` |
| Application | Orchestration failure, external timeout | `if (!response.ok) throw new ExternalServiceUnavailableException(...)` |
| Interface | DTO validation (auto) | (handled by `ValidationPipe`) |
| Infrastructure | Adapter-level failures | `throw new ExternalApiException(...)` |

### 5.2 Style

```
// Bad
if (!user) throw new Error('User not found');

// Good
if (!user) throw new ResourceNotFoundException('User', id);

// Worse
if (!user) throw new HttpException('Not found', 404);
```

> Domain/Application code never imports HTTP types.

---

## 6. Global Exception Filter

### 6.1 Responsibility

A single NestJS `ExceptionFilter` catches all uncaught exceptions and produces the standard error envelope:

```
@Catch()
class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    
    const errorResponse = this.translate(exception, req);
    
    res.status(errorResponse.httpStatus).json({
      error: {
        code: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details,
        traceId: req['requestId'],
        timestamp: new Date().toISOString(),
        path: req.url
      }
    });
    
    // Log
    if (errorResponse.httpStatus >= 500) {
      this.logger.error({ err: exception, ... });
    } else {
      this.logger.warn({ ... });
    }
  }
  
  private translate(exception, req): ErrorResponse {
    if (exception instanceof BaseException) {
      return exception.toErrorResponse();
    }
    
    if (exception instanceof HttpException) {
      return translateHttpException(exception);
    }
    
    // Unknown — generic 500
    return {
      httpStatus: 500,
      code: 'INTERNAL_ERROR',
      message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    };
  }
}
```

### 6.2 Behavior by Exception Type

| Exception | HTTP Status | Response Body |
|---|---|---|
| `ValidationException` | 422 | `{ code: VALIDATION_ERROR, details: [...] }` |
| `ResourceNotFoundException` | 404 | `{ code: NOT_FOUND }` |
| `BusinessRuleException` | 422 | `{ code: <specific> }` |
| `InvalidStateTransitionException` | 409 | `{ code: CANNOT_TRANSITION_STATUS }` |
| `InsufficientStockException` | 409 | `{ code: INSUFFICIENT_STOCK, metadata }` |
| `PermissionDeniedException` | 403 | `{ code: INSUFFICIENT_PERMISSIONS }` |
| `ExternalServiceUnavailableException` | 503 | `{ code: EXTERNAL_SERVICE_UNAVAILABLE }` |
| `TimeoutException` | 504 | `{ code: TIMEOUT }` |
| `DatabaseException` | 500 | `{ code: INTERNAL_ERROR }` (sanitized) |
| `ExternalApiException` | 502 | `{ code: UPSTREAM_ERROR }` |
| NestJS `HttpException` | mapped | translated |
| Unknown `Error` | 500 | generic message; full stack in logs |

### 6.3 Information Disclosure Prevention

- 500-level exceptions never expose:
  - Stack trace in response
  - Database error messages
  - Internal file paths
  - Provider API responses

Stack traces and full details are logged but **not** returned to clients.

---

## 7. Retry Strategy

### 7.1 Automatic Retry (in-process)

For transient infrastructure failures:

| Exception | Retry? | Strategy |
|---|---|---|
| `DatabaseException` (deadlock) | Yes | Up to 3 attempts; jitter |
| `ExternalApiException` (5xx, timeout) | Yes | Per adapter; see module docs |
| `CacheException` | No | Treat as miss |
| `QueueException` | Yes | BullMQ handles |
| `ValidationException` | No | Never retry client errors |
| `InsufficientStockException` | No | Business failure |
| `PermissionDeniedException` | No | Never retry auth |

### 7.2 BullMQ Retry (queue)

For async jobs: see `15_BACKGROUND_JOB_ARCHITECTURE.md`.

### 7.3 Manual Retry

For client-driven retries: use Idempotency-Key.

---

## 8. Circuit Breaker

For external service calls, circuit breaker pattern prevents cascading failures:

```
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  private failureCount: number;
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.openedAt < this.timeout) {
        throw new ExternalServiceUnavailableException(...);
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }
}
```

Applied to:
- VNPay, MoMo, ZaloPay, PayPal APIs
- GHN, GHTK, Viettel Post APIs
- Cloudinary API
- Email provider

---

## 9. Async Error Handling (Queues)

```
queue.process('email.send', async (job) => {
  try {
    await this.emailService.send(...);
  } catch (err) {
    if (err instanceof ExternalServiceUnavailableException) {
      // Retry
      throw err; // BullMQ will retry
    }
    
    if (err instanceof ValidationException) {
      // Don't retry; mark failed
      await this.notificationLog.update(job.data.logId, { status: 'failed', error: err.code });
      return; // not re-thrown
    }
    
    throw err; // unknown; will retry then DLQ
  }
});
```

---

## 10. Domain Error Logging

Domain exceptions are **not** logged at the source (they're expected). They are logged when caught by the global filter:

```
{
  "level": "warn",
  "msg": "Domain exception",
  "error.code": "INSUFFICIENT_STOCK",
  "error.message": "Insufficient stock for variant uuid-1",
  "requestId": "...",
  "userId": "..."
}
```

- **5xx** → logged at `error` with stack.
- **4xx** → logged at `warn` without stack.
- **Operational vs programming errors** — distinguished; only operational exceptions re-thrown.

---

## 11. Operational vs Programming Errors

### 11.1 Operational (`isOperational = true`)

Expected errors; do not crash the app:

- Validation failures
- Resource not found
- Insufficient stock
- Payment declined
- External service unavailable (with retry)
- Authorization denied

### 11.2 Programming (`isOperational = false`)

Bugs; should crash and be fixed:

- Type errors
- Null pointer
- Unhandled promise rejection
- DB constraint violation not caught (indicates missing validation)
- `throw new Error('...')` (untyped)

> Programming errors should be caught at the global filter and logged with stack; alert on rate spike.

---

## 12. Error Codes Catalog

A canonical set of error codes; see `docs/04-api-design/ERROR_RESPONSE_STANDARD.md` for full list. Examples:

```
VALIDATION_ERROR
INVALID_EMAIL
INVALID_PHONE
INVALID_FORMAT
VALUE_OUT_OF_RANGE
WEAK_PASSWORD

NOT_FOUND
USER_NOT_FOUND
ORDER_NOT_FOUND
PRODUCT_NOT_FOUND
PAYMENT_NOT_FOUND

INSUFFICIENT_PERMISSIONS
RESOURCE_NOT_OWNED
EMAIL_NOT_VERIFIED
MFA_REQUIRED
ACCOUNT_LOCKED

CONFLICT
DUPLICATE_RESOURCE
EMAIL_ALREADY_EXISTS
REVIEW_ALREADY_EXISTS
INSUFFICIENT_STOCK
STOCK_GOES_NEGATIVE
CANNOT_TRANSITION_STATUS

PAYMENT_FAILED
PAYMENT_EXPIRED
INSUFFICIENT_FUNDS
PROVIDER_TIMEOUT

RATE_LIMIT_EXCEEDED

EXTERNAL_SERVICE_UNAVAILABLE
TIMEOUT

INTERNAL_ERROR
DATABASE_ERROR
```

---

## 13. Testing Exception Handling

### 13.1 Unit Tests

- Each exception class produces correct envelope
- Domain throws right exception for right input
- Application translates properly

### 13.2 Integration Tests

- HTTP layer returns correct status/body
- Sensitive info not leaked

### 13.3 E2E Tests

- Known scenarios produce expected responses
- Circuit breaker trips on repeated failures

---

## 14. Coverage Validation

| Check | Status |
|---|---|
| Exception taxonomy defined | ✓ |
| Base + Domain + Application + Infrastructure + Framework | ✓ |
| Throwing conventions | ✓ |
| Global filter behavior | ✓ |
| HTTP status mapping | ✓ |
| Information disclosure prevention | ✓ |
| Retry strategy | ✓ |
| Circuit breaker pattern | ✓ |
| Async error handling | ✓ |
| Logging strategy | ✓ |
| Operational vs programming errors | ✓ |
| Error codes aligned with API spec | ✓ |

---

## 15. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial exception handling: taxonomy, filter, retry, circuit breaker |

---

**End of 10_EXCEPTION_HANDLING.md**
# 03 — Layered Architecture

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document describes the **layered architecture** applied to every bounded-context module in SmartLight. It enforces Clean Architecture and DDD layering rules so that the domain stays pure and infrastructure stays replaceable.

---

## 2. Layering Model

SmartLight uses a strict **four-layer architecture** inspired by Clean Architecture and adapted to NestJS:

```
┌─────────────────────────────────────────────────────────┐
│  1. Interface Layer (HTTP / API)                        │
│     Controllers · Guards · Pipes · Filters · DTOs       │
├─────────────────────────────────────────────────────────┤
│  2. Application Layer (Use Cases / Orchestration)       │
│     Commands · Queries · Orchestrators · Event Handlers │
├─────────────────────────────────────────────────────────┤
│  3. Domain Layer (Business Logic — PURE)                │
│     Aggregates · Entities · Value Objects · Domain      │
│     Events · Domain Services · Domain Exceptions        │
├─────────────────────────────────────────────────────────┤
│  4. Infrastructure Layer (Adapters / Persistence)       │
│     Prisma Repositories · External Adapters · Mappers   │
└─────────────────────────────────────────────────────────┘
```

**Dependency Rule:** dependencies flow **inward only**.

```
Interface → Application → Domain ← Infrastructure
```

> The Domain layer has **zero** dependencies on outer layers. It does not import NestJS, Prisma, Redis, or HTTP.

---

## 3. Layer Responsibilities

### 3.1 Interface Layer

**Path:** `modules/{context}/interface/`

| Element | Responsibility |
|---|---|
| Controllers | Translate HTTP → Commands/Queries; map responses to DTOs |
| DTOs | Request validation, response shaping |
| Guards | AuthN (JWT), AuthZ (roles), RateLimit |
| Pipes | Transformation, validation |
| Filters | Exception → HTTP error |
| Decorators | `@CurrentUser()`, `@IdempotencyKey()`, `@Audit()` |
| HTTP-specific | Status codes, headers, cookies |

**Allowed imports:** Application layer, Domain layer (for types), Platform.

**Forbidden imports:** Prisma, Redis, BullMQ, external SDKs directly.

### 3.2 Application Layer

**Path:** `modules/{context}/application/`

| Element | Responsibility |
|---|---|
| Commands | One method = one business action (e.g., `PlaceOrderCommand`) |
| Queries | Read-only operations (e.g., `GetOrderQuery`) |
| Orchestrators | Multi-step workflows that coordinate aggregates and external services |
| Event Handlers (sync) | React to domain events emitted in-process |
| Mappers (DTO ↔ Domain) | Translate domain entities to DTOs (kept thin) |

**Allowed imports:** Domain layer, other modules' public services, Platform.

**Forbidden imports:** Prisma, HTTP types, NestJS request/response.

### 3.3 Domain Layer

**Path:** `modules/{context}/domain/`

| Element | Responsibility |
|---|---|
| Aggregates | Cluster of entities with consistency boundary (Order, Cart, Product) |
| Entities | Stateful domain objects with identity |
| Value Objects | Immutable descriptors (Money, Address, Phone, Email, Slug) |
| Domain Events | Facts about the past (`OrderPlaced`, `PaymentCaptured`) |
| Domain Services | Stateless business logic that doesn't fit aggregates (Pricing, Tax) |
| Domain Exceptions | Business rule violations (typed exceptions) |
| Specifications | Composable predicates (e.g., `IsVoucherApplicable`) |
| Policies | Encapsulated rules (`CanRefundPolicy`) |

**Allowed imports:** Other modules' **domain interfaces only** (e.g., `InventoryPort` interface). NO concrete infrastructure.

**Forbidden imports:** Prisma, NestJS, Redis, BullMQ, HTTP, fetch, JSON.stringify/parse with DB payloads.

### 3.4 Infrastructure Layer

**Path:** `modules/{context}/infrastructure/`

| Element | Responsibility |
|---|---|
| Repositories | Implement domain repository interfaces using Prisma |
| Adapters | Payment gateways (VNPay, MoMo, etc.), Shipping carriers, Email provider |
| Mappers | Prisma model ↔ Domain entity conversion |
| Schema | Prisma model declarations (later phase) |
| Transaction Helpers | Wrap multi-step writes in a Prisma transaction |

**Allowed imports:** Domain layer (interfaces, entities), Platform infrastructure.

**Forbidden imports:** Interface layer, other modules' internal types.

---

## 4. Dependency Direction (Strict)

```
Interface ──▶ Application ──▶ Domain ◀── Infrastructure
                │                ▲
                ▼                │
            Other Module      │
           Public Services ────┘  (via interface in Domain)
```

### 4.1 The Dependency Inversion Principle

The Domain layer **declares** the ports (interfaces) it needs. The Infrastructure layer **implements** them. This is the key to keeping the domain testable and infrastructure-agnostic.

```
// domain/ports/InventoryPort.ts
export interface InventoryPort {
  reserve(items: ReservationItem[]): Promise<Reservation>;
  release(reservationId: string): Promise<void>;
  consume(reservationId: string): Promise<void>;
}

// infrastructure/adapters/InventoryAdapter.ts
@Injectable()
export class InventoryAdapter implements InventoryPort { /* Prisma impl */ }

// inventory.module.ts
{
  providers: [
    { provide: INVENTORY_PORT, useClass: InventoryAdapter }
  ]
}
```

---

## 5. Mapping to NestJS

NestJS already provides module/controller/service abstractions. We map our layers to NestJS as follows:

| Clean Layer | NestJS Provider Type |
|---|---|
| Interface | `@Controller()` |
| Application (Command) | `@Injectable()` (handler classes) |
| Application (Orchestrator) | `@Injectable()` |
| Domain Service | Plain TS class (no `@Injectable()`); instantiated by an Application provider |
| Domain Aggregate | Plain TS class |
| Infrastructure Repository | `@Injectable()` |
| External Adapter | `@Injectable()` |

### 5.1 NestJS Module Composition

```
@Module({
  imports: [...],
  controllers: [OrderController],                  // Interface
  providers: [
    PlaceOrderHandler,                             // Application
    OrderOrchestrator,                             // Application
    OrderRepository,                               // Infrastructure
    { provide: ORDER_REPOSITORY, useClass: OrderRepository },
    { provide: INVENTORY_PORT, useClass: InventoryAdapter },
    { provide: PAYMENT_PORT, useClass: PaymentAdapter }
  ],
  exports: [OrderService, ORDER_REPOSITORY]        // Public API
})
class OrderModule {}
```

---

## 6. Cross-Layer Concerns

### 6.1 Where does Logging Live?

| Layer | Logs |
|---|---|
| Interface | Request started, response sent (with `requestId`) |
| Application | Command started, command succeeded, command failed |
| Domain | Domain rule violated (as exception, not log) |
| Infrastructure | External call started, completed, failed (with retries) |

### 6.2 Where does Exception Handling Live?

| Layer | Exception Type |
|---|---|
| Domain | `DomainException` subclasses (business rules) |
| Application | `ApplicationException` (orchestration) |
| Interface | HTTP-mapped (via global filter) |
| Infrastructure | `InfrastructureException` (external failures) |

> See `10_EXCEPTION_HANDLING.md`.

### 6.3 Where does Validation Live?

| Layer | Validation |
|---|---|
| Interface | DTO validation (class-validator); request shape |
| Application | Pre-condition checks before orchestration |
| Domain | Invariant checks inside aggregates |
| Infrastructure | Adapter-specific sanity checks |

---

## 7. Aggregate Design Rules

Every aggregate must follow:

1. **Has a root entity** — all mutations go through the root.
2. **Has a consistency boundary** — invariants enforced atomically.
3. **Emits domain events** — past-tense facts.
4. **Encapsulates state changes** — no public setters; only behaviors.
5. **Reconstituted via repository** — never created via `new` outside the aggregate.
6. **Identified by ID** — UUID v7 in V1.

### 7.1 Example Aggregate Shape

```
class Order {
  private _status: OrderStatus;
  private _items: OrderItem[];
  private _events: DomainEvent[];

  static create(input: CreateOrderInput): Order { ... }
  static reconstitute(snapshot: OrderSnapshot): Order { ... }

  addItem(item: OrderItemInput): void { /* invariant + event */ }
  removeItem(itemId: string): void { /* invariant + event */ }
  confirm(payment: PaymentRef): void { /* state machine + event */ }
  cancel(reason: string): void { /* state machine + event */ }

  pullEvents(): DomainEvent[] { /* for publishing */ }
}
```

---

## 8. DDD Building Blocks

| Block | Definition | Example |
|---|---|---|
| **Entity** | Has identity; mutable state | `Order`, `User` |
| **Value Object** | No identity; immutable; replaceable | `Money`, `Address`, `Phone` |
| **Aggregate** | Consistency cluster | `Order` + `OrderItem` + `OrderAddress` |
| **Repository** | Persistence abstraction | `OrderRepository.findById()` |
| **Domain Service** | Stateless business logic | `PricingService.calculate()` |
| **Domain Event** | Past-tense fact | `OrderPlaced` |
| **Specification** | Predicate | `IsOrderCancellable` |
| **Policy** | Encapsulated rule | `RefundPolicy` |
| **Factory** | Complex creation logic | `OrderFactory.createFromCheckout()` |

---

## 9. Anti-Patterns Forbidden

| Anti-Pattern | Why Forbidden |
|---|---|
| Prisma calls in Controllers | Bypasses application layer; un-testable |
| Domain code importing NestJS | Couples domain to framework |
| Domain code importing HTTP types | Same |
| Domain code `JSON.stringify` of state | Encapsulation leak |
| Repository returning Prisma models | Layer leakage |
| Application services as static methods | Un-testable; no DI |
| God services (one service does everything) | Single responsibility violation |
| Aggregates returning DB rows | Encapsulation violation |

---

## 10. Testing Strategy by Layer

| Layer | Test Type | Tooling |
|---|---|---|
| Domain | Pure unit tests (no mocks of DB) | Jest |
| Application | Unit tests with mocked ports | Jest + ts-mockito |
| Infrastructure | Integration tests with real DB | Jest + testcontainers (V1.5) |
| Interface | E2E / supertest | Jest + supertest |

> Domain tests run without any framework or external dependency.

---

## 11. Coverage Validation

| Check | Status |
|---|---|
| Four-layer model defined | ✓ |
| Layer responsibilities documented | ✓ |
| Strict dependency direction enforced | ✓ |
| Dependency Inversion applied | ✓ |
| NestJS mapping documented | ✓ |
| Aggregate design rules defined | ✓ |
| DDD building blocks listed | ✓ |
| Anti-patterns enumerated | ✓ |
| Testing strategy per layer | ✓ |

---

## 12. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial layered architecture: 4-layer Clean Architecture + DDD |

---

**End of 03_LAYERED_ARCHITECTURE.md**
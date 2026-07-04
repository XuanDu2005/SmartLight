# 04 — Dependency Rules

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document defines **explicit rules** about which modules may import which. These rules are enforced by:

1. Code review
2. ESLint rules (`no-restricted-imports`)
3. Architecture tests (`@arch-test/*` libraries) — V1.5+
4. Module dependency lint job in CI (V1.5+)

---

## 2. Allowed Imports (Module-Level)

A `→` means "may depend on."

| From Module | Allowed Targets |
|---|---|
| **Platform** | (none) |
| **Identity** | Platform |
| **Admin (RBAC)** | Identity, Platform |
| **User** | Identity, Platform |
| **Catalog** | Platform, Media |
| **Inventory** | Catalog, Platform |
| **Cart** | Catalog, Inventory, Promotion, Platform |
| **Promotion** | Catalog, Platform |
| **Tax** | Platform |
| **Address** | Platform |
| **Checkout** | Cart, Catalog, Inventory, Promotion, Tax, Shipping, Address, Platform |
| **Order** | Inventory, Promotion, Tax, Shipping, Payment, Address, Catalog, Platform |
| **Payment** | Order, Platform |
| **Refund** | Payment, Order, Platform |
| **Shipping** | Address, Platform |
| **Review** | Order, Catalog, Platform |
| **Notification** | Platform |
| **Media** | Platform |
| **Support** | Identity, Order, Platform |
| **Audit** | (none — subscribes only) |

> **Notification** may be invoked from any module via the **event bus** only (no direct synchronous call). This is the canonical pattern for cross-module async work.

---

## 3. Forbidden Imports (Module-Level)

| From | Cannot Import |
|---|---|
| **Domain Layer (any module)** | Infrastructure, Application, Interface layers; Prisma; Redis; BullMQ; NestJS `Request`/`Response`; external SDKs |
| **Application Layer** | Prisma directly; HTTP types; controllers; filters |
| **Interface Layer** | Prisma directly; Redis directly; BullMQ directly |
| **Domain** of one module | Domain of another module (use a Port instead) |
| **Audit** | Business modules (only subscribes to events) |
| **Notification** | Business modules (only via events) |
| **Platform** | Any business module |

---

## 4. Allowed Imports (Layer-Level)

| From Layer | May Import |
|---|---|
| Interface | Application, Domain (DTO types only), Platform (decorators, guards, pipes), other modules' DTO types only |
| Application | Domain (entities, ports, services, events), other modules' **public services**, Platform (logging, transaction, event bus) |
| Domain | (nothing — pure) |
| Infrastructure | Domain (interfaces, entities), Platform (Prisma client, Redis, queue, logger) |

---

## 5. Forbidden Patterns

| Pattern | Forbidden Because |
|---|---|
| `import { PrismaClient } from '@prisma/client'` in Domain or Application | Domain must be pure |
| `import { Request, Response } from 'express'` outside Interface | Layer violation |
| `import { InventoryService } from 'src/modules/inventory'` in Order's Domain | Bypass encapsulation; use Port |
| Cross-module domain access (Order entity referencing Cart entity directly) | Coupling |
| Static singletons (e.g., `Database.instance`) | Un-testable |
| Service Locator pattern (instead of DI) | Hides dependencies |
| Hard-coded URLs in code | Config should come from `ConfigService` |
| Direct calls to other modules' **internal** classes | Use public API only |

---

## 6. Circular Dependency Prevention

### 6.1 Detection

```
madge --circular src/
```

Run in CI as a build gate.

### 6.2 Resolution Strategies

| Strategy | When |
|---|---|
| **Dependency Inversion** | Module A needs module B's behavior; A defines Port, B implements |
| **Event-based decoupling** | A and B communicate via domain events, not direct calls |
| **Extract shared concept** | If both A and B depend on C, extract C into its own module |
| **Merge modules** | If A↔B cycle cannot be broken, they're the same bounded context |
| **Lazy loading** | Last resort; use forwardRef only when unavoidable (NestJS `forwardRef`) |

### 6.3 Forbidden

- `forwardRef()` as default — must justify in code comment.
- Two modules in the same cyclic dependency graph.

---

## 7. Shared Kernel

A **Shared Kernel** holds code shared across multiple bounded contexts. In SmartLight, this is `src/common/` and `src/platform/`.

### 7.1 Allowed in Shared Kernel

- Value objects reused across modules (Money, Address, Phone, Email)
- Common exception base classes
- Common types and constants
- Common utility functions (pure)
- Common infrastructure (Prisma client wrapper, Redis client wrapper, Logger)

### 7.2 Forbidden in Shared Kernel

- Business logic tied to a specific bounded context
- Aggregates or entities of any module
- HTTP-specific types
- Database models

---

## 8. Module Public API

Each module's `index.ts` declares its **public API**:

```
// modules/cart/index.ts
export { CartModule } from './cart.module';
export { CartService } from './application/cart.service';
export { CART_SERVICE } from './application/cart.service.tokens';

// Allowed: other modules import from `src/modules/cart`
import { CartService, CART_SERVICE } from 'src/modules/cart';

// Forbidden: other modules reach into internals
import { CartAggregate } from 'src/modules/cart/domain/cart.aggregate'; // ❌
```

Internal classes (entities, repositories, controllers) are not exported from `index.ts`. ESLint enforces this with `no-restricted-imports` patterns.

---

## 9. Cross-Module Communication Patterns

### 9.1 Allowed Patterns

| Pattern | When |
|---|---|
| **Direct call via public service** | Same-process synchronous need (e.g., Inventory reserve during Checkout) |
| **Domain event** | Async; eventual consistency (e.g., OrderPlaced → Notification) |
| **Port + Adapter** | When domain needs the contract (allows testability) |
| **Shared Kernel** | Truly shared types (Money, Address) |

### 9.2 Forbidden Patterns

| Pattern | Why |
|---|---|
| Direct DB access across modules | Bypasses business rules; un-testable |
| Shared mutable state | Race conditions |
| Two-way dependency | Cycle |
| HTTP calls between modules within same process | Network overhead; defeats monolith |
| Singleton service accessed via static method | Hidden dependency; un-testable |

---

## 10. Implementation in NestJS

### 10.1 Module Imports

```
@Module({
  imports: [
    TypeOrmModule.forFeature([CartEntity]),     // own entities
    forwardRef(() => InventoryModule),          // cross-module (last resort)
    CatalogModule                                // normal cross-module
  ],
  ...
})
```

### 10.2 Token-Based DI for Cross-Module

```
// In Inventory module:
export const INVENTORY_PORT = Symbol('INVENTORY_PORT');

// In Order module:
constructor(
  @Inject(INVENTORY_PORT) private readonly inventory: InventoryPort
) {}

// In app module composition:
{
  provide: INVENTORY_PORT,
  useFactory: (inventoryAdapter) => inventoryAdapter,
  inject: [InventoryAdapter]
}
```

This makes the dependency **explicit** at compile time and **testable** via mocks.

---

## 11. Lint Enforcement (V1)

### 11.1 ESLint Rule Example

```js
// .eslintrc.js
"no-restricted-imports": ["error", {
  patterns: [
    {
      group: ["@prisma/client", "src/platform/database/prisma"],
      message: "Do not import Prisma in domain/application/interface layers."
    },
    {
      group: ["src/modules/*/domain/*"],
      message: "Use the module's public API (src/modules/*/index.ts)."
    }
  ]
}]
```

### 11.2 CI Check

A `pnpm lint:arch` script (V1.5+) runs `madge --circular` and `eslint-rules-check`.

---

## 12. Anti-Patterns Detected by Architecture Tests

| Anti-Pattern | Detection |
|---|---|
| Domain imports Infrastructure | ESLint `no-restricted-imports` |
| Circular dependency | `madge --circular` |
| Layer violation | Custom arch test: file location + import source |
| God service (> 500 lines) | File size lint rule |
| Prisma in Domain | `grep -r "from '@prisma'" src/modules/*/domain` |

---

## 13. Coverage Validation

| Check | Status |
|---|---|
| Allowed imports listed per module | ✓ |
| Forbidden imports listed | ✓ |
| Layer-level rules defined | ✓ |
| Circular dependency prevention documented | ✓ |
| Shared Kernel rules defined | ✓ |
| Public API pattern documented | ✓ |
| NestJS implementation patterns documented | ✓ |
| Lint enforcement described | ✓ |

---

## 14. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial dependency rules: 18 modules + 4 layers + lint enforcement |

---

**End of 04_DEPENDENCY_RULES.md**
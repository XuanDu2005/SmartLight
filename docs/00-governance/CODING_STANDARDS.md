# SmartLight — Coding Standards

| Field | Value |
| --- | --- |
| **Document ID** | `GOV-CODING-STANDARDS-001` |
| **Document Owner** | Principal Software Architect |
| **Status** | Approved — v1.0 |
| **Effective Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2027-01-02 |
| **Classification** | Project Governance — Source of Truth |
| **Audience** | Engineering, AI Agents |

---

## 1. Purpose

This document defines the **non-negotiable coding standards** for SmartLight. Its purpose is to:

- Produce code that is **consistent, predictable, and reviewable** across all modules.
- Make AI-generated code conformant by default.
- Minimize cognitive load when navigating the codebase.
- Prevent common classes of bugs through compile-time and lint-time checks.

These standards are enforced by tooling wherever possible. Where they cannot be enforced automatically, they are enforced in code review.

---

## 2. Language Versions

| Component | Version |
| --- | --- |
| **TypeScript** | 5.x (strict mode) |
| **Node.js** | 20 LTS |
| **Target JS** | ES2022 (modules, top-level await where supported) |
| **TS Module System** | ESM-first (`"type": "module"`) |
| **JSX** | React 18+ |

---

## 3. TypeScript Standards

### 3.1 Strict Configuration (Mandatory)

The base `tsconfig.json` enables at minimum:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "useUnknownInCatchVariables": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

### 3.2 Forbidden Patterns

| Pattern | Reason |
| --- | --- |
| `any` | Bypasses type safety; use `unknown` and narrow |
| `as any` casts | Same; use Zod parse or proper typing |
| Non-null assertions (`!`) outside tests | Hides possible null; treat as code smell |
| `@ts-ignore` | Forbidden except with linked ticket + comment |
| `@ts-expect-error` | Allowed only with reason and ticket |
| Implicit `any` from missing return types | Public functions must declare return types |

### 3.3 Required Patterns

| Pattern | Requirement |
| --- | --- |
| **Explicit return types** | All exported functions, methods, and public class members |
| **Branded types** | For IDs (`type UserId = string & { __brand: 'UserId' }`) |
| **Discriminated unions** | For state machines and result types |
| **Readonly by default** | Use `readonly` modifiers liberally |
| **Immutability** | Prefer `as const`, spread, immutable libraries |

### 3.4 Error Handling

- Use typed error classes per module in `apps/api/src/modules/<x>/errors.ts`.
- Never throw raw strings or plain objects.
- Catch blocks must narrow `unknown`; never use `catch (e: any)`.
- Domain errors carry a stable `code` and safe `message`; details go to logs.

---

## 4. Naming Conventions

| Element | Convention | Example |
| --- | --- | --- |
| Variables / functions | `camelCase` | `computeTotal`, `userId` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_CART_ITEMS` |
| Classes / types / interfaces | `PascalCase` | `OrderService`, `OrderItem` |
| React components | `PascalCase` | `ProductCard` |
| Filenames (TS) | `kebab-case` | `order.service.ts` |
| Component files (TSX) | `PascalCase` | `ProductCard.tsx` |
| Test files | `<subject>.spec.ts(x)` | `order.service.spec.ts` |
| Folders | `kebab-case` | `modules/order` |
| DB tables | `snake_case`, plural | `order_items` |
| DB columns | `snake_case` | `created_at` |
| Env variables | `UPPER_SNAKE_CASE` | `DATABASE_URL` |
| Booleans | `is*`, `has*`, `can*`, `should*` | `isActive`, `hasPermission` |
| Async functions | verb prefix | `fetchUser`, `createOrder` |
| Event handlers | `handle*` or `on*` | `handleSubmit`, `onClick` |

---

## 5. File and Module Organization

### 5.1 One Responsibility Per File

- One exported class or one primary function per file is the default.
- Group tightly-coupled helpers in the same file only when they share a clear concept.

### 5.2 Import Order (Enforced by ESLint)

1. Node built-ins
2. External packages (alphabetical)
3. Workspace packages (`@smartlight/*`)
4. Internal modules (relative — avoid when possible)
5. Type-only imports last

```ts
import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { type OrderDto } from '@smartlight/contracts';

import { OrderRepository } from './order.repository';
import { OrderNotFoundError } from './errors';
```

### 5.3 No Circular Dependencies

- Circular imports fail CI.
- Use dependency injection (NestJS) or barrel reorganization to break cycles.

### 5.4 Barrel Files

- Each module exposes `index.ts` as its public surface.
- Internal files are not imported from outside the module.

---

## 6. Comments and Documentation

### 6.1 JSDoc for Public APIs

- Every exported function, class, and interface must have a JSDoc block when:
  - The behavior is non-obvious.
  - The contract includes error conditions or side effects.
- JSDoc explains **why**, not what.

```ts
/**
 * Reserves stock for the given cart line items.
 *
 * Uses an optimistic check-and-decrement strategy. Callers must handle
 * InsufficientStockError and present a clear message to the customer.
 *
 * @throws InsufficientStockError when requested quantity exceeds available stock.
 */
async reserve(items: CartLine[]): Promise<Reservation> { ... }
```

### 6.2 Inline Comments

- Used to explain non-obvious intent, trade-offs, or constraints.
- Forbidden: comments narrating what the code does.

### 6.3 TODO Format

```ts
// TODO(#ticket): short description — owner
```

Forbidden: unlinked `TODO`, `FIXME` without ticket, or stale comments.

### 6.4 Forbidden Code Smells

- Dead code (commented-out code, unreachable branches) — delete or extract.
- Magic numbers — extract to named constants.
- Long functions (> 50 lines) — split.
- Long parameter lists (> 4) — use an options object.
- Deep nesting (> 4) — extract or use early returns.

---

## 7. Formatting

| Tool | Configuration |
| --- | --- |
| **Prettier** | 2-space indent, single quotes, no semicolons (configurable per workspace), trailing commas all, 100-col width |
| **EditorConfig** | UTF-8, LF line endings (`.gitattributes` enforces), final newline |

Prettier is the **single source of formatting truth**. No style debates in PRs.

---

## 8. Linting

### 8.1 ESLint (Flat Config)

- Shared config in `@smartlight/eslint-config`.
- Per-preset rules for: `frontend`, `backend`, `node`, `react`, `test`.
- Errors fail CI; warnings are reviewed but non-blocking.

### 8.2 Mandatory Rules

| Rule Family | Behavior |
| --- | --- |
| `no-console` | Error outside scripts and tests (use `@smartlight/logger`) |
| `no-debugger` | Error (always) |
| `eqeqeq` | Error |
| `curly` | Error for multi-line blocks |
| `prefer-const` | Error |
| `no-var` | Error |
| `no-throw-literal` | Error |
| `consistent-return` | Error |
| `import/order` | Error |
| `import/no-cycle` | Error |
| `@typescript-eslint/no-explicit-any` | Error |
| `@typescript-eslint/no-non-null-assertion` | Error |
| `@typescript-eslint/explicit-function-return-type` | Error for exported |
| `@typescript-eslint/no-floating-promises` | Error |
| `react-hooks/rules-of-hooks` | Error |
| `react-hooks/exhaustive-deps` | Error |

---

## 9. Backend Coding Standards (NestJS)

### 9.1 Layered Architecture

```
Controller  →  Service  →  Repository  →  Prisma
     ↓           ↓              ↓
   DTOs       Domain        Entities
            Errors/Events
```

- **Controller:** thin; parses input, calls service, returns DTO.
- **Service:** use cases and business rules; orchestrates repositories and events.
- **Repository:** data access only; no business rules.
- **Entity:** pure domain types; no Prisma imports.

### 9.2 Dependency Injection

- Constructor injection only. No service locators.
- Bind interfaces to concrete implementations at the module level.
- Scope: default (singleton) for stateless services; `Request` only when justified.

### 9.3 DTO and Validation

- All inbound payloads validated with Zod or class-validator.
- DTOs live in `modules/<x>/dto/`.
- Validation pipes are global; controllers declare `@Body()` typed DTOs.
- Outbound responses are mapped from entities to DTOs — never leak Prisma models.

### 9.4 Transactions

- Use the `transaction` helper from `infra/database/`.
- Never write to multiple modules inside a single transaction.
- Long-running operations move to background jobs.

### 9.5 Database Access (Prisma)

- Use Prisma Client via `PrismaService` (injected).
- Repositories own all queries; services never call Prisma directly.
- Prefer `select` over `include` to avoid over-fetching.
- Use cursor-based pagination for large lists.
- Indexes added with their queries; never ship a query that needs one without it.

### 9.6 Async and Concurrency

- All I/O is async; no blocking calls in request handlers.
- Promise.all for independent async operations.
- Timeouts on every external call (default 5s; configurable per integration).
- Retry with exponential backoff + jitter, capped attempts.

### 9.7 Logging

- Use the injected logger.
- Never log PII, secrets, or full request bodies.
- Include `requestId` and `userId` when present.

### 9.8 Error Responses

- Global exception filter maps domain errors to HTTP responses.
- Response shape:
  ```json
  { "code": "ORDER_NOT_FOUND", "message": "Order does not exist", "details": {} }
  ```
- HTTP status codes follow REST conventions.
- 5xx errors are logged at `error` level with stack traces.

---

## 10. Frontend Coding Standards (React + TS)

### 10.1 Component Rules

- Functional components only.
- Components are pure with respect to their props.
- Side effects in `useEffect` are explicit and minimal.
- No business logic inside components — extract to hooks or services.
- One component per file; co-locate `Component.test.tsx` and `index.ts`.

### 10.2 Hooks

- Hook names start with `use`.
- Hooks are pure functions of inputs; they call APIs via TanStack Query.
- No direct fetch calls in components or hooks.
- Linting enforces exhaustive `useEffect` deps.

### 10.3 State Management

| State Type | Tool |
| --- | --- |
| Server state | TanStack Query |
| UI / local state | React `useState`, `useReducer` |
| Cross-component UI state | Zustand stores |
| Form state | React Hook Form |
| URL state | React Router `useSearchParams` |

Forbidden: Redux Toolkit, MobX, custom event buses.

### 10.4 Data Fetching

- All HTTP calls through `lib/api/` client.
- Auth tokens attached by the client interceptor; never read tokens in components.
- Loading and error states are explicit and tested.

### 10.5 Styling

- Tailwind utility classes preferred.
- Component variants via `cva` (class-variance-authority).
- Global styles only for resets and base typography.
- No inline `style={{}}` for static values.
- Icons: `lucide-react`.

### 10.6 Accessibility

- Semantic HTML first; ARIA only when needed.
- All interactive elements keyboard accessible.
- Focus management for modals, drawers, and toasts.
- Color contrast ≥ WCAG 2.1 AA.
- Images have meaningful `alt` text or empty `alt=""` for decorative.

### 10.7 Performance

- Route-based code splitting.
- Lazy-load below-the-fold sections.
- Images via Cloudinary with `loading="lazy"` and `sizes`.
- Avoid unnecessary re-renders (memoization only when measured).

---

## 11. Database and Prisma Standards

### 11.1 Schema

- Schema is the single source of truth (`schema.prisma`).
- All models use `id` (UUID v7 where supported), `createdAt`, `updatedAt`.
- Soft delete via `deletedAt` only where required by compliance.
- Use enums for finite state machines.
- All money fields stored as `Decimal(18, 2)` in VND (no floats).

### 11.2 Migrations

- One migration per logical change.
- Reversible unless explicitly documented.
- Backfills via jobs, not migrations.
- Naming: timestamp-based generated by Prisma; descriptive `migration.sql` comments added.

### 11.3 Indexes

- Add indexes for foreign keys.
- Add composite indexes for hot queries.
- Never add indexes without a documented query that uses them.

---

## 12. Testing Standards

### 12.1 Test Naming

- `describe('<unit or scenario>')` + `it('<expected behavior>')`.
- Behavior-focused, not implementation-focused.
- Use Arrange / Act / Assert pattern.

### 12.2 Unit Tests

- Pure functions; no I/O.
- Cover edge cases and error paths.
- Snapshot tests only for stable output (e.g., serializers).

### 12.3 Integration Tests

- Real Postgres via Testcontainers.
- Reset DB between tests with transactions or truncation.
- Mock external HTTP calls; do not call real providers.

### 12.4 Component Tests (Frontend)

- Use React Testing Library.
- Query by accessible role / label.
- No snapshots for component structure.
- Test user behavior, not internals.

### 12.5 E2E Tests

- Cover critical journeys: browse → cart → checkout → order confirmation.
- Deterministic: no real payments, no real shipping calls.
- Run on every PR; full suite nightly.

---

## 13. Internationalization (i18n)

- All user-facing strings go through `t('key')`.
- Translation keys live in `i18n/locales/<lang>/<namespace>.json`.
- Default language: `vi`.
- No hardcoded user-facing strings in components.
- Dates and numbers use `vi-VN` locale.

---

## 14. Money, Currency, and Time

- All monetary values handled in **VND** with `Decimal` or integer minor units (e.g., xu).
- Never use floats for money.
- All timestamps stored in UTC; converted to local timezone only at presentation.
- Display in `Asia/Ho_Chi_Minh` for users.

---

## 15. Security Standards (Code-Level)

- All inputs validated at boundaries.
- Output encoding applied where user content is rendered.
- Parameterized queries only (Prisma enforces this).
- No `eval`, `Function`, or dynamic `require`.
- File uploads: validate MIME, scan for type mismatches, store outside web root.
- Authentication tokens never logged.
- Sensitive operations write audit log entries.

---

## 16. Git Hygiene (Code-Level)

- No committed `node_modules`, build outputs, or `.env*` files.
- Lockfiles (`pnpm-lock.yaml`) committed.
- Generated files (Prisma client, OpenAPI) are regenerated in CI, not committed unless required.

---

## 17. AI-Generated Code Standards

- AI-generated code is held to the **same standards** as human-written code.
- AI agents must read `AI_DEVELOPMENT_RULES.md` before contributing code.
- AI agents must include a "Generated-By" footer in PR descriptions.
- Reviewers treat AI PRs with the same scrutiny, not more.

---

## 18. Examples of Compliant Code

### 18.1 Service (Backend)

```ts
@Injectable()
export class CreateOrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventEmitter,
    private readonly logger: Logger,
  ) {}

  async execute(input: CreateOrderInput): Promise<OrderDto> {
    const order = await this.orders.createWithItems(input);
    this.events.emit('order.created', new OrderCreatedEvent(order));
    this.logger.info({ orderId: order.id }, 'order created');
    return OrderMapper.toDto(order);
  }
}
```

### 18.2 Component (Frontend)

```tsx
type ProductCardProps = {
  product: ProductSummary;
  onAddToCart: (productId: string) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const formattedPrice = useFormattedPrice(product.price);

  return (
    <article className="rounded-lg border p-4">
      <img src={product.thumbnail} alt={product.name} loading="lazy" />
      <h3 className="mt-2 text-lg font-medium">{product.name}</h3>
      <p className="text-sm text-gray-600">{formattedPrice}</p>
      <button
        type="button"
        className="mt-3 rounded bg-black px-4 py-2 text-white"
        onClick={() => onAddToCart(product.id)}
      >
        {t('product.addToCart')}
      </button>
    </article>
  );
}
```

---

## 19. Standards Are Enforced By

| Concern | Tool |
| --- | --- |
| Formatting | Prettier (pre-commit + CI) |
| Linting | ESLint (pre-commit + CI) |
| Type safety | TypeScript strict (CI) |
| Test coverage | Vitest/Jest with thresholds (CI) |
| Dependency cycles | `dependency-cruiser` (CI) |
| Secrets | `gitleaks` (pre-commit + CI) |
| Code quality trends | CodeQL (CI) |

---

## 20. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-02 | Principal Architect | Initial governance baseline |

---

**End of Document — CODING_STANDARDS.md**
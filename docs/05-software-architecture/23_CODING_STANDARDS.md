# 23 — Coding Standards

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document defines SmartLight's **coding standards**: folder structure, naming, file organization, testing, comments, and Git conventions.

> Goal: **consistent, reviewable, easy-to-onboard** codebase.

---

## 2. Repository Layout

### 2.1 Top Level

```
smartlight/
├── apps/
│   ├── api/                       # NestJS backend
│   ├── storefront/                # Customer-facing SPA
│   ├── admin/                     # Admin SPA
│   └── worker/                    # BullMQ worker (V1.5+)
├── packages/
│   ├── shared/                    # Shared types, constants
│   ├── ui/                        # Shared UI components
│   ├── eslint-config/             # ESLint presets
│   └── tsconfig/                  # TypeScript presets
├── docs/                          # Architecture docs (governance, BA, SA, DB, API)
├── infra/                         # IaC (later)
├── scripts/                       # Dev scripts
├── .github/                       # GitHub workflows
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

> V1 may simplify to `apps/{api,storefront,admin}` only.

---

## 3. Backend Folder Structure (NestJS)

```
apps/api/
├── src/
│   ├── main.ts                    # Entry point
│   ├── app.module.ts              # Root module
│   ├── common/                    # Shared Kernel
│   │   ├── errors/                # BaseException + subclasses
│   │   ├── value-objects/         # Money, Email, Phone, Address
│   │   ├── types/                 # Shared TS types
│   │   ├── constants/             # App-wide constants
│   │   ├── utils/                 # Pure utility functions
│   │   ├── decorators/            # @CurrentUser, @IdempotencyKey
│   │   └── filters/               # GlobalExceptionFilter
│   ├── platform/                  # Infrastructure
│   │   ├── database/              # Prisma client
│   │   ├── cache/                 # Redis client + cache service
│   │   ├── queue/                 # BullMQ + workers
│   │   ├── logger/                # Pino config
│   │   ├── storage/               # Cloudinary adapter
│   │   ├── email/                 # Email adapter
│   │   ├── events/                # In-process event bus
│   │   ├── auth/                  # JWT helpers, passport strategies
│   │   ├── config/                # Config modules
│   │   └── jobs/                  # Background jobs
│   └── modules/                   # Bounded contexts
│       ├── identity/
│       ├── catalog/
│       ├── inventory/
│       ├── cart/
│       ├── checkout/
│       ├── order/
│       ├── payment/
│       ├── shipping/
│       ├── promotion/
│       ├── review/
│       ├── notification/
│       ├── media/
│       ├── support/
│       ├── admin/
│       └── audit/
├── test/                          # E2E tests (supertest)
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

---

## 4. Module Folder Structure

```
modules/{context}/
├── {context}.module.ts
├── domain/                        # PURE (no framework)
│   ├── aggregates/
│   │   └── {context}.aggregate.ts
│   ├── entities/
│   ├── value-objects/
│   ├── events/
│   ├── ports/                     # Interfaces for adapters
│   ├── services/                  # Domain services
│   ├── exceptions/                # Module-specific exceptions
│   └── specifications/
├── application/                   # Use cases
│   ├── commands/
│   │   └── place-{context}.command.ts
│   ├── queries/
│   │   └── get-{context}.query.ts
│   ├── orchestrators/
│   ├── handlers/                  # Event handlers
│   └── mappers/
├── infrastructure/                # Adapters
│   ├── repositories/
│   ├── adapters/                  # Payment, Email, Storage adapters
│   └── mappers/
├── interface/                     # HTTP layer
│   ├── controllers/
│   ├── dtos/
│   ├── decorators/
│   └── guards/                    # Context-specific guards
└── index.ts                       # Public exports only
```

---

## 5. Frontend Folder Structure (Vite + React)

```
apps/storefront/
├── src/
│   ├── main.tsx                   # Entry point
│   ├── App.tsx
│   ├── routes/                    # File-based or module-based
│   ├── pages/                     # Page components
│   ├── components/
│   │   ├── ui/                    # shadcn primitives
│   │   └── features/              # Feature components
│   ├── api/                       # API client
│   ├── hooks/                     # React hooks
│   ├── stores/                    # Zustand stores
│   ├── lib/                       # Utils
│   ├── i18n/                      # Translations
│   ├── styles/                    # Tailwind config + globals
│   └── types/                     # TS types
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── package.json
└── README.md
```

---

## 6. Naming Conventions

### 6.1 Files

| Type | Naming | Example |
|---|---|---|
| TypeScript file | `kebab-case.ts` | `place-order.command.ts` |
| React component | `PascalCase.tsx` | `OrderSummaryCard.tsx` |
| Folder | `kebab-case/` | `order-management/` |
| Test file | `{name}.spec.ts` or `{name}.test.ts` | `place-order.command.spec.ts` |
| Constants file | `kebab-case.constants.ts` | `order.constants.ts` |
| Index file | `index.ts` | `index.ts` |
| Migration file | `{timestamp}_{name}.sql` | `20260704_create_orders.sql` |
| ADR | `NNNN-title.md` | `0001-modular-monolith.md` |

### 6.2 Classes & Types

| Category | Convention | Example |
|---|---|---|
| Class | `PascalCase` | `OrderService`, `Money` |
| Interface | `PascalCase` (no I-prefix) | `OrderRepository`, `MoneyProps` |
| Type alias | `PascalCase` | `OrderStatus` |
| Enum | `PascalCase` | `OrderStatus`, `PaymentMethod` |
| DTO | `PascalCase` + `Dto` suffix | `PlaceOrderRequestDto`, `OrderResponseDto` |
| Aggregate | `PascalCase` | `Order`, `Cart` |
| Domain event | `PascalCase` + `Event` suffix | `OrderPlacedEvent` |
| Module token | `UPPER_SNAKE_CASE` + `_TOKEN` | `ORDER_REPOSITORY_TOKEN` |
| Exception | `PascalCase` + `Exception` suffix | `OrderNotFoundException` |

### 6.3 Variables & Functions

| Category | Convention | Example |
|---|---|---|
| Variable | `camelCase` | `orderItems`, `totalAmount` |
| Function | `camelCase` | `placeOrder()`, `calculateTotal()` |
| Method | `camelCase` | `addItem()`, `removeItem()` |
| Boolean | `camelCase` + `is/has/can/should` | `isActive`, `hasPermission` |
| Constant | `UPPER_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_TIMEOUT_MS` |
| Private class field | `_camelCase` or `_camelCase` | `_events`, `_items` |
| Local constant | `camelCase` (if used once) | `defaultTimeout = 5000` |

### 6.4 Database

| Object | Convention |
|---|---|
| Table | `snake_case`, plural |
| Column | `snake_case` |
| Foreign key | `{table_singular}_id` |
| Index | `idx_{table}_{columns}` |
| Unique index | `uniq_{table}_{columns}` |
| Check | `chk_{table}_{rule}` |

### 6.5 REST Endpoints

| Aspect | Convention |
|---|---|
| Resource names | Plural, kebab-case |
| Action | Avoid except for non-CRUD |
| Versioning | `/v1/...` |
| ID in URL | `:id` (route param) |
| Actions | `/v1/orders/{id}/cancel` (RPC-style) |

### 6.6 Git

| Concept | Convention |
|---|---|
| Branch | `kebab-case` |
| Commit | Conventional Commits |
| Tag | `vMAJOR.MINOR.PATCH` |
| PR title | Conventional Commits format |

---

## 7. TypeScript Style

### 7.1 Config

- `strict: true`
- `noImplicitAny`, `noImplicitThis`
- `strictNullChecks`
- `noUnusedLocals`, `noUnusedParameters`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noFallthroughCasesInSwitch`

### 7.2 Rules

- **Always** use `type` imports: `import type { Order } from ...`
- **Avoid** `any`; use `unknown` if needed
- **No** `as any` casts
- **Prefer** `readonly` for value objects
- **Prefer** `const` over `let`
- **No** `void` returns from arrow functions returning values
- **Use** `null` to mean "no value", `undefined` for "not set"
- **Prefer** named exports
- **Avoid** default exports (file-name match needed)

### 7.3 Discriminated Unions

```
type OrderEvent =
  | { type: 'placed'; orderId: string }
  | { type: 'shipped'; orderId: string; tracking: string }
  | { type: 'cancelled'; orderId: string; reason: string };
```

### 7.4 Branded Types

For primitives with semantic meaning:

```
type UserId = string & { __brand: 'UserId' };
type OrderId = string & { __brand: 'OrderId' };
```

> Implementation in `common/types/branded.ts`.

### 7.5 Async Patterns

- `async/await` over `.then()`
- Promise.all() for parallel independent ops
- Race-conditional code uses AbortSignal

---

## 8. Backend Code Style

### 8.1 Controllers

```
@Controller({ path: 'orders', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('orders')
class OrderController {
  @Post()
  @Roles('customer')
  @RateLimit({ endpoint: 'place-order', limit: 10, window: '1m' })
  async placeOrder(@Body() dto: PlaceOrderDto, @CurrentUser() user): Promise<OrderResponseDto> { ... }
}
```

### 8.2 Services

```
@Injectable()
class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: OrderRepository,
    private readonly logger: Logger,
  ) {}
  
  async placeOrder(input: PlaceOrderInput): Promise<Order> {
    this.logger.log({ msg: 'Place order request', input });
    const order = Order.create(input);
    await this.repo.save(order);
    return order;
  }
}
```

### 8.3 DTOs

```
class PlaceOrderDto {
  @ApiProperty()
  @IsUUID()
  cartId: string;
  
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
  
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
```

### 8.4 Repositories (Interface)

```
interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  findByCustomer(userId: UserId, query: FindOrdersQuery): Promise<Order[]>;
  save(order: Order): Promise<void>;
  delete(id: OrderId): Promise<void>;
}
```

---

## 9. Frontend Code Style

### 9.1 Components

```
import { type FC } from 'react';

export const ProductCard: FC<ProductCardProps> = ({ product }) => {
  return (
    <article className="...">
      <h3>{product.name}</h3>
      <p>{formatPrice(product.price)}</p>
    </article>
  );
};

interface ProductCardProps {
  product: Product;
}
```

### 9.2 Hooks

```
function useProducts(filter: ProductFilter) {
  return useQuery({
    queryKey: ['products', filter],
    queryFn: () => api.products.list(filter),
    staleTime: 60_000,
  });
}
```

### 9.3 Stores

```
export const useCartStore = create<CartState>((set) => ({
  cart: null,
  loading: false,
  addItem: async (variantId, qty) => { ... },
  clear: () => set({ cart: null }),
}));
```

---

## 10. Comments

### 10.1 When to Comment

- **Why**, not **what** (code shows what)
- Business rules references (e.g., `// BR-ORDER-005: cannot cancel after shipped`)
- TODO with link to issue
- Non-obvious behavior or trade-offs

### 10.2 When NOT to Comment

- Restating obvious code
- Commented-out code (delete it)
- File-level "this file does X" headers
- Verbose JSDoc on trivial methods

### 10.3 JSDoc

Use sparingly for:
- Public APIs (libraries)
- Complex algorithms
- Domain rules with non-obvious intent

---

## 11. Error Handling

| Layer | Approach |
|---|---|
| Domain | Throw specific `DomainException` |
| Application | Catch domain exceptions; re-throw or map |
| Infrastructure | Wrap in `InfrastructureException` |
| Interface | Global filter maps to HTTP |
| Frontend | TanStack Query error state; toast on generic error |

---

## 12. Testing

### 12.1 Naming

| Layer | Convention |
|---|---|
| Unit | `{name}.spec.ts` next to source |
| Integration | `{name}.integration.spec.ts` |
| E2E | `test/e2e/{name}.e2e.spec.ts` |

### 12.2 Structure (AAA)

```
describe('Order.place()', () => {
  it('transitions to confirmed when payment captured', async () => {
    // Arrange
    const order = Order.create({...});
    
    // Act
    order.confirm(payment);
    
    // Assert
    expect(order.status).toBe('confirmed');
  });
});
```

### 12.3 Don't

- Test implementation details
- Mock everything; test domain in isolation
- Skip assertions
- Use snapshot tests for non-trivial data

### 12.4 Coverage Targets

| Layer | Target |
|---|---|
| Domain | 90% |
| Application | 80% |
| Infrastructure | 60% |
| Interface | 70% |
| Frontend (utils) | 90% |
| Frontend (components) | 70% (smoke) |

---

## 13. Git Commit Convention

### 13.1 Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 13.2 Examples

```
feat(order): add return request endpoint
fix(payment): handle VNPay timeout
docs(api): update webhook signature guide
chore(deps): bump Prisma to 5.20
refactor(cart): extract cart pricing domain service
test(order): add cancel state transitions
```

### 13.3 Scope

Affects which? `auth`, `cart`, `order`, `payment`, `catalog`, `infra`, etc., or `*` for global.

### 13.4 Forbidden

- Merge commits in `main` (squash only)
- Commit messages without type
- Commits referencing internal users without context

---

## 14. Branch Convention

| Pattern | Use |
|---|---|
| `feature/{slug}` | New feature |
| `fix/{slug}` | Bug fix |
| `chore/{slug}` | Tooling, deps |
| `hotfix/{slug}` | Production emergency |
| `release/{version}` | Release prep (V1.5+) |

Examples:
- `feature/return-request`
- `fix/vnpay-signature-bug`
- `chore/update-eslint`

---

## 15. Code Review Rules

### 15.1 Reviewer

- Author cannot approve own PR
- 1 approval minimum
- Code owner approval for sensitive files

### 15.2 Review Focus

- Layer boundaries respected
- Domain invariants
- Transaction boundaries
- Error handling
- Tests cover the change
- Security implications

### 15.3 PR Size

- < 400 lines diff ideal
- < 800 lines diff acceptable
- > 800 lines — split

### 15.4 Forbidden in PR

- Force pushes after review starts
- Stray debug logs
- Disabled linting
- `console.log` left behind (frontend OK for dev)
- Commented-out code

---

## 16. EditorConfig

```
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

---

## 17. ESLint Configuration

### 17.1 Plugins

- `@typescript-eslint/eslint-plugin`
- `eslint-plugin-import` (enforces order)
- `eslint-plugin-no-restricted-imports`
- `eslint-plugin-jest`
- `eslint-plugin-security`
- `eslint-plugin-prettier`

### 17.2 Key Rules

- `no-console: warn` (allow `error`, `warn`)
- `no-restricted-imports`: prevent cross-layer imports (see `04_DEPENDENCY_RULES.md`)
- `no-floating-promises: error`
- `prefer-const: error`
- `no-unused-vars: error`

---

## 18. Prettier Configuration

```
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf"
}
```

---

## 19. Husky Pre-commit Hooks

```
.husky/
├── pre-commit
│   └── pnpm lint-staged
└── commit-msg
    └── pnpm commitlint --edit
```

`lint-staged` runs ESLint + Prettier on staged files.

---

## 20. Documentation in Code

- README per package
- Per-module: short `README.md` explaining purpose and public surface
- OpenAPI annotations on every controller (Swagger)
- TSDoc on domain rules / invariants

---

## 21. Coverage Validation

| Check | Status |
|---|---|
| Repo layout | ✓ |
| Module folder structure | ✓ |
| Frontend folder structure | ✓ |
| Naming conventions for files/classes/variables/git | ✓ |
| TypeScript style | ✓ |
| Backend style (controllers/services/DTOs/repos) | ✓ |
| Frontend style (components/hooks/stores) | ✓ |
| Comments policy | ✓ |
| Error handling by layer | ✓ |
| Testing style | ✓ |
| Git commit convention | ✓ |
| Branch convention | ✓ |
| PR rules | ✓ |
| EditorConfig / ESLint / Prettier | ✓ |
| Husky hooks | ✓ |

---

## 22. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial coding standards (folder structure, naming, Git, tests) |

---

**End of 23_CODING_STANDARDS.md**
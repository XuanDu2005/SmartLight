# @smartlight/api

NestJS API for the SmartLight Modular Monolith.

Bootstrap only \u2014 no business logic. See `docs/04-api-design/` for the
contracts that each module will implement.

## Run (with Docker)

```bash
# from repo root:
docker compose up -d api
```

## Run (local)

```bash
pnpm install
pnpm --filter @smartlight/api run prisma:generate
pnpm --filter @smartlight/api run dev
```

API: http://localhost:4000/v1

## Structure

```
src/
\u251c\u2500\u2500 main.ts                  # Entry point
\u251c\u2500\u2500 app.module.ts            # Root module wiring
\u251c\u2500\u2500 platform/               # Infrastructure (DB, logger, health)
\u2502   \u251c\u2500\u2500 database/         # PrismaService
\u2502   \u251c\u2500\u2500 health/           # /health endpoint
\u2502   \u2514\u2500\u2500 logger/           # Pino config
\u2514\u2500\u2500 modules/                # Bounded contexts
    \u251c\u2500\u2500 identity/
    \u251c\u2500\u2500 users/
    \u251c\u2500\u2500 catalog/
    \u251c\u2500\u2500 inventory/
    \u251c\u2500\u2500 cart/
    \u251c\u2500\u2500 checkout/
    \u251c\u2500\u2500 order/
    \u251c\u2500\u2500 payment/
    \u251c\u2500\u2500 shipping/
    \u251c\u2500\u2500 promotion/
    \u251c\u2500\u2500 review/
    \u251c\u2500\u2500 notification/
    \u251c\u2500\u2500 media/
    \u251c\u2500\u2500 admin/
    \u2514\u2500\u2500 audit/
```

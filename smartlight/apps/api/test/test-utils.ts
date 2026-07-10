/**
 * E2E test bootstrap helper.
 *
 * Builds a NestJS application instance against the live database, applies
 * an in-process rate-limit bypass, and returns a Supertest agent plus
 * lifecycle hooks. Designed to be used from `.e2e-spec.ts` files:
 *
 *   const { app, request, prisma, close } = await bootstrapE2E();
 *   // ... tests ...
 *   await close();
 *
 * IMPORTANT: this test bootstrap requires:
 *   - A reachable PostgreSQL with the schema migrated (DATABASE_URL)
 *   - A reachable Redis (REDIS_URL) — if absent the in-process queue will
 *     run inline, so the tests can still proceed (no real worker).
 *   - JWT secrets set (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET)
 *
 * The bootstrap is intentionally defensive: it will print clear
 * instructions if any of those are missing instead of crashing deep
 * inside the Nest container.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/platform/database/prisma.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { GlobalExceptionFilter } from '../src/platform/filters/global-exception.filter';
import { assertValidEnv } from '../src/config/env.validation';
import { REDIS_CLIENT } from '../src/platform/redis/redis.module';
import { QUEUE_FACTORY } from '../src/platform/queue/queue.module';
import { NotificationProcessor } from '../src/modules/notification/notification.processor';

export interface E2EHandle {
  app: INestApplication;
  request: ReturnType<typeof request>;
  prisma: PrismaService;
  /** Tear down the app + prisma connections. */
  close: () => Promise<void>;
}

let appCounter = 0;

export async function bootstrapE2E(opts?: {
  /** Override default throttler ttl/limit (e.g. set both to 0 to disable). */
  throttlerTtlSec?: number;
  throttlerLimit?: number;
}): Promise<E2EHandle> {
  // Validate env first to fail fast with a clear message.
  try {
    assertValidEnv();
  } catch (e) {
    throw new Error(
      `E2E bootstrap: environment validation failed. ` +
        `Ensure DATABASE_URL, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET are set. ` +
        `Original: ${(e as Error).message}`,
    );
  }

  // Increase throttle TTL/limit so tests don't bump into rate limiting.
  const ttl = opts?.throttlerTtlSec ?? 60;
  const limit = opts?.throttlerLimit ?? 10000;

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideModule(ThrottlerModule)
    .useModule(
      ThrottlerModule.forRootAsync({
        useFactory: () => [{ ttl: ttl * 1000, limit }],
      }),
    )
    .overrideProvider(REDIS_CLIENT)
    .useValue(null)
    .overrideProvider(QUEUE_FACTORY)
    .useValue(() => null)
    .overrideProvider(NotificationProcessor)
    .useValue({
      onModuleInit: () => undefined,
      onModuleDestroy: () => undefined,
      enqueue: () => Promise.resolve(),
    })
    .compile();

  const app = moduleRef.createNestApplication({
    bufferLogs: true,
  });

  app.setGlobalPrefix('v1', {
    exclude: ['/health', '/', '/api/docs', '/api/docs-json'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // tests are stricter than the runtime
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();

  appCounter += 1;
  // eslint-disable-next-line no-console
  console.log(`[e2e] Nest app #${appCounter} bootstrapped`);

  const prisma = app.get(PrismaService);

  return {
    app,
    request: request(app.getHttpServer()),
    prisma,
    close: async () => {
      await app.close();
    },
  };
}

/**
 * A "unique-enough" email generator for tests so re-runs don't collide
 * on the `User.email` UNIQUE index.
 */
export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.smartlight.vn`;
}

/**
 * Wait a tiny interval to give async background tasks (queue workers,
 * transaction commits) a chance to settle.
 */
export const wait = (ms = 50) => new Promise((r) => setTimeout(r, ms));

/**
 * Standard strong password (passes the password policy in the service).
 */
export const STRONG_PASSWORD = 'TestPassword!SmartLight2026';

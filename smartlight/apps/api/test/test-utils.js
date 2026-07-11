"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRONG_PASSWORD = exports.wait = void 0;
exports.bootstrapE2E = bootstrapE2E;
exports.uniqueEmail = uniqueEmail;
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
const common_1 = require("@nestjs/common");
const testing_1 = require("@nestjs/testing");
const supertest_1 = __importDefault(require("supertest"));
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/platform/database/prisma.service");
const throttler_1 = require("@nestjs/throttler");
const global_exception_filter_1 = require("../src/platform/filters/global-exception.filter");
const env_validation_1 = require("../src/config/env.validation");
const redis_module_1 = require("../src/platform/redis/redis.module");
const queue_module_1 = require("../src/platform/queue/queue.module");
const notification_processor_1 = require("../src/modules/notification/notification.processor");
let appCounter = 0;
async function bootstrapE2E(opts) {
    // Validate env first to fail fast with a clear message.
    try {
        (0, env_validation_1.assertValidEnv)();
    }
    catch (e) {
        throw new Error(`E2E bootstrap: environment validation failed. ` +
            `Ensure DATABASE_URL, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET are set. ` +
            `Original: ${e.message}`);
    }
    // Increase throttle TTL/limit so tests don't bump into rate limiting.
    const ttl = opts?.throttlerTtlSec ?? 60;
    const limit = opts?.throttlerLimit ?? 10000;
    const moduleRef = await testing_1.Test.createTestingModule({
        imports: [app_module_1.AppModule],
    })
        .overrideModule(throttler_1.ThrottlerModule)
        .useModule(throttler_1.ThrottlerModule.forRootAsync({
        useFactory: () => [{ ttl: ttl * 1000, limit }],
    }))
        .overrideProvider(redis_module_1.REDIS_CLIENT)
        .useValue(null)
        .overrideProvider(queue_module_1.QUEUE_FACTORY)
        .useValue(() => null)
        .overrideProvider(notification_processor_1.NotificationProcessor)
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
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false, // tests are stricter than the runtime
        transform: true,
        transformOptions: { enableImplicitConversion: false },
    }));
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
    await app.init();
    appCounter += 1;
    // eslint-disable-next-line no-console
    console.log(`[e2e] Nest app #${appCounter} bootstrapped`);
    const prisma = app.get(prisma_service_1.PrismaService);
    return {
        app,
        request: (0, supertest_1.default)(app.getHttpServer()),
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
function uniqueEmail(prefix = 'user') {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.smartlight.vn`;
}
/**
 * Wait a tiny interval to give async background tasks (queue workers,
 * transaction commits) a chance to settle.
 */
const wait = (ms = 50) => new Promise((r) => setTimeout(r, ms));
exports.wait = wait;
/**
 * Standard strong password (passes the password policy in the service).
 */
exports.STRONG_PASSWORD = 'TestPassword!SmartLight2026';

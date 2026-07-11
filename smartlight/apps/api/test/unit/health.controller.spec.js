"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Unit tests for the HealthController's status / memory / cpu helpers.
 *
 * Doesn't hit the network — uses mocked PrismaService + null Redis.
 */
const health_controller_1 = require("../../src/platform/health/health.controller");
describe('HealthController (deep status helpers)', () => {
    const buildController = (queryRawImpl) => {
        const prisma = {
            $queryRaw: jest.fn(queryRawImpl),
        };
        return new health_controller_1.HealthController(prisma, null);
    };
    it('health returns ok when DB is reachable and Redis is disabled', async () => {
        const c = buildController(async () => [{ '?column?': 1 }]);
        const r = await c.health();
        expect(r.status).toBe('ok');
        expect(r.database).toBe('connected');
        expect(r.redis).toBe('disabled');
        expect(typeof r.uptimeSec).toBe('number');
        expect(r.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
    it('health returns degraded when DB fails', async () => {
        const c = buildController(async () => {
            throw new Error('connection refused');
        });
        const r = await c.health();
        expect(r.status).toBe('degraded');
        expect(r.database).toBe('disconnected');
    });
    it('ready sets 503 status code when degraded', async () => {
        const c = buildController(async () => {
            throw new Error('connection refused');
        });
        const res = { status: jest.fn().mockReturnThis() };
        const r = await c.ready(res);
        expect(r.status).toBe('degraded');
        expect(res.status).toHaveBeenCalledWith(503);
    });
    it('status returns comprehensive payload', async () => {
        const c = buildController(async () => [{ '?column?': 1 }]);
        const r = await c.status();
        expect(r).toHaveProperty('status');
        expect(r).toHaveProperty('version.api');
        expect(r).toHaveProperty('system.hostname');
        expect(r).toHaveProperty('cpu.cores');
        expect(r).toHaveProperty('memory.heapUsedMb');
        expect(r).toHaveProperty('disk.path');
        expect(r).toHaveProperty('checks.database.ok');
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Unit tests for MetricsService.
 */
const testing_1 = require("@nestjs/testing");
const metrics_service_1 = require("../../src/platform/metrics/metrics.service");
const redis_module_1 = require("../../src/platform/redis/redis.module");
const test_mocks_1 = require("../mocks/test-mocks");
describe('MetricsService', () => {
    let svc;
    beforeEach(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            providers: [
                {
                    provide: metrics_service_1.MetricsService,
                    useFactory: () => new metrics_service_1.MetricsService((0, test_mocks_1.createMockPrisma)(), (0, test_mocks_1.createMockRedis)()),
                },
                { provide: redis_module_1.REDIS_CLIENT, useValue: (0, test_mocks_1.createMockRedis)() },
            ],
        }).compile();
        svc = moduleRef.get(metrics_service_1.MetricsService);
    });
    it('registers default node metrics', () => {
        expect(svc.registry.getSingleMetric('process_cpu_user_seconds_total')).toBeDefined();
    });
    it('exposes http / db / redis / cache metric families', () => {
        expect(svc.registry.getSingleMetric('http_requests_total')).toBeDefined();
        expect(svc.registry.getSingleMetric('http_request_duration_seconds')).toBeDefined();
        expect(svc.registry.getSingleMetric('db_queries_total')).toBeDefined();
        expect(svc.registry.getSingleMetric('db_query_duration_seconds')).toBeDefined();
        expect(svc.registry.getSingleMetric('redis_commands_total')).toBeDefined();
        expect(svc.registry.getSingleMetric('redis_command_duration_seconds')).toBeDefined();
        expect(svc.registry.getSingleMetric('redis_cache_hits_total')).toBeDefined();
        expect(svc.registry.getSingleMetric('redis_cache_misses_total')).toBeDefined();
    });
    it('records http metrics', async () => {
        svc.recordHttp('GET', '/v1/products/:id', 200, 0.012);
        svc.recordHttp('POST', '/v1/orders', 201, 0.234);
        const metric = svc.registry.getSingleMetric('http_requests_total');
        const values = await metric.get();
        expect(values.values).toEqual(expect.arrayContaining([
            expect.objectContaining({
                labels: { method: 'GET', route: '/v1/products/:id', status: '200' },
            }),
            expect.objectContaining({
                labels: { method: 'POST', route: '/v1/orders', status: '201' },
            }),
        ]));
    });
    it('records db metrics', async () => {
        svc.recordDb('Product', 'SELECT', 0.005);
        const metric = svc.registry.getSingleMetric('db_queries_total');
        const values = await metric.get();
        expect(values.values).toEqual(expect.arrayContaining([
            expect.objectContaining({
                labels: { model: 'Product', action: 'SELECT' },
            }),
        ]));
    });
    it('records redis cache hit/miss', async () => {
        svc.recordRedis('GET', 0.001);
        svc.recordCacheHit('products');
        svc.recordCacheMiss('products');
        const hits = svc.registry.getSingleMetric('redis_cache_hits_total');
        const misses = svc.registry.getSingleMetric('redis_cache_misses_total');
        const h = await hits.get();
        const m = await misses.get();
        expect(h.values).toEqual(expect.arrayContaining([
            expect.objectContaining({ labels: { key_prefix: 'products' } }),
        ]));
        expect(m.values).toEqual(expect.arrayContaining([
            expect.objectContaining({ labels: { key_prefix: 'products' } }),
        ]));
    });
    it('render() returns Prometheus exposition format', async () => {
        svc.recordHttp('GET', '/health', 200, 0.001);
        const { contentType, body } = await svc.render();
        expect(contentType).toMatch(/text\/plain/);
        expect(body).toContain('# HELP http_requests_total');
        expect(body).toContain('http_requests_total{');
    });
});

/**
 * MetricsService — owns the prom-client Registry + metric definitions.
 *
 * Default Node.js metrics (heap, GC, event loop lag, fd count) are enabled
 * once at construction. HTTP / DB / Redis metrics are recorded by:
 *   - HttpMetricsInterceptor  : HTTP
 *   - MetricsService.recordDbQuery / recordRedisCmd : DB + Redis
 *
 * All metrics use a single shared registry so the /metrics endpoint
 * returns one combined payload.
 */
import { Inject, Injectable, OnModuleInit, forwardRef } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  // ---------- HTTP metrics ---------------------------------------------
  readonly httpRequestsTotal: Counter<string>;
  readonly httpRequestDurationSeconds: Histogram<string>;

  // ---------- DB metrics -----------------------------------------------
  readonly dbQueriesTotal: Counter<string>;
  readonly dbQueryDurationSeconds: Histogram<string>;

  // ---------- Redis metrics --------------------------------------------
  readonly redisCommandsTotal: Counter<string>;
  readonly redisCommandDurationSeconds: Histogram<string>;
  readonly redisCacheHitsTotal: Counter<string>;
  readonly redisCacheMissesTotal: Counter<string>;

  // ---------- Domain metrics (business KPIs) ---------------------------
  readonly ordersPlacedTotal: Counter<string>;
  readonly checkoutsAbandonedTotal: Counter<string>;
  readonly paymentsCompletedTotal: Counter<string>;

  constructor(
    @Inject(forwardRef(() => PrismaService)) private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {
    // Default Node.js process metrics (memory, CPU, GC, event-loop lag).
    collectDefaultMetrics({ register: this.registry });

    // Tag every metric with service + version so multi-tenant Prometheus
    // scrapes can filter.
    this.registry.setDefaultLabels({
      service: 'smartlight-api',
      env: process.env.NODE_ENV ?? 'development',
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests handled, partitioned by method, route, and status.',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDurationSeconds = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request handler latency in seconds.',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.dbQueriesTotal = new Counter({
      name: 'db_queries_total',
      help: 'Total Prisma queries executed.',
      labelNames: ['model', 'action'],
      registers: [this.registry],
    });

    this.dbQueryDurationSeconds = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Prisma query latency in seconds.',
      labelNames: ['model', 'action'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
      registers: [this.registry],
    });

    this.redisCommandsTotal = new Counter({
      name: 'redis_commands_total',
      help: 'Total ioredis commands executed.',
      labelNames: ['command', 'status'],
      registers: [this.registry],
    });

    this.redisCommandDurationSeconds = new Histogram({
      name: 'redis_command_duration_seconds',
      help: 'ioredis command latency in seconds.',
      labelNames: ['command'],
      buckets: [0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
      registers: [this.registry],
    });

    this.redisCacheHitsTotal = new Counter({
      name: 'redis_cache_hits_total',
      help: 'Cache hits against the Redis layer.',
      labelNames: ['key_prefix'],
      registers: [this.registry],
    });

    this.redisCacheMissesTotal = new Counter({
      name: 'redis_cache_misses_total',
      help: 'Cache misses against the Redis layer.',
      labelNames: ['key_prefix'],
      registers: [this.registry],
    });

    // Domain KPIs — surfaced in Grafana business dashboards.
    this.ordersPlacedTotal = new Counter({
      name: 'orders_placed_total',
      help: 'Total orders successfully placed.',
      labelNames: ['payment_provider'],
      registers: [this.registry],
    });
    this.checkoutsAbandonedTotal = new Counter({
      name: 'checkouts_abandoned_total',
      help: 'Total checkouts that timed out without being completed.',
      registers: [this.registry],
    });
    this.paymentsCompletedTotal = new Counter({
      name: 'payments_completed_total',
      help: 'Total payments marked as completed.',
      labelNames: ['provider'],
      registers: [this.registry],
    });
  }

  async onModuleInit(): Promise<void> {
    // Eager DB + Redis connection pings so the first real query doesn't
    // pay the connect cost.
    if (this.redis) {
      try {
        await this.redis.ping();
      } catch {
        /* swallow — health probe will surface */
      }
    }
  }

  // -------------------------------------------------------------------
  // Recording helpers — keep call-sites small.
  // -------------------------------------------------------------------
  recordHttp(
    method: string,
    route: string,
    status: number,
    durationSeconds: number,
  ): void {
    const labels = { method, route, status: String(status) };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDurationSeconds.observe(labels, durationSeconds);
  }

  recordDb(model: string, action: string, durationSeconds: number): void {
    this.dbQueriesTotal.inc({ model, action });
    this.dbQueryDurationSeconds.observe({ model, action }, durationSeconds);
  }

  recordRedis(
    command: string,
    durationSeconds: number,
    status: 'ok' | 'err' = 'ok',
  ): void {
    this.redisCommandsTotal.inc({ command, status });
    this.redisCommandDurationSeconds.observe({ command }, durationSeconds);
  }

  recordCacheHit(keyPrefix: string): void {
    this.redisCacheHitsTotal.inc({ key_prefix: keyPrefix });
  }
  recordCacheMiss(keyPrefix: string): void {
    this.redisCacheMissesTotal.inc({ key_prefix: keyPrefix });
  }

  // -------------------------------------------------------------------
  // Render the registry for the /metrics endpoint.
  // -------------------------------------------------------------------
  async render(): Promise<{ contentType: string; body: string }> {
    return {
      contentType: this.registry.contentType,
      body: await this.registry.metrics(),
    };
  }
}
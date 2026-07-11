/**
 * MetricsModule — Prometheus instrumentation.
 *
 * Exposes a singleton `MetricsService` that owns the `prom-client` Registry
 * and the metric definitions for:
 *
 *   - HTTP     : request count + duration histogram, status-code labels
 *   - DB       : Prisma query duration histogram
 *   - Redis    : ioredis command duration + cache hit/miss counters
 *   - Process  : CPU, memory, event-loop lag, GC, file descriptors
 *   - Default  : prom-client's built-in Node.js collectors (heap, GC, etc.)
 *
 * The /metrics endpoint is exposed by MetricsController, gated by a
 * bearer token (METRICS_SCRAPE_TOKEN) so it isn't publicly scrapeable.
 */
import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';

@Global()
@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [MetricsController],
  providers: [MetricsService, HttpMetricsInterceptor],
  exports: [MetricsService, HttpMetricsInterceptor],
})
export class MetricsModule {}
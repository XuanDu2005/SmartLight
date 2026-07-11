import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service';

/**
 * Single Prisma client used across the application.
 *
 * Boot lifecycle:
 *   - Connect on module init.
 *   - Disconnect on module destroy (SIGTERM-safe).
 *
 * DB query metrics:
 *   - If MetricsService is available (Phase 20), record every query into
 *     `db_queries_total` and `db_query_duration_seconds`. The middleware
 *     runs at Prisma's `query` event so we see the *post-execution*
 *     duration, not the queueing time.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(@Optional() @Inject(forwardRef(() => MetricsService)) private readonly metrics?: MetricsService) {
    super();

    // Best-effort metrics hook — never let it break queries.
    if (this.metrics) {
      this.$on('query' as never, (event: PrismaQueryEvent) => {
        try {
          const model = this.inferModel(event.query);
          const action = this.inferAction(event.query);
          const durationMs = Number(event.duration ?? 0);
          this.metrics?.recordDb(model, action, durationMs / 1000);
        } catch {
          /* metrics are best-effort */
        }
      });
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  // -------------------------------------------------------------------
  // Helpers — pull a coarse label out of a Prisma query string.
  // -------------------------------------------------------------------
  private inferModel(query: string): string {
    // e.g. "SELECT ... FROM \"Product\" ..." → "Product"
    const m = /FROM\s+"([^"]+)"/i.exec(query);
    return m?.[1] ?? 'unknown';
  }

  private inferAction(query: string): string {
    const head = query.trim().split(/\s+/)[0]?.toUpperCase();
    return head ?? 'unknown';
  }
}

interface PrismaQueryEvent {
  query: string;
  duration: number;
  timestamp: Date;
}
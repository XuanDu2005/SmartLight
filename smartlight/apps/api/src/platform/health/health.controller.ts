/**
 * Liveness + readiness probes.
 *
 *   GET /health       \u2014 liveness (always returns 200 if the process is alive)
 *   GET /health/ready \u2014 readiness (pings the database)
 *
 * Both routes are `@Public()` so they're reachable without a JWT \u2014 they're
 * intended for k8s / load balancer probes and uptime monitors.
 */
import { Controller, Get } from '@nestjs/common';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

interface ReadinessReport {
  status: 'ok' | 'degraded';
  checks: {
    database: { ok: boolean; latencyMs: number; error?: string };
  };
  uptimeSec: number;
  timestamp: string;
}

@Controller()
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  health(): { status: 'ok'; uptimeSec: number; timestamp: string } {
    return {
      status: 'ok',
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health/ready')
  async ready(): Promise<ReadinessReport> {
    const dbResult = await this.pingDb();
    const allOk = dbResult.ok;
    return {
      status: allOk ? 'ok' : 'degraded',
      checks: { database: dbResult },
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  private async pingDb(): Promise<{
    ok: boolean;
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: (err as Error).message ?? 'unknown',
      };
    }
  }
}
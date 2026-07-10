/**
 * Liveness + readiness probes.
 *
 *   GET /health       — liveness + database + redis status (Phase 17.5)
 *   GET /health/ready — readiness (pings the database + Redis)
 *
 * Both routes are `@Public()` so they're reachable without a JWT — they're
 * intended for k8s / load balancer probes and uptime monitors.
 */
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type Redis from 'ioredis';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

interface ReadinessReport {
  status: 'ok' | 'degraded';
  checks: {
    database: { ok: boolean; latencyMs: number; error?: string };
    redis: { ok: boolean; latencyMs: number; error?: string };
  };
  uptimeSec: number;
  timestamp: string;
}

interface LivenessReport {
  status: 'ok' | 'degraded';
  database: 'connected' | 'disconnected';
  redis: 'connected' | 'disabled' | 'disconnected';
  uptimeSec: number;
  timestamp: string;
}

@ApiTags('Health')
@Controller()
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Liveness probe (process + dependency status)',
    description:
      'Returns the overall process health and a snapshot of the database ' +
      'and Redis connection status. The endpoint itself never throws; ' +
      'degraded states are reported via the body.',
  })
  async health(): Promise<LivenessReport> {
    const [dbOk, redisState] = await Promise.all([
      this.canConnectDb(),
      this.canConnectRedis(),
    ]);
    return {
      status: dbOk && redisState !== 'disconnected' ? 'ok' : 'degraded',
      database: dbOk ? 'connected' : 'disconnected',
      redis: redisState,
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health/ready')
  @ApiOperation({
    summary: 'Readiness probe (pings the database + Redis)',
    description:
      'Verifies the API can reach the database and Redis. Returns 200 with ' +
      'status=ok when both are reachable, status=degraded otherwise. The body ' +
      'includes per-dependency latency in milliseconds.',
  })
  async ready(): Promise<ReadinessReport> {
    const [dbResult, redisResult] = await Promise.all([
      this.pingDb(),
      this.pingRedis(),
    ]);
    const allOk = dbResult.ok && redisResult.ok;
    return {
      status: allOk ? 'ok' : 'degraded',
      checks: { database: dbResult, redis: redisResult },
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  private async canConnectDb(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async canConnectRedis(): Promise<
    'connected' | 'disabled' | 'disconnected'
  > {
    if (!this.redis) return 'disabled';
    try {
      const reply = await this.redis.ping();
      return reply === 'PONG' ? 'connected' : 'disconnected';
    } catch {
      return 'disconnected';
    }
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

  private async pingRedis(): Promise<{
    ok: boolean;
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    if (!this.redis) {
      return {
        ok: false,
        latencyMs: 0,
        error: 'REDIS_URL not configured',
      };
    }
    try {
      const reply = await this.redis.ping();
      if (reply !== 'PONG') {
        return {
          ok: false,
          latencyMs: Date.now() - start,
          error: `unexpected reply: ${reply}`,
        };
      }
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

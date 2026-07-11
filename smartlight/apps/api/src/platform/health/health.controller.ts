/**
 * Liveness + readiness + deep status endpoints.
 *
 *   GET /health         — liveness probe (process + dependency snapshot)
 *   GET /health/ready   — readiness probe (DB + Redis reachability; 503 on failure)
 *   GET /health/status  — deep status: DB, Redis, disk, memory, version,
 *                          build, uptime, system info
 *
 * All routes are `@Public()` so they're reachable without a JWT — they're
 * intended for k8s / load balancer probes, uptime monitors, and the
 * /metrics scrape controller.
 */
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as process from 'node:process';
import type Redis from 'ioredis';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

// ---------------------------------------------------------------------------
// Shape definitions
// ---------------------------------------------------------------------------
interface LivenessReport {
  status: 'ok' | 'degraded';
  database: 'connected' | 'disconnected';
  redis: 'connected' | 'disabled' | 'disconnected';
  uptimeSec: number;
  timestamp: string;
}

interface ReadinessReport {
  status: 'ok' | 'degraded';
  checks: {
    database: { ok: boolean; latencyMs: number; error?: string };
    redis: { ok: boolean; latencyMs: number; error?: string };
  };
  uptimeSec: number;
  timestamp: string;
}

interface DiskReport {
  ok: boolean;
  path: string;
  totalMb: number;
  freeMb: number;
  usedMb: number;
  usedPercent: number;
}

interface MemoryReport {
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  externalMb: number;
  systemFreeMb: number;
  systemTotalMb: number;
}

interface CpuReport {
  cores: number;
  model: string;
  loadAvg1: number;
  loadAvg5: number;
  loadAvg15: number;
}

interface SystemInfo {
  hostname: string;
  platform: NodeJS.Platform;
  arch: string;
  nodeVersion: string;
  pid: number;
  container: boolean;
}

interface VersionReport {
  api: string;
  node: string;
  uptimeSec: number;
  startedAt: string;
  timestamp: string;
  build: {
    sha: string;
    builtAt: string;
    imageTag: string;
  };
}

interface DeepStatusReport {
  status: 'ok' | 'degraded';
  version: VersionReport;
  system: SystemInfo;
  cpu: CpuReport;
  memory: MemoryReport;
  disk: DiskReport;
  checks: {
    database: { ok: boolean; latencyMs: number; error?: string };
    redis: { ok: boolean; latencyMs: number; error?: string };
  };
  uptimeSec: number;
  timestamp: string;
}

@ApiTags('Health')
@Controller()
export class HealthController {
  private readonly startedAt = Date.now();
  private readonly startedAtIso = new Date().toISOString();
  /** Cached build metadata — read once on construction. */
  private readonly buildInfo = this.readBuildInfo();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  // ---------------------------------------------------------------------
  // GET /health — cheap liveness check
  // ---------------------------------------------------------------------
  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Liveness probe (process + dependency snapshot)',
    description:
      'Returns the overall process health and a snapshot of the database ' +
      'and Redis connection status. Never throws — degraded states are ' +
      'reported via the body.',
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

  // ---------------------------------------------------------------------
  // GET /health/ready — readiness for traffic; 503 if degraded
  // ---------------------------------------------------------------------
  @Public()
  @Get('health/ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Readiness probe (pings the database + Redis)',
    description:
      'Verifies the API can reach the database and Redis. Returns 200 with ' +
      'status=ok when both are reachable, 503 with status=degraded otherwise. ' +
      'The body includes per-dependency latency in milliseconds.',
  })
  async ready(@Res({ passthrough: true }) res: Response): Promise<ReadinessReport> {
    const [dbResult, redisResult] = await Promise.all([
      this.pingDb(),
      this.pingRedis(),
    ]);
    const allOk = dbResult.ok && redisResult.ok;
    if (!allOk) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return {
      status: allOk ? 'ok' : 'degraded',
      checks: { database: dbResult, redis: redisResult },
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------
  // GET /health/status — deep status (Disk, Memory, CPU, Version, Build)
  // ---------------------------------------------------------------------
  @Public()
  @Get('health/status')
  @ApiOperation({
    summary: 'Deep status (DB + Redis + disk + memory + CPU + version)',
    description:
      'Returns a comprehensive status report. Used by ops dashboards and ' +
      'post-mortem investigations. Always returns 200 — degraded state is ' +
      'reflected in the body.',
  })
  async status(): Promise<DeepStatusReport> {
    const [dbResult, redisResult, disk] = await Promise.all([
      this.pingDb(),
      this.pingRedis(),
      this.diskReport(),
    ]);
    const mem = this.memoryReport();
    const cpu = this.cpuReport();
    const allOk = dbResult.ok && redisResult.ok && disk.ok;
    return {
      status: allOk ? 'ok' : 'degraded',
      version: {
        api: process.env.APP_VERSION ?? 'dev',
        node: process.version,
        uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
        startedAt: this.startedAtIso,
        timestamp: new Date().toISOString(),
        build: this.buildInfo,
      },
      system: {
        hostname: os.hostname(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid,
        container: this.isContainer(),
      },
      cpu,
      memory: mem,
      disk,
      checks: { database: dbResult, redis: redisResult },
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------
  // Private probes
  // ---------------------------------------------------------------------
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
      return { ok: false, latencyMs: 0, error: 'REDIS_URL not configured' };
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

  // ---------------------------------------------------------------------
  // Memory / Disk / CPU reports
  // ---------------------------------------------------------------------
  private memoryReport(): MemoryReport {
    const m = process.memoryUsage();
    return {
      heapUsedMb: this.toMb(m.heapUsed),
      heapTotalMb: this.toMb(m.heapTotal),
      rssMb: this.toMb(m.rss),
      externalMb: this.toMb(m.external),
      systemFreeMb: this.toMb(os.freemem()),
      systemTotalMb: this.toMb(os.totalmem()),
    };
  }

  private cpuReport(): CpuReport {
    const cpus = os.cpus();
    const [l1, l5, l15] = os.loadavg();
    return {
      cores: cpus.length,
      model: cpus[0]?.model ?? 'unknown',
      loadAvg1: l1,
      loadAvg5: l5,
      loadAvg15: l15,
    };
  }

  /**
   * Best-effort disk report. Uses `statvfs` on Linux via /proc, falls back
   * to a coarser "no info" payload on platforms that don't expose it.
   */
  private async diskReport(): Promise<DiskReport> {
    const path = process.cwd();
    try {
      // On Linux Docker containers, /proc/mounts gives us the underlying FS.
      // We use statfs via a tiny syscall wrapper through fs.statSync.
      // For container hosts the same call reports the overlay fs.
      // (No third-party dep — Node 18+ exposes this via fs.statfs.)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statfs = (fs as any).statfs as
        | ((p: string) => Promise<{ bsize: number; blocks: number; bfree: number }>)
        | undefined;

      if (typeof statfs === 'function') {
        const s = await statfs.call(fs, path);
        const total = Number(s.blocks) * Number(s.bsize);
        const free = Number(s.bfree) * Number(s.bsize);
        const used = total - free;
        const usedPercent = total > 0 ? (used / total) * 100 : 0;
        return {
          ok: usedPercent < 95,
          path,
          totalMb: this.toMb(total),
          freeMb: this.toMb(free),
          usedMb: this.toMb(used),
          usedPercent: Number(usedPercent.toFixed(2)),
        };
      }
    } catch {
      /* fall through to coarse report */
    }
    return {
      ok: true,
      path,
      totalMb: 0,
      freeMb: 0,
      usedMb: 0,
      usedPercent: 0,
    };
  }

  private isContainer(): boolean {
    try {
      // Cheap heuristic: container envs expose /.dockerenv or runc's
      // /.containerenv. Avoids requiring fs.access sync calls here.
      return (
        process.env.DOCKER_CONTAINER === 'true' ||
        process.env.CONTAINER === 'true' ||
        process.env.KUBERNETES_SERVICE_HOST !== undefined
      );
    } catch {
      return false;
    }
  }

  /**
   * Read build metadata once on construction. Reads from /app/BUILD_INFO
   * if present (CI mounts it), otherwise returns placeholder values.
   *
   * Expected file format (JSON):
   *   { "sha": "...", "builtAt": "2024-01-01T00:00:00Z", "imageTag": "..." }
   */
  private readBuildInfo(): VersionReport['build'] {
    const fallback = {
      sha: 'unknown',
      builtAt: new Date(0).toISOString(),
      imageTag: process.env.APP_VERSION ?? 'dev',
    };
    try {
      // Synchronous read at construction time — no async allowed in constructor.
      const buf = require('node:fs').readFileSync('/app/BUILD_INFO', 'utf-8');
      const parsed = JSON.parse(buf) as Partial<VersionReport['build']>;
      return { ...fallback, ...parsed };
    } catch {
      return fallback;
    }
  }

  private toMb(bytes: number): number {
    return Number((bytes / (1024 * 1024)).toFixed(2));
  }
}
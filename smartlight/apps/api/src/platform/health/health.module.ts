/**
 * Health check module — liveness + readiness + deep status.
 *
 * Three endpoints (all `@Public()`, no JWT required):
 *
 *   GET /health           — liveness: is the process up?
 *   GET /health/ready     — readiness: can the process serve traffic?
 *   GET /health/status    — deep status: DB, Redis, disk, memory,
 *                           version, build, uptime, system info
 *
 * The endpoints return 200 even when degraded so uptime monitors can
 * parse the body — only `/health/ready` returns 503 when dependencies
 * are unreachable (so a load balancer can pull the pod out of rotation).
 */
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
})
export class HealthModule {}
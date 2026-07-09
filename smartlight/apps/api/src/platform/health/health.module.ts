/**
 * HealthModule \u2014 liveness + readiness probes for k8s / LB / uptime monitors.
 */
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
})
export class HealthModule {}
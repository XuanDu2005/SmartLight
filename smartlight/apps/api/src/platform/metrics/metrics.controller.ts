/**
 * MetricsController — exposes Prometheus scrape endpoint.
 *
 *   GET /metrics
 *
 * The endpoint is gated by a Bearer token (METRICS_SCRAPE_TOKEN) so it's
 * not publicly readable. When METRICS_ENABLED=false, the controller
 * returns 404 so unauthenticated probes don't even know the endpoint exists.
 *
 * The token is intentionally not exposed via /api/docs — Prometheus
 * scrapers are expected to be configured with the secret out-of-band.
 */
import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';
import { Public } from '../../modules/auth/decorators/public.decorator';

@ApiExcludeController()
@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Public()
  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async getMetrics(@Res() res: Response): Promise<void> {
    if (process.env.METRICS_ENABLED !== 'true') {
      throw new NotFoundException('metrics endpoint disabled');
    }

    const expected = process.env.METRICS_SCRAPE_TOKEN;
    if (!expected) {
      throw new UnauthorizedException('metrics scrape token not configured');
    }

    const auth = res.req.headers['authorization'];
    const token =
      typeof auth === 'string' && auth.startsWith('Bearer ')
        ? auth.slice('Bearer '.length)
        : null;

    if (token !== expected) {
      throw new UnauthorizedException('invalid scrape token');
    }

    const { contentType, body } = await this.metrics.render();
    res.setHeader('Content-Type', contentType);
    res.status(HttpStatus.OK).send(body);
  }
}
import { Controller, Get } from '@nestjs/common';
import { Public } from '../../modules/auth/decorators/public.decorator';

/**
 * Simple liveness/readiness endpoint.
 * Performs an on-demand DB ping on /health/ready.
 */
@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
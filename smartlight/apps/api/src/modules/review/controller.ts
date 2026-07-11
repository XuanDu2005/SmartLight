import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Reviews')
@Controller()
export class ReviewController {
  /**
   * Placeholder. Reviews are scheduled for a future phase; this route
   * exists only so the OpenAPI doc has a "Reviews" tag entry.
   */
  @Get('reviews/ping')
  @ApiOperation({
    summary: 'Reviews module liveness',
    description:
      'Placeholder route. The reviews feature is scheduled for a future phase.',
  })
  ping(): { ok: true; tag: 'reviews' } {
    return { ok: true, tag: 'reviews' };
  }
}


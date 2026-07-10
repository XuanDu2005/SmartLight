import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { SWAGGER_BEARER_AUTH } from '../../config/swagger';

@ApiTags('Admin')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller()
@Roles('admin', 'super_admin')
export class AdminController {
  /**
   * Placeholder route under the admin tag. The active admin endpoints
   * live in their respective modules (catalog, orders, payments, etc.)
   * and are documented under those tags. This route is a no-op that
   * exists purely so the OpenAPI doc has a "Admin" tag entry.
   */
  @Get('admin/ping')
  @ApiOperation({
    summary: 'Admin module liveness',
    description:
      'No-op ping. Each bounded context exposes its own admin endpoints ' +
      'under its own tag. This route exists only so the OpenAPI doc has ' +
      'an "Admin" tag entry.',
  })
  ping(): { ok: true; tag: 'admin' } {
    return { ok: true, tag: 'admin' };
  }
}

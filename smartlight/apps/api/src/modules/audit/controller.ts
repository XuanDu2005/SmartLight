import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { SWAGGER_BEARER_AUTH } from '../../config/swagger';

@ApiTags('Audit')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller()
@Roles('admin', 'super_admin')
export class AuditController {
  /**
   * Placeholder route under the audit tag. The active audit log reads
   * (search, filter, export) are scheduled for a future phase. This
   * route is a no-op so the OpenAPI doc has an "Audit" tag entry.
   */
  @Get('admin/audit/ping')
  @ApiOperation({
    summary: 'Audit module liveness',
    description:
      'No-op ping. Audit log browsing/filtering endpoints are scheduled ' +
      'for a future phase.',
  })
  ping(): { ok: true; tag: 'audit' } {
    return { ok: true, tag: 'audit' };
  }
}

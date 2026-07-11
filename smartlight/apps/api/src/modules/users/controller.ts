/**
 * Users controller — customer profile endpoints.
 *
 * NOTE: bootstrap stub expanded. The auth controller currently owns
 *   GET /v1/auth/me        → returns the current user
 *   POST /v1/auth/logout   → revokes session
 * For full /v1/users/me/profile CRUD, see the user-management endpoint
 * catalogue in docs/04-api-design/USER_API.md (V1.1).
 */
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SWAGGER_BEARER_AUTH } from '../../config/swagger';

@ApiTags('Users')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller()
export class UsersController {
  /**
   * Placeholder — the canonical endpoint is /v1/auth/me.
   * Documented here so the Users tag isn't empty in the OpenAPI doc.
   */
  @Get('users/me/ping')
  @ApiOperation({
    summary: 'Users module liveness',
    description:
      'Placeholder route under the Users tag. Use /v1/auth/me for the ' +
      'actual current-user endpoint. Reserved for V1.1 user-management routes.',
  })
  ping(): { ok: true; tag: 'users' } {
    return { ok: true, tag: 'users' };
  }
}


/**
 * PermissionsGuard \u2014 checks that the principal has every permission
 * listed via `@Permissions(...)`.
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { UserPrincipal } from '../../users/interfaces/user-principal.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: UserPrincipal }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('Not authenticated');

    const has = required.every((p) => user.permissions.includes(p));
    if (!has) {
      throw new ForbiddenException(
        `Missing one of permissions: ${required.join(', ')}`,
      );
    }
    return true;
  }
}

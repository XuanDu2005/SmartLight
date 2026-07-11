/**
 * RolesGuard \u2014 checks that the principal has at least one of the roles
 * specified on the route via `@Roles(...)`.
 *
 * Run AFTER JwtAuthGuard (NestJS guard ordering is left-to-right).
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { UserPrincipal } from '../../users/interfaces/user-principal.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: UserPrincipal }>();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }
    const match = user.roles.some((r) => required.includes(r));
    if (!match) {
      throw new ForbiddenException(
        `Requires one of roles: ${required.join(', ')}`,
      );
    }
    return true;
  }
}

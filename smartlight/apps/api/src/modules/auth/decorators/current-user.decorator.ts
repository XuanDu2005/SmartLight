/**
 * `@CurrentUser()` \u2014 extracts the resolved UserPrincipal from the request.
 *
 * Usage:
 *   handler(@CurrentUser() user: UserPrincipal) { ... }
 *   handler(@CurrentUser('id') id: string)            // property path
 */
import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { UserPrincipal } from '../../users/interfaces/user-principal.interface';

export const CurrentUser = createParamDecorator(
  (data: keyof UserPrincipal | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as UserPrincipal | undefined;
    if (!user) {
      throw new InternalServerErrorException(
        '@CurrentUser() used on a route without an auth guard',
      );
    }
    return data ? user[data] : user;
  },
);

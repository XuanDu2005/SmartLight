/**
 * `@Public()` \u2014 marks an endpoint as not requiring authentication.
 *
 * The global JwtAuthGuard is applied via APP_GUARD; any route that should be
 * reachable without a JWT opts in via this decorator.
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);

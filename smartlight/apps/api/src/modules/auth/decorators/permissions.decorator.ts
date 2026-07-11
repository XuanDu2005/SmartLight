/**
 * `@Permissions(...)` \u2014 fine-grained permission check (admin side).
 *
 * All listed permissions must be present on the principal (AND). For an OR
 * check, apply the decorator twice (currently not exposed for simplicity).
 */
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'auth:permissions';
export const Permissions = (...perms: string[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);

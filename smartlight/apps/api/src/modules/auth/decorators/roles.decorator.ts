/**
 * `@Roles(...)` \u2014 declarative role-based access control.
 *
 * Works with RolesGuard. Roles are AND-evaluated when an array is passed
 * to a single call, and OR-evaluated across multiple decorators.
 *
 * Example:
 *   @Roles('admin', 'super_admin')
 *   @Roles('catalog_manager')           // OR
 *   @UseGuards(RolesGuard)
 */
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'auth:roles';
export type RoleCode = string;

export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);
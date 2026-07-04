/**
 * Public surface of the auth module.
 *
 * Anything exported here is intended to be consumed by other modules
 * (e.g. the future admin/catalog modules that need to read the current user).
 */
export { AuthModule } from './auth.module';
export { AuthService } from './auth.service';
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { RolesGuard } from './guards/roles.guard';
export { PermissionsGuard } from './guards/permissions.guard';
export { Public } from './decorators/public.decorator';
export { Roles } from './decorators/roles.decorator';
export { Permissions } from './decorators/permissions.decorator';
export { CurrentUser } from './decorators/current-user.decorator';
export type { UserPrincipal } from '../users/interfaces/user-principal.interface';
export type { TokenPairResponseDto } from './dto/auth-response.dto';
export type { UserResponseDto } from '../users/dto/user-response.dto';
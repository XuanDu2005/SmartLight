/**
 * AuthModule \u2014 owns all identity / authentication / RBAC wiring.
 *
 * Imports the UsersModule (for User/AdminUser lookups) and the database
 * platform module (PrismaService).
 *
 * The OAuth strategies are conditionally registered \u2014 Passport throws on
 * construction if the credentials are missing, so we only mount them when
 * both client id and secret are present in the environment.
 *
 * Global guards are registered in AppModule; this module just provides
 * strategies, services, and the controller.
 */
import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { TokenService } from '../../platform/security/token.service';

const log = new Logger('AuthModule');

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ session: false, defaultStrategy: 'jwt' }),
    JwtModule.register({}), // options configured per sign call
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    JwtStrategy,
    RefreshTokenStrategy,
    JwtAuthGuard,
    JwtRefreshGuard,
    GoogleAuthGuard,
    FacebookAuthGuard,
    RolesGuard,
    PermissionsGuard,
    ...conditionalOAuthProviders(),
  ],
  exports: [
    AuthService,
    TokenService,
    JwtAuthGuard,
    JwtRefreshGuard,
    RolesGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}

/**
 * Conditionally registers Google + Facebook strategies based on env vars.
 * Read at import time using process.env so the module doesn't depend on
 * a fully-initialised ConfigService (which happens after module init).
 */
function conditionalOAuthProviders(): Array<typeof GoogleStrategy | typeof FacebookStrategy> {
  const hasGoogle = Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
  const hasFacebook = Boolean(
    process.env.FACEBOOK_OAUTH_CLIENT_ID && process.env.FACEBOOK_OAUTH_CLIENT_SECRET,
  );
  const providers: Array<typeof GoogleStrategy | typeof FacebookStrategy> = [];
  if (hasGoogle) {
    providers.push(GoogleStrategy);
    log.log('Google OAuth strategy enabled');
  } else {
    log.warn('Google OAuth strategy disabled (missing credentials)');
  }
  if (hasFacebook) {
    providers.push(FacebookStrategy);
    log.log('Facebook OAuth strategy enabled');
  } else {
    log.warn('Facebook OAuth strategy disabled (missing credentials)');
  }
  return providers;
}
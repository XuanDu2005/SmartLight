/**
 * GoogleAuthGuard \u2014 triggers Passport's `google` strategy.
 * Used at GET /v1/auth/oauth/google.
 *
 * When the Google credentials are missing, this guard short-circuits with
 * 503 Service Unavailable. When the credentials are present, the request
 * is forwarded to Passport.
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') implements CanActivate {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'OAUTH_NOT_CONFIGURED',
        message: 'Google OAuth is not configured on this server',
      });
    }
    return super.canActivate(context);
  }

  private isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('GOOGLE_OAUTH_CLIENT_ID') &&
        this.config.get<string>('GOOGLE_OAUTH_CLIENT_SECRET'),
    );
  }
}

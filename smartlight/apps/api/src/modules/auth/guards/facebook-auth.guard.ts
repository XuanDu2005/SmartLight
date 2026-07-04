/**
 * FacebookAuthGuard \u2014 triggers Passport's `facebook` strategy.
 * Used at GET /v1/auth/oauth/facebook.
 *
 * When the Facebook credentials are missing, this guard short-circuits with
 * 503 Service Unavailable. Otherwise delegates to Passport.
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
export class FacebookAuthGuard extends AuthGuard('facebook') implements CanActivate {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'OAUTH_NOT_CONFIGURED',
        message: 'Facebook OAuth is not configured on this server',
      });
    }
    return super.canActivate(context);
  }

  private isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('FACEBOOK_OAUTH_CLIENT_ID') &&
        this.config.get<string>('FACEBOOK_OAUTH_CLIENT_SECRET'),
    );
  }
}
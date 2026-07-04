/**
 * Google OAuth 2.0 strategy.
 *
 * Flow:
 *   GET  /v1/auth/oauth/google          \u2192 Passport redirects to Google.
 *   GET  /v1/auth/oauth/google/callback \u2192 Passport exchanges the code and
 *                                       invokes `validate()` with the profile.
 * The auth controller then upserts the user and issues tokens.
 *
 * Required env vars:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   GOOGLE_OAUTH_CALLBACK_URL
 *
 * NOTE: Passport's OAuth2Strategy throws if `clientID` is missing. To
 * keep the API runnable in environments without Google credentials, the
 * AuthModule only registers this strategy when the credentials are set
 * (see `auth.module.ts` for the conditional provider wiring).
 */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface OAuthProfile {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private static readonly log = new Logger(GoogleStrategy.name);

  constructor(config: ConfigService) {
    const clientID = config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_SECRET');
    const callbackURL =
      config.get<string>('GOOGLE_OAUTH_CALLBACK_URL') ??
      'http://localhost:4000/v1/auth/oauth/google/callback';

    const opts: StrategyOptions = {
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: false,
    };
    super(opts);
    GoogleStrategy.log.log('Google OAuth strategy initialised');
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: {
      id: string;
      emails?: { value: string; verified?: boolean }[];
      name?: { givenName?: string; familyName?: string };
      photos?: { value: string }[];
    },
    done: VerifyCallback,
  ): Promise<void> {
    const emailEntry = profile.emails?.[0];
    if (!emailEntry?.value) {
      return done(
        new UnauthorizedException('Google account does not expose an email'),
        undefined,
      );
    }

    const normalized: OAuthProfile = {
      provider: 'google',
      providerId: profile.id,
      email: emailEntry.value.toLowerCase(),
      emailVerified: emailEntry.verified ?? true,
      firstName: profile.name?.givenName ?? null,
      lastName: profile.name?.familyName ?? null,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, normalized);
  }
}
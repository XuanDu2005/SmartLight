/**
 * Facebook OAuth 2.0 strategy.
 *
 * Requires the `email` permission in the Facebook app configuration.
 *   FACEBOOK_OAUTH_CLIENT_ID
 *   FACEBOOK_OAUTH_CLIENT_SECRET
 *   FACEBOOK_OAUTH_CALLBACK_URL
 *
 * NOTE: registered only when the credentials are configured \u2014 see
 * `auth.module.ts` for the conditional provider wiring.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import type { OAuthProfile } from './google.strategy';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private static readonly log = new Logger(FacebookStrategy.name);

  constructor(config: ConfigService) {
    const clientID = config.getOrThrow<string>('FACEBOOK_OAUTH_CLIENT_ID');
    const clientSecret = config.getOrThrow<string>('FACEBOOK_OAUTH_CLIENT_SECRET');
    const callbackURL =
      config.get<string>('FACEBOOK_OAUTH_CALLBACK_URL') ??
      'http://localhost:4000/v1/auth/oauth/facebook/callback';

    const opts: StrategyOptions = {
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email'],
      profileFields: ['id', 'emails', 'name', 'picture'],
      passReqToCallback: false,
    };
    super(opts);
    FacebookStrategy.log.log('Facebook OAuth strategy initialised');
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: {
      id: string;
      emails?: { value: string }[];
      name?: { givenName?: string; familyName?: string };
      photos?: { value: string }[];
    },
    done: (err: unknown, user?: OAuthProfile) => void,
  ): Promise<void> {
    const emailEntry = profile.emails?.[0];
    const email = emailEntry?.value ?? `${profile.id}@facebook.placeholder`;

    const normalized: OAuthProfile = {
      provider: 'facebook',
      providerId: profile.id,
      email: email.toLowerCase(),
      // Facebook only returns verified emails (after app review).
      emailVerified: Boolean(emailEntry),
      firstName: profile.name?.givenName ?? null,
      lastName: profile.name?.familyName ?? null,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, normalized);
  }
}

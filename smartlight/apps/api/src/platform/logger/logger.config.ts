import type { Params } from 'nestjs-pino';
import type { IncomingMessage } from 'http';

/**
 * Pino logger configuration.
 * - Pretty in development.
 * - JSON logs everywhere else (BetterStack / Loki friendly).
 *
 * Sensitive fields (password, secret, token, cookie) are redacted.
 */
export const LoggerConfig = (): Params => ({
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { singleLine: true } }
        : undefined,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.token',
        'req.body.refreshToken',
        '*.password',
        '*.passwordHash',
        '*.token',
        '*.secret',
      ],
      censor: '[REDACTED]',
    },
    customProps: (_req: IncomingMessage) => ({
      service: 'smartlight-api',
      env: process.env.NODE_ENV ?? 'development',
    }),
  },
});

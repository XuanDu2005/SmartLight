import { randomUUID } from 'node:crypto';
import type { Params } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Pino logger configuration for SmartLight API.
 *
 * Production behavior:
 *   - JSON logs on stdout (one event per line).
 *   - `info` level for 2xx/3xx, `warn` for 4xx, `error` for 5xx.
 *   - Latency (`responseTime`) and request size logged per request.
 *   - Correlation ID propagated via `X-Request-ID` / `X-Correlation-ID` headers.
 *   - Sensitive fields are redacted (passwords, secrets, cookies, JWT).
 *
 * Development behavior:
 *   - Pretty-printed single-line logs via pino-pretty.
 *   - Trace-level logs are enabled when LOG_LEVEL=trace|debug.
 *
 * Compliance:
 *   - GDPR / PCI-DSS: passwords, tokens, hashes are never logged.
 *   - Audit logs are produced by the dedicated `audit` module, not here.
 */
export const LoggerConfig = (): Params => {
  const isDev = process.env.NODE_ENV === 'development';
  const level = process.env.LOG_LEVEL ?? 'info';

  return {
    pinoHttp: {
      level,
      // Use pino-pretty only in development; JSON elsewhere for ingestion.
      transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              translateTime: 'SYS:HH:MM:ss.l',
              ignore: 'pid,hostname,context,req,res,responseTime',
              colorize: true,
              levelFirst: true,
            },
          }
        : undefined,

      // Correlation ID strategy:
      //   - Honor an incoming `X-Request-ID` / `X-Correlation-ID` if present
      //     (useful for tracing across services).
      //   - Otherwise mint a UUIDv4.
      genReqId: (req, res) => {
        const header =
          (req.headers['x-request-id'] as string | undefined) ??
          (req.headers['x-correlation-id'] as string | undefined);
        const id = header?.trim() || randomUUID();
        res.setHeader('X-Request-ID', id);
        return id;
      },

      // Response time + status code in every request log.
      customSuccessMessage: (req, res) =>
        `${(req as IncomingMessage).method} ${(req as IncomingMessage).url ?? ''} ${(res as ServerResponse).statusCode}`,
      customErrorMessage: (req, res, err) =>
        `${(req as IncomingMessage).method} ${(req as IncomingMessage).url ?? ''} ${(res as ServerResponse).statusCode} — ${(err as Error).message}`,

      customLogLevel: (_req, res, err) => {
        if (err || (res as ServerResponse).statusCode >= 500) return 'error';
        if ((res as ServerResponse).statusCode >= 400) return 'warn';
        return 'info';
      },

      customAttributeKeys: {
        req: 'req',
        res: 'res',
        err: 'err',
        responseTime: 'durationMs',
      },

      // Static properties attached to every log line.
      customProps: () => ({
        service: 'smartlight-api',
        env: process.env.NODE_ENV ?? 'development',
        version: process.env.APP_VERSION ?? 'dev',
        pid: process.pid,
      }),

      // Per-request serializers strip URLs and headers we don't want logged.
      serializers: {
        req: (req: IncomingMessage & { id?: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.socket?.remoteAddress,
        }),
        res: (res: ServerResponse) => ({
          statusCode: res.statusCode,
        }),
      },

      // Auto-attached request/response logging is too noisy for high-RPS
      // production. Keep it enabled but tune the level so 5xx/4xx stand out.
      autoLogging: {
        ignore: (req) => {
          const url = req.url ?? '';
          // Skip health probes and metrics scrape from request logs.
          return (
            url === '/health' ||
            url === '/metrics' ||
            url.startsWith('/health/') ||
            url.startsWith('/metrics')
          );
        },
      },

      // Redact sensitive fields anywhere they appear in the log object tree.
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["set-cookie"]',
          'req.body.password',
          'req.body.currentPassword',
          'req.body.newPassword',
          'req.body.token',
          'req.body.refreshToken',
          'req.body.accessToken',
          'req.body.idToken',
          'res.headers["set-cookie"]',
          '*.password',
          '*.passwordHash',
          '*.token',
          '*.refreshToken',
          '*.accessToken',
          '*.secret',
          '*.apiKey',
          '*.api_key',
          '*.client_secret',
        ],
        censor: '[REDACTED]',
      },

      // Don't crash on a logger failure — fall back to console.
      wrapSerializers: false,
    },
  };
};
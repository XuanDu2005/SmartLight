/**
 * Nest API entry point.
 * Boots the application, wires global pipes, filters, CORS, and starts listening.
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { Logger as PinoLogger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { parseApiEnv } from '@smartlight/config';
import {
  buildSwaggerConfig,
  SWAGGER_PATH,
  SWAGGER_BEARER_AUTH,
  SWAGGER_REFRESH_COOKIE_AUTH,
} from './config/swagger';
import { assertValidEnv } from './config/env.validation';
import { CorrelationIdMiddleware } from './platform/logger/correlation-id.middleware';

async function bootstrap(): Promise<void> {
  // Phase 17.5: fail-fast environment validation (class-validator).
  // Runs BEFORE NestFactory.create() so we never bind to a port with
  // a misconfigured process.
  assertValidEnv();

  const env = parseApiEnv();
  const isProd = env.NODE_ENV === 'production';
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(PinoLogger));

  // Compression — gzip JSON responses
  app.use(
    compression({
      threshold: 1024,
      level: 6,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        const ce = (res.getHeader('Content-Encoding') as string) ?? '';
        return ce === '' && compression.filter(req, res);
      },
    }),
  );

  // Correlation ID middleware
  app.use(new CorrelationIdMiddleware().use);

  // Security headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hidePoweredBy: true,
      noSniff: true,
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      hsts: isProd
        ? { maxAge: 15552000, includeSubDomains: true, preload: true }
        : false,
    }),
  );

  // Cookie parsing
  app.use(cookieParser());

  // CORS — origin allowlist is mandatory
  // `API_CORS_ORIGINS` is parsed by config into a string[] of origins.
  const allowedOrigins = Array.isArray(env.API_CORS_ORIGINS)
    ? env.API_CORS_ORIGINS
    : String(env.API_CORS_ORIGINS ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-Reauth-Token',
      'X-Request-ID',
      'X-Correlation-ID',
      'Idempotency-Key',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Correlation-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'Retry-After',
    ],
    maxAge: 600,
  });

  app.setGlobalPrefix('v1', {
    exclude: ['/health', '/health/ready', '/health/status', '/metrics', '/', `/${SWAGGER_PATH}`, `/${SWAGGER_PATH}-json`],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      stopAtFirstError: false,
    }),
  );

  // OpenAPI / Swagger UI
  const swaggerConfig = buildSwaggerConfig().build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(SWAGGER_PATH, app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      tryItOutEnabled: true,
    },
    customSiteTitle: 'SmartLight API — OpenAPI Explorer',
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(env.API_PORT, '0.0.0.0');
  const log = app.get(PinoLogger);
  log.log(`SmartLight API ready at http://0.0.0.0:${env.API_PORT}/v1`);
  log.log(`Swagger UI available at http://0.0.0.0:${env.API_PORT}/api/docs`);
  log.log(
    `Environment: ${env.NODE_ENV} | log_level=${process.env.LOG_LEVEL ?? 'info'} | app_version=${process.env.APP_VERSION ?? 'dev'}`,
  );
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(
    JSON.stringify({
      level: 'fatal',
      time: new Date().toISOString(),
      service: 'smartlight-api',
      env: process.env.NODE_ENV ?? 'development',
      msg: 'Fatal bootstrap error',
      err: { message: (err as Error)?.message, stack: (err as Error)?.stack },
    }),
  );
  process.exit(1);
});
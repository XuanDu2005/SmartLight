/**
 * Nest API entry point.
 * Boots the application, wires global pipes, filters, CORS, and starts listening.
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
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

async function bootstrap(): Promise<void> {
  // Phase 17.5: fail-fast environment validation (class-validator).
  // Runs BEFORE NestFactory.create() so we never bind to a port with
  // a misconfigured process.
  assertValidEnv();

  const env = parseApiEnv();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(PinoLogger));

  // Security headers (Helmet). Disable CSP at the API layer \u2014 the API
  // returns JSON, not HTML; CSP is enforced at the frontends.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false,
      hsts:
        env.NODE_ENV === 'production'
          ? { maxAge: 15552000, includeSubDomains: true, preload: true }
          : false,
    }),
  );

  // Cookie parsing \u2014 needed for refresh-token extraction in the browser flow.
  app.use(cookieParser());

  app.enableCors({
    origin: env.API_CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-Reauth-Token',
      'Idempotency-Key',
    ],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
  });

  app.setGlobalPrefix('v1', {
    exclude: ['/health', '/', `/${SWAGGER_PATH}`, `/${SWAGGER_PATH}-json`],
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
  Logger.log(
    `SmartLight API ready at http://0.0.0.0:${env.API_PORT}/v1`,
    'Bootstrap',
  );
  Logger.log(
    `Swagger UI available at http://0.0.0.0:${env.API_PORT}/api/docs`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error', err);
  process.exit(1);
});
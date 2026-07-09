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

async function bootstrap(): Promise<void> {
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
    exclude: ['/health', '/', '/api/docs', '/api/docs-json'],
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
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SmartLight API')
    .setDescription(
      'SmartLight e-commerce backend API. Routes are namespaced under /v1.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        description: 'Paste the access token from /v1/auth/login here',
      },
      'bearer',
    )
    .addCookieAuth(
      'smartlight.rt',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'smartlight.rt',
        description: 'Refresh token cookie used by /v1/auth/refresh',
      },
      'cookie',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
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
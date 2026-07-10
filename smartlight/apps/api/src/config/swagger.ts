/**
 * Swagger / OpenAPI configuration.
 *
 * Centralises the DocumentBuilder wiring so `main.ts` stays clean and so the
 * spec metadata stays consistent across runs. The configuration exported here
 * is consumed by `SwaggerModule.createDocument()` in the bootstrap file.
 */
import { DocumentBuilder } from '@nestjs/swagger';

export const SWAGGER_TITLE = 'SmartLight API';
export const SWAGGER_VERSION = '1.0.0';
export const SWAGGER_DESCRIPTION =
  'Enterprise E-Commerce API for SmartLight lighting platform';
export const SWAGGER_PATH = 'api/docs';

export const SWAGGER_BEARER_AUTH = 'bearer-auth';
export const SWAGGER_REFRESH_COOKIE_AUTH = 'refresh-cookie';

export function buildSwaggerConfig(): DocumentBuilder {
  return new DocumentBuilder()
    .setTitle(SWAGGER_TITLE)
    .setVersion(SWAGGER_VERSION)
    .setDescription(SWAGGER_DESCRIPTION)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        name: 'Authorization',
        description:
          'Paste the access token returned by /v1/auth/login. ' +
          'Format: "Bearer <token>".',
      },
      SWAGGER_BEARER_AUTH,
    )
    .addCookieAuth(
      'smartlight.rt',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'smartlight.rt',
        description:
          'HTTP-only refresh token cookie. Used by /v1/auth/refresh ' +
          'for token rotation in the browser flow.',
      },
      SWAGGER_REFRESH_COOKIE_AUTH,
    )
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'Idempotency-Key' },
      'idempotency-key',
    )
    .addTag('Auth', 'Customer & admin authentication, OAuth, sessions')
    .addTag('Users', 'Customer profile & admin user management')
    .addTag('Catalog', 'Products, categories, brands, variants, attributes')
    .addTag('Inventory', 'Stock levels, movements, adjustments (admin)')
    .addTag('Cart', 'Customer shopping cart')
    .addTag('Checkout', 'Checkout session, address, inventory reservation')
    .addTag('Orders', 'Order lifecycle, state machine, history')
    .addTag('Payments', 'Payment intents, webhooks (MoMo/VNPay/PayPal)')
    .addTag('Shipping', 'Shipments, fee estimation, carrier webhooks')
    .addTag('Promotions', 'Promotions, vouchers, discount engine')
    .addTag('Health', 'Liveness & readiness probes');
}

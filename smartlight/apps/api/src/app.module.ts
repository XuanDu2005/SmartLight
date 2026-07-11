/**
 * Root application module.
 * Wires platform-level providers (config, logger, DB) and all bounded-context modules.
 * No business logic lives here.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { HealthModule } from './platform/health/health.module';
import { DatabaseModule } from './platform/database/database.module';
import { RedisModule } from './platform/redis/redis.module';
import { QueueModule } from './platform/queue/queue.module';
import { LoggerConfig } from './platform/logger/logger.config';
import { MetricsModule } from './platform/metrics/metrics.module';
import { CacheModule } from './platform/cache/cache.module';
import { HttpMetricsInterceptor } from './platform/metrics/http-metrics.interceptor';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { ReviewModule } from './modules/review/review.module';
import { NotificationModule } from './modules/notification/notification.module';
import { MediaModule } from './modules/media/media.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';

import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { GlobalExceptionFilter } from './platform/filters/global-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRootAsync({ useFactory: LoggerConfig }),

    // Rate limiting (global)
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          ttl: Number(process.env.THROTTLE_TTL_SEC ?? 60) * 1000,
          limit: Number(process.env.THROTTLE_LIMIT ?? 20),
        },
      ],
    }),

    // Platform
    HealthModule,
    DatabaseModule,
    RedisModule,
    QueueModule,
    MetricsModule,
    CacheModule,

    // Bounded contexts
    AuthModule,
    UsersModule,
    CatalogModule,
    InventoryModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
    PaymentsModule,
    ShippingModule,
    PromotionsModule,
    ReviewModule,
    NotificationModule,
    MediaModule,
    AdminModule,
    AuditModule,
  ],
  providers: [
    // Global guard order: throttle \u2192 jwt \u2192 roles \u2192 permissions
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Global error envelope
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    // Prometheus HTTP metrics
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
  ],
})
export class AppModule {}

/**
 * Redis client provider.
 *
 * Wraps `ioredis` in a Nest provider. If `REDIS_URL` is missing, the
 * provider registers a `null` token so BullMQ-dependent modules can degrade
 * gracefully and run in inline mode.
 */
import {
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
export class RedisLifecycle implements OnModuleDestroy {
  private readonly logger = new Logger(RedisLifecycle.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis | null) {}

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (err) {
        this.logger.warn(
          `Redis disconnect failed: ${(err as Error).message}`,
        );
      }
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const url = process.env.REDIS_URL;
        if (!url) {
          Logger.warn(
            'REDIS_URL not configured \u2014 Redis client disabled; queue features will run inline.',
            'RedisModule',
          );
          return null;
        }
        Logger.log(`Redis client connecting to ${url}`, 'RedisModule');
        return new Redis(url, {
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
          lazyConnect: false,
        });
      },
    },
    RedisLifecycle,
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
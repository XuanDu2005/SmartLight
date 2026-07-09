/**
 * BullMQ queue factory.
 *
 * Exposes a generic `getQueue(name, options)` provider that returns either
 * a live BullMQ Queue (when REDIS_URL is configured) or null (so callers
 * can degrade to inline mode).
 *
 * BullMQ itself isn't a Nest module \u2014 we expose just enough factory
 * helpers so the Notification module (and any future consumer) can plug in.
 */
import { Global, Logger, Module } from '@nestjs/common';
import { Queue, QueueOptions } from 'bullmq';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '../redis/redis.module';

export const QUEUE_FACTORY = Symbol('QUEUE_FACTORY');

export type QueueFactory = (
  name: string,
  options?: Partial<QueueOptions>,
) => Queue | null;

@Global()
@Module({
  providers: [
    {
      provide: QUEUE_FACTORY,
      useFactory: (redis: Redis | null): QueueFactory => {
        if (!redis) {
          Logger.warn(
            'QueueFactory returning null \u2014 jobs will not be enqueued.',
            'QueueModule',
          );
          return () => null;
        }
        return (name: string, options?: Partial<QueueOptions>) => {
          // BullMQ accepts ioredis-compatible connection options; pass-through.
          const conn: any =
            typeof redis === 'object' && redis !== null && 'options' in redis
              ? { ...(redis as any).options }
              : redis;
          return new Queue(name, {
            connection: conn,
            ...options,
          });
        };
      },
      inject: [REDIS_CLIENT],
    },
  ],
  exports: [QUEUE_FACTORY],
})
export class QueueModule {}
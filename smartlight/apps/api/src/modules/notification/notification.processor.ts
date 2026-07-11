/**
 * NotificationProcessor \u2014 BullMQ worker that drains the notifications queue.
 *
 * Lifecycle:
 *   - onModuleInit: subscribes a Worker to the queue (if BullMQ + Redis are
 *     configured).
 *   - onModuleDestroy: closes the worker cleanly.
 *
 * The actual `send` logic lives in NotificationService.processById() so that
 * `queueAndWait` (inline) and worker-driven paths share the same code.
 *
 * If BullMQ is not configured (no REDIS_URL), this processor becomes a
 * no-op \u2014 callers can still use queueAndWait() for inline sends.
 */
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';

import { NotificationService } from './service';
import { NOTIFICATION_CONSTANTS } from './constants/notification.constants';
import { QUEUE_FACTORY, type QueueFactory } from '../../platform/queue/queue.module';

export const NOTIFICATION_QUEUE = NOTIFICATION_CONSTANTS.QUEUE_NOTIFICATIONS;

export interface NotificationJobPayload {
  notificationId: string;
}

@Injectable()
export class NotificationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationProcessor.name);
  private worker: any | null = null;
  private readonly bullLib: any | null;

  constructor(
    @Inject(forwardRef(() => NotificationService))
    private readonly notifications: NotificationService,
    @Optional() @Inject(QUEUE_FACTORY) private readonly queueFactory?: QueueFactory,
  ) {
    // Require bullmq lazily so the module boots even when it's not installed.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.bullLib = require('bullmq');
    } catch {
      this.bullLib = null;
    }
  }

  /**
   * Enqueue a notification for async delivery. If BullMQ isn't configured
   * the function is a no-op \u2014 the caller is expected to use
   * `queueAndWait()` for inline delivery instead.
   */
  async enqueue(notificationId: string): Promise<void> {
    if (!this.queueFactory || !this.bullLib) {
      this.logger.debug(
        `BullMQ not configured \u2014 skipping enqueue for ${notificationId}`,
      );
      return;
    }
    const queue = this.queueFactory(NOTIFICATION_QUEUE);
    if (!queue) return;
    await queue.add(
      'send',
      { notificationId } as NotificationJobPayload,
      {
        attempts: NOTIFICATION_CONSTANTS.MAX_RETRY_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: NOTIFICATION_CONSTANTS.RETRY_BACKOFF_BASE_SEC * 1000,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
  }

  onModuleInit(): void {
    if (!this.bullLib || !this.queueFactory) {
      this.logger.warn('BullMQ not configured \u2014 processor in inline mode');
      return;
    }
    this.bootstrapWorker();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.close();
      } catch (err) {
        this.logger.warn(`Worker close failed: ${(err as Error).message}`);
      }
    }
  }

  private bootstrapWorker(): void {
    try {
      const { Worker } = this.bullLib;
      const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
      this.worker = new Worker(
        NOTIFICATION_QUEUE,
        async (job: any) => {
          const { notificationId } = job.data as NotificationJobPayload;
          this.logger.log(`Processing notification ${notificationId}`);
          await this.notifications.processById(notificationId);
        },
        {
          connection: { url },
          concurrency: NOTIFICATION_CONSTANTS.WORKER_CONCURRENCY,
        },
      );

      this.worker.on('failed', (job: any, err: Error) => {
        this.logger.error(
          `Notification job ${job?.id} failed: ${err.message}`,
        );
      });

      this.logger.log(`Notification worker subscribed to ${NOTIFICATION_QUEUE}`);
    } catch (err) {
      this.logger.error(
        `Failed to start notification worker: ${(err as Error).message}`,
      );
    }
  }
}

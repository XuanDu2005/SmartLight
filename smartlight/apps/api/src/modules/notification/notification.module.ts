/**
 * NotificationModule \u2014 owns the notification bounded context.
 *
 * Responsibilities:
 *   - Persist NotificationTemplate + Notification rows
 *   - Render templates with variables
 *   - Send via Resend (production) or console (development fallback)
 *   - Retry with exponential backoff
 *   - Optional BullMQ worker (when BullModule is configured)
 */
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../platform/database/database.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../../platform/redis/redis.module';
import { QueueModule } from '../../platform/queue/queue.module';

import { NotificationController } from './controller';
import { NotificationService } from './service';
import { NotificationProcessor } from './notification.processor';
import { NotificationRepository } from './repositories/notification.repository';
import { ResendEmailProvider } from './adapters/resend.provider';
import { ConsoleEmailProvider } from './adapters/console.provider';
import { EMAIL_PROVIDER } from './interfaces/provider.interface';

const useConsoleProvider = !process.env.RESEND_API_KEY;

@Module({
  imports: [DatabaseModule, AuthModule, RedisModule, QueueModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    NotificationProcessor,
    ResendEmailProvider,
    ConsoleEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      useExisting: useConsoleProvider
        ? ConsoleEmailProvider
        : ResendEmailProvider,
    },
  ],
  exports: [NotificationService, EMAIL_PROVIDER],
})
export class NotificationModule {}
import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Single Prisma client used across the application.
 *
 * Boot lifecycle:
 *   - Connect on module init.
 *   - Disconnect on module destroy (SIGTERM-safe).
 *
 * NOTE: Real production setup will configure replica routing, shadow DB for
 * migrations, and connection pool tuning. That logic lives in V1.1.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

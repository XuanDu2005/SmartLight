/**
 * NotificationRepository \u2014 DB access for the notification bounded context.
 */
import { Injectable } from '@nestjs/common';
import { Prisma, Notification, NotificationTemplate } from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';

import { NOTIFICATION_CONSTANTS } from '../constants/notification.constants';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------- Templates ------------- */

  async findTemplate(args: {
    code?: string;
    eventType?: string;
    channel?: string;
    locale?: string;
  }): Promise<NotificationTemplate | null> {
    const locale =
      args.locale ?? NOTIFICATION_CONSTANTS.FALLBACK_LOCALES[0];
    const where: Prisma.NotificationTemplateWhereInput = { deletedAt: null };
    if (args.code) where.code = args.code;
    if (args.eventType) where.eventType = args.eventType as any;
    if (args.channel) where.channel = args.channel as any;

    return this.prisma.notificationTemplate.findFirst({
      where,
      orderBy: { locale: 'asc' },
    });
  }

  async getTemplate(id: string): Promise<NotificationTemplate | null> {
    return this.prisma.notificationTemplate.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async createTemplate(
    data: Prisma.NotificationTemplateCreateInput,
  ): Promise<NotificationTemplate> {
    return this.prisma.notificationTemplate.create({ data });
  }

  async updateTemplate(
    id: string,
    data: Prisma.NotificationTemplateUpdateInput,
  ): Promise<NotificationTemplate> {
    return this.prisma.notificationTemplate.update({
      where: { id },
      data,
    });
  }

  async softDeleteTemplate(id: string): Promise<void> {
    await this.prisma.notificationTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async listTemplates(opts: {
    page: number;
    limit: number;
    channel?: string;
    eventType?: string;
  }) {
    const where: Prisma.NotificationTemplateWhereInput = { deletedAt: null };
    if (opts.channel) where.channel = opts.channel as any;
    if (opts.eventType) where.eventType = opts.eventType as any;
    const skip = (opts.page - 1) * opts.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notificationTemplate.findMany({
        where,
        orderBy: [{ code: 'asc' }, { locale: 'asc' }],
        skip,
        take: opts.limit,
      }),
      this.prisma.notificationTemplate.count({ where }),
    ]);
    return { items, total };
  }

  /* ------------- Notifications ------------- */

  async createNotification(
    data: Prisma.NotificationCreateInput,
  ): Promise<Notification> {
    return this.prisma.notification.create({ data });
  }

  async getNotification(id: string): Promise<Notification | null> {
    return this.prisma.notification.findFirst({ where: { id } });
  }

  async markProcessing(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.notification.update({
      where: { id },
      data: {
        status: 'PROCESSING' as any,
        attempts: { increment: 1 },
      },
    });
  }

  async markSent(
    id: string,
    providerMessageId: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.notification.update({
      where: { id },
      data: {
        status: 'SENT' as any,
        sentAt: new Date(),
        providerMessageId: providerMessageId ?? null,
        lastError: null,
      },
    });
  }

  async markFailed(
    id: string,
    error: string,
    nextAttemptAt: Date | null,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.notification.update({
      where: { id },
      data: {
        status: nextAttemptAt ? ('FAILED' as any) : ('FAILED' as any),
        lastError: error.slice(0, 2000),
        nextAttemptAt,
      },
    });
  }

  async markCancelled(id: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: { status: 'CANCELLED' as any },
    });
  }

  async listNotifications(opts: {
    page: number;
    limit: number;
    status?: string;
    eventType?: string;
    channel?: string;
  }) {
    const where: Prisma.NotificationWhereInput = {};
    if (opts.status) where.status = opts.status as any;
    if (opts.eventType) where.eventType = opts.eventType as any;
    if (opts.channel) where.channel = opts.channel as any;
    const skip = (opts.page - 1) * opts.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { queuedAt: 'desc' },
        skip,
        take: opts.limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total };
  }

  async findRetryable(now: Date, limit: number): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        status: 'FAILED' as any,
        nextAttemptAt: { lte: now },
      },
      orderBy: { nextAttemptAt: 'asc' },
      take: limit,
    });
  }

  parsePagination(
    pageStr?: number | string,
    limitStr?: number | string,
  ): { page: number; limit: number } {
    const page = Math.max(
      NOTIFICATION_CONSTANTS.DEFAULT_PAGE,
      Number(pageStr ?? NOTIFICATION_CONSTANTS.DEFAULT_PAGE) ||
        NOTIFICATION_CONSTANTS.DEFAULT_PAGE,
    );
    const limit = Math.min(
      NOTIFICATION_CONSTANTS.MAX_LIMIT ?? 200,
      Math.max(
        1,
        Number(limitStr ?? 50) || 50,
      ),
    );
    return { page, limit };
  }
}

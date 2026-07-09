/**
 * NotificationService \u2014 public API for queueing notifications and
 * managing templates. The actual provider call happens in
 * NotificationProcessor (BullMQ worker) which is exported separately so
 * other modules can inject it without booting the full worker.
 *
 * Internal service contract (used by other modules):
 *   - queue(args)         \u2192 Notification row (status=QUEUED)
 *   - queueAndWait(args)  \u2192 Notification row + immediate sync send
 *   - cancel(id)
 *   - retry(id)
 *   - registerTemplate / updateTemplate / deleteTemplate
 */
import {
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { NotificationEventType, Prisma } from '@prisma/client';

import { NotificationRepository } from './repositories/notification.repository';
import {
  IEmailProvider,
  EMAIL_PROVIDER,
} from './interfaces/provider.interface';
import {
  NOTIFICATION_CONSTANTS,
  NOTIFICATION_ERROR_CODES,
} from './constants/notification.constants';
import {
  InvalidRecipientException,
  InvalidTemplateVariablesException,
  NotificationNotFoundException,
  NotificationProviderFailedException,
  NotificationTemplateNotFoundException,
  ResendNotConfiguredException,
} from './exceptions/notification.exceptions';
import {
  extractVariables,
  renderTemplate,
} from './entities/template-renderer';
import { NotificationProcessor } from './notification.processor';

import type {
  CreateTemplateDto,
  ListNotificationsQueryDto,
  QueueNotificationDto,
  UpdateTemplateDto,
} from './dto/notification.dto';
import type {
  NotificationListResponseDto,
  NotificationResponseDto,
  NotificationTemplateResponseDto,
  QueueNotificationResponseDto,
} from './dto/notification-response.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly repo: NotificationRepository,
    @Inject(EMAIL_PROVIDER) private readonly provider: IEmailProvider,
    @Optional() private readonly processor?: NotificationProcessor,
  ) {}

  /* ============================================================== */
  /*  Queueing (public API + internal contract)                     */
  /* ============================================================== */

  async queue(args: QueueNotificationDto): Promise<QueueNotificationResponseDto> {
    const channel = (args.channel ?? NOTIFICATION_CONSTANTS.DEFAULT_CHANNEL) as
      | 'EMAIL'
      | 'SMS'
      | 'PUSH'
      | 'IN_APP';

    this.assertRecipient(args);

    let template = null;
    if (args.templateCode) {
      template = await this.repo.findTemplate({
        code: args.templateCode,
        channel,
        locale: args.locale,
      });
      if (!template) {
        throw new NotificationTemplateNotFoundException(args.templateCode);
      }
    } else if (args.eventType) {
      template = await this.repo.findTemplate({
        eventType: args.eventType,
        channel,
        locale: args.locale,
      });
    }

    let subject: string | null = null;
    let body: string;

    if (template) {
      subject = template.subjectTemplate
        ? this.safeRender(template.subjectTemplate, args.variables)
        : null;
      body = this.safeRender(template.bodyTemplate, args.variables);
    } else {
      // No template \u2014 caller must have supplied a literal body via variables.body
      const fallback = args.variables['body'];
      const fallbackSubject = args.variables['subject'];
      if (typeof fallback !== 'string') {
        throw new InvalidTemplateVariablesException(['body']);
      }
      body = fallback;
      subject = typeof fallbackSubject === 'string' ? fallbackSubject : null;
    }

    const row = await this.repo.createNotification({
      template: template ? { connect: { id: template.id } } : undefined,
      eventType: (args.eventType ?? 'CUSTOM') as NotificationEventType,
      channel,
      recipientUserId: args.recipientUserId ?? null,
      recipientEmail: args.recipientEmail ?? null,
      recipientPhone: args.recipientPhone ?? null,
      subject,
      body,
      variablesJson: (args.variables as any) ?? Prisma.JsonNull ?? {},
    });

    // Best-effort enqueue (no-op if BullMQ isn't configured)
    if (this.processor && !args.sendImmediately) {
      try {
        await this.processor.enqueue(row.id);
      } catch (err) {
        this.logger.warn(
          `enqueue failed for ${row.id}: ${(err as Error).message}`,
        );
      }
    }

    return { notificationId: row.id, status: 'QUEUED' };
  }

  async queueAndWait(args: QueueNotificationDto): Promise<QueueNotificationResponseDto> {
    const queued = await this.queue(args);

    if (args.sendImmediately) {
      try {
        await this.processById(queued.notificationId);
        return { notificationId: queued.notificationId, status: 'SENT' };
      } catch (err) {
        this.logger.warn(
          `queueAndWait failed for ${queued.notificationId}: ${(err as Error).message}`,
        );
      }
    }

    return queued;
  }

  /**
   * Process a single notification synchronously by id (used by the worker
   * and for `sendImmediately=true`). Idempotent: if status=SENT, no-op.
   */
  async processById(notificationId: string): Promise<void> {
    const notification = await this.repo.getNotification(notificationId);
    if (!notification) throw new NotificationNotFoundException(notificationId);
    if (notification.status === 'SENT') return;

    await this.repo.markProcessing(notificationId);

    if (notification.channel === 'EMAIL') {
      const recipient =
        notification.recipientEmail ?? (notification as any).user?.email;
      if (!recipient) {
        await this.repo.markFailed(
          notificationId,
          'No recipient email',
          null,
        );
        throw new InvalidRecipientException('No recipient email');
      }
      try {
        const result = await this.provider.send({
          to: recipient,
          from: NOTIFICATION_CONSTANTS.DEFAULT_FROM_EMAIL,
          fromName: NOTIFICATION_CONSTANTS.DEFAULT_FROM_NAME,
          subject: notification.subject ?? '(no subject)',
          body: notification.body,
          metadata: {
            eventType: notification.eventType,
            notificationId,
          },
        });
        await this.repo.markSent(notificationId, result.providerMessageId);
      } catch (err) {
        const message = (err as Error).message ?? 'unknown';
        await this.repo.markFailed(
          notificationId,
          message,
          this.computeNextAttemptAt(notification.attempts + 1),
        );
        throw err;
      }
    } else {
      // SMS/PUSH/IN_APP \u2014 not yet implemented; mark failed.
      await this.repo.markFailed(
        notificationId,
        `Channel ${notification.channel} not implemented`,
        null,
      );
      throw new NotificationProviderFailedException(
        notification.channel,
        'channel not implemented',
      );
    }
  }

  async cancel(id: string): Promise<void> {
    const existing = await this.repo.getNotification(id);
    if (!existing) throw new NotificationNotFoundException(id);
    if (existing.status === 'SENT') return;
    await this.repo.markCancelled(id);
  }

  async retry(id: string): Promise<void> {
    const existing = await this.repo.getNotification(id);
    if (!existing) throw new NotificationNotFoundException(id);
    await this.processById(id);
  }

  async getNotification(id: string): Promise<NotificationResponseDto> {
    const row = await this.repo.getNotification(id);
    if (!row) throw new NotificationNotFoundException(id);
    return this.toResponse(row);
  }

  async listNotifications(
    query: ListNotificationsQueryDto,
  ): Promise<NotificationListResponseDto> {
    const { page, limit } = this.repo.parsePagination(query.page, query.limit);
    const { items, total } = await this.repo.listNotifications({
      page,
      limit,
      status: query.status,
      eventType: query.eventType,
      channel: query.channel,
    });
    return {
      items: items.map((n: any) => this.toResponse(n)),
      total,
      page,
      limit,
    };
  }

  /* ============================================================== */
  /*  Template management                                            */
  /* ============================================================== */

  async registerTemplate(
    dto: CreateTemplateDto,
  ): Promise<NotificationTemplateResponseDto> {
    const existing = await this.repo.findTemplate({
      code: dto.code,
      channel: dto.channel,
      locale: dto.locale,
    });
    if (existing) {
      throw new NotificationTemplateNotFoundException(
        `${dto.code}:${dto.channel}:${dto.locale} already exists`,
      );
    }

    const row = await this.repo.createTemplate({
      code: dto.code,
      eventType: dto.eventType as any,
      channel: dto.channel as any,
      locale: dto.locale ?? NOTIFICATION_CONSTANTS.FALLBACK_LOCALES[0],
      subjectTemplate: dto.subjectTemplate ?? null,
      bodyTemplate: dto.bodyTemplate,
      variablesJson: (dto.variables as any) ?? [],
      isActive: dto.isActive ?? true,
    });
    return this.toTemplateResponse(row);
  }

  async updateTemplate(
    id: string,
    dto: UpdateTemplateDto,
  ): Promise<NotificationTemplateResponseDto> {
    const existing = await this.repo.getTemplate(id);
    if (!existing) throw new NotificationTemplateNotFoundException(id);

    const data: Prisma.NotificationTemplateUpdateInput = {};
    if (dto.subjectTemplate !== undefined)
      data.subjectTemplate = dto.subjectTemplate;
    if (dto.bodyTemplate !== undefined) data.bodyTemplate = dto.bodyTemplate;
    if (dto.variables !== undefined) data.variablesJson = dto.variables as any;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    // bump version on body change
    if (dto.bodyTemplate !== undefined) {
      data.version = { increment: 1 };
    }

    const updated = await this.repo.updateTemplate(id, data);
    return this.toTemplateResponse(updated);
  }

  async deleteTemplate(id: string): Promise<void> {
    const existing = await this.repo.getTemplate(id);
    if (!existing) throw new NotificationTemplateNotFoundException(id);
    await this.repo.softDeleteTemplate(id);
  }

  async listTemplates(opts: {
    page: number;
    limit: number;
    channel?: string;
    eventType?: string;
  }) {
    const { items, total } = await this.repo.listTemplates(opts);
    return {
      items: items.map((t: any) => this.toTemplateResponse(t)),
      total,
      page: opts.page,
      limit: opts.limit,
    };
  }

  /* ============================================================== */
  /*  Internal helpers                                               */
  /* ============================================================== */

  private assertRecipient(args: QueueNotificationDto): void {
    if (
      !args.recipientEmail &&
      !args.recipientUserId &&
      !args.recipientPhone
    ) {
      throw new InvalidRecipientException('at least one of email/userId/phone is required');
    }
  }

  private safeRender(template: string, variables: Record<string, unknown>): string {
    try {
      return renderTemplate(template, variables);
    } catch (err) {
      if (err && typeof err === 'object' && 'missing' in err) {
        throw new InvalidTemplateVariablesException(
          (err as { missing: string[] }).missing,
        );
      }
      throw err;
    }
  }

  private computeNextAttemptAt(attempts: number): Date | null {
    if (attempts >= NOTIFICATION_CONSTANTS.MAX_RETRY_ATTEMPTS) {
      return null;
    }
    const delaySec =
      NOTIFICATION_CONSTANTS.RETRY_BACKOFF_BASE_SEC * Math.pow(2, attempts - 1);
    return new Date(Date.now() + delaySec * 1000);
  }

  private toResponse(n: any): NotificationResponseDto {
    return {
      id: n.id,
      templateId: n.templateId ?? null,
      eventType: n.eventType,
      channel: n.channel,
      recipientUserId: n.recipientUserId ?? null,
      recipientEmail: n.recipientEmail ?? null,
      recipientPhone: n.recipientPhone ?? null,
      subject: n.subject ?? null,
      body: n.body,
      status: n.status,
      attempts: n.attempts,
      lastError: n.lastError ?? null,
      providerMessageId: n.providerMessageId ?? null,
      queuedAt: n.queuedAt.toISOString(),
      sentAt: n.sentAt?.toISOString() ?? null,
      nextAttemptAt: n.nextAttemptAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    };
  }

  private toTemplateResponse(t: any): NotificationTemplateResponseDto {
    const variables = Array.isArray(t.variablesJson)
      ? (t.variablesJson as string[])
      : [];
    return {
      id: t.id,
      code: t.code,
      eventType: t.eventType,
      channel: t.channel,
      locale: t.locale,
      subjectTemplate: t.subjectTemplate ?? null,
      bodyTemplate: t.bodyTemplate,
      variables,
      isActive: t.isActive,
      version: t.version,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  /**
   * Best-effort compile-time check that the renderer is wired.
   */
  static __test_renderer() {
    return { extractVariables, renderTemplate };
  }
}
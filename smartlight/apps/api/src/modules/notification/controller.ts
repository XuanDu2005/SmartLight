/**
 * NotificationController \u2014 admin endpoints for templates + notifications.
 *
 *   POST   /admin/notifications              \u2014 queue a notification
 *   GET    /admin/notifications              \u2014 list with filters
 *   GET    /admin/notifications/:id          \u2014 get by id
 *   POST   /admin/notifications/:id/retry    \u2014 retry a failed one
 *   DELETE /admin/notifications/:id          \u2014 cancel
 *
 *   GET    /admin/notification-templates
 *   POST   /admin/notification-templates
 *   PATCH  /admin/notification-templates/:id
 *   DELETE /admin/notification-templates/:id
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { NotificationService } from './service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { UserPrincipal } from '../users/interfaces/user-principal.interface';

import {
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

@Controller()
@Roles('admin', 'marketing_manager', 'support')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  /* ---------------- Notifications ---------------- */

  @Post('admin/notifications')
  @HttpCode(HttpStatus.ACCEPTED)
  async queue(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: QueueNotificationDto,
  ): Promise<QueueNotificationResponseDto> {
    return this.notifications.queue({
      ...dto,
      variables: {
        ...(dto.variables ?? {}),
        actorId: user.id,
      },
    });
  }

  @Get('admin/notifications')
  async list(
    @Query() query: ListNotificationsQueryDto,
  ): Promise<NotificationListResponseDto> {
    return this.notifications.listNotifications(query);
  }

  @Get('admin/notifications/:id')
  async get(
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    return this.notifications.getNotification(id);
  }

  @Post('admin/notifications/:id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  async retry(
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    await this.notifications.retry(id);
    return this.notifications.getNotification(id);
  }

  @Delete('admin/notifications/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(
    @Param('id') id: string,
  ): Promise<void> {
    return this.notifications.cancel(id);
  }

  /* ---------------- Templates ---------------- */

  @Get('admin/notification-templates')
  async listTemplates(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('channel') channel?: string,
    @Query('eventType') eventType?: string,
  ): Promise<{
    items: NotificationTemplateResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const p = Number(page ?? 1) || 1;
    const l = Math.min(200, Number(limit ?? 50) || 50);
    return this.notifications.listTemplates({
      page: p,
      limit: l,
      channel,
      eventType,
    });
  }

  @Post('admin/notification-templates')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @Body() dto: CreateTemplateDto,
  ): Promise<NotificationTemplateResponseDto> {
    return this.notifications.registerTemplate(dto);
  }

  @Patch('admin/notification-templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ): Promise<NotificationTemplateResponseDto> {
    return this.notifications.updateTemplate(id, dto);
  }

  @Delete('admin/notification-templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(
    @Param('id') id: string,
  ): Promise<void> {
    return this.notifications.deleteTemplate(id);
  }
}
/**
 * Notification response DTOs.
 */

export interface NotificationTemplateResponseDto {
  id: string;
  code: string;
  eventType: string;
  channel: string;
  locale: string;
  subjectTemplate: string | null;
  bodyTemplate: string;
  variables: string[];
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponseDto {
  id: string;
  templateId: string | null;
  eventType: string;
  channel: string;
  recipientUserId: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  subject: string | null;
  body: string;
  status: string;
  attempts: number;
  lastError: string | null;
  providerMessageId: string | null;
  queuedAt: string;
  sentAt: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponseDto {
  items: NotificationResponseDto[];
  total: number;
  page: number;
  limit: number;
}

export interface QueueNotificationResponseDto {
  notificationId: string;
  status: 'QUEUED' | 'SENT';
}

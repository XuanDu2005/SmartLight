/**
 * Notification request DTOs.
 */
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class QueueNotificationDto {
  @IsString()
  @MaxLength(40)
  eventType!: string;

  @IsOptional()
  @IsString()
  @IsIn(['EMAIL', 'SMS', 'PUSH', 'IN_APP'])
  channel?: string;

  @IsOptional()
  @IsString()
  recipientUserId?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  recipientPhone?: string;

  @IsOptional()
  @IsString()
  templateCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsObject()
  variables!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  sendImmediately?: boolean;
}

export class CreateTemplateDto {
  @IsString()
  @MaxLength(80)
  code!: string;

  @IsString()
  @MaxLength(40)
  eventType!: string;

  @IsString()
  @IsIn(['EMAIL', 'SMS', 'PUSH', 'IN_APP'])
  channel!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subjectTemplate?: string;

  @IsString()
  bodyTemplate!: string;

  @IsOptional()
  @IsArray()
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subjectTemplate?: string;

  @IsOptional()
  @IsString()
  bodyTemplate?: string;

  @IsOptional()
  @IsArray()
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListNotificationsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  eventType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  channel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
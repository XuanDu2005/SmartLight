/**
 * Global exception filter \u2014 normalizes every thrown error into the
 * SmartLight error envelope defined in docs/04-api-design/ERROR_RESPONSE_STANDARD.md.
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  traceId: string;
  timestamp: string;
  path: string;
  fieldErrors?: unknown;
  [extra: string]: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = randomUUID();
    const path = request.url;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: Partial<ErrorPayload> = {
      code: 'INTERNAL',
      message: 'Internal server error',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        payload = { code: defaultCodeForStatus(status), message: res };
      } else if (res && typeof res === 'object') {
        const obj = res as Record<string, unknown>;
        payload = {
          code: (obj.code as string) ?? defaultCodeForStatus(status),
          message:
            (obj.message as string) ??
            (obj.error as string) ??
            defaultMessageForStatus(status),
        };
        if (Array.isArray(obj.message)) {
          // class-validator pattern: message is an array of strings
          payload.message = 'Validation failed';
          payload.fieldErrors = (obj.message as string[]).map((m) => ({
            message: m,
          }));
        }
        if (obj.details !== undefined) payload.details = obj.details;
        for (const [k, v] of Object.entries(obj)) {
          if (k === 'code' || k === 'message' || k === 'details') continue;
          if (payload[k] === undefined) payload[k] = v;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error(`Non-Error thrown: ${JSON.stringify(exception)}`);
    }

    const body: ErrorPayload = {
      code: payload.code ?? defaultCodeForStatus(status),
      message: payload.message ?? defaultMessageForStatus(status),
      details: payload.details,
      traceId,
      timestamp: new Date().toISOString(),
      path,
      ...(payload.fieldErrors ? { fieldErrors: payload.fieldErrors } : {}),
    };

    response.status(status).json({ error: body });
  }
}

function defaultCodeForStatus(s: number): string {
  switch (s) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 423:
      return 'LOCKED';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL';
  }
}

function defaultMessageForStatus(s: number): string {
  switch (s) {
    case 400:
      return 'Bad request';
    case 401:
      return 'Authentication required';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Validation failed';
    case 423:
      return 'Resource locked';
    case 429:
      return 'Too many requests';
    default:
      return 'Internal server error';
  }
}
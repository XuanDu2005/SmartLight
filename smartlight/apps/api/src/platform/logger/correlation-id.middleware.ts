import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Correlation / Request-ID middleware.
 *
 * Honors an incoming `X-Request-ID` or `X-Correlation-ID` header (for
 * distributed tracing across services). Otherwise mints a UUIDv4.
 *
 * The id is:
 *   1. attached to the request as `req.id` (used by Pino's `genReqId`)
 *   2. echoed back in the response header `X-Request-ID`
 *   3. available downstream via `@Req() req: Request` in controllers
 *
 * NOTE: This is the *request-level* correlation id. The Pino logger config
 * also has a `genReqId` callback that does the same thing — we keep both
 * so the id is available to non-HTTP code paths (workers, schedulers) too.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming =
      (req.headers['x-request-id'] as string | undefined) ??
      (req.headers['x-correlation-id'] as string | undefined);
    const id = incoming?.trim() || randomUUID();
    (req as Request & { id?: string }).id = id;
    res.setHeader('X-Request-ID', id);
    next();
  }
}
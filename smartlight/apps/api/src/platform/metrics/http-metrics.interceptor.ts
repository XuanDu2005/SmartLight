/**
 * HttpMetricsInterceptor — records every HTTP request's status + duration.
 *
 * Uses prom-client's `http_request_duration_seconds` histogram + a
 * `http_requests_total` counter. The `route` label uses the *route
 * pattern* (e.g. `/v1/products/:id`) instead of the raw URL so the
 * cardinality stays bounded.
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { route?: { path?: string } }>();
    const res = http.getResponse<Response>();
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => this.record(req, res, start),
        error: () => this.record(req, res, start),
      }),
    );
  }

  private record(
    req: Request & { route?: { path?: string } },
    res: Response,
    start: bigint,
  ): void {
    const elapsedNs = Number(process.hrtime.bigint() - start);
    const durationSeconds = elapsedNs / 1e9;
    // Prefer the route pattern (`:id` etc.); fall back to URL path; finally
    // bucket unknowns as `unmatched` to keep cardinality bounded.
    const route =
      (req.route?.path as string | undefined) ??
      (req.baseUrl ? `${req.baseUrl}${req.path}` : req.path) ??
      'unmatched';
    this.metrics.recordHttp(req.method, route, res.statusCode, durationSeconds);
  }
}